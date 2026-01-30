import { getBoardInfo, getAllBoards, loadBoardThreads, createThread } from './boards.js';
import { getThread, getThreadReplies, createReply, formatDate } from './threads.js';

// Состояние приложения
let currentBoard = null;
let currentThread = null;

// DOM элементы
const homeView = document.getElementById('homeView');
const boardView = document.getElementById('boardView');
const threadView = document.getElementById('threadView');
const boardNav = document.getElementById('boardNav');
const boardTitle = document.getElementById('boardTitle');
const threadsList = document.getElementById('threadsList');
const newThreadBtn = document.getElementById('newThreadBtn');
const newThreadModal = document.getElementById('newThreadModal');
const newThreadForm = document.getElementById('newThreadForm');
const threadContent = document.getElementById('threadContent');
const repliesList = document.getElementById('repliesList');
const backToBoard = document.getElementById('backToBoard');
const submitReply = document.getElementById('submitReply');
const replyText = document.getElementById('replyText');

// Инициализация приложения
function init() {
    renderBoardNav();
    setupEventListeners();
    handleRoute();
}

// Рендер навигации бордов
function renderBoardNav() {
    const boards = getAllBoards();
    boardNav.innerHTML = '';
    
    Object.keys(boards).forEach(boardId => {
        const board = boards[boardId];
        const link = document.createElement('a');
        link.href = `#${boardId}`;
        link.textContent = board.name;
        link.dataset.board = boardId;
        boardNav.appendChild(link);
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация по hash
    window.addEventListener('hashchange', handleRoute);
    
    // Кнопка создания треда
    newThreadBtn.addEventListener('click', openNewThreadModal);
    
    // Закрытие модального окна
    const closeModal = document.querySelector('.close');
    closeModal.addEventListener('click', closeNewThreadModal);
    
    // Клик вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === newThreadModal) {
            closeNewThreadModal();
        }
    });
    
    // Отправка формы создания треда
    newThreadForm.addEventListener('submit', handleNewThreadSubmit);
    
    // Кнопка возврата к борде
    backToBoard.addEventListener('click', () => {
        if (currentBoard) {
            window.location.hash = currentBoard;
        }
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
function showHome() {
    homeView.style.display = 'block';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    currentBoard = null;
    currentThread = null;
    updateActiveNav(null);
}

// Показать борду
async function showBoard(boardId) {
    currentBoard = boardId;
    currentThread = null;
    
    homeView.style.display = 'none';
    boardView.style.display = 'block';
    threadView.style.display = 'none';
    
    const boardInfo = getBoardInfo(boardId);
    boardTitle.textContent = `${boardInfo.name} - ${boardInfo.title}`;
    
    updateActiveNav(boardId);
    
    // Загрузка тредов
    threadsList.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const threads = await loadBoardThreads(boardId);
        renderThreads(threads);
    } catch (error) {
        threadsList.innerHTML = '<div class="error">Ошибка загрузки тредов. Проверьте подключение к Supabase.</div>';
    }
}

// Рендер тредов
function renderThreads(threads) {
    threadsList.innerHTML = '';
    
    if (threads.length === 0) {
        threadsList.innerHTML = '<div class="empty-state">Пока нет тредов. Создайте первый!</div>';
        return;
    }
    
    threads.forEach(thread => {
        const threadItem = document.createElement('div');
        threadItem.className = 'thread-item';
        threadItem.innerHTML = `
            <h3>${escapeHtml(thread.title)}</h3>
            <p>${escapeHtml(thread.content.substring(0, 200))}${thread.content.length > 200 ? '...' : ''}</p>
            <div class="thread-meta">Создан: ${formatDate(thread.created_at)} | ID: ${thread.id}</div>
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
    
    updateActiveNav(boardId);
    
    threadContent.innerHTML = '<div class="loading">Загрузка...</div>';
    repliesList.innerHTML = '';
    replyText.value = '';
    
    try {
        // Загрузка треда
        const thread = await getThread(threadId);
        
        threadContent.innerHTML = `
            <h2>${escapeHtml(thread.title)}</h2>
            <div class="thread-text">${escapeHtml(thread.content)}</div>
            <div class="thread-meta">Создан: ${formatDate(thread.created_at)} | ID: ${thread.id}</div>
        `;
        
        // Загрузка ответов
        const replies = await getThreadReplies(threadId);
        renderReplies(replies);
        
    } catch (error) {
        threadContent.innerHTML = '<div class="error">Ошибка загрузки треда. Проверьте подключение к Supabase.</div>';
    }
}

// Рендер ответов
function renderReplies(replies) {
    repliesList.innerHTML = '';
    
    if (replies.length === 0) {
        repliesList.innerHTML = '<div class="empty-state">Пока нет ответов. Будьте первым!</div>';
        return;
    }
    
    replies.forEach((reply, index) => {
        const replyItem = document.createElement('div');
        replyItem.className = 'reply-item';
        replyItem.innerHTML = `
            <div class="reply-text">${escapeHtml(reply.content)}</div>
            <div class="reply-meta">#${index + 1} | ${formatDate(reply.created_at)}</div>
        `;
        repliesList.appendChild(replyItem);
    });
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
}

// Закрыть модальное окно создания треда
function closeNewThreadModal() {
    newThreadModal.style.display = 'none';
}

// Обработка создания треда
async function handleNewThreadSubmit(e) {
    e.preventDefault();
    
    if (!currentBoard) {
        alert('Ошибка: борда не выбрана');
        return;
    }
    
    const title = document.getElementById('threadTitle').value.trim();
    const content = document.getElementById('threadContent').value.trim();
    
    if (!title || !content) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        await createThread(currentBoard, title, content);
        closeNewThreadModal();
        
        // Перезагрузка тредов борды
        const threads = await loadBoardThreads(currentBoard);
        renderThreads(threads);
        
        alert('Тред успешно создан!');
    } catch (error) {
        alert('Ошибка создания треда: ' + error.message);
    }
}

// Обработка отправки ответа
async function handleReplySubmit() {
    if (!currentThread) {
        alert('Ошибка: тред не выбран');
        return;
    }
    
    const content = replyText.value.trim();
    
    if (!content) {
        alert('Напишите текст ответа');
        return;
    }
    
    try {
        await createReply(currentThread, content);
        replyText.value = '';
        
        // Перезагрузка ответов
        const replies = await getThreadReplies(currentThread);
        renderReplies(replies);
        
    } catch (error) {
        alert('Ошибка отправки ответа: ' + error.message);
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
