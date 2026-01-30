// boards.js - Boards Management Module

import { supabaseClient, uploadImage } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

// Определение всех бордов
const BOARDS = {
    // Art
    art: { name: '/art/', title: 'Art', category: 'Art' },
    lit: { name: '/lit/', title: 'Literature', category: 'Art' },
    po: { name: '/po/', title: 'Poetry', category: 'Art' },
    mu: { name: '/mu/', title: 'Music', category: 'Art' },
    diy: { name: '/diy/', title: 'DIY', category: 'Art' },
    ph: { name: '/ph/', title: 'Photography', category: 'Art' },
    
    // Chat
    b: { name: '/b/', title: 'Random', category: 'Chat' },
    soc: { name: '/soc/', title: 'Social', category: 'Chat' },
    chat: { name: '/chat/', title: 'Chat', category: 'Chat' },
    news: { name: '/news/', title: 'News', category: 'Chat' },
    int: { name: '/int/', title: 'International', category: 'Chat' },
    r9k: { name: '/r9k/', title: 'Robot9000', category: 'Chat' },
    
    // Furry/Anime
    fur: { name: '/fur/', title: 'Furry', category: 'Furry/Anime' },
    a: { name: '/a/', title: 'Anime', category: 'Furry/Anime' },
    vn: { name: '/vn/', title: 'Visual Novels', category: 'Furry/Anime' },
    cm: { name: '/cm/', title: 'Cute Male', category: 'Furry/Anime' },
    c: { name: '/c/', title: 'Cute', category: 'Furry/Anime' },
    
    // Games
    vg: { name: '/vg/', title: 'Video Games', category: 'Games' },
    tg: { name: '/tg/', title: 'Board Games', category: 'Games' },
    vr: { name: '/vr/', title: 'VR', category: 'Games' },
    vm: { name: '/vm/', title: 'Retro Games', category: 'Games' },
    tv: { name: '/tv/', title: 'TV & Movies', category: 'Games' },
    co: { name: '/co/', title: 'Comics', category: 'Games' },
    
    // IT
    g: { name: '/g/', title: 'Technology', category: 'IT' },
    pr: { name: '/pr/', title: 'Programming', category: 'IT' },
    sci: { name: '/sci/', title: 'Science', category: 'IT' },
    wsr: { name: '/wsr/', title: 'Help', category: 'IT' },
    3: { name: '/3/', title: '3D Printing', category: 'IT' },
    
    // About live
    fit: { name: '/fit/', title: 'Fitness', category: 'About live' },
    ck: { name: '/ck/', title: 'Cooking', category: 'About live' },
    fa: { name: '/fa/', title: 'Fashion', category: 'About live' },
    adv: { name: '/adv/', title: 'Advice', category: 'About live' },
    trv: { name: '/trv/', title: 'Travel', category: 'About live' },
    out: { name: '/out/', title: 'Outdoors', category: 'About live' },
    
    // Hobby
    sp: { name: '/sp/', title: 'Sports', category: 'Hobby' },
    auto: { name: '/auto/', title: 'Automobiles', category: 'Hobby' },
    an: { name: '/an/', title: 'Animals', category: 'Hobby' },
    his: { name: '/his/', title: 'History', category: 'Hobby' },
    p: { name: '/p/', title: 'Photography', category: 'Hobby' },
    
    // Adult
    e: { name: '/e/', title: 'Ecchi (18+)', category: 'Adult' },
    h: { name: '/h/', title: 'Hentai (18+)', category: 'Adult' },
    gif: { name: '/gif/', title: 'Adult GIF (18+)', category: 'Adult' }
};

// Получить информацию о борде
function getBoardInfo(boardId) {
    return BOARDS[boardId] || null;
}

// Получить все борды
function getAllBoards() {
    return BOARDS;
}

// Загрузить треды борды из Supabase
async function loadBoardThreads(boardId) {
    try {
        const { data, error } = await supabaseClient
            .from('threads')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname,
                    avatar_url
                )
            `)
            .eq('board', boardId)
            .order('is_sticky', { ascending: false })
            .order('bumped_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        // Get reply counts for each thread
        const threadsWithCounts = await Promise.all(data.map(async (thread) => {
            const { count } = await supabaseClient
                .from('replies')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', thread.id);
            
            thread.reply_count = count || 0;
            return thread;
        }));
        
        return threadsWithCounts || [];
    } catch (error) {
        console.error('Ошибка загрузки тредов:', error);
        throw error;
    }
}

// Создать новый тред
async function createThread(boardId, title, content, imageFile, isAnonymous = false) {
    try {
        const user = await getCurrentUser();
        
        // Upload image if provided
        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImage(imageFile, `threads/${boardId}`);
        }
        
        const threadData = {
            board: boardId,
            title: title,
            content: content,
            image_url: imageUrl,
            is_anonymous: isAnonymous,
            user_id: user ? user.id : null,
            bumped_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient
            .from('threads')
            .insert([threadData])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка создания треда:', error);
        throw error;
    }
}

// Increment view counter (based on IP simulation)
async function incrementViewCount(threadId) {
    try {
        // Get current views
        const { data: thread } = await supabaseClient
            .from('threads')
            .select('views')
            .eq('id', threadId)
            .single();
        
        if (!thread) return;
        
        // Check if already viewed (simple sessionStorage check)
        const viewedKey = `viewed_thread_${threadId}`;
        if (sessionStorage.getItem(viewedKey)) {
            return;
        }
        
        // Increment view count
        const { error } = await supabaseClient
            .from('threads')
            .update({ views: (thread.views || 0) + 1 })
            .eq('id', threadId);
        
        if (!error) {
            sessionStorage.setItem(viewedKey, 'true');
        }
    } catch (error) {
        console.error('Error incrementing view count:', error);
    }
}

// Bump thread (move to top)
async function bumpThread(threadId) {
    try {
        const { error } = await supabaseClient
            .from('threads')
            .update({ bumped_at: new Date().toISOString() })
            .eq('id', threadId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error bumping thread:', error);
    }
}

export {
    BOARDS,
    getBoardInfo,
    getAllBoards,
    loadBoardThreads,
    createThread,
    incrementViewCount,
    bumpThread
};
