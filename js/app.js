// app.js - Main Application File

import { initI18n, t } from './i18n.js';
import { getBoardInfo, getAllBoards, loadBoardThreads, createThread, incrementViewCount } from './boards.js';
import { getThread, getThreadReplies, createReply, formatDate, formatQuotes, addQuote } from './threads.js';
import { register, login, logout, getCurrentUser, updateAuthUI, updateProfile } from './auth.js';
import { initializeWidgets } from './widgets.js';
import { loadUserProfile, renderUserProfile } from './profile.js';

// --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---
let currentBoard = null;
let currentThread = null;

// --- DOM ЭЛЕМЕНТЫ ---
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

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    await initI18n();
    await getCurrentUser();
    updateAuthUI();
    
    renderBoardNav();
    setupEventListeners();
    handleRoute(); // Вызываем сразу, чтобы подхватить хеш при загрузке
}

// --- НАВИГАЦИЯ (БОРДЫ) ---
function renderBoardNav() {
    const boards = getAllBoards();
    boardNav.innerHTML = '';
    
    // Список основных разделов для быстрой навигации
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

// --- ОБРАБОТКА МАРШРУТОВ (ГЛАВНЫЙ МОЗГ) ---
function handleRoute() {
    const hash = window.location.hash.slice(1);
    
    // 1. Главная страница
    if (!hash) {
        showHome();
        return;
    }
    
    // 2. Профиль пользователя (#u/hash)
    if (hash.startsWith('u/')) {
        showProfile(hash.substring(2));
        return;
    }
    
    // 3. Тред внутри борды (#b-123)
    if (hash.includes('-')) {
        const parts = hash.split('-');
        const threadId = parts.pop();
        const boardId = parts.join('-');
        showThread(boardId, threadId);
        return;
    }
    
    // 4. Раздел борды (#b, #vg, #random)
    const boardInfo = getBoardInfo(hash);
    if (boardInfo) {
        showBoard(hash);
    } else {
        // Если это какой-то специфичный раздел (топ/недавние), пробуем загрузить
        showBoard(hash).catch(() => showHome());
    }
}

// --- ОТОБРАЖЕНИЕ СТРАНИЦ ---

async function showHome() {
    homeView.style.display = 'block';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    profileView.style.display = 'none';
    currentBoard = null;
    currentThread = null;
    updateActiveNav(null);
    await initializeWidgets();
}

async function showBoard(boardId) {
    currentBoard = boardId;
    currentThread = null;
    
    homeView.style.display = 'none';
    boardView.style.display = 'block';
    threadView.style.display = 'none';
    profileView.style.display = 'none';
    
    const boardInfo = getBoardInfo(boardId);
    boardTitle.textContent = boardInfo ? `${boardInfo.name} - ${boardInfo.title}` : boardId.toUpperCase();
    
    updateActiveNav(boardId);
    threadsList.innerHTML = `<div class="loading">${t('loading')}</div>`;
    
    try {
        const threads = await loadBoardThreads(boardId);
        renderThreads(threads);
    } catch (error) {
        threadsList.innerHTML = `<div class="error">${t('error_load')}</div>`;
    }
}

function renderThreads(threads) {
    threadsList.innerHTML = '';
    if (!threads || threads.length === 0) {
        threadsList.innerHTML = `<div class="empty-state">${t('no_threads')}</div>`;
        return;
    }
    
    threads.forEach(thread => {
        const threadItem = document.createElement('div');
        threadItem.className = 'thread-item' + (thread.is_sticky ? ' sticky' : '');
        const author = thread.is_anonymous ? t('anonymous') : (thread.user?.nickname || t('anonymous'));
        
        threadItem.innerHTML = `
            <h3>${escapeHtml(thread.title)}</h3>
            <p>${escapeHtml(thread.content.substring(0, 200))}${thread.content.length > 200 ? '...' : ''}</p>
            ${thread.image_url ? `<img src="${thread.image_url}" alt="Image">` : ''}
            <div class="thread-meta">
                <span class="thread-author ${thread.is_anonymous ? 'anonymous' : ''}">${author}</span>
                <span>${formatDate(thread.created_at)}</span>
                <span>💬 ${thread.reply_count || 0}</span>
                <span>👁️ ${thread.views || 0}</span>
                <span>ID: ${thread.id}</span>
            </div>
        `;
        
        threadItem.addEventListener('click', () => {
            window.location.hash = `${currentBoard}-${thread.id}`;
        });
        threadsList.appendChild(threadItem);
    });
}

async function showThread(boardId, threadId) {
    currentBoard = boardId;
    currentThread = threadId;
    
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'block';
    profileView.style.display = 'none';
    
    updateActiveNav(boardId);
    threadContent.innerHTML = `<div class="loading">${t('loading')}</div>`;
    repliesList.innerHTML = '';
    
    try {
        await incrementViewCount(threadId);
        const thread = await getThread(threadId);
        const author = thread.is_anonymous ? t('anonymous') : (thread.user?.nickname || t('anonymous'));
        
        threadContent.innerHTML = `
            <h2>${escapeHtml(thread.title)}</h2>
            <div class="thread-text">${escapeHtml(thread.content)}</div>
            ${thread.image_url ? `<img src="${thread.image_url}" alt="Image">` : ''}
            <div class="thread-meta">
                <span class="thread-author">${author}</span>
                <span>${formatDate(thread.created_at)}</span>
                <span>👁️ ${thread.views || 0}</span>
            </div>
        `;
        
        const replies = await getThreadReplies(threadId);
        renderReplies(replies);
    } catch (error) {
        threadContent.innerHTML = `<div class="error">${t('error_load')}</div>`;
    }
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---

function setupEventListeners() {
    window.addEventListener('hashchange', handleRoute);
    
    newThreadBtn.addEventListener('click', () => {
        newThreadModal.style.display = 'block';
        newThreadForm.reset();
    });

    // Модалки
    document.getElementById('loginBtn').addEventListener('click', () => loginModal.style.display = 'block');
    document.getElementById('registerBtn').addEventListener('click', () => registerModal.style.display = 'block');
    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none');
    });

    // Сабмиты форм
    newThreadForm.addEventListener('submit', handleNewThreadSubmit);
    loginForm.addEventListener('submit', handleLoginSubmit);
    registerForm.addEventListener('submit', handleRegisterSubmit);
    
    if (document.getElementById('editProfileForm')) {
        document.getElementById('editProfileForm').addEventListener('submit', handleEditProfileSubmit);
    }

    backToBoard.addEventListener('click', () => {
        if (currentBoard) window.location.hash = currentBoard;
    });

    backToHome.addEventListener('click', () => window.location.hash = '');
    submitReply.addEventListener('click', handleReplySubmit);
}

// --- ЛОГИКА ОТПРАВКИ ТРЕДА ---
async function handleNewThreadSubmit(e) {
    e.preventDefault();
    
    // Берем борду из текущего состояния
    if (!currentBoard) {
        alert('Выберите раздел для создания треда');
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
        
        // Авто-обновление списка тредов
        const threads = await loadBoardThreads(currentBoard);
        renderThreads(threads);
        
        alert(t('success_thread'));
    } catch (error) {
        alert(t('error_thread_create') + ': ' + error.message);
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function renderReplies(replies) {
    repliesList.innerHTML = replies.length === 0 ? `<div class="empty-state">${t('no_replies')}</div>` : '';
    replies.forEach((reply, index) => {
        const replyItem = document.createElement('div');
        replyItem.className = 'reply-item';
        const author = reply.is_anonymous ? t('anonymous') : (reply.user?.nickname || t('anonymous'));
        
        replyItem.innerHTML = `
            <div class="reply-number">##${index + 1}</div>
            <div class="reply-text">${formatQuotes(escapeHtml(reply.content))}</div>
            ${reply.image_url ? `<img src="${reply.image_url}" alt="Reply">` : ''}
            <div class="reply-meta">
                <span class="reply-author">${author}</span>
                <span>${formatDate(reply.created_at)}</span>
                <span class="thread-quote" data-reply-num="${index + 1}">&gt;&gt;${index + 1}</span>
            </div>
        `;
        
        replyItem.querySelector('.thread-quote').addEventListener('click', () => addQuote(index + 1));
        repliesList.appendChild(replyItem);
    });
}

async function handleReplySubmit() {
    const content = replyText.value.trim();
    if (!currentThread || !content) return;

    try {
        await createReply(currentThread, content, document.getElementById('replyImage').files[0], document.getElementById('postAnon').checked);
        replyText.value = '';
        const replies = await getThreadReplies(currentThread);
        renderReplies(replies);
    } catch (error) {
        alert(error.message);
    }
}

function updateActiveNav(boardId) {
    document.querySelectorAll('#boardNav a').forEach(link => {
        link.classList.toggle('active', link.dataset.board === boardId);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функции-заглушки (логин/рег) остаются такими же, как у тебя
async function handleLoginSubmit(e) {
    e.preventDefault();
    try {
        await login(document.getElementById('loginNickname').value, document.getElementById('loginPassword').value);
        loginModal.style.display = 'none';
        updateAuthUI();
    } catch (e) { alert(e.message); }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    try {
        await register(
            document.getElementById('registerNickname').value,
            document.getElementById('registerPassword').value,
            document.getElementById('registerPasswordConfirm').value,
            document.getElementById('registerAvatar').files[0],
            document.getElementById('registerStatus').value,
            document.getElementById('registerAlwaysAnon').checked
        );
        registerModal.style.display = 'none';
    } catch (e) { alert(e.message); }
}

async function showProfile(userHash) {
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    profileView.style.display = 'block';
    const profileData = await loadUserProfile(userHash);
    renderUserProfile(profileData);
}

async function handleEditProfileSubmit(e) {
    e.preventDefault();
    try {
        await updateProfile(document.getElementById('editAvatar').files[0], document.getElementById('editStatus').value);
        editProfileModal.style.display = 'none';
        location.reload();
    } catch (e) { alert(e.message); }
}

init();
