// app.js - Main Application File

import { initI18n, t } from './i18n.js';
import { getBoardInfo, getAllBoards, loadBoardThreads, createThread, incrementViewCount } from './boards.js';
import { getThread, getThreadReplies, createReply, formatDate, formatQuotes, addQuote } from './threads.js';
import { register, login, logout, getCurrentUser, updateAuthUI, updateProfile } from './auth.js';
import { initializeWidgets } from './widgets.js';
import { loadUserProfile, renderUserProfile, updateBioCharCount } from './profile.js';
import { searchContent, renderSearchResults } from './search.js';
import { getReactions, renderReactions } from './reactions.js';
import { renderThreadActions } from './thread-actions.js';
import { formatText, addFormattingToolbar, showFormattingHelp } from './text-formatting.js';

// ─── App state ───────────────────────────────────────────────────
let currentBoard  = null;
let currentThread = null;

// ─── DOM refs ────────────────────────────────────────────────────
const homeView          = document.getElementById('homeView');
const boardView         = document.getElementById('boardView');
const threadView        = document.getElementById('threadView');
const profileView       = document.getElementById('profileView');
const boardNav          = document.getElementById('boardNav');
const boardTitle        = document.getElementById('boardTitle');
const threadsList       = document.getElementById('threadsList');
const newThreadBtn      = document.getElementById('newThreadBtn');
const newThreadModal    = document.getElementById('newThreadModal');
const loginModal        = document.getElementById('loginModal');
const registerModal     = document.getElementById('registerModal');
const editProfileModal  = document.getElementById('editProfileModal');
const newThreadForm     = document.getElementById('newThreadForm');
const loginForm         = document.getElementById('loginForm');
const registerForm      = document.getElementById('registerForm');
const threadContent     = document.getElementById('threadContent');
const repliesList       = document.getElementById('repliesList');
const backToBoard       = document.getElementById('backToBoard');
const backToHome        = document.getElementById('backToHome');
const submitReply       = document.getElementById('submitReply');
const replyText         = document.getElementById('replyText');
const searchView        = document.getElementById('searchView');
const searchForm        = document.getElementById('searchForm');
const searchInput       = document.getElementById('searchInput');
const searchResults     = document.getElementById('searchResults');

// ─── Init ────────────────────────────────────────────────────────
async function init() {
    await initI18n();
    await getCurrentUser();
    updateAuthUI();

    renderBoardNav();
    setupEventListeners();
    initTheme();
    handleRoute();
}

// ─── Theme toggle (global dark/light) ────────────────────────────
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('femfur_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}

function toggleTheme() {
    const body        = document.body;
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('femfur_theme', 'light');
    } else {
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
        localStorage.setItem('femfur_theme', 'dark');
    }
}

// ─── Board nav ───────────────────────────────────────────────────
async function renderBoardNav() {
    boardNav.innerHTML = '<div class="board-nav-loading">Loading popular boards...</div>';

    try {
        const popularBoards = await getPopularBoards();
        boardNav.innerHTML = '';

        if (popularBoards && popularBoards.length > 0) {
            popularBoards.forEach(boardStat => {
                const link = document.createElement('a');
                link.href  = `#${boardStat.board}`;
                link.innerHTML = `
                    <span class="board-name">${boardStat.name}</span>
                    <span class="board-stats">📊 ${boardStat.thread_count} 💬 ${boardStat.reply_count}</span>
                `;
                link.dataset.board = boardStat.board;
                link.classList.add('popular-board-link');
                boardNav.appendChild(link);
            });
        } else {
            // Fallback — NSFW boards removed from list
            const mainBoards = ['b', 'fur', 'a', 'vg', 'g', 'fit', 'sp', 'meme', 'ai'];
            const boards = getAllBoards();

            mainBoards.forEach(boardId => {
                if (boards[boardId]) {
                    const link = document.createElement('a');
                    link.href        = `#${boardId}`;
                    link.textContent = boards[boardId].name;
                    link.dataset.board = boardId;
                    boardNav.appendChild(link);
                }
            });
        }
    } catch (error) {
        console.error('Error loading popular boards:', error);
        const mainBoards = ['b', 'fur', 'a', 'vg', 'g', 'meme', 'ai'];
        const boards = getAllBoards();

        mainBoards.forEach(boardId => {
            if (boards[boardId]) {
                const link = document.createElement('a');
                link.href        = `#${boardId}`;
                link.textContent = boards[boardId].name;
                link.dataset.board = boardId;
                boardNav.appendChild(link);
            }
        });
    }
}

async function getPopularBoards() {
    try {
        const { getPopularBoards: getBoardsStats } = await import('./boards.js');
        return await getBoardsStats();
    } catch (error) {
        console.error('Error getting popular boards:', error);
        return null;
    }
}

// ─── Event listeners ─────────────────────────────────────────────
function setupEventListeners() {
    window.addEventListener('hashchange', handleRoute);

    document.getElementById('searchBtn').addEventListener('click', () => {
        window.location.hash = 'search';
    });

    if (searchForm) searchForm.addEventListener('submit', handleSearchSubmit);

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    newThreadBtn.addEventListener('click', openNewThreadModal);

    document.getElementById('loginBtn').addEventListener('click', () => {
        loginModal.style.display = 'block';
    });
    document.getElementById('registerBtn').addEventListener('click', () => {
        registerModal.style.display = 'block';
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Close modals
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });

    // Forms
    newThreadForm.addEventListener('submit', handleNewThreadSubmit);
    loginForm.addEventListener('submit', handleLoginSubmit);
    registerForm.addEventListener('submit', handleRegisterSubmit);

    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) editProfileForm.addEventListener('submit', handleEditProfileSubmit);

    const editThreadForm = document.getElementById('editThreadForm');
    if (editThreadForm) editThreadForm.addEventListener('submit', handleEditThreadSubmit);

    backToBoard.addEventListener('click', () => { if (currentBoard) window.location.hash = currentBoard; });
    backToHome.addEventListener('click', () => { window.location.hash = ''; });
    submitReply.addEventListener('click', handleReplySubmit);

    // Bio char counter
    const bioField = document.getElementById('editBio');
    if (bioField) {
        bioField.addEventListener('input', updateBioCharCount);
    }

    // Theme preset buttons (live switch)
    document.querySelectorAll('.theme-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ─── Routing ─────────────────────────────────────────────────────
function handleRoute() {
    const hash = window.location.hash.slice(1);

    if (!hash)                          { showHome(); return; }
    if (hash === 'search' || hash.startsWith('search?')) { showSearch(); return; }
    if (hash.startsWith('u/'))          { showProfile(hash.substring(2)); return; }

    if (hash.includes('-')) {
        const [boardId, threadId] = hash.split('-');
        showThread(boardId, threadId);
        return;
    }

    const boardInfo = getBoardInfo(hash);
    if (boardInfo) showBoard(hash);
    else           showHome();
}

// ─── Views ───────────────────────────────────────────────────────
async function showHome() {
    homeView.style.display    = 'block';
    boardView.style.display   = 'none';
    threadView.style.display  = 'none';
    profileView.style.display = 'none';
    searchView.style.display  = 'none';
    currentBoard  = null;
    currentThread = null;
    updateActiveNav(null);
    await initializeWidgets();
}

async function showBoard(boardId) {
    currentBoard  = boardId;
    currentThread = null;

    homeView.style.display    = 'none';
    boardView.style.display   = 'block';
    threadView.style.display  = 'none';
    profileView.style.display = 'none';
    searchView.style.display  = 'none';

    const boardInfo = getBoardInfo(boardId);
    boardTitle.textContent = `${boardInfo.name} - ${boardInfo.title}`;
    updateActiveNav(boardId);

    threadsList.innerHTML = renderSkeletonThreads(10);

    try {
        const threads = await loadBoardThreads(boardId);
        renderThreads(threads);
    } catch (error) {
        threadsList.innerHTML = `<div class="error">${t('error_load')}</div>`;
    }
}

async function renderThreads(threads) {
    threadsList.innerHTML = '';

    if (threads.length === 0) {
        threadsList.innerHTML = `<div class="empty-state">${t('no_threads')}</div>`;
        return;
    }

    for (const thread of threads) {
        const threadItem = document.createElement('div');
        threadItem.className = 'thread-item fade-in-up' + (thread.is_sticky ? ' sticky' : '');

        const author     = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
        const authorHash = thread.user?.profile_hash || null;

        const authorHtml = !thread.is_anonymous && authorHash
            ? `<a href="#u/${authorHash}" class="thread-author-link" onclick="event.stopPropagation();">${escapeHtml(author)}</a>`
            : `<span class="thread-author ${thread.is_anonymous ? 'anonymous' : ''}">${escapeHtml(author)}</span>`;

        const reactions    = await getReactions('thread', thread.id);
        const reactionsHtml = renderInlineReactionsHtml(reactions);

        const contentPreview = thread.content && thread.content.trim() !== ''
            ? escapeHtml(thread.content.substring(0, 200)) + (thread.content.length > 200 ? '...' : '')
            : '<em>' + t('no_content', 'No content') + '</em>';

        threadItem.innerHTML = `
            <h3>${escapeHtml(thread.title)}</h3>
            <p>${contentPreview}</p>
            ${thread.image_url ? `<img src="${thread.image_url}" alt="Thread image">` : ''}
            <div class="thread-meta">
                ${authorHtml}
                <span>${t('created')}: ${formatDate(thread.created_at)}</span>
                <span>💬 ${thread.reply_count || 0} ${t('replies')}</span>
                <span class="view-counter">👁 ${thread.views || 0}</span>
                <span>ID: ${thread.id}</span>
                ${reactionsHtml}
            </div>
        `;

        threadItem.addEventListener('click', () => {
            window.location.hash = `${currentBoard}-${thread.id}`;
        });

        threadsList.appendChild(threadItem);
    }
}

function renderInlineReactionsHtml(reactions) {
    if (!reactions) return '';
    const REACTION_EMOJIS = { skull:'💀', clown:'🤡', based:'based', cringe:'cringe', schizo:'schizo' };
    let html = '<div class="reactions-inline">';
    let hasReactions = false;

    Object.entries(reactions).forEach(([type, data]) => {
        if (data && data.count > 0) {
            hasReactions = true;
            html += `<span class="reaction-inline ${data.userReacted ? 'active' : ''}">${REACTION_EMOJIS[type]} ${data.count}</span>`;
        }
    });

    html += '</div>';
    return hasReactions ? html : '';
}

// ─── Thread view ─────────────────────────────────────────────────
async function showThread(boardId, threadId) {
    currentBoard  = boardId;
    currentThread = threadId;

    homeView.style.display    = 'none';
    boardView.style.display   = 'none';
    threadView.style.display  = 'block';
    profileView.style.display = 'none';
    searchView.style.display  = 'none';

    updateActiveNav(boardId);
    threadContent.innerHTML = renderSkeletonThreads(1);
    repliesList.innerHTML   = renderSkeletonReplies(3);
    replyText.value         = '';

    try {
        await incrementViewCount(threadId);
        const thread = await getThread(threadId);

        const author     = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
        const authorHash = thread.user?.profile_hash || null;
        const avatarUrl  = thread.user?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3Ctext x="20" y="25" font-size="20" text-anchor="middle" fill="%23999"%3E?%3C/text%3E%3C/svg%3E';

        let creatorInfoHtml = '';
        if (!thread.is_anonymous && thread.user) {
            creatorInfoHtml = `
                <div class="thread-creator-info">
                    <img src="${avatarUrl}" alt="${escapeHtml(author)}" class="thread-creator-avatar">
                    <div class="thread-creator-details">
                        <a href="#u/${authorHash}" class="thread-creator-name">${escapeHtml(author)}</a>
                        <div class="thread-creator-date">${formatDate(thread.created_at)}</div>
                    </div>
                </div>`;
        }

        const threadReactionsId = `thread-reactions-${threadId}`;
        const threadActionsId   = `thread-actions-${threadId}`;

        const formattedContent = await formatText(thread.content);
        
        threadContent.innerHTML = `
            <h2>${escapeHtml(thread.title)}</h2>
            ${creatorInfoHtml}
            <div class="thread-text">${formattedContent}</div>
            ${thread.image_url ? `<img src="${thread.image_url}" alt="Thread image">` : ''}
            <div class="thread-meta">
                ${thread.is_anonymous ? `<span class="thread-author anonymous">${author}</span>` : ''}
                ${thread.is_anonymous ? `<span>${t('created')}: ${formatDate(thread.created_at)}</span>` : ''}
                <span class="view-counter">👁 ${thread.views || 0}</span>
                <span>ID: ${thread.id}</span>
            </div>
            <div id="${threadReactionsId}"></div>
            <div id="${threadActionsId}"></div>
        `;

        await renderReactions('thread', threadId, threadReactionsId);
        renderThreadActions(threadId, threadActionsId);

        const replies = await getThreadReplies(threadId);
        await renderReplies(replies);

        // Add formatting toolbar to reply textarea
        if (replyText && !replyText.previousElementSibling?.classList.contains('formatting-toolbar')) {
            addFormattingToolbar('replyText');
        }
    } catch (error) {
        threadContent.innerHTML = `<div class="error">${t('error_load')}</div>`;
    }
}

async function renderReplies(replies) {
    repliesList.innerHTML = '';

    if (replies.length === 0) {
        repliesList.innerHTML = `<div class="empty-state">${t('no_replies')}</div>`;
        return;
    }

    for (let index = 0; index < replies.length; index++) {
        const reply = replies[index];
        const replyItem = document.createElement('div');
        replyItem.className = 'reply-item fade-in-up';
        replyItem.dataset.replyId = reply.id;

        const author     = reply.is_anonymous ? t('anonymous') : (reply.user ? reply.user.nickname : t('anonymous'));
        const authorHash = reply.user?.profile_hash || null;

        const authorHtml = !reply.is_anonymous && authorHash
            ? `<a href="#u/${authorHash}" class="thread-author-link">${escapeHtml(author)}</a>`
            : `<span class="reply-author ${reply.is_anonymous ? 'anonymous' : ''}">${escapeHtml(author)}</span>`;

        const replyReactionsId = `reply-reactions-${reply.id}`;
        const formattedContent = await formatText(reply.content);

        replyItem.innerHTML = `
            <div class="reply-number">##${index + 1}</div>
            <div class="reply-text">${formattedContent}</div>
            ${reply.image_url ? `<img src="${reply.image_url}" alt="Reply image">` : ''}
            <div class="reply-meta">
                ${authorHtml}
                <span>${formatDate(reply.created_at)}</span>
                <span class="thread-quote" data-reply-num="${index + 1}">&gt;&gt;${index + 1}</span>
            </div>
            <div id="${replyReactionsId}"></div>
        `;

        replyItem.querySelectorAll('.thread-quote').forEach(quote => {
            quote.addEventListener('click', (e) => {
                e.stopPropagation();
                addQuote(quote.getAttribute('data-reply-num'));
            });
        });

        repliesList.appendChild(replyItem);
        await renderReactions('reply', reply.id, replyReactionsId);
    }
}

// ─── Profile & Search ────────────────────────────────────────────
async function showProfile(userHash) {
    homeView.style.display    = 'none';
    boardView.style.display   = 'none';
    threadView.style.display  = 'none';
    profileView.style.display = 'block';
    searchView.style.display  = 'none';

    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = `<div class="loading">${t('loading', 'Loading...')}</div>`;

    const profileData = await loadUserProfile(userHash);
    renderUserProfile(profileData);
}

function showSearch() {
    homeView.style.display    = 'none';
    boardView.style.display   = 'none';
    threadView.style.display  = 'none';
    profileView.style.display = 'none';
    searchView.style.display  = 'block';

    const urlParams = new URLSearchParams(window.location.hash.slice(1).split('?')[1]);
    const query = urlParams.get('q');

    if (query) {
        searchInput.value = query;
        performSearch(query);
    } else {
        searchResults.innerHTML = `<div class="empty-state"><p>${t('search_empty', 'Enter keywords to search threads and replies')}</p></div>`;
    }
}

async function performSearch(query) {
    searchResults.innerHTML = renderSkeletonThreads(5);
    try {
        const results = await searchContent(query);
        renderSearchResults(results, 'searchResults');
    } catch (error) {
        searchResults.innerHTML = `<div class="error">${t('error_search', 'Search failed')}</div>`;
    }
}

function handleSearchSubmit(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) window.location.hash = `search?q=${encodeURIComponent(query)}`;
}

// ─── Skeleton loaders ────────────────────────────────────────────
function renderSkeletonThreads(count = 5) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-thread fade-in">
                <div class="skeleton skeleton-thread-title"></div>
                <div class="skeleton skeleton-thread-content"></div>
                <div class="skeleton skeleton-thread-content"></div>
                <div class="skeleton-thread-meta">
                    <div class="skeleton skeleton-meta-item"></div>
                    <div class="skeleton skeleton-meta-item"></div>
                    <div class="skeleton skeleton-meta-item"></div>
                </div>
            </div>`;
    }
    return html;
}

function renderSkeletonReplies(count = 5) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-reply fade-in">
                <div class="skeleton skeleton-reply-content"></div>
                <div class="skeleton skeleton-reply-content"></div>
                <div class="skeleton-thread-meta">
                    <div class="skeleton skeleton-meta-item"></div>
                    <div class="skeleton skeleton-meta-item"></div>
                </div>
            </div>`;
    }
    return html;
}

function updateActiveNav(boardId) {
    document.querySelectorAll('#boardNav a').forEach(link => {
        link.classList.toggle('active', link.dataset.board === boardId);
    });
}

// ─── Modals ──────────────────────────────────────────────────────
function openNewThreadModal() {
    newThreadModal.style.display = 'block';
    document.getElementById('threadTitle').value        = '';
    document.getElementById('newThreadContent').value   = '';
    document.getElementById('threadImage').value        = '';

    const tc = document.getElementById('newThreadContent');
    if (tc && !tc.previousElementSibling?.classList.contains('formatting-toolbar')) {
        addFormattingToolbar('newThreadContent');
    }
}

// ─── Form handlers ───────────────────────────────────────────────
async function handleNewThreadSubmit(e) {
    e.preventDefault();
    if (!currentBoard) { alert(t('error_empty_fields')); return; }

    const title     = document.getElementById('threadTitle').value.trim();
    const content   = document.getElementById('newThreadContent').value.trim();
    const imageFile = document.getElementById('threadImage').files[0];
    const isAnon    = document.getElementById('threadPostAnon').checked;

    try {
        await createThread(currentBoard, title, content, imageFile, isAnon);
        newThreadModal.style.display = 'none';

        document.getElementById('threadTitle').value      = '';
        document.getElementById('newThreadContent').value = '';
        document.getElementById('threadImage').value      = '';

        const threads = await loadBoardThreads(currentBoard);
        renderThreads(threads);
        await initializeWidgets();
        alert(t('success_thread'));
    } catch (error) {
        alert(t('error_thread_create') + ': ' + error.message);
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const nickname = document.getElementById('loginNickname').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        await login(nickname, password);
        loginModal.style.display = 'none';
        updateAuthUI();
        alert(t('success_login'));
    } catch (error) {
        alert(error.message);
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const nickname        = document.getElementById('registerNickname').value.trim();
    const password        = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const avatarFile      = document.getElementById('registerAvatar').files[0];
    const status          = document.getElementById('registerStatus').value.trim();
    const alwaysAnon      = document.getElementById('registerAlwaysAnon').checked;

    try {
        await register(nickname, password, passwordConfirm, avatarFile, status, alwaysAnon);
        registerModal.style.display = 'none';
        alert(t('success_register'));
    } catch (error) {
        alert(error.message);
    }
}

async function handleReplySubmit() {
    if (!currentThread) { alert(t('error_empty_fields')); return; }

    const content   = replyText.value.trim();
    const imageFile = document.getElementById('replyImage').files[0];
    const isAnon    = document.getElementById('postAnon').checked;

    try {
        repliesList.innerHTML += renderSkeletonReplies(1);
        await createReply(currentThread, content, imageFile, isAnon);
        replyText.value = '';
        document.getElementById('replyImage').value = '';

        const replies = await getThreadReplies(currentThread);
        await renderReplies(replies);
        repliesList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        alert(t('error_reply_create') + ': ' + error.message);
    }
}

// ═══════════════════════════════════════════════════════════════════
// EDIT PROFILE SUBMIT  ← passes all new fields to fixed updateProfile
// ═══════════════════════════════════════════════════════════════════
async function handleEditProfileSubmit(e) {
    e.preventDefault();

    const avatarFile = document.getElementById('editAvatar').files[0];
    const bannerFile = document.getElementById('editBanner').files[0];
    const status     = document.getElementById('editStatus').value.trim();
    const bio        = document.getElementById('editBio').value.trim();

    // Get active theme preset
    const activePresetBtn = document.querySelector('.theme-preset.active');
    const themePreset     = activePresetBtn ? activePresetBtn.dataset.theme : 'default';

    const themeColor = document.getElementById('editThemeColor').value;
    const customCss  = document.getElementById('editCustomCss').value.trim();

    try {
        await updateProfile(avatarFile, status, bannerFile, bio, themePreset, themeColor, customCss);
        editProfileModal.style.display = 'none';
        alert(t('success_profile_update', 'Profile updated successfully!'));

        // Reload profile view
        const currentUser = await getCurrentUser();
        if (currentUser) {
            window.location.hash = `u/${currentUser.profile_hash}`;
            // Force re-render
            setTimeout(() => { showProfile(currentUser.profile_hash); }, 150);
        }
    } catch (error) {
        alert(t('error_profile_update', 'Error updating profile: ') + error.message);
    }
}

async function handleEditThreadSubmit(e) {
    e.preventDefault();
    const { updateThread } = await import('./thread-actions.js');

    const threadId  = document.getElementById('editThreadId').value;
    const title     = document.getElementById('editThreadTitle').value.trim();
    const content   = document.getElementById('editThreadContent').value.trim();
    const imageFile = document.getElementById('editThreadImage').files[0];

    try {
        await updateThread(threadId, title, content, imageFile);
        document.getElementById('editThreadModal').style.display = 'none';
        alert(t('success_thread_update', 'Thread updated successfully!'));

        const hash = window.location.hash;
        window.location.hash = '';
        setTimeout(() => { window.location.hash = hash; }, 100);
    } catch (error) {
        alert(t('error_thread_update', 'Failed to update thread: ') + error.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Start ───────────────────────────────────────────────────────
init();
