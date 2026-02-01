// boards.js - Boards Management Module

import { supabaseClient, uploadImage } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

// ═══════════════════════════════════════════════════════
// BOARD DEFINITIONS  (NSFW boards removed, 16 new added)
// ═══════════════════════════════════════════════════════
const BOARDS = {
    // ─── Art ────────────────────────────────────────────
    art:   { name: '/art/',   title: 'Art',           category: 'Art' },
    lit:   { name: '/lit/',   title: 'Literature',    category: 'Art' },
    po:    { name: '/po/',    title: 'Poetry',        category: 'Art' },
    mu:    { name: '/mu/',    title: 'Music',         category: 'Art' },
    diy:   { name: '/diy/',   title: 'DIY',           category: 'Art' },
    ph:    { name: '/ph/',    title: 'Photography',   category: 'Art' },
    craft: { name: '/craft/', title: 'Crafts',        category: 'Art' },          // NEW 🧵

    // ─── Chat ───────────────────────────────────────────
    b:    { name: '/b/',    title: 'Random',       category: 'Chat' },
    soc:  { name: '/soc/',  title: 'Social',       category: 'Chat' },
    chat: { name: '/chat/', title: 'Chat',         category: 'Chat' },
    news: { name: '/news/', title: 'News',         category: 'Chat' },
    int:  { name: '/int/',  title: 'International',category: 'Chat' },
    r9k:  { name: '/r9k/',  title: 'Robot9000',    category: 'Chat' },
    meme: { name: '/meme/', title: 'Memes',        category: 'Chat' },          // NEW 😂

    // ─── Furry / Anime ──────────────────────────────────
    fur: { name: '/fur/', title: 'Furry',         category: 'Furry/Anime' },
    a:   { name: '/a/',   title: 'Anime',         category: 'Furry/Anime' },
    vn:  { name: '/vn/',  title: 'Visual Novels', category: 'Furry/Anime' },
    cm:  { name: '/cm/',  title: 'Cute Male',     category: 'Furry/Anime' },
    c:   { name: '/c/',   title: 'Cute',          category: 'Furry/Anime' },

    // ─── Games ──────────────────────────────────────────
    vg:      { name: '/vg/',      title: 'Video Games',  category: 'Games' },
    tg:      { name: '/tg/',      title: 'Board Games',  category: 'Games' },
    vr:      { name: '/vr/',      title: 'VR',           category: 'Games' },
    vm:      { name: '/vm/',      title: 'Retro Games',  category: 'Games' },
    tv:      { name: '/tv/',      title: 'TV & Movies',  category: 'Games' },
    co:      { name: '/co/',      title: 'Comics',       category: 'Games' },
    esports: { name: '/esports/', title: 'Esports',      category: 'Games' },    // NEW 🏆

    // ─── IT & Science ───────────────────────────────────
    g:      { name: '/g/',      title: 'Technology',     category: 'IT' },
    pr:     { name: '/pr/',     title: 'Programming',    category: 'IT' },
    sci:    { name: '/sci/',    title: 'Science',        category: 'IT' },
    wsr:    { name: '/wsr/',    title: 'Help',           category: 'IT' },
    3:      { name: '/3/',      title: '3D Printing',    category: 'IT' },
    cyber:  { name: '/cyber/',  title: 'Cybersecurity',  category: 'IT' },       // NEW 🔒
    ai:     { name: '/ai/',     title: 'AI',             category: 'IT' },       // NEW 🤖
    crypto: { name: '/crypto/', title: 'Crypto',         category: 'IT' },       // NEW 💎

    // ─── About Life ─────────────────────────────────────
    fit:    { name: '/fit/',    title: 'Fitness',      category: 'About Life' },
    ck:     { name: '/ck/',     title: 'Cooking',      category: 'About Life' },
    fa:     { name: '/fa/',     title: 'Fashion',      category: 'About Life' },
    adv:    { name: '/adv/',    title: 'Advice',       category: 'About Life' },
    trv:    { name: '/trv/',    title: 'Travel',       category: 'About Life' },
    out:    { name: '/out/',    title: 'Outdoors',     category: 'About Life' },
    mental: { name: '/mental/', title: 'Mental Health',category: 'About Life' }, // NEW 🧠

    // ─── Hobby ──────────────────────────────────────────
    sp:    { name: '/sp/',    title: 'Sports',       category: 'Hobby' },
    auto:  { name: '/auto/',  title: 'Automobiles',  category: 'Hobby' },
    an:    { name: '/an/',    title: 'Animals',      category: 'Hobby' },
    his:   { name: '/his/',   title: 'History',      category: 'Hobby' },
    p:     { name: '/p/',     title: 'Photography',  category: 'Hobby' },
    music: { name: '/music/', title: 'Music Fans',   category: 'Hobby' },       // NEW 🎵

    // ─── Society (NEW category) ─────────────────────────
    pol:   { name: '/pol/',   title: 'Politics',     category: 'Society' },     // NEW 🗳️
    phil:  { name: '/phil/',  title: 'Philosophy',   category: 'Society' },     // NEW 🤔
    edu:   { name: '/edu/',   title: 'Education',    category: 'Society' },     // NEW 📚
    eco:   { name: '/eco/',   title: 'Economy',      category: 'Society' },     // NEW 📈
    world: { name: '/world/', title: 'World',        category: 'Society' },     // NEW 🌍
    lang:  { name: '/lang/',  title: 'Languages',    category: 'Society' }      // NEW 🗣️
};

// ─── Public API ─────────────────────────────────────────────────
function getBoardInfo(boardId) {
    return BOARDS[boardId] || null;
}

function getAllBoards() {
    return BOARDS;
}

// ─── Load threads for a board ────────────────────────────────────
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

        if (error) throw error;

        const threadsWithCounts = await Promise.all(data.map(async (thread) => {
            const { count } = await supabaseClient
                .from('replies')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', thread.id);

            thread.reply_count = count || 0;

            if (thread.user && thread.user.id) {
                const { generateUserHash } = await import('./auth.js');
                thread.user.profile_hash = generateUserHash(thread.user.id);
            }

            return thread;
        }));

        return threadsWithCounts || [];
    } catch (error) {
        console.error('Ошибка загрузки тредов:', error);
        throw error;
    }
}

// ─── Create thread ───────────────────────────────────────────────
async function createThread(boardId, title, content, imageFile, isAnonymous = false) {
    try {
        const user = await getCurrentUser();

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

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка создания треда:', error);
        throw error;
    }
}

// ─── View counter ────────────────────────────────────────────────
async function incrementViewCount(threadId) {
    try {
        const { data: thread } = await supabaseClient
            .from('threads')
            .select('views')
            .eq('id', threadId)
            .single();

        if (!thread) return;

        const viewedKey = `viewed_thread_${threadId}`;
        if (sessionStorage.getItem(viewedKey)) return;

        const { error } = await supabaseClient
            .from('threads')
            .update({ views: (thread.views || 0) + 1 })
            .eq('id', threadId);

        if (!error) sessionStorage.setItem(viewedKey, 'true');
    } catch (error) {
        console.error('Error incrementing view count:', error);
    }
}

// ─── Bump thread ─────────────────────────────────────────────────
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

// ─── Popular boards (excludes removed NSFW boards) ──────────────
async function getPopularBoards(limit = 7) {
    try {
        const { data: threadStats, error } = await supabaseClient
            .from('threads')
            .select('board');

        if (error) throw error;

        // Filter out any leftover NSFW boards that might still exist in DB
        const BLOCKED = new Set(['e', 'h', 'gif']);

        const boardCounts = {};
        threadStats.forEach(thread => {
            if (BLOCKED.has(thread.board)) return; // skip NSFW
            if (!boardCounts[thread.board]) {
                boardCounts[thread.board] = { board: thread.board, thread_count: 0, reply_count: 0 };
            }
            boardCounts[thread.board].thread_count++;
        });

        for (const boardId in boardCounts) {
            const { data: threads } = await supabaseClient
                .from('threads')
                .select('id')
                .eq('board', boardId);

            if (threads && threads.length > 0) {
                const threadIds = threads.map(t => t.id);
                const { count } = await supabaseClient
                    .from('replies')
                    .select('*', { count: 'exact', head: true })
                    .in('thread_id', threadIds);
                boardCounts[boardId].reply_count = count || 0;
            }
        }

        return Object.values(boardCounts)
            .map(stat => ({
                ...stat,
                activity_score: stat.thread_count + (stat.reply_count * 0.5),
                name: BOARDS[stat.board]?.name || `/${stat.board}/`
            }))
            .sort((a, b) => b.activity_score - a.activity_score)
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting popular boards:', error);
        return null;
    }
}

export {
    BOARDS,
    getBoardInfo,
    getAllBoards,
    loadBoardThreads,
    createThread,
    incrementViewCount,
    bumpThread,
    getPopularBoards
};
