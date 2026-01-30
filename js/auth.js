// auth.js - Authentication Module with Hash-based Profiles

import { supabaseClient, uploadImage } from './supabaseClient.js';
import { t } from './i18n.js';

let currentUser = null;

// Generate stable hash from user ID
function generateUserHash(userId) {
    // Simple hash function - in production use a better one
    const str = `user_${userId}_salt`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
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
        // Validate
        if (!nickname || !password || !passwordConfirm) {
            throw new Error(t('error_empty_fields'));
        }
        
        if (password !== passwordConfirm) {
            throw new Error(t('error_password_mismatch'));
        }
        
        // Check if nickname exists
        const { data: existingUser } = await supabaseClient
            .from('users')
            .select('id')
            .eq('nickname', nickname)
            .single();
        
        if (existingUser) {
            throw new Error(t('error_register'));
        }
        
        // Hash password (simple hash - in production use better hashing like bcrypt on server)
        const passwordHash = await simpleHash(password);
        
        // Upload avatar if provided
        let avatarUrl = null;
        if (avatar) {
            avatarUrl = await uploadImage(avatar, 'avatars');
        }
        
        // Create user
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
        
        // Generate hash for profile URL
        data.profile_hash = generateUserHash(data.id);
        
        // Save to session
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

// Simple hash function (use better hashing in production)
async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get user by hash
async function getUserByHash(hash) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, nickname, avatar_url, status, created_at');
        
        if (error) throw error;
        
        // Find user with matching hash
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
        profileLink.href = `#u/${currentUser.profile_hash}`;
        
        // Show anonymous toggle in forms if user is logged in
        const anonContainers = document.querySelectorAll('#anonToggleContainer, #threadAnonToggleContainer');
        anonContainers.forEach(container => {
            container.style.display = 'block';
        });
        
        // Set default anonymous state
        if (currentUser.always_anonymous) {
            document.getElementById('postAnon').checked = true;
            document.getElementById('threadPostAnon').checked = true;
        }
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        userMenu.style.display = 'none';
        
        // Hide anonymous toggle
        const anonContainers = document.querySelectorAll('#anonToggleContainer, #threadAnonToggleContainer');
        anonContainers.forEach(container => {
            container.style.display = 'none';
        });
    }
}

// Update user profile
async function updateProfile(avatarFile, status) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_login'));
        }

        let updates = {};

        // Upload new avatar if provided
        if (avatarFile) {
            const avatarUrl = await uploadImage(avatarFile, 'avatars');
            updates.avatar_url = avatarUrl;
        }

        // Update status
        if (status !== undefined) {
            updates.status = status || null;
        }

        // Update in database
        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        // Update current user
        data.profile_hash = generateUserHash(data.id);
        currentUser = data;
        localStorage.setItem('femfur_user', JSON.stringify(data));

        return data;
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
