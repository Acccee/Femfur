import { getBoardInfo, getAllBoards, loadBoardThreads, createThread } from './boards.js';
import { getThread, getThreadReplies, createReply, uploadImage, formatDate, formatFileSize } from './threads.js';

// Application state
let currentBoard = null;
let currentThread = null;

// DOM elements
const homeView = document.getElementById('homeView');
const boardView = document.getElementById('boardView');
const threadView = document.getElementById('threadView');
const boardNav = document.getElementById('boardNav');
const boardTitle = document.getElementById('boardTitle');
const boardDescription = document.getElementById('boardDescription');
const threadsList = document.getElementById('threadsList');
const newThreadBtn = document.getElementById('newThreadBtn');
const newThreadFormContainer = document.getElementById('newThreadFormContainer');
const newThreadForm = document.getElementById('newThreadForm');
const cancelThread = document.getElementById('cancelThread');
const threadFile = document.getElementById('threadFile');
const fileName = document.getElementById('fileName');
const threadContent = document.getElementById('threadContent');
const backToBoard = document.getElementById('backToBoard');
const showReplyForm = document.getElementById('showReplyForm');
const replyFormContainer = document.getElementById('replyFormContainer');
const replyForm = document.getElementById('replyForm');
const cancelReply = document.getElementById('cancelReply');
const replyFile = document.getElementById('replyFile');
const replyFileName = document.getElementById('replyFileName');

// Initialize app
function init() {
    renderBoardNav();
    setupEventListeners();
    handleRoute();
}

// Render board navigation
function renderBoardNav() {
    const boards = getAllBoards();
    boardNav.innerHTML = '';
    
    const boardKeys = Object.keys(boards);
    boardKeys.forEach((boardId, index) => {
        const board = boards[boardId];
        const link = document.createElement('a');
        link.href = `#${boardId}`;
        link.textContent = board.name;
        link.dataset.board = boardId;
        boardNav.appendChild(link);
        
        // Add separator
        if (index < boardKeys.length - 1) {
            const separator = document.createTextNode(' / ');
            boardNav.appendChild(separator);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Hash change navigation
    window.addEventListener('hashchange', handleRoute);
    
    // New thread button
    newThreadBtn.addEventListener('click', () => {
        newThreadFormContainer.style.display = 'block';
    });
    
    // Cancel thread
    cancelThread.addEventListener('click', () => {
        newThreadFormContainer.style.display = 'none';
        newThreadForm.reset();
        fileName.textContent = '';
    });
    
    // Thread form submit
    newThreadForm.addEventListener('submit', handleNewThreadSubmit);
    
    // File input change
    threadFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileName.textContent = e.target.files[0].name;
        } else {
            fileName.textContent = '';
        }
    });
    
    // Back to board
    backToBoard.addEventListener('click', () => {
        if (currentBoard) {
            window.location.hash = currentBoard;
        }
    });
    
    // Show reply form
    showReplyForm.addEventListener('click', () => {
        replyFormContainer.style.display = 'block';
    });
    
    // Cancel reply
    cancelReply.addEventListener('click', () => {
        replyFormContainer.style.display = 'none';
        replyForm.reset();
        replyFileName.textContent = '';
    });
    
    // Reply form submit
    replyForm.addEventListener('submit', handleReplySubmit);
    
    // Reply file input change
    replyFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            replyFileName.textContent = e.target.files[0].name;
        } else {
            replyFileName.textContent = '';
        }
    });
}

// Handle routing
function handleRoute() {
    const hash = window.location.hash.slice(1);
    
    if (!hash) {
        showHome();
        return;
    }
    
    // Check if it's a thread (format: boardId-threadId)
    if (hash.includes('-')) {
        const parts = hash.split('-');
        const boardId = parts[0];
        const threadId = parts.slice(1).join('-'); // Handle IDs with dashes
        showThread(boardId, threadId);
        return;
    }
    
    // Show board
    const boardInfo = getBoardInfo(hash);
    if (boardInfo) {
        showBoard(hash);
    } else {
        showHome();
    }
}

// Show home view
function showHome() {
    homeView.style.display = 'block';
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    currentBoard = null;
    currentThread = null;
    updateActiveNav(null);
}

// Show board view
async function showBoard(boardId) {
    currentBoard = boardId;
    currentThread = null;
    
    homeView.style.display = 'none';
    boardView.style.display = 'block';
    threadView.style.display = 'none';
    newThreadFormContainer.style.display = 'none';
    
    const boardInfo = getBoardInfo(boardId);
    boardTitle.textContent = `${boardInfo.name} - ${boardInfo.title}`;
    boardDescription.textContent = boardInfo.desc;
    
    updateActiveNav(boardId);
    
    // Load threads
    threadsList.innerHTML = '<div class="loading">Loading threads...</div>';
    
    try {
        const threads = await loadBoardThreads(boardId);
        renderThreadsList(threads);
    } catch (error) {
        threadsList.innerHTML = '<div class="error">Error loading threads. Please check your Supabase connection.</div>';
        console.error(error);
    }
}

// Render threads list
function renderThreadsList(threads) {
    threadsList.innerHTML = '';
    
    if (threads.length === 0) {
        threadsList.innerHTML = '<div class="empty-state">No threads yet. Be the first to create one!</div>';
        return;
    }
    
    threads.forEach(thread => {
        const threadEl = document.createElement('div');
        threadEl.className = 'thread-preview';
        
        let html = `
            <div class="post-info">
                ${thread.subject ? `<span class="post-subject">${escapeHtml(thread.subject)}</span> ` : ''}
                <span class="post-date">${formatDate(thread.created_at)}</span>
                <span class="post-number">No.${thread.id}</span>
            </div>
        `;
        
        if (thread.image_url) {
            html += `
                <div class="post-image">
                    <a href="${thread.image_url}" target="_blank">
                        <img src="${thread.image_url}" alt="Thread image" loading="lazy">
                    </a>
                </div>
            `;
        }
        
        html += `
            <div class="post-message">${escapeHtml(thread.comment)}</div>
            <div class="post-link">[View Thread]</div>
        `;
        
        threadEl.innerHTML = html;
        
        // Click handler
        threadEl.querySelector('.post-link').addEventListener('click', () => {
            window.location.hash = `${currentBoard}-${thread.id}`;
        });
        
        threadsList.appendChild(threadEl);
    });
}

// Show thread view
async function showThread(boardId, threadId) {
    currentBoard = boardId;
    currentThread = threadId;
    
    homeView.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'block';
    replyFormContainer.style.display = 'none';
    
    updateActiveNav(boardId);
    
    threadContent.innerHTML = '<div class="loading">Loading thread...</div>';
    
    try {
        // Load thread
        const thread = await getThread(threadId);
        
        // Load replies
        const replies = await getThreadReplies(threadId);
        
        // Render thread
        renderThread(thread, replies);
        
    } catch (error) {
        threadContent.innerHTML = '<div class="error">Error loading thread. Please check your Supabase connection.</div>';
        console.error(error);
    }
}

// Render thread with replies
function renderThread(thread, replies) {
    let html = `
        <div class="op-post">
            <div class="post-info">
                ${thread.subject ? `<span class="post-subject">${escapeHtml(thread.subject)}</span> ` : ''}
                <span class="post-date">${formatDate(thread.created_at)}</span>
                <span class="post-number">No.${thread.id}</span>
            </div>
    `;
    
    if (thread.image_url) {
        html += `
            <div class="post-file">
                <a href="${thread.image_url}" target="_blank">
                    <img src="${thread.image_url}" alt="Thread image">
                </a>
            </div>
        `;
    }
    
    html += `
            <div class="post-message">${escapeHtml(thread.comment)}</div>
        </div>
    `;
    
    // Add replies
    replies.forEach((reply, index) => {
        html += `
            <div class="reply-post">
                <div class="post-info">
                    <span class="post-date">${formatDate(reply.created_at)}</span>
                    <span class="post-number">No.${reply.id}</span>
                </div>
        `;
        
        if (reply.image_url) {
            html += `
                <div class="post-file">
                    <a href="${reply.image_url}" target="_blank">
                        <img src="${reply.image_url}" alt="Reply image">
                    </a>
                </div>
            `;
        }
        
        html += `
                <div class="post-message">${escapeHtml(reply.comment)}</div>
            </div>
        `;
    });
    
    threadContent.innerHTML = html;
}

// Update active navigation
function updateActiveNav(boardId) {
    document.querySelectorAll('#boardNav a').forEach(link => {
        if (link.dataset.board === boardId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Handle new thread submit
async function handleNewThreadSubmit(e) {
    e.preventDefault();
    
    if (!currentBoard) {
        alert('Error: No board selected');
        return;
    }
    
    const subject = document.getElementById('threadSubject').value.trim();
    const comment = document.getElementById('threadComment').value.trim();
    const file = threadFile.files[0];
    
    if (!comment) {
        alert('Please enter a comment');
        return;
    }
    
    // Disable submit button
    const submitBtn = newThreadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    
    try {
        let imageUrl = null;
        
        // Upload image if present
        if (file) {
            imageUrl = await uploadImage(file);
        }
        
        // Create thread
        const thread = await createThread(currentBoard, subject, comment, imageUrl);
        
        // Reset form
        newThreadForm.reset();
        fileName.textContent = '';
        newThreadFormContainer.style.display = 'none';
        
        // Reload threads
        const threads = await loadBoardThreads(currentBoard);
        renderThreadsList(threads);
        
        alert('Thread created successfully!');
        
    } catch (error) {
        alert('Error creating thread: ' + error.message);
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post';
    }
}

// Handle reply submit
async function handleReplySubmit(e) {
    e.preventDefault();
    
    if (!currentThread) {
        alert('Error: No thread selected');
        return;
    }
    
    const comment = document.getElementById('replyComment').value.trim();
    const file = replyFile.files[0];
    
    if (!comment) {
        alert('Please enter a comment');
        return;
    }
    
    // Disable submit button
    const submitBtn = replyForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    
    try {
        let imageUrl = null;
        
        // Upload image if present
        if (file) {
            imageUrl = await uploadImage(file);
        }
        
        // Create reply
        await createReply(currentThread, comment, imageUrl);
        
        // Reset form
        replyForm.reset();
        replyFileName.textContent = '';
        replyFormContainer.style.display = 'none';
        
        // Reload thread
        const thread = await getThread(currentThread);
        const replies = await getThreadReplies(currentThread);
        renderThread(thread, replies);
        
    } catch (error) {
        alert('Error posting reply: ' + error.message);
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post';
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start the app
init();
