// groups-system.js - Complete Groups System
//
// Features:
// - Create/manage user groups
// - Custom boards within groups (up to 3)
// - Group roles (owner, moderator, member)
// - Public/private groups (with join requests)
// - 12 thematic tags
// - Group discovery and browsing

import { supabaseClient, uploadImage } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

// Available thematic tags
const GROUP_TAGS = [
    'art', 'gaming', 'music', 'tech', 'anime', 'furry',
    'creative', 'discussion', 'community', 'hobby', 'learning', 'fun'
];

// Group roles
const ROLES = {
    OWNER: 'owner',
    MODERATOR: 'moderator',
    MEMBER: 'member'
};

// ═══════════════════════════════════════════════════════════════
//  DATABASE SCHEMA (Reference - must be created in Supabase)
// ═══════════════════════════════════════════════════════════════
//
// Table: groups
// - id: uuid (PK)
// - name: text (unique)
// - description: text
// - banner_url: text
// - owner_id: uuid (FK -> users)
// - is_public: boolean
// - tags: text[] (array of tags)
// - created_at: timestamp
// - updated_at: timestamp
//
// Table: group_members
// - id: uuid (PK)
// - group_id: uuid (FK -> groups)
// - user_id: uuid (FK -> users)
// - role: text (owner/moderator/member)
// - joined_at: timestamp
//
// Table: group_boards
// - id: uuid (PK)
// - group_id: uuid (FK -> groups)
// - board_id: text (unique within group, max 10 chars)
// - board_name: text
// - description: text
// - created_at: timestamp
//
// Table: group_join_requests
// - id: uuid (PK)
// - group_id: uuid (FK -> groups)
// - user_id: uuid (FK -> users)
// - message: text
// - status: text (pending/approved/rejected)
// - created_at: timestamp

// ═══════════════════════════════════════════════════════════════
//  GROUP CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

async function createGroup(data) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t('error_login_required'));

        const { name, description, bannerFile, isPublic, tags, boards } = data;

        // Validate inputs
        if (!name || name.trim().length < 3) {
            throw new Error('Group name must be at least 3 characters');
        }

        if (!boards || boards.length === 0 || boards.length > 3) {
            throw new Error('Groups must have 1-3 boards');
        }

        // Check if name is unique
        const { data: existingGroup } = await supabaseClient
            .from('groups')
            .select('id')
            .eq('name', name.trim())
            .maybeSingle();

        if (existingGroup) {
            throw new Error('Group name already exists');
        }

        // Validate board IDs uniqueness
        const boardIds = boards.map(b => b.id.toLowerCase());
        if (new Set(boardIds).size !== boardIds.length) {
            throw new Error('Board IDs must be unique within the group');
        }

        // Check if board IDs conflict with site boards or other groups
        for (const boardId of boardIds) {
            const { data: existingBoard } = await supabaseClient
                .from('group_boards')
                .select('id')
                .eq('board_id', boardId)
                .maybeSingle();

            if (existingBoard) {
                throw new Error(`Board ID "${boardId}" is already taken`);
            }
        }

        // Upload banner if provided
        let bannerUrl = null;
        if (bannerFile) {
            bannerUrl = await uploadImage(bannerFile, 'group-banners');
        }

        // Create group
        const { data: newGroup, error: groupError } = await supabaseClient
            .from('groups')
            .insert({
                name: name.trim(),
                description: description?.trim() || '',
                banner_url: bannerUrl,
                owner_id: user.id,
                is_public: isPublic !== false,
                tags: tags || []
            })
            .select()
            .single();

        if (groupError) throw groupError;

        // Add owner as member
        const { error: memberError } = await supabaseClient
            .from('group_members')
            .insert({
                group_id: newGroup.id,
                user_id: user.id,
                role: ROLES.OWNER
            });

        if (memberError) throw memberError;

        // Create boards
        for (const board of boards) {
            const { error: boardError } = await supabaseClient
                .from('group_boards')
                .insert({
                    group_id: newGroup.id,
                    board_id: board.id.toLowerCase(),
                    board_name: board.name,
                    description: board.description || ''
                });

            if (boardError) throw boardError;
        }

        return newGroup;
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
}

async function updateGroup(groupId, updates) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t('error_login_required'));

        // Check if user is owner
        const member = await getGroupMember(groupId, user.id);
        if (!member || member.role !== ROLES.OWNER) {
            throw new Error('Only group owner can update settings');
        }

        const { error } = await supabaseClient
            .from('groups')
            .update(updates)
            .eq('id', groupId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error updating group:', error);
        throw error;
    }
}

async function deleteGroup(groupId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t('error_login_required'));

        // Check if user is owner
        const member = await getGroupMember(groupId, user.id);
        if (!member || member.role !== ROLES.OWNER) {
            throw new Error('Only group owner can delete the group');
        }

        // Delete all related data (boards, members, threads, etc.)
        const { error } = await supabaseClient
            .from('groups')
            .delete()
            .eq('id', groupId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting group:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
//  GROUP DISCOVERY & BROWSING
// ═══════════════════════════════════════════════════════════════

async function getAllGroups(filters = {}) {
    try {
        let query = supabaseClient
            .from('groups')
            .select(`
                *,
                owner:owner_id (
                    id,
                    nickname
                ),
                member_count:group_members(count)
            `)
            .order('created_at', { ascending: false });

        if (filters.tag) {
            query = query.contains('tags', [filters.tag]);
        }

        if (filters.isPublic !== undefined) {
            query = query.eq('is_public', filters.isPublic);
        }

        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error loading groups:', error);
        return [];
    }
}

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
                ),
                boards:group_boards (
                    id,
                    board_id,
                    board_name,
                    description
                )
            `)
            .eq('id', groupId)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error loading group:', error);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
//  MEMBERSHIP MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function getGroupMember(groupId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('group_members')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error getting member:', error);
        return null;
    }
}

async function getGroupMembers(groupId) {
    try {
        const { data, error } = await supabaseClient
            .from('group_members')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname,
                    avatar_url
                )
            `)
            .eq('group_id', groupId)
            .order('role', { ascending: true })
            .order('joined_at', { ascending: true });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error loading members:', error);
        return [];
    }
}

async function joinGroup(groupId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t('error_login_required'));

        const group = await getGroup(groupId);
        if (!group) throw new Error('Group not found');

        // Check if already a member
        const existingMember = await getGroupMember(groupId, user.id);
        if (existingMember) {
            throw new Error('Already a member of this group');
        }

        if (group.is_public) {
            // Join directly
            const { error } = await supabaseClient
                .from('group_members')
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    role: ROLES.MEMBER
                });

            if (error) throw error;

            return { joined: true };
        } else {
            // Create join request
            const { error } = await supabaseClient
                .from('group_join_requests')
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    status: 'pending'
                });

            if (error) throw error;

            return { requested: true };
        }
    } catch (error) {
        console.error('Error joining group:', error);
        throw error;
    }
}

async function leaveGroup(groupId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t('error_login_required'));

        // Check if owner
        const member = await getGroupMember(groupId, user.id);
        if (member && member.role === ROLES.OWNER) {
            throw new Error('Group owner cannot leave. Transfer ownership or delete the group.');
        }

        const { error } = await supabaseClient
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error leaving group:', error);
        throw error;
    }
}

async function updateMemberRole(groupId, userId, newRole) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t('error_login_required'));

        // Check if current user is owner
        const currentMember = await getGroupMember(groupId, user.id);
        if (!currentMember || currentMember.role !== ROLES.OWNER) {
            throw new Error('Only group owner can change roles');
        }

        // Cannot change owner role
        const targetMember = await getGroupMember(groupId, userId);
        if (targetMember && targetMember.role === ROLES.OWNER) {
            throw new Error('Cannot change owner role');
        }

        const { error } = await supabaseClient
            .from('group_members')
            .update({ role: newRole })
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error updating role:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
//  JOIN REQUESTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function getJoinRequests(groupId) {
    try {
        const { data, error } = await supabaseClient
            .from('group_join_requests')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname,
                    avatar_url
                )
            `)
            .eq('group_id', groupId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error loading join requests:', error);
        return [];
    }
}

async function approveJoinRequest(requestId, groupId, userId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t('error_login_required'));

        // Check if current user is owner or moderator
        const member = await getGroupMember(groupId, user.id);
        if (!member || (member.role !== ROLES.OWNER && member.role !== ROLES.MODERATOR)) {
            throw new Error('Only owners and moderators can approve requests');
        }

        // Add user to group
        const { error: memberError } = await supabaseClient
            .from('group_members')
            .insert({
                group_id: groupId,
                user_id: userId,
                role: ROLES.MEMBER
            });

        if (memberError) throw memberError;

        // Update request status
        const { error: requestError } = await supabaseClient
            .from('group_join_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        if (requestError) throw requestError;

        return true;
    } catch (error) {
        console.error('Error approving request:', error);
        throw error;
    }
}

async function rejectJoinRequest(requestId) {
    try {
        const { error } = await supabaseClient
            .from('group_join_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error rejecting request:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
//  UI RENDERING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function renderGroupCard(group) {
    const bannerStyle = group.banner_url
        ? `background-image: url('${group.banner_url}'); background-size: cover; background-position: center;`
        : 'background: linear-gradient(135deg, #af0a0f, #d6daf0);';

    const tagsHtml = (group.tags || []).map(tag => 
        `<span class="group-tag">${tag}</span>`
    ).join('');

    const memberCount = group.member_count?.[0]?.count || 0;

    return `
        <div class="group-card" data-group-id="${group.id}">
            <div class="group-banner" style="${bannerStyle}"></div>
            <div class="group-info">
                <h3>${escapeHtml(group.name)}</h3>
                <p class="group-description">${escapeHtml(group.description || '')}</p>
                <div class="group-tags">${tagsHtml}</div>
                <div class="group-meta">
                    <span>👥 ${memberCount} ${t('members', 'members')}</span>
                    <span>${group.is_public ? '🌐 ' + t('public', 'Public') : '🔒 ' + t('private', 'Private')}</span>
                </div>
                <button class="btn-secondary view-group-btn" data-group-id="${group.id}">
                    ${t('view_group', 'View Group')}
                </button>
            </div>
        </div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export {
    GROUP_TAGS,
    ROLES,
    createGroup,
    updateGroup,
    deleteGroup,
    getAllGroups,
    getGroup,
    getGroupMember,
    getGroupMembers,
    joinGroup,
    leaveGroup,
    updateMemberRole,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    renderGroupCard
};
