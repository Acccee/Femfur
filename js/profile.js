// profile.js - User Profile Module

import { supabaseClient } from './supabaseClient.js';
import { getUserByHash, generateUserHash } from './auth.js';
import { t } from './i18n.js';

// Load user profile
async function loadUserProfile(userHash) {
    try {
        const user = await getUserByHash(userHash);
        
        if (!user) {
            return null;
        }
        
        // Get user's threads
        const { data: threads } = await supabaseClient
            .from('threads')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_anonymous', false)
            .order('created_at', { ascending: false });
        
        // Get user's replies
        const { data: replies } = await supabaseClient
            .from('replies')
            .select(`
                *,
                thread:thread_id (
                    id,
                    title,
                    board
                )
            `)
            .eq('user_id', user.id)
            .eq('is_anonymous', false)
            .order('created_at', { ascending: false });
        
        return {
            user,
            threads: threads || [],
            replies: replies || []
        };
    } catch (error) {
        console.error('Error loading user profile:', error);
        return null;
    }
}

// Render user profile
function renderUserProfile(profileData) {
    const profileContent = document.getElementById('profileContent');
    
    if (!profileData || !profileData.user) {
        profileContent.innerHTML = `
            <div class="error">${t('error_load')}</div>
        `;
        return;
    }
    
    const { user, threads, replies } = profileData;
    
    const avatarUrl = user.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23999"%3E?%3C/text%3E%3C/svg%3E';
    
    // Check if this is the current user's profile
    const currentUserData = JSON.parse(localStorage.getItem('femfur_user') || 'null');
    const isOwnProfile = currentUserData && currentUserData.id === user.id;
    
    const html = `
        <div class="profile-header">
            <img src="${avatarUrl}" alt="${escapeHtml(user.nickname)}" class="profile-avatar">
            <div class="profile-info">
                <h2>${escapeHtml(user.nickname)}</h2>
                ${user.status ? `<div class="profile-status">${escapeHtml(user.status)}</div>` : ''}
                <div class="profile-meta">
                    ${t('memberSince')}: ${formatDate(user.created_at)}
                </div>
                <div class="profile-meta">
                    ${t('threads')}: ${threads.length} | ${t('posts')}: ${replies.length}
                </div>
                ${isOwnProfile ? '<button id="editProfileBtn" class="btn-primary" style="margin-top: 10px;" data-i18n="editProfile">Edit Profile</button>' : ''}
            </div>
        </div>
        
        <div class="profile-tabs">
            <button class="active" data-tab="all">${t('allActivity')}</button>
            <button data-tab="threads">${t('userThreads')}</button>
            <button data-tab="posts">${t('userPosts')}</button>
        </div>
        
        <div class="profile-content">
            <div id="profileTabContent"></div>
        </div>
    `;
    
    profileContent.innerHTML = html;
    
    // Add edit profile button handler if it's the user's own profile
    if (isOwnProfile) {
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                openEditProfileModal(user);
            });
        }
    }
    
    // Set up tab switching
    const tabs = profileContent.querySelectorAll('.profile-tabs button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.getAttribute('data-tab');
            renderProfileTab(tabName, threads, replies);
        });
    });
    
    // Show all activity by default
    renderProfileTab('all', threads, replies);
}

// Open edit profile modal
function openEditProfileModal(user) {
    const modal = document.getElementById('editProfileModal');
    const editStatus = document.getElementById('editStatus');
    const currentAvatarDiv = document.getElementById('currentAvatar');
    
    // Set current values
    editStatus.value = user.status || '';
    
    // Show current avatar
    if (user.avatar_url) {
        currentAvatarDiv.innerHTML = `<img src="${user.avatar_url}" alt="Current avatar" style="max-width: 100px; border-radius: 50%;">`;
    } else {
        currentAvatarDiv.innerHTML = '<p>No avatar set</p>';
    }
    
    modal.style.display = 'block';
}

// Render profile tab content
function renderProfileTab(tabName, threads, replies) {
    const tabContent = document.getElementById('profileTabContent');
    
    let html = '';
    
    if (tabName === 'all') {
        // Combine threads and replies, sort by date
        const allActivity = [
            ...threads.map(t => ({ ...t, type: 'thread' })),
            ...replies.map(r => ({ ...r, type: 'reply' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        if (allActivity.length === 0) {
            html = `<div class="empty-state">${t('no_activity')}</div>`;
        } else {
            html = allActivity.map(item => {
                if (item.type === 'thread') {
                    return `
                        <div class="thread-item" onclick="window.location.hash='${item.board}-${item.id}'">
                            <h3>${escapeHtml(item.title)}</h3>
                            <p>${escapeHtml(item.content.substring(0, 200))}${item.content.length > 200 ? '...' : ''}</p>
                            <div class="thread-meta">
                                <span>${t('created')}: ${formatDate(item.created_at)}</span>
                                <span>/${item.board}/</span>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="reply-item" onclick="window.location.hash='${item.thread.board}-${item.thread_id}'">
                            <div class="reply-text">${escapeHtml(item.content)}</div>
                            <div class="reply-meta">
                                ${t('created')}: ${formatDate(item.created_at)} | 
                                In: ${escapeHtml(item.thread.title)} (/${item.thread.board}/)
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }
    } else if (tabName === 'threads') {
        if (threads.length === 0) {
            html = `<div class="empty-state">${t('no_threads')}</div>`;
        } else {
            html = threads.map(thread => `
                <div class="thread-item" onclick="window.location.hash='${thread.board}-${thread.id}'">
                    <h3>${escapeHtml(thread.title)}</h3>
                    <p>${escapeHtml(thread.content.substring(0, 200))}${thread.content.length > 200 ? '...' : ''}</p>
                    <div class="thread-meta">
                        <span>${t('created')}: ${formatDate(thread.created_at)}</span>
                        <span>/${thread.board}/</span>
                    </div>
                </div>
            `).join('');
        }
    } else if (tabName === 'posts') {
        if (replies.length === 0) {
            html = `<div class="empty-state">${t('no_replies')}</div>`;
        } else {
            html = replies.map(reply => `
                <div class="reply-item" onclick="window.location.hash='${reply.thread.board}-${reply.thread_id}'">
                    <div class="reply-text">${escapeHtml(reply.content)}</div>
                    <div class="reply-meta">
                        ${t('created')}: ${formatDate(reply.created_at)} | 
                        In: ${escapeHtml(reply.thread.title)} (/${reply.thread.board}/)
                    </div>
                </div>
            `).join('');
        }
    }
    
    tabContent.innerHTML = html;
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export { loadUserProfile, renderUserProfile, openEditProfileModal };
