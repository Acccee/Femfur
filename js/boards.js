import { supabaseClient } from './supabaseClient.js';

// Board definitions
const BOARDS = {
    // Art & Creative
    art: { name: '/art/', title: 'Artwork & Drawings', desc: 'Share and discuss artwork' },
    lit: { name: '/lit/', title: 'Literature & Stories', desc: 'Books, stories, and creative writing' },
    po: { name: '/po/', title: 'Poetry', desc: 'Poetry and poetic discussion' },
    mu: { name: '/mu/', title: 'Music', desc: 'Music discussion and sharing' },
    diy: { name: '/diy/', title: 'DIY & Crafts', desc: 'Do it yourself projects' },
    ph: { name: '/ph/', title: 'Photography', desc: 'Photography and techniques' },
    
    // Discussion
    b: { name: '/b/', title: 'Random', desc: 'Random discussions' },
    soc: { name: '/soc/', title: 'Social', desc: 'Social discussion' },
    chat: { name: '/chat/', title: 'General Chat', desc: 'General discussion' },
    news: { name: '/news/', title: 'News & Current Events', desc: 'News and current events' },
    int: { name: '/int/', title: 'International', desc: 'International discussion' },
    r9k: { name: '/r9k/', title: 'Robot9000', desc: 'Original content only' },
    
    // Furry & Anime
    fur: { name: '/fur/', title: 'Furry', desc: 'Furry art and discussion' },
    a: { name: '/a/', title: 'Anime & Manga', desc: 'Anime and manga discussion' },
    vn: { name: '/vn/', title: 'Visual Novels', desc: 'Visual novel discussion' },
    cm: { name: '/cm/', title: 'Cute Male', desc: 'Cute male characters' },
    c: { name: '/c/', title: 'Cute', desc: 'Cute characters and art' },
    
    // Games & Entertainment
    vg: { name: '/vg/', title: 'Video Games', desc: 'Video game discussion' },
    tg: { name: '/tg/', title: 'Tabletop Games', desc: 'Board games and RPGs' },
    vr: { name: '/vr/', title: 'Virtual Reality', desc: 'VR discussion' },
    vm: { name: '/vm/', title: 'Retro Games', desc: 'Retro gaming' },
    tv: { name: '/tv/', title: 'TV & Film', desc: 'Television and movies' },
    co: { name: '/co/', title: 'Comics & Cartoons', desc: 'Comics and animated content' },
    
    // Technology
    g: { name: '/g/', title: 'Technology', desc: 'Technology discussion' },
    pr: { name: '/pr/', title: 'Programming', desc: 'Programming and development' },
    sci: { name: '/sci/', title: 'Science', desc: 'Science and mathematics' },
    wsr: { name: '/wsr/', title: 'Tech Support', desc: 'Tech support and help' },
    3: { name: '/3/', title: '3D Printing', desc: '3D printing discussion' },
    
    // Lifestyle
    fit: { name: '/fit/', title: 'Fitness & Health', desc: 'Fitness and health discussion' },
    ck: { name: '/ck/', title: 'Food & Cooking', desc: 'Food and cooking' },
    fa: { name: '/fa/', title: 'Fashion', desc: 'Fashion discussion' },
    adv: { name: '/adv/', title: 'Advice', desc: 'Advice and support' },
    trv: { name: '/trv/', title: 'Travel', desc: 'Travel discussion' },
    out: { name: '/out/', title: 'Outdoors', desc: 'Outdoor activities' },
    
    // Hobbies
    sp: { name: '/sp/', title: 'Sports', desc: 'Sports discussion' },
    auto: { name: '/auto/', title: 'Automobiles', desc: 'Cars and vehicles' },
    an: { name: '/an/', title: 'Animals & Nature', desc: 'Animals and nature' },
    his: { name: '/his/', title: 'History', desc: 'History discussion' },
    p: { name: '/p/', title: 'Photography', desc: 'Photography' },
    
    // Adult (18+)
    e: { name: '/e/', title: 'Ecchi (18+)', desc: 'Ecchi content' },
    h: { name: '/h/', title: 'Hentai (18+)', desc: 'Hentai content' },
    gif: { name: '/gif/', title: 'Adult GIF (18+)', desc: 'Adult animated content' }
};

// Get board info
function getBoardInfo(boardId) {
    return BOARDS[boardId] || null;
}

// Get all boards
function getAllBoards() {
    return BOARDS;
}

// Load threads from board
async function loadBoardThreads(boardId) {
    try {
        const { data, error } = await supabaseClient
            .from('threads')
            .select('*')
            .eq('board', boardId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error loading threads:', error);
        throw error;
    }
}

// Create new thread
async function createThread(boardId, subject, comment, imageUrl) {
    try {
        const { data, error } = await supabaseClient
            .from('threads')
            .insert([{
                board: boardId,
                subject: subject || '',
                comment: comment,
                image_url: imageUrl || null
            }])
            .select();
        
        if (error) throw error;
        
        return data[0];
    } catch (error) {
        console.error('Error creating thread:', error);
        throw error;
    }
}

export {
    BOARDS,
    getBoardInfo,
    getAllBoards,
    loadBoardThreads,
    createThread
};
