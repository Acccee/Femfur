// threads.js - Threads Module with Quote Support

import { supabaseClient, uploadImage } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { bumpThread } from './boards.js';
import { t } from './i18n.js';

// Получить тред по ID
async function getThread(threadId) {
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
            .select(`
                *,
                user:user_id (
                    id,
                    nickname,
                    avatar_url
                )
            `)
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
async function createReply(threadId, content, imageFile, isAnonymous = false) {
    try {
        const user = await getCurrentUser();
        
        // Upload image if provided
        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImage(imageFile, `replies/${threadId}`);
        }
        
        const replyData = {
            thread_id: threadId,
            content: content,
            image_url: imageUrl,
            is_anonymous: isAnonymous,
            user_id: user ? user.id : null
        };
        
        const { data, error } = await supabaseClient
            .from('replies')
            .insert([replyData])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Bump thread
        await bumpThread(threadId);
        
        return data;
    } catch (error) {
        console.error('Ошибка создания ответа:', error);
        throw error;
    }
}

// Format quote links in content
function formatQuotes(content) {
    // Replace >>number with clickable quote links
    return content.replace(/&gt;&gt;(\d+)/g, '<span class="thread-quote" data-reply-id="$1">&gt;&gt;$1</span>');
}

// Add quote to textarea
function addQuote(replyNumber) {
    const textarea = document.getElementById('replyText');
    const quote = `>>${replyNumber}\n`;
    
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        textarea.value = text.substring(0, start) + quote + text.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + quote.length;
        textarea.focus();
    }
}

// Форматировать дату
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Меньше минуты
    if (diff < 60000) {
        return t('justNow', 'just now');
    }
    
    // Меньше часа
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} ${t('minutesAgo', 'min ago')}`;
    }
    
    // Меньше дня
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} ${t('hoursAgo', 'h ago')}`;
    }
    
    // Меньше недели
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} ${t('daysAgo', 'd ago')}`;
    }
    
    // Полная дата
    return date.toLocaleDateString('en-US', {
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
    formatDate,
    formatQuotes,
    addQuote
};
