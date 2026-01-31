// groups-complete.js - ПОЛНАЯ система групп

import { supabaseClient, uploadImage } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

const MAX_BOARDS_PER_GROUP = 3;
const MAX_OWNED_GROUPS = 1;
const MAX_MEMBER_GROUPS = 4;

// Создание группы
async function createGroup(name, displayName, description, avatarFile, bannerFile) {
    const user = await getCurrentUser();
    if (!user) throw new Error(t('error_not_logged_in'));
    
    // Проверка лимита владения
    const { count } = await supabaseClient
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);
    
    if (count >= MAX_OWNED_GROUPS) {
        throw new Error(t('error_max_owned_groups', `You can only own ${MAX_OWNED_GROUPS} group`));
    }
    
    // Валидация имени
    if (!/^[a-z0-9_]{3,50}$/.test(name)) {
        throw new Error(t('error_invalid_group_name', 'Group name: 3-50 chars, lowercase, numbers, _ only'));
    }
    
    let avatarUrl = null, bannerUrl = null;
    
    if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile, `groups/${name}/avatar`);
    }
    
    if (bannerFile) {
        bannerUrl = await uploadImage(bannerFile, `groups/${name}/banner`);
    }
    
    const { data, error } = await supabaseClient
        .from('groups')
        .insert([{
            name, display_name: displayName, description,
            avatar_url: avatarUrl, banner_url: bannerUrl,
            owner_id: user.id
        }])
        .select()
        .single();
    
    if (error) throw error;
    
    // Добавить владельца как участника
    await supabaseClient
        .from('group_members')
        .insert([{ group_id: data.id, user_id: user.id, role: 'owner' }]);
    
    return data;
}

// Создание борда в группе
async function createGroupBoard(groupId, name, displayName, description) {
    const user = await getCurrentUser();
    if (!user) throw new Error(t('error_not_logged_in'));
    
    // Проверка прав
    const { data: membership } = await supabaseClient
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
    
    if (!membership || membership.role !== 'owner') {
        throw new Error(t('error_no_permission'));
    }
    
    // Проверка лимита бордов
    const { data: group } = await supabaseClient
        .from('groups')
        .select('board_count')
        .eq('id', groupId)
        .single();
    
    if (group.board_count >= MAX_BOARDS_PER_GROUP) {
        throw new Error(t('error_max_boards', `Max ${MAX_BOARDS_PER_GROUP} boards per group`));
    }
    
    // Валидация имени
    if (!/^[a-z0-9]{2,20}$/.test(name)) {
        throw new Error(t('error_invalid_board_name'));
    }
    
    const { data, error } = await supabaseClient
        .from('group_boards')
        .insert([{ group_id: groupId, name, display_name: displayName, description }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Вступление в группу
async function joinGroup(groupId) {
    const user = await getCurrentUser();
    if (!user) throw new Error(t('error_not_logged_in'));
    
    // Проверка лимита участия
    const { data: userData } = await supabaseClient
        .from('users')
        .select('member_groups_count')
        .eq('id', user.id)
        .single();
    
    if (userData.member_groups_count >= MAX_MEMBER_GROUPS) {
        throw new Error(t('error_max_member_groups', `You can join max ${MAX_MEMBER_GROUPS} groups`));
    }
    
    const { error } = await supabaseClient
        .from('group_members')
        .insert([{ group_id: groupId, user_id: user.id, role: 'member' }]);
    
    if (error) throw error;
    return true;
}

// Получить группу
async function getGroup(groupId) {
    const { data, error } = await supabaseClient
        .from('groups')
        .select(`
            *,
            owner:owner_id (id, nickname, avatar_url)
        `)
        .eq('id', groupId)
        .single();
    
    if (error) throw error;
    return data;
}

// Получить борды группы
async function getGroupBoards(groupId) {
    const { data, error } = await supabaseClient
        .from('group_boards')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
}

// Получить участников
async function getGroupMembers(groupId) {
    const { data, error } = await supabaseClient
        .from('group_members')
        .select(`
            *,
            user:user_id (id, nickname, avatar_url, global_role)
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: true });
    
    if (error) throw error;
    return data;
}

// Обновить группу (аватар, баннер, описание)
async function updateGroup(groupId, updates) {
    const user = await getCurrentUser();
    if (!user) throw new Error(t('error_not_logged_in'));
    
    const { data, error } = await supabaseClient
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .eq('owner_id', user.id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export {
    createGroup,
    createGroupBoard,
    joinGroup,
    getGroup,
    getGroupBoards,
    getGroupMembers,
    updateGroup,
    MAX_BOARDS_PER_GROUP,
    MAX_OWNED_GROUPS,
    MAX_MEMBER_GROUPS
};
