import { supabaseClient } from './supabaseClient.js';

// Определение всех бордов
const BOARDS = {
    // Art
    art: { name: '/art/', title: 'Искусство', category: 'Art' },
    lit: { name: '/lit/', title: 'Литература', category: 'Art' },
    po: { name: '/po/', title: 'Поэзия', category: 'Art' },
    mu: { name: '/mu/', title: 'Музыка', category: 'Art' },
    diy: { name: '/diy/', title: 'DIY', category: 'Art' },
    ph: { name: '/ph/', title: 'Фотография', category: 'Art' },
    
    // Chat
    b: { name: '/b/', title: 'Random', category: 'Chat' },
    soc: { name: '/soc/', title: 'Общение', category: 'Chat' },
    chat: { name: '/chat/', title: 'Чат', category: 'Chat' },
    news: { name: '/news/', title: 'Новости', category: 'Chat' },
    int: { name: '/int/', title: 'Международное', category: 'Chat' },
    r9k: { name: '/r9k/', title: 'Robot9000', category: 'Chat' },
    
    // Furry/Anime
    fur: { name: '/fur/', title: 'Furry', category: 'Furry/Anime' },
    a: { name: '/a/', title: 'Аниме', category: 'Furry/Anime' },
    vn: { name: '/vn/', title: 'Визуальные новеллы', category: 'Furry/Anime' },
    cm: { name: '/cm/', title: 'Cute Male', category: 'Furry/Anime' },
    c: { name: '/c/', title: 'Cute', category: 'Furry/Anime' },
    
    // Games
    vg: { name: '/vg/', title: 'Видеоигры', category: 'Games' },
    tg: { name: '/tg/', title: 'Настольные игры', category: 'Games' },
    vr: { name: '/vr/', title: 'VR', category: 'Games' },
    vm: { name: '/vm/', title: 'Ретро игры', category: 'Games' },
    tv: { name: '/tv/', title: 'ТВ и фильмы', category: 'Games' },
    co: { name: '/co/', title: 'Комиксы', category: 'Games' },
    
    // IT
    g: { name: '/g/', title: 'Технологии', category: 'IT' },
    pr: { name: '/pr/', title: 'Программирование', category: 'IT' },
    sci: { name: '/sci/', title: 'Наука', category: 'IT' },
    wsr: { name: '/wsr/', title: 'Помощь', category: 'IT' },
    3: { name: '/3/', title: '3D печать', category: 'IT' },
    
    // About live
    fit: { name: '/fit/', title: 'Фитнес', category: 'About live' },
    ck: { name: '/ck/', title: 'Кулинария', category: 'About live' },
    fa: { name: '/fa/', title: 'Мода', category: 'About live' },
    adv: { name: '/adv/', title: 'Советы', category: 'About live' },
    trv: { name: '/trv/', title: 'Путешествия', category: 'About live' },
    out: { name: '/out/', title: 'Природа', category: 'About live' },
    
    // Hobby
    sp: { name: '/sp/', title: 'Спорт', category: 'Hobby' },
    auto: { name: '/auto/', title: 'Автомобили', category: 'Hobby' },
    an: { name: '/an/', title: 'Животные', category: 'Hobby' },
    his: { name: '/his/', title: 'История', category: 'Hobby' },
    p: { name: '/p/', title: 'Фотография', category: 'Hobby' },
    
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
            .select('*')
            .eq('board', boardId)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        return data || [];
    } catch (error) {
        console.error('Ошибка загрузки тредов:', error);
        throw error;
    }
}

// Создать новый тред
async function createThread(boardId, title, content) {
    try {
        const { data, error } = await supabaseClient
            .from('threads')
            .insert([
                {
                    board: boardId,
                    title: title,
                    content: content
                }
            ])
            .select();
        
        if (error) {
            throw error;
        }
        
        return data[0];
    } catch (error) {
        console.error('Ошибка создания треда:', error);
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
