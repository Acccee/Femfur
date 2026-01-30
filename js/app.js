// app.js - Main Application File

import { initI18n, t } from './i18n.js';
import { getBoardInfo, getAllBoards, loadBoardThreads, createThread, incrementViewCount } from './boards.js';
import { getThread, getThreadReplies, createReply, formatDate, formatQuotes, addQuote } from './threads.js';
import { register, login, logout, getCurrentUser, updateAuthUI, updateProfile } from './auth.js';
import { initializeWidgets } from './widgets.js';
import { loadUserProfile, renderUserProfile } from './profile.js';

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

// Инициализация приложения
async function init() {
    // Initialize i18n first
    await initI18n();
    
    // Initialize auth
    await getCurrentUser();
    updateAuthUI();
    
    renderBoardNav();
    setupEventListeners();
    handleRoute();
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
    currentBoard = null;
    currentThread = null;
    updateActiveNav(null);
    
    // Initialize widgets
    await initializeWidgets();
}

// Показать борду
async function handleNewThreadSubmit(e) {
    e.preventDefault();

    // 🔥 ПОЛУЧАЕМ БОРДУ НАПРЯМУЮ ИЗ URL
    const boardId = window.location.hash.replace('#', '');

    if (!boardId) {
        alert('Ошибка: борда не определена');
        return;
    }

    const title = document.getElementById('threadTitle').value.trim();
    const content = document.getElementById('threadContent').value.trim();
    const imageFile = document.getElementById('threadImage').files[0];
    const isAnon = document.getElementById('threadPostAnon').checked;

    if (!title || !content) {
        alert('Заполните все поля');
        return;
    }

    try {
        await createThread(boardId, title, content, imageFile, isAnon);
        newThreadModal.style.display = 'none';

        const threads = await loadBoardThreads(boardId);
        renderThreads(threads);

        alert('Тред создан');
    } catch (error) {
        alert('Ошибка создания треда: ' + error.message);
    }
}


// Рендер тредов
function renderThreads(threads) {
    threadsList.innerHTML = '';
    
    if (threads.length === 0) {
        threadsList.innerHTML = `<div class="empty-state">${t('no_threads')}</div>`;
        return;
    }
    
    threads.forEach(thread => {
        const threadItem = document.createElement('div');
        threadItem.className = 'thread-item' + (thread.is_sticky ? ' sticky' : '');
        
        const author = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
        
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
            </div>
        `;
        
        threadItem.addEventListener('click', () => {
            window.location.hash = `${currentBoard}-${thread.id}`;
        });
        
        threadsList.appendChild(threadItem);
    });
}

// Показать тред
async function showThread(boardId, threadId) {
    currentBoard = boardId;
    currentThread = threadId;
    
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'block';
    profileView.style.display = 'none';
    
    updateActiveNav(boardId);
    
    threadContent.innerHTML = `<div class="loading">${t('loading', 'Loading...')}</div>`;
    repliesList.innerHTML = '';
    replyText.value = '';
    
    try {
        // Increment view count
        await incrementViewCount(threadId);
        
        // Загрузка треда
        const thread = await getThread(threadId);
        
        const author = thread.is_anonymous ? t('anonymous') : (thread.user ? thread.user.nickname : t('anonymous'));
        
        threadContent.innerHTML = `
            <h2>${escapeHtml(thread.title)}</h2>
            <div class="thread-text">${escapeHtml(thread.content)}</div>
            ${thread.image_url ? `<img src="${thread.image_url}" alt="Thread image">` : ''}
            <div class="thread-meta">
                <span class="thread-author ${thread.is_anonymous ? 'anonymous' : ''}">${author}</span>
                <span>${t('created')}: ${formatDate(thread.created_at)}</span>
                <span class="view-counter">${thread.views || 0}</span>
                <span>ID: ${thread.id}</span>
            </div>
        `;
        
        // Загрузка ответов
        const replies = await getThreadReplies(threadId);
        renderReplies(replies);
        
    } catch (error) {
        threadContent.innerHTML = `<div class="error">${t('error_load')}</div>`;
    }
}

// Рендер ответов
function renderReplies(replies) {
    repliesList.innerHTML = '';
    
    if (replies.length === 0) {
        repliesList.innerHTML = `<div class="empty-state">${t('no_replies')}</div>`;
        return;
    }
    
    replies.forEach((reply, index) => {
        const replyItem = document.createElement('div');
        replyItem.className = 'reply-item';
        replyItem.dataset.replyId = reply.id;
        
        const author = reply.is_anonymous ? t('anonymous') : (reply.user ? reply.user.nickname : t('anonymous'));
        
        replyItem.innerHTML = `
            <div class="reply-number">##${index + 1}</div>
            <div class="reply-text">${formatQuotes(escapeHtml(reply.content))}</div>
            ${reply.image_url ? `<img src="${reply.image_url}" alt="Reply image">` : ''}
            <div class="reply-meta">
                <span class="reply-author ${reply.is_anonymous ? 'anonymous' : ''}">${author}</span>
                <span>${formatDate(reply.created_at)}</span>
                <span class="thread-quote" data-reply-num="${index + 1}">&gt;&gt;${index + 1}</span>
            </div>
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
    });
}

// Show user profile
async function showProfile(userHash) {
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    profileView.style.display = 'block';
    
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = `<div class="loading">${t('loading', 'Loading...')}</div>`;
    
    const profileData = await loadUserProfile(userHash);
    renderUserProfile(profileData);
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
    
    if (!title || !content) {
        alert(t('error_empty_fields'));
        return;
    }
    
    try {
        await createThread(currentBoard, title, content, imageFile, isAnon);
        newThreadModal.style.display = 'none';
        
        // Перезагрузка тредов борды
        const threads = await loadBoardThreads(currentBoard);
        renderThreads(threads);
        
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
    
    if (!content) {
        alert(t('error_empty_fields'));
        return;
    }
    
    try {
        await createReply(currentThread, content, imageFile, isAnon);
        replyText.value = '';
        document.getElementById('replyImage').value = '';
        
        // Перезагрузка ответов
        const replies = await getThreadReplies(currentThread);
        renderReplies(replies);
        
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
