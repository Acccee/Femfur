// profiles.js - User Profiles Module

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

// Get public profile
async function getPublicProfile(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, nickname, avatar_url, status, karma_status, global_role, created_at')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        // Get thread count
        const { count: threadCount } = await supabaseClient
            .from('threads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        // Get owned groups
        const { count: groupCount } = await supabaseClient
            .from('groups')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', userId);
        
        return {
            ...data,
            bio: data.status,
            thread_count: threadCount || 0,
            group_count: groupCount || 0
        };
    } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
    }
}

// Update own profile
async function updateProfile(bio, avatarFile) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_not_logged_in'));
        }
        
        const updates = {};
        
        if (bio !== undefined) {
            updates.status = bio.trim();
        }
        
        if (avatarFile) {
            const { uploadImage } = await import('./supabaseClient.js');
            updates.avatar_url = await uploadImage(avatarFile, `avatars/${user.id}`);
        }
        
        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

export { getPublicProfile, updateProfile };
