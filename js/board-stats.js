// board-stats.js - Board Statistics Module

import { supabaseClient } from './supabaseClient.js';
import { t } from './i18n.js';

// Get board statistics
async function getBoardStats(boardId) {
    try {
        // Get thread count
        const { count: threadCount } = await supabaseClient
            .from('threads')
            .select('*', { count: 'exact', head: true })
            .eq('board', boardId);
        
        // Get all thread IDs for this board
        const { data: threads } = await supabaseClient
            .from('threads')
            .select('id, views')
            .eq('board', boardId);
        
        if (!threads || threads.length === 0) {
            return {
                threadCount: 0,
                replyCount: 0,
                totalViews: 0,
                activeUsers: 0
            };
        }
        
        const threadIds = threads.map(t => t.id);
        const totalViews = threads.reduce((sum, t) => sum + (t.views || 0), 0);
        
        // Get reply count
        const { count: replyCount } = await supabaseClient
            .from('replies')
            .select('*', { count: 'exact', head: true })
            .in('thread_id', threadIds);
        
        // Get unique user count (approximate)
        const { data: uniqueAuthors } = await supabaseClient
            .from('threads')
            .select('user_id')
            .eq('board', boardId)
            .not('user_id', 'is', null);
        
        const uniqueUserIds = new Set(uniqueAuthors?.map(t => t.user_id) || []);
        
        return {
            threadCount: threadCount || 0,
            replyCount: replyCount || 0,
            totalViews: totalViews || 0,
            activeUsers: uniqueUserIds.size || 0
        };
    } catch (error) {
        console.error('Error getting board stats:', error);
        return {
            threadCount: 0,
            replyCount: 0,
            totalViews: 0,
            activeUsers: 0
        };
    }
}

// Render board statistics
function renderBoardStats(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="thread-statistics">
            <div class="stat-item">
                <div class="stat-value">${stats.threadCount}</div>
                <div class="stat-label">${t('threads', 'Threads')}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.replyCount}</div>
                <div class="stat-label">${t('replies', 'Replies')}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.totalViews}</div>
                <div class="stat-label">${t('views', 'Views')}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.activeUsers}</div>
                <div class="stat-label">${t('users', 'Users')}</div>
            </div>
        </div>
    `;
}

// Create statistics container
function createStatsContainer() {
    return '<div id="boardStats"></div>';
}

export { getBoardStats, renderBoardStats, createStatsContainer };
