// search.js - Search Module with Full-Text Search

import { supabaseClient } from './supabaseClient.js';
import { t } from './i18n.js';

// Search threads and replies
async function searchContent(query) {
    if (!query || query.trim().length === 0) {
        return { threads: [], replies: [] };
    }
    
    try {
        const searchQuery = query.trim().toLowerCase();
        
        // Search in threads (title and content)
        const { data: threadsData, error: threadsError } = await supabaseClient
            .from('threads')
            .select(`
                *,
                user:user_id (
                    id,
                    nickname
                )
            `)
            .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (threadsError) throw threadsError;
        
        // Search in replies
        const { data: repliesData, error: repliesError } = await supabaseClient
            .from('replies')
            .select(`
                *,
                thread:thread_id (
                    id,
                    board,
                    title
                ),
                user:user_id (
                    id,
                    nickname
                )
            `)
            .ilike('content', `%${searchQuery}%`)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (repliesError) throw repliesError;
        
        return {
            threads: threadsData || [],
            replies: repliesData || [],
            query: searchQuery
        };
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}

// Highlight search terms in text
function highlightSearchTerms(text, query) {
    if (!query || !text) return escapeHtml(text);
    
    const escapedText = escapeHtml(text);
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    
    let highlightedText = escapedText;
    terms.forEach(term => {
        const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape regex special characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Format date
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

// Render search results
function renderSearchResults(results, containerId) {
    const container = document.getElementById(containerId);
    
    if (!results || (results.threads.length === 0 && results.replies.length === 0)) {
        container.innerHTML = `
            <div class="empty-state">
                <p>${t('no_search_results', 'No results found')}</p>
                <p class="hint">${t('search_hint', 'Try different keywords or check your spelling')}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Threads section
    if (results.threads.length > 0) {
        html += `
            <div class="search-section">
                <h3>${t('threads_found', 'Threads')} (${results.threads.length})</h3>
                <div class="search-results-threads">
        `;
        
        results.threads.forEach(thread => {
            const author = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
            const boardName = `/${thread.board}/`;
            
            html += `
                <div class="search-result-item thread-result" data-thread-id="${thread.id}" data-board="${thread.board}">
                    <div class="search-result-header">
                        <h4>${highlightSearchTerms(thread.title, results.query)}</h4>
                        <span class="search-result-board">${boardName}</span>
                    </div>
                    <div class="search-result-content">
                        ${highlightSearchTerms(thread.content.substring(0, 200), results.query)}${thread.content.length > 200 ? '...' : ''}
                    </div>
                    <div class="search-result-meta">
                        <span>${author}</span> • 
                        <span>${formatDate(thread.created_at)}</span> • 
                        <span>👁 ${thread.views || 0}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Replies section
    if (results.replies.length > 0) {
        html += `
            <div class="search-section">
                <h3>${t('replies_found', 'Replies')} (${results.replies.length})</h3>
                <div class="search-results-replies">
        `;
        
        results.replies.forEach(reply => {
            const author = reply.is_anonymous ? t('anonymous') : (reply.user ? reply.user.nickname : t('anonymous'));
            const threadTitle = reply.thread ? reply.thread.title : 'Unknown Thread';
            const boardName = reply.thread ? `/${reply.thread.board}/` : '';
            
            html += `
                <div class="search-result-item reply-result" data-thread-id="${reply.thread_id}" data-board="${reply.thread.board}">
                    <div class="search-result-header">
                        <span class="search-result-type">Reply in:</span>
                        <h4>${escapeHtml(threadTitle)}</h4>
                        <span class="search-result-board">${boardName}</span>
                    </div>
                    <div class="search-result-content">
                        ${highlightSearchTerms(reply.content.substring(0, 200), results.query)}${reply.content.length > 200 ? '...' : ''}
                    </div>
                    <div class="search-result-meta">
                        <span>${author}</span> • 
                        <span>${formatDate(reply.created_at)}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.thread-result').forEach(item => {
        item.addEventListener('click', () => {
            const board = item.dataset.board;
            const threadId = item.dataset.threadId;
            window.location.hash = `${board}-${threadId}`;
        });
    });
    
    container.querySelectorAll('.reply-result').forEach(item => {
        item.addEventListener('click', () => {
            const board = item.dataset.board;
            const threadId = item.dataset.threadId;
            window.location.hash = `${board}-${threadId}`;
        });
    });
}

export { searchContent, highlightSearchTerms, renderSearchResults };
