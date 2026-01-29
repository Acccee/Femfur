// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://httzzyjltrfzagkipojv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dHp6eWpsdHJmemFna2lwb2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTY0NTksImV4cCI6MjA4NTI5MjQ1OX0.o210K6q3HRNbRsDgTEYlzMYGUm1Gk0cgYWMj4zGe3j0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentView = 'home';
let currentCategory = null;
let currentBoard = null;
let currentThread = null;
let lastPostTime = 0;
const COOLDOWN_MS = 10000;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
    loadHome();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        
        if (profile) {
            currentUser = profile;
            updateAuthUI();
        }
    }
}

function updateAuthUI() {
    if (currentUser) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('user-section').style.display = 'inline';
        document.getElementById('username-display').textContent = currentUser.username;
    } else {
        document.getElementById('auth-section').style.display = 'inline';
        document.getElementById('user-section').style.display = 'none';
    }
}

async function register(username, password) {
    try {
        const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@femfur.local`;
        
        const { data, error } = await supabase.auth.signUp({
            email: fakeEmail,
            password: password,
        });

        if (error) throw error;

        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    { 
                        id: data.user.id, 
                        username: username,
                        is_admin: false
                    }
                ]);

            if (profileError) throw profileError;

            showMessage('Registration successful! Please login.', 'success');
            showView('home');
        }
    } catch (error) {
        showMessage('Registration failed: ' + error.message, 'error');
    }
}

async function login(username, password) {
    try {
        const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@femfur.local`;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: password,
        });

        if (error) throw error;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        currentUser = profile;
        updateAuthUI();
        showMessage('Login successful!', 'success');
        showView('home');
        loadHome();
    } catch (error) {
        showMessage('Login failed: ' + error.message, 'error');
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI();
    showView('home');
    loadHome();
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.style.display = 'block';
        currentView = viewName;
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showMessage(message, type) {
    const container = document.getElementById('message-container');
    const div = document.createElement('div');
    div.className = type;
    div.textContent = message;
    container.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

function checkCooldown() {
    const now = Date.now();
    if (now - lastPostTime < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (now - lastPostTime)) / 1000);
        showMessage(`Please wait ${remaining} seconds before posting again.`, 'error');
        return false;
    }
    return true;
}

function updateCooldown() {
    lastPostTime = Date.now();
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadHome() {
    showView('home');
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

    const container = document.getElementById('categories-list');
    container.innerHTML = '';

    if (categories && categories.length > 0) {
        categories.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `<h3>${sanitizeHTML(cat.name)}</h3>`;
            div.addEventListener('click', () => loadCategory(cat.id));
            container.appendChild(div);
        });
    } else {
        container.innerHTML = '<p>No categories yet. Create one!</p>';
    }
}

async function createCategory(name) {
    if (!checkCooldown()) return;

    const { error } = await supabase
        .from('categories')
        .insert([{ 
            name: name,
            created_by: currentUser ? currentUser.id : null
        }]);

    if (error) {
        showMessage('Error creating category: ' + error.message, 'error');
    } else {
        updateCooldown();
        hideModal('modal-create-category');
        document.getElementById('input-category-name').value = '';
        loadHome();
    }
}

async function loadCategory(categoryId) {
    currentCategory = categoryId;
    showView('category');

    const { data: category } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

    const { data: boards } = await supabase
        .from('boards')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });

    document.getElementById('category-header').innerHTML = `
        <h2>${sanitizeHTML(category.name)}</h2>
        <span class="back-link" id="back-to-home">← Back to Home</span>
    `;

    document.getElementById('back-to-home').addEventListener('click', loadHome);

    const container = document.getElementById('boards-list');
    container.innerHTML = '';

    if (boards && boards.length > 0) {
        boards.forEach(board => {
            const div = document.createElement('div');
            div.className = 'board-item';
            div.innerHTML = `
                <h3><span class="board-code">${sanitizeHTML(board.code)}</span> ${sanitizeHTML(board.name)}</h3>
                <p>${sanitizeHTML(board.description || '')}</p>
            `;
            div.addEventListener('click', () => loadBoard(board.id));
            container.appendChild(div);
        });
    } else {
        container.innerHTML = '<p>No boards yet. Create one!</p>';
    }
}

async function createBoard(name, code, description) {
    if (!checkCooldown()) return;

    const { error } = await supabase
        .from('boards')
        .insert([{ 
            name: name,
            code: code,
            description: description,
            category_id: currentCategory,
            created_by: currentUser ? currentUser.id : null
        }]);

    if (error) {
        showMessage('Error creating board: ' + error.message, 'error');
    } else {
        updateCooldown();
        hideModal('modal-create-board');
        document.getElementById('input-board-name').value = '';
        document.getElementById('input-board-code').value = '';
        document.getElementById('input-board-desc').value = '';
        loadCategory(currentCategory);
    }
}

async function loadBoard(boardId) {
    currentBoard = boardId;
    showView('board');

    const { data: board } = await supabase
        .from('boards')
        .select('*, categories(name)')
        .eq('id', boardId)
        .single();

    const { data: threads } = await supabase
        .from('threads')
        .select('*, profiles(username)')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

    document.getElementById('board-header').innerHTML = `
        <h2><span class="board-code">${sanitizeHTML(board.code)}</span> ${sanitizeHTML(board.name)}</h2>
        <p>${sanitizeHTML(board.description || '')}</p>
        <span class="back-link" id="back-to-category">← Back to ${sanitizeHTML(board.categories.name)}</span>
    `;

    document.getElementById('back-to-category').addEventListener('click', () => loadCategory(board.category_id));

    const container = document.getElementById('threads-list');
    container.innerHTML = '';

    if (threads && threads.length > 0) {
        threads.forEach(thread => {
            const div = document.createElement('div');
            div.className = 'thread-item';
            const authorName = thread.profiles ? thread.profiles.username : 'Anonymous';
            div.innerHTML = `
                <h3>${sanitizeHTML(thread.title)}</h3>
                <div class="post-header">
                    <span class="${thread.profiles ? '' : 'anon'}">${sanitizeHTML(authorName)}</span> | 
                    ${new Date(thread.created_at).toLocaleString()}
                </div>
            `;
            div.addEventListener('click', () => loadThread(thread.id));
            container.appendChild(div);
        });
    } else {
        container.innerHTML = '<p>No threads yet. Create one!</p>';
    }
}

async function createThread(title, content) {
    if (!checkCooldown()) return;

    const { error } = await supabase
        .from('threads')
        .insert([{ 
            title: title,
            content: content,
            board_id: currentBoard,
            created_by: currentUser ? currentUser.id : null
        }]);

    if (error) {
        showMessage('Error creating thread: ' + error.message, 'error');
    } else {
        updateCooldown();
        hideModal('modal-create-thread');
        document.getElementById('input-thread-title').value = '';
        document.getElementById('input-thread-content').value = '';
        loadBoard(currentBoard);
    }
}

async function loadThread(threadId) {
    currentThread = threadId;
    showView('thread');

    const { data: thread } = await supabase
        .from('threads')
        .select('*, profiles(username), boards(id, name, code, category_id)')
        .eq('id', threadId)
        .single();

    const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles(username)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

    const authorName = thread.profiles ? thread.profiles.username : 'Anonymous';
    
    document.getElementById('thread-header').innerHTML = `
        <h2>${sanitizeHTML(thread.title)}</h2>
        <div class="post-item">
            <div class="post-header">
                <span class="${thread.profiles ? '' : 'anon'}">${sanitizeHTML(authorName)}</span> | 
                ${new Date(thread.created_at).toLocaleString()}
            </div>
            <div class="post-content">${sanitizeHTML(thread.content)}</div>
        </div>
        <span class="back-link" id="back-to-board">← Back to ${sanitizeHTML(thread.boards.code)}</span>
    `;

    document.getElementById('back-to-board').addEventListener('click', () => loadBoard(thread.boards.id));

    const container = document.getElementById('thread-posts');
    container.innerHTML = '<h3>Replies</h3>';

    if (posts && posts.length > 0) {
        posts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'post-item';
            const postAuthor = post.profiles ? post.profiles.username : 'Anonymous';
            div.innerHTML = `
                <div class="post-header">
                    <span class="${post.profiles ? '' : 'anon'}">${sanitizeHTML(postAuthor)}</span> | 
                    ${new Date(post.created_at).toLocaleString()}
                </div>
                <div class="post-content">${sanitizeHTML(post.content)}</div>
            `;
            container.appendChild(div);
        });
    }
}

async function createPost(content) {
    if (!checkCooldown()) return;

    const { error } = await supabase
        .from('posts')
        .insert([{ 
            content: content,
            thread_id: currentThread,
            created_by: currentUser ? currentUser.id : null
        }]);

    if (error) {
        showMessage('Error posting reply: ' + error.message, 'error');
    } else {
        updateCooldown();
        document.getElementById('reply-content').value = '';
        loadThread(currentThread);
    }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const view = btn.getAttribute('data-view');
            if (view === 'home' || view === 'boards') {
                loadHome();
            } else {
                showView(view);
            }
        });
    });

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            await login(username, password);
        });
    }

    const registerForm = document.getElementById('form-register');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            await register(username, password);
        });
    }

    const btnCreateCategory = document.getElementById('btn-create-category');
    if (btnCreateCategory) {
        btnCreateCategory.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('modal-create-category');
        });
    }

    const btnCreateBoard = document.getElementById('btn-create-board');
    if (btnCreateBoard) {
        btnCreateBoard.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('modal-create-board');
        });
    }

    const btnCreateThread = document.getElementById('btn-create-thread');
    if (btnCreateThread) {
        btnCreateThread.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('modal-create-thread');
        });
    }

    const btnSubmitCategory = document.getElementById('btn-submit-category');
    if (btnSubmitCategory) {
        btnSubmitCategory.addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.getElementById('input-category-name').value;
            if (name.trim()) {
                createCategory(name);
            }
        });
    }

    const btnSubmitBoard = document.getElementById('btn-submit-board');
    if (btnSubmitBoard) {
        btnSubmitBoard.addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.getElementById('input-board-name').value;
            const code = document.getElementById('input-board-code').value;
            const desc = document.getElementById('input-board-desc').value;
            if (name.trim() && code.trim()) {
                createBoard(name, code, desc);
            }
        });
    }

    const btnSubmitThread = document.getElementById('btn-submit-thread');
    if (btnSubmitThread) {
        btnSubmitThread.addEventListener('click', (e) => {
            e.preventDefault();
            const title = document.getElementById('input-thread-title').value;
            const content = document.getElementById('input-thread-content').value;
            if (title.trim() && content.trim()) {
                createThread(title, content);
            }
        });
    }

    const btnSubmitReply = document.getElementById('btn-submit-reply');
    if (btnSubmitReply) {
        btnSubmitReply.addEventListener('click', (e) => {
            e.preventDefault();
            const content = document.getElementById('reply-content').value;
            if (content.trim()) {
                createPost(content);
            }
        });
    }

    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            hideModal(modalId);
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}
