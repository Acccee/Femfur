import { supabaseClient } from './supabaseClient.js';

// Получить тред по ID
async function getThread(threadId) {
    try {
        const { data, error } = await supabaseClient
            .from('threads')
            .select('*')
            .eq('id', threadId)
            .single();
        
        if (error) {
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка загрузки треда:', error);
        throw error;
    }
}

// Получить все ответы треда
async function getThreadReplies(threadId) {
    try {
        const { data, error } = await supabaseClient
            .from('replies')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        return data || [];
    } catch (error) {
        console.error('Ошибка загрузки ответов:', error);
        throw error;
    }
}

// Создать ответ в треде
async function createReply(threadId, content) {
    try {
        const { data, error } = await supabaseClient
            .from('replies')
            .insert([
                {
                    thread_id: threadId,
                    content: content
                }
            ])
            .select();
        
        if (error) {
            throw error;
        }
        
        return data[0];
    } catch (error) {
        console.error('Ошибка создания ответа:', error);
        throw error;
    }
}

// Форматировать дату
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Меньше минуты
    if (diff < 60000) {
        return 'только что';
    }
    
    // Меньше часа
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} мин. назад`;
    }
    
    // Меньше дня
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} ч. назад`;
    }
    
    // Меньше недели
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} дн. назад`;
    }
    
    // Полная дата
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export {
    getThread,
    getThreadReplies,
    createReply,
    formatDate
};
