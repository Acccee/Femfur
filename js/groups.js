// groups.js - Groups Management Module

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';
import { checkCooldown, setCooldown } from './cooldowns.js';

// Constants
const GROUP_NAME_REGEX = /^[a-z0-9_-]{3,50}$/;
const MAX_GROUPS_PER_USER = 3;
const MIN_ACCOUNT_AGE_DAYS = 7;

// Create new group
async function createGroup(name, displayName, description, iconFile) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_not_logged_in', 'You must be logged in'));
        }
        
        // Check cooldown
        const canCreate = await checkCooldown('create_group');
        if (!canCreate) {
            throw new Error(t('error_cooldown', 'Please wait before creating another group'));
        }
        
        // Validate name format
        if (!GROUP_NAME_REGEX.test(name)) {
            throw new Error(t('error_invalid_group_name', 'Group name must be 3-50 characters, latin letters, numbers, _ and - only'));
        }
        
        // Check karma status
        const { data: userData } = await supabaseClient
            .from('users')
            .select('karma_status, created_at')
            .eq('id', user.id)
            .single();
        
        if (userData.karma_status === 'restricted' || userData.karma_status === 'unstable') {
            throw new Error(t('error_low_karma', 'Your karma is too low to create groups'));
        }
        
        // Check account age
        const accountAge = Date.now() - new Date(userData.created_at).getTime();
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreation < MIN_ACCOUNT_AGE_DAYS) {
            throw new Error(t('error_account_too_new', 'Your account must be at least {days} days old', { days: MIN_ACCOUNT_AGE_DAYS }));
        }
        
        // Check group limit
        const { count } = await supabaseClient
            .from('groups')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.id);
        
        if (count >= MAX_GROUPS_PER_USER) {
            throw new Error(t('error_group_limit', 'You can only create {max} groups', { max: MAX_GROUPS_PER_USER }));
        }
        
        // Upload icon if provided
        let iconUrl = null;
        if (iconFile) {
            const { uploadImage } = await import('./supabaseClient.js');
            iconUrl = await uploadImage(iconFile, `groups/${name}`);
        }
        
        // Create group
        const { data, error } = await supabaseClient
            .from('groups')
            .insert([{
                name: name,
                display_name: displayName,
                description: description,
                icon_url: iconUrl,
                owner_id: user.id,
                is_private: true
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Add owner as member with owner role
        await supabaseClient
            .from('group_members')
            .insert([{
                group_id: data.id,
                user_id: user.id,
                role: 'owner'
            }]);
        
        // Set cooldown
        await setCooldown('create_group', 3600); // 1 hour
        
        return data;
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
}

// Get group info
async function getGroup(groupId) {
    try {
        const { data, error } = await supabaseClient
            .from('groups')
            .select(`
                *,
                owner:owner_id (
                    id,
                    nickname,
                    avatar_url
                )
            `)
            .eq('id', groupId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching group:', error);
        throw error;
    }
}

// Request to join group
async function requestJoinGroup(groupId, message = '') {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_not_logged_in'));
        }
        
        // Check cooldown
        const canRequest = await checkCooldown('join_group');
        if (!canRequest) {
            throw new Error(t('error_cooldown'));
        }
        
        // Check if already member
        const { data: existing } = await supabaseClient
            .from('group_members')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (existing) {
            throw new Error(t('error_already_member', 'You are already a member'));
        }
        
        // Check existing request
        const { data: existingRequest } = await supabaseClient
            .from('group_requests')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (existingRequest && existingRequest.status === 'pending') {
            throw new Error(t('error_pending_request', 'You already have a pending request'));
        }
        
        // Create request
        const { data, error } = await supabaseClient
            .from('group_requests')
            .insert([{
                group_id: groupId,
                user_id: user.id,
                message: message,
                status: 'pending'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Set cooldown based on karma
        const { data: userData } = await supabaseClient
            .from('users')
            .select('karma_status')
            .eq('id', user.id)
            .single();
        
        const cooldowns = {
            'trusted': 10,
            'neutral': 60,
            'unstable': 300,
            'restricted': 600
        };
        
        await setCooldown('join_group', cooldowns[userData.karma_status] || 60);
        
        return data;
    } catch (error) {
        console.error('Error requesting to join group:', error);
        throw error;
    }
}

// Approve join request (owner/admin only)
async function approveJoinRequest(requestId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_not_logged_in'));
        }
        
        // Get request
        const { data: request } = await supabaseClient
            .from('group_requests')
            .select('*, group:group_id(*)')
            .eq('id', requestId)
            .single();
        
        if (!request) {
            throw new Error(t('error_request_not_found'));
        }
        
        // Check permissions
        const { data: membership } = await supabaseClient
            .from('group_members')
            .select('role')
            .eq('group_id', request.group_id)
            .eq('user_id', user.id)
            .single();
        
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            throw new Error(t('error_no_permission'));
        }
        
        // Add member
        await supabaseClient
            .from('group_members')
            .insert([{
                group_id: request.group_id,
                user_id: request.user_id,
                role: 'member'
            }]);
        
        // Update request
        await supabaseClient
            .from('group_requests')
            .update({
                status: 'approved',
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        return true;
    } catch (error) {
        console.error('Error approving request:', error);
        throw error;
    }
}

// Get group members
async function getGroupMembers(groupId) {
    try {
        const { data, error } = await supabaseClient
            .from('group_members')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname,
                    avatar_url,
                    karma_status,
                    global_role
                )
            `)
            .eq('group_id', groupId)
            .order('role', { ascending: true });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching group members:', error);
        throw error;
    }
}

// Change user role in group
async function setGroupRole(groupId, userId, newRole) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_not_logged_in'));
        }
        
        // Check permissions
        const { data: myMembership } = await supabaseClient
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();
        
        if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
            throw new Error(t('error_no_permission'));
        }
        
        // Can't change owner role
        const { data: targetMembership } = await supabaseClient
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();
        
        if (targetMembership.role === 'owner' && myMembership.role !== 'owner') {
            throw new Error(t('error_cannot_change_owner'));
        }
        
        // Update role
        const { error } = await supabaseClient
            .from('group_members')
            .update({ role: newRole })
            .eq('group_id', groupId)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        return true;
    } catch (error) {
        console.error('Error setting group role:', error);
        throw error;
    }
}

// Create board in group
async function createGroupBoard(groupId, name, displayName, description) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error(t('error_not_logged_in'));
        }
        
        // Validate name
        if (!/^[a-z0-9]+$/.test(name)) {
            throw new Error(t('error_invalid_board_name'));
        }
        
        // Check permissions
        const { data: membership } = await supabaseClient
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();
        
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            throw new Error(t('error_no_permission'));
        }
        
        // Create board
        const { data, error } = await supabaseClient
            .from('group_boards')
            .insert([{
                group_id: groupId,
                name: name,
                display_name: displayName,
                description: description
            }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating group board:', error);
        throw error;
    }
}

export {
    createGroup,
    getGroup,
    requestJoinGroup,
    approveJoinRequest,
    getGroupMembers,
    setGroupRole,
    createGroupBoard
};
