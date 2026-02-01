// board-filters.js - Board Filtering and Sorting Module

import { t } from './i18n.js';

// Create filter controls HTML
function createFilterControls() {
    return `
        <div class="board-filters">
            <div class="filter-group">
                <label for="sortBy">${t('sortBy', 'Sort by')}:</label>
                <select id="sortBy" class="filter-select">
                    <option value="bumped">${t('lastBumped', 'Last Bumped')}</option>
                    <option value="created">${t('newest', 'Newest')}</option>
                    <option value="replies">${t('mostReplies', 'Most Replies')}</option>
                    <option value="views">${t('mostViewed', 'Most Viewed')}</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="filterBy">${t('filterBy', 'Filter')}:</label>
                <select id="filterBy" class="filter-select">
                    <option value="all">${t('allThreads', 'All Threads')}</option>
                    <option value="withImages">${t('withImages', 'With Images')}</option>
                    <option value="noImages">${t('noImages', 'No Images')}</option>
                    <option value="active">${t('active', 'Active (5+ replies)')}</option>
                </select>
            </div>
            
            <div class="filter-group">
                <button id="refreshThreads" class="btn-secondary">
                    🔄 ${t('refresh', 'Refresh')}
                </button>
            </div>
        </div>
    `;
}

// Apply filters to threads array
function applyFilters(threads, filterBy) {
    switch (filterBy) {
        case 'withImages':
            return threads.filter(t => t.image_url);
        case 'noImages':
            return threads.filter(t => !t.image_url);
        case 'active':
            return threads.filter(t => (t.reply_count || 0) >= 5);
        default:
            return threads;
    }
}

// Apply sorting to threads array
function applySorting(threads, sortBy) {
    const sorted = [...threads];
    
    switch (sortBy) {
        case 'created':
            return sorted.sort((a, b) => {
                // Keep sticky threads at top
                if (a.is_sticky && !b.is_sticky) return -1;
                if (!a.is_sticky && b.is_sticky) return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
        case 'replies':
            return sorted.sort((a, b) => {
                if (a.is_sticky && !b.is_sticky) return -1;
                if (!a.is_sticky && b.is_sticky) return 1;
                return (b.reply_count || 0) - (a.reply_count || 0);
            });
        case 'views':
            return sorted.sort((a, b) => {
                if (a.is_sticky && !b.is_sticky) return -1;
                if (!a.is_sticky && b.is_sticky) return 1;
                return (b.views || 0) - (a.views || 0);
            });
        case 'bumped':
        default:
            return sorted.sort((a, b) => {
                if (a.is_sticky && !b.is_sticky) return -1;
                if (!a.is_sticky && b.is_sticky) return 1;
                return new Date(b.bumped_at) - new Date(a.bumped_at);
            });
    }
}

// Initialize filter controls
function initializeFilters(onFilterChange) {
    const sortBy = document.getElementById('sortBy');
    const filterBy = document.getElementById('filterBy');
    const refreshBtn = document.getElementById('refreshThreads');
    
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            onFilterChange(sortBy.value, filterBy.value);
        });
    }
    
    if (filterBy) {
        filterBy.addEventListener('change', () => {
            onFilterChange(sortBy.value, filterBy.value);
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            onFilterChange(sortBy.value, filterBy.value, true);
        });
    }
}

export { createFilterControls, applyFilters, applySorting, initializeFilters };
