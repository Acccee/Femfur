// auth.js - Authentication Module with Hash-based Profiles

import { supabaseClient, uploadImage } from './supabaseClient.js';
import { t } from './i18n.js';

let currentUser = null;

// Generate stable hash from user ID
function generateUserHash(userId) {
    const str = `user_${userId}_salt`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Get current user from session
async function getCurrentUser() {
    if (currentUser) return currentUser;
    
    const userSession = localStorage.getItem('femfur_user');
    if (userSession) {
        try {
            currentUser = JSON.parse(userSession);
            return currentUser;
        } catch (e) {
            localStorage.removeItem('femfur_user');
        }
    }
    return null;
}

// Register new user
async function register(nickname, password, passwordConfirm, avatar, status, alwaysAnon) {
    try {
        if (!nickname || !password || !passwordConfirm) {
            throw new Error(t('error_empty_fields'));
        }
        
        if (password !== passwordConfirm) {
            throw new Error(t('error_password_mismatch'));
        }
        
        const { data: existingUser } = await supabaseClient
            .from('users')
            .select('id')
            .eq('nickname', nickname)
            .single();
        
        if (existingUser) {
            throw new Error(t('error_register'));
        }
        
        const passwordHash = await simpleHash(password);
        
        let avatarUrl = null;
        if (avatar) {
            avatarUrl = await uploadImage(avatar, 'avatars');
        }
        
        const { data, error } = await supabaseClient
            .from('users')
            .insert([{
                nickname,
                password_hash: passwordHash,
                avatar_url: avatarUrl,
                status: status || null,
                always_anonymous: alwaysAnon || false
            }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Login user
async function login(nickname, password) {
    try {
        if (!nickname || !password) {
            throw new Error(t('error_empty_fields'));
        }
        
        const passwordHash = await simpleHash(password);
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('nickname', nickname)
            .eq('password_hash', passwordHash)
            .single();
        
        if (error || !data) {
            throw new Error(t('error_login'));
        }
        
        data.profile_hash = generateUserHash(data.id);
        currentUser = data;
        localStorage.setItem('femfur_user', JSON.stringify(data));
        
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Logout user
function logout() {
    currentUser = null;
    localStorage.removeItem('femfur_user');
    window.location.hash = '';
    window.location.reload();
}

// Simple hash function
async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get user by hash — now selects new profile columns
async function getUserByHash(hash) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, nickname, avatar_url, status, banner_url, bio, theme_preset, theme_color, custom_css, created_at');
        
        if (error) throw error;
        
        for (const user of data) {
            if (generateUserHash(user.id) === hash) {
                user.profile_hash = hash;
                return user;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting user by hash:', error);
        return null;
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const profileLink = document.getElementById('profileLink');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        profileLink.textContent = currentUser.nickname;
        profileLink.href = `#u/${currentUser.profile_hash || generateUserHash(currentUser.id)}`;
        
        const anonContainers = document.querySelectorAll('#anonToggleContainer, #threadAnonToggleContainer');
        anonContainers.forEach(container => {
            container.style.display = 'block';
        });
        
        if (currentUser.always_anonymous) {
            document.getElementById('postAnon').checked = true;
            document.getElementById('threadPostAnon').checked = true;
        }
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        userMenu.style.display = 'none';
        
        const anonContainers = document.querySelectorAll('#anonToggleContainer, #threadAnonToggleContainer');
        anonContainers.forEach(container => {
            container.style.display = 'none';
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
//  updateProfile  —  BUG FIX
//
//  Original crash: "Cannot coerce the result to a single JSON object"
//
//  Root cause: Supabase .update().select().single() fails when:
//    • The updates object is empty (nothing to change)
//    • The response shape is an array, not a single row
//
//  Fix applied:
//    1. Build the updates object incrementally
//    2. Return early if updates is empty (nothing to persist)
//    3. Use .select() WITHOUT .single() — returns an array
//    4. Manually extract data[0] from the array
// ═══════════════════════════════════════════════════════════════════
async function updateProfile(avatarFile, status, bannerFile, bio, themePreset, themeColor, customCss) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_login'));
        }

        const updates = {};

        // Avatar
        if (avatarFile) {
            updates.avatar_url = await uploadImage(avatarFile, 'avatars');
        }

        // Banner (1200×300px recommended)
        if (bannerFile) {
            updates.banner_url = await uploadImage(bannerFile, 'banners');
        }

        // Status
        if (status !== undefined) {
            updates.status = status.trim() || null;
        }

        // Bio (max 500 chars enforced)
        if (bio !== undefined) {
            updates.bio = bio.trim().substring(0, 500) || null;
        }

        // Theme preset (default | minimal | colorful | dark | neon)
        if (themePreset !== undefined) {
            updates.theme_preset = themePreset;
        }

        // Accent colour hex
        if (themeColor !== undefined) {
            updates.theme_color = themeColor;
        }

        // Custom CSS (scoped to .profile-themed)
        if (customCss !== undefined) {
            updates.custom_css = customCss.trim() || null;
        }

        // ── GUARD: nothing changed → skip DB round-trip ──
        if (Object.keys(updates).length === 0) {
            return user;
        }

        // ── FIX: .select() returns an array; never use .single() here ──
        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select();   // ← array, NOT single object

        if (error) throw error;

        // Extract first element from array
        const updatedRow = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (!updatedRow) {
            throw new Error('Profile update returned no data');
        }

        // Attach hash and persist to session
        updatedRow.profile_hash = generateUserHash(updatedRow.id);
        currentUser = updatedRow;
        localStorage.setItem('femfur_user', JSON.stringify(updatedRow));

        return updatedRow;
    } catch (error) {
        console.error('Profile update error:', error);
        throw error;
    }
}

export { 
    register, 
    login, 
    logout, 
    getCurrentUser, 
    getUserByHash, 
    generateUserHash,
    updateAuthUI,
    updateProfile,
    currentUser
};
