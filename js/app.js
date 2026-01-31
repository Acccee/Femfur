// app.js - Main Application File

import { initI18n, t } from './i18n.js';
import { getBoardInfo, getAllBoards, loadBoardThreads, createThread, incrementViewCount } from './boards.js';
import { getThread, getThreadReplies, createReply, formatDate, formatQuotes, addQuote } from './threads.js';
import { register, login, logout, getCurrentUser, updateAuthUI, updateProfile } from './auth.js';
import { initializeWidgets } from './widgets.js';
import { loadUserProfile, renderUserProfile } from './profile.js';
import { searchContent, renderSearchResults } from './search.js';
import { getReactions, renderReactions } from './reactions.js';
import { renderThreadActions } from './thread-actions.js';
import { formatText, addFormattingToolbar, showFormattingHelp } from './text-formatting.js';

// Состояние приложения
let currentBoard = null;
let currentThread = null;

// DOM элементы
const homeView = document.getElementById('homeView');
const boardView = document.getElementById('boardView');
const threadView = document.getElementById('threadView');
const profileView = document.getElementById('profileView');
const boardNav = document.getElementById('boardNav');
const boardTitle = document.getElementById('boardTitle');
const threadsList = document.getElementById('threadsList');
const newThreadBtn = document.getElementById('newThreadBtn');
const newThreadModal = document.getElementById('newThreadModal');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const editProfileModal = document.getElementById('editProfileModal');
const newThreadForm = document.getElementById('newThreadForm');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const threadContent = document.getElementById('threadContent');
const repliesList = document.getElementById('repliesList');
const backToBoard = document.getElementById('backToBoard');
const backToHome = document.getElementById('backToHome');
const submitReply = document.getElementById('submitReply');
const replyText = document.getElementById('replyText');
const searchView = document.getElementById('searchView');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Инициализация приложения
async function init() {
    // Initialize i18n first
    await initI18n();
    
    // Initialize auth
    await getCurrentUser();
    updateAuthUI();
    
    renderBoardNav();
    setupEventListeners();
    
    // Initialize theme AFTER elements are ready
    initTheme();
    
    // Add formatting toolbars
    addFormattingToolbar('threadContent');
    addFormattingToolbar('replyText');
    
    handleRoute();
}

// Инициализация темы
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) {
        console.error('Theme toggle button not found');
        return;
    }
    
    const savedTheme = localStorage.getItem('femfur_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (!themeToggle) {
        console.error('Theme toggle button not found');
        return;
    }
    
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

// Рендер навигации бордов
function renderBoardNav() {
    const boards = getAllBoards();
    boardNav.innerHTML = '';
    
    // Show only first few boards in nav
    const mainBoards = ['b', 'fur', 'a', 'vg', 'g', 'fit', 'sp'];
    
    mainBoards.forEach(boardId => {
        if (boards[boardId]) {
            const board = boards[boardId];
            const link = document.createElement('a');
            link.href = `#${boardId}`;
            link.textContent = board.name;
            link.dataset.board = boardId;
            boardNav.appendChild(link);
        }
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация по hash
    window.addEventListener('hashchange', handleRoute);
    
    // Кнопка поиска
    document.getElementById('searchBtn').addEventListener('click', () => {
        window.location.hash = 'search';
    });
    
    // Форма поиска
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }
    
    // Переключатель темы
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Кнопка создания треда
    newThreadBtn.addEventListener('click', openNewThreadModal);
    
    // Кнопки авторизации
    document.getElementById('loginBtn').addEventListener('click', () => {
        loginModal.style.display = 'block';
    });
    
    document.getElementById('registerBtn').addEventListener('click', () => {
        registerModal.style.display = 'block';
    });
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Закрытие модальных окон
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });
    
    // Клик вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Отправка форм
    newThreadForm.addEventListener('submit', handleNewThreadSubmit);
    loginForm.addEventListener('submit', handleLoginSubmit);
    registerForm.addEventListener('submit', handleRegisterSubmit);
    
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleEditProfileSubmit);
    }
    
    // Кнопка возврата к борде
    backToBoard.addEventListener('click', () => {
        if (currentBoard) {
            window.location.hash = currentBoard;
        }
    });
    
    // Кнопка возврата на главную
    backToHome.addEventListener('click', () => {
        window.location.hash = '';
    });
    
    // Отправка ответа
    submitReply.addEventListener('click', handleReplySubmit);
}

// Обработка маршрутизации
function handleRoute() {
    const hash = window.location.hash.slice(1);
    
    if (!hash) {
        showHome();
        return;
    }
    
    // Check for search
    if (hash === 'search' || hash.startsWith('search?')) {
        showSearch();
        return;
    }
    
    // Check for user profile (format: u/hash)
    if (hash.startsWith('u/')) {
        const userHash = hash.substring(2);
        showProfile(userHash);
        return;
    }
    
    // Проверка на тред (формат: boardId-threadId)
    if (hash.includes('-')) {
        const [boardId, threadId] = hash.split('-');
        showThread(boardId, threadId);
        return;
    }
    
    // Показ борды
    const boardInfo = getBoardInfo(hash);
    if (boardInfo) {
        showBoard(hash);
    } else {
        showHome();
    }
}

// Показать главную страницу
async function showHome() {
    homeView.style.display = 'block';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    profileView.style.display = 'none';
    searchView.style.display = 'none';
    currentBoard = null;
    currentThread = null;
    updateActiveNav(null);
    
    // Initialize widgets
    await initializeWidgets();
}

// Показать борду
async function showBoard(boardId) {
    currentBoard = boardId;
    currentThread = null;
    
    homeView.style.display = 'none';
    boardView.style.display = 'block';
    threadView.style.display = 'none';
    profileView.style.display = 'none';
    searchView.style.display = 'none';
    
    const boardInfo = getBoardInfo(boardId);
    boardTitle.textContent = `${boardInfo.name} - ${boardInfo.title}`;
    
    updateActiveNav(boardId);
    
    // Загрузка тредов с skeleton
    threadsList.innerHTML = renderSkeletonThreads(10);
    
    try {
        const threads = await loadBoardThreads(boardId);
        renderThreads(threads);
    } catch (error) {
        threadsList.innerHTML = `<div class="error">${t('error_load')}</div>`;
    }
}

// Рендер тредов
async function renderThreads(threads) {
    threadsList.innerHTML = '';
    
    if (threads.length === 0) {
        threadsList.innerHTML = `<div class="empty-state">${t('no_threads')}</div>`;
        return;
    }
    
    for (const thread of threads) {
        const threadItem = document.createElement('div');
        threadItem.className = 'thread-item fade-in-up' + (thread.is_sticky ? ' sticky' : '');
        
        const author = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
        
        // Get reactions for thread
        const reactions = await getReactions('thread', thread.id);
        const reactionsHtml = renderInlineReactionsHtml(reactions);
        
        threadItem.innerHTML = `
            <h3>${escapeHtml(thread.title)}</h3>
            <p>${escapeHtml(thread.content.substring(0, 200))}${thread.content.length > 200 ? '...' : ''}</p>
            ${thread.image_url ? `<img src="${thread.image_url}" alt="Thread image">` : ''}
            <div class="thread-meta">
                <span class="thread-author ${thread.is_anonymous ? 'anonymous' : ''}">${author}</span>
                <span>${t('created')}: ${formatDate(thread.created_at)}</span>
                <span>💬 ${thread.reply_count || 0} ${t('replies')}</span>
                <span class="view-counter">${thread.views || 0}</span>
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

// Helper to render inline reactions HTML
function renderInlineReactionsHtml(reactions) {
    if (!reactions) return '';
    
    const REACTION_EMOJIS = {
        skull: '💀',
        clown: '🤡',
        based: 'based',
        cringe: 'cringe',
        schizo: 'schizo'
    };
    
    let html = '<div class="reactions-inline">';
    let hasReactions = false;
    
    Object.entries(reactions).forEach(([type, data]) => {
        if (data && data.count > 0) {
            hasReactions = true;
            const activeClass = data.userReacted ? 'active' : '';
            html += `
                <span class="reaction-inline ${activeClass}">
                    ${REACTION_EMOJIS[type]} ${data.count}
                </span>
            `;
        }
    });
    
    html += '</div>';
    return hasReactions ? html : '';
}

// Показать тред
async function showThread(boardId, threadId) {
    currentBoard = boardId;
    currentThread = threadId;
    
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'block';
    profileView.style.display = 'none';
    searchView.style.display = 'none';
    
    updateActiveNav(boardId);
    
    threadContent.innerHTML = renderSkeletonThreads(1);
    repliesList.innerHTML = renderSkeletonReplies(3);
    replyText.value = '';
    
    try {
        // Increment view count
        await incrementViewCount(threadId);
        
        // Загрузка треда
        const thread = await getThread(threadId);
        
        const author = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
        
        // Create container for thread reactions
        const threadReactionsId = `thread-reactions-${threadId}`;
        const threadActionsId = `thread-actions-${threadId}`;
        
        threadContent.innerHTML = `
            <h2>${escapeHtml(thread.title)}</h2>
            <div class="thread-text">${formatText(thread.content)}</div>
            ${thread.image_url ? `<img src="${thread.image_url}" alt="Thread image">` : ''}
            <div class="thread-meta">
                <span class="thread-author ${thread.is_anonymous ? 'anonymous' : ''}">${author}</span>
                <span>${t('created')}: ${formatDate(thread.created_at)}</span>
                <span class="view-counter">${thread.views || 0}</span>
                <span>ID: ${thread.id}</span>
            </div>
            <div id="${threadReactionsId}"></div>
            <div id="${threadActionsId}"></div>
        `;
        
        // Render reactions for thread
        await renderReactions('thread', threadId, threadReactionsId);
        
        // Render edit/delete buttons if user owns thread
        renderThreadActions(threadId, threadActionsId);
        
        // Загрузка ответов
        const replies = await getThreadReplies(threadId);
        await renderReplies(replies);
        
    } catch (error) {
        threadContent.innerHTML = `<div class="error">${t('error_load')}</div>`;
    }
}

// Рендер ответов
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
        
        const author = reply.is_anonymous ? t('anonymous') : (reply.user ? reply.user.nickname : t('anonymous'));
        
        // Create container for reply reactions
        const replyReactionsId = `reply-reactions-${reply.id}`;
        
        replyItem.innerHTML = `
            <div class="reply-number">##${index + 1}</div>
            <div class="reply-text">${formatText(reply.content)}</div>
            ${reply.image_url ? `<img src="${reply.image_url}" alt="Reply image">` : ''}
            <div class="reply-meta">
                <span class="reply-author ${reply.is_anonymous ? 'anonymous' : ''}">${author}</span>
                <span>${formatDate(reply.created_at)}</span>
                <span class="thread-quote" data-reply-num="${index + 1}">&gt;&gt;${index + 1}</span>
            </div>
            <div id="${replyReactionsId}"></div>
        `;
        
        // Add click handler for quotes
        replyItem.querySelectorAll('.thread-quote').forEach(quote => {
            quote.addEventListener('click', (e) => {
                e.stopPropagation();
                const replyNum = quote.getAttribute('data-reply-num');
                addQuote(replyNum);
            });
        });
        
        repliesList.appendChild(replyItem);
        
        // Render reactions for reply
        await renderReactions('reply', reply.id, replyReactionsId);
    }
}

// Show user profile
async function showProfile(userHash) {
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    profileView.style.display = 'block';
    searchView.style.display = 'none';
    
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = `<div class="loading">${t('loading', 'Loading...')}</div>`;
    
    const profileData = await loadUserProfile(userHash);
    renderUserProfile(profileData);
}

// Show search page
function showSearch() {
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    profileView.style.display = 'none';
    searchView.style.display = 'block';
    
    // Check if there's a search query in URL
    const urlParams = new URLSearchParams(window.location.hash.slice(1).split('?')[1]);
    const query = urlParams.get('q');
    
    if (query) {
        searchInput.value = query;
        performSearch(query);
    } else {
        searchResults.innerHTML = `
            <div class="empty-state">
                <p>${t('search_empty', 'Enter keywords to search threads and replies')}</p>
            </div>
        `;
    }
}

// Perform search
async function performSearch(query) {
    searchResults.innerHTML = renderSkeletonThreads(5);
    
    try {
        const results = await searchContent(query);
        renderSearchResults(results, 'searchResults');
    } catch (error) {
        searchResults.innerHTML = `<div class="error">${t('error_search', 'Search failed')}</div>`;
    }
}

// Handle search form submit
function handleSearchSubmit(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    
    if (query) {
        window.location.hash = `search?q=${encodeURIComponent(query)}`;
    }
}

// Render skeleton loading for threads
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
            </div>
        `;
    }
    return html;
}

// Render skeleton loading for replies
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
            </div>
        `;
    }
    return html;
}

// Обновить активную борду в навигации
function updateActiveNav(boardId) {
    document.querySelectorAll('#boardNav a').forEach(link => {
        if (link.dataset.board === boardId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Открыть модальное окно создания треда
function openNewThreadModal() {
    newThreadModal.style.display = 'block';
    document.getElementById('threadTitle').value = '';
    document.getElementById('threadContent').value = '';
    document.getElementById('threadImage').value = '';
}

// Обработка создания треда
async function handleNewThreadSubmit(e) {
    e.preventDefault();
    
    if (!currentBoard) {
        alert(t('error_empty_fields'));
        return;
    }
    
    const title = document.getElementById('threadTitle').value.trim();
    const content = document.getElementById('threadContent').value.trim();
    const imageFile = document.getElementById('threadImage').files[0];
    const isAnon = document.getElementById('threadPostAnon').checked;
    
    try {
        await createThread(currentBoard, title, content, imageFile, isAnon);
        newThreadModal.style.display = 'none';
        
        // Очистка формы
        document.getElementById('threadTitle').value = '';
        document.getElementById('threadContent').value = '';
        document.getElementById('threadImage').value = '';
        
        // Перезагрузка тредов борды
        const threads = await loadBoardThreads(currentBoard);
        renderThreads(threads);
        
        // Обновляем виджеты на главной странице
        await initializeWidgets();
        
        alert(t('success_thread'));
    } catch (error) {
        alert(t('error_thread_create') + ': ' + error.message);
    }
}

// Обработка логина
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

// Обработка регистрации
async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const nickname = document.getElementById('registerNickname').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const avatarFile = document.getElementById('registerAvatar').files[0];
    const status = document.getElementById('registerStatus').value.trim();
    const alwaysAnon = document.getElementById('registerAlwaysAnon').checked;
    
    try {
        await register(nickname, password, passwordConfirm, avatarFile, status, alwaysAnon);
        registerModal.style.display = 'none';
        alert(t('success_register'));
    } catch (error) {
        alert(error.message);
    }
}

// Обработка отправки ответа
async function handleReplySubmit() {
    if (!currentThread) {
        alert(t('error_empty_fields'));
        return;
    }
    
    const content = replyText.value.trim();
    const imageFile = document.getElementById('replyImage').files[0];
    const isAnon = document.getElementById('postAnon').checked;
    
    try {
        // Добавить skeleton в конец списка ответов
        repliesList.innerHTML += renderSkeletonReplies(1);
        
        await createReply(currentThread, content, imageFile, isAnon);
        replyText.value = '';
        document.getElementById('replyImage').value = '';
        
        // Мгновенная перезагрузка ответов
        const replies = await getThreadReplies(currentThread);
        await renderReplies(replies);
        
        // Scroll to the new reply
        repliesList.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
    } catch (error) {
        alert(t('error_reply_create') + ': ' + error.message);
    }
}

// Обработка редактирования профиля
async function handleEditProfileSubmit(e) {
    e.preventDefault();
    
    const avatarFile = document.getElementById('editAvatar').files[0];
    const status = document.getElementById('editStatus').value.trim();
    
    try {
        await updateProfile(avatarFile, status);
        editProfileModal.style.display = 'none';
        alert(t('success_profile_update', 'Profile updated successfully!'));
        
        // Reload current page to show updated profile
        const currentUser = await getCurrentUser();
        if (currentUser) {
            window.location.hash = `u/${currentUser.profile_hash}`;
            window.location.reload();
        }
    } catch (error) {
        alert(t('error_profile_update', 'Error updating profile: ') + error.message);
    }
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запуск приложения
init();
