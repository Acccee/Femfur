// widgets.js - Widget Module for Homepage

import { supabaseClient } from './supabaseClient.js';
import { t } from './i18n.js';

// Get Thread of the Day
async function getThreadOfDay() {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const { data, error } = await supabaseClient
            .from('threads')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname
                )
            `)
            .gte('created_at', oneDayAgo.toISOString())
            .order('views', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            // Get reply count
            const { count } = await supabaseClient
                .from('replies')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', data[0].id);
            
            data[0].reply_count = count || 0;
            data[0].score = (data[0].views || 0) + (count || 0) * 2;
            return data[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error getting thread of the day:', error);
        return null;
    }
}

// Get Thread of the Week
async function getThreadOfWeek() {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const { data, error } = await supabaseClient
            .from('threads')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname
                )
            `)
            .gte('created_at', oneWeekAgo.toISOString())
            .order('views', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            // Get reply count
            const { count } = await supabaseClient
                .from('replies')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', data[0].id);
            
            data[0].reply_count = count || 0;
            data[0].score = (data[0].views || 0) + (count || 0) * 2;
            return data[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error getting thread of the week:', error);
        return null;
    }
}

// Get Recent Threads
async function getRecentThreads(limit = 10) {
    try {
        const { data, error } = await supabaseClient
            .from('threads')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        // Get reply counts
        const threadsWithCounts = await Promise.all(data.map(async (thread) => {
            const { count } = await supabaseClient
                .from('replies')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', thread.id);
            
            thread.reply_count = count || 0;
            return thread;
        }));
        
        return threadsWithCounts;
    } catch (error) {
        console.error('Error getting recent threads:', error);
        return [];
    }
}

// Render thread widget item
function renderThreadWidget(thread, containerId) {
    if (!thread) {
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state">${t('no_threads')}</div>
        `;
        return;
    }
    
    const author = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
    const boardName = thread.board ? `/${thread.board}/` : '';
    
    const html = `
        <div class="widget-thread-item" onclick="window.location.hash='${thread.board}-${thread.id}'">
            <h4>${escapeHtml(thread.title)}</h4>
            <div class="meta">
                <span>${boardName}</span> • 
                <span>${author}</span> • 
                <span>${formatDate(thread.created_at)}</span>
            </div>
            <div class="stats">
                👁 ${thread.views || 0} ${t('views')} • 
                💬 ${thread.reply_count || 0} ${t('replies')}
            </div>
        </div>
    `;
    
    document.getElementById(containerId).innerHTML = html;
}

// Render recent threads list
function renderRecentThreadsList(threads, containerId) {
    const container = document.getElementById(containerId);
    
    if (!threads || threads.length === 0) {
        container.innerHTML = `<div class="empty-state">${t('no_threads')}</div>`;
        return;
    }
    
    const html = threads.map(thread => {
        const author = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
        const boardName = thread.board ? `/${thread.board}/` : '';
        
        return `
            <div class="widget-thread-item" onclick="window.location.hash='${thread.board}-${thread.id}'">
                <h4>${escapeHtml(thread.title)}</h4>
                <div class="meta">
                    <span>${boardName}</span> • 
                    <span>${author}</span> • 
                    <span>${formatDate(thread.created_at)}</span>
                </div>
                <div class="stats">
                    👁 ${thread.views || 0} • 💬 ${thread.reply_count || 0}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Initialize all widgets
async function initializeWidgets() {
    // Thread of the Day
    const threadOfDay = await getThreadOfDay();
    renderThreadWidget(threadOfDay, 'threadOfDayContent');
    
    // Thread of the Week
    const threadOfWeek = await getThreadOfWeek();
    renderThreadWidget(threadOfWeek, 'threadOfWeekContent');
    
    // Recent Threads
    const recentThreads = await getRecentThreads(10);
    renderRecentThreadsList(recentThreads, 'recentThreadsContent');
}

// Helper: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return t('justNow', 'just now');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export { initializeWidgets, getThreadOfDay, getThreadOfWeek, getRecentThreads };
