// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://httzzyjltrfzagkipojv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dHp6eWpsdHJmemFna2lwb2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTY0NTksImV4cCI6MjA4NTI5MjQ1OX0.o210K6q3HRNbRsDgTEYlzMYGUm1Gk0cgYWMj4zGe3j0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// STATE
let currentUser = null;
let currentView = 'home';
let currentCategory = null;
let currentBoard = null;
let currentThread = null;
let lastPostTime = 0;
const COOLDOWN_MS = 10000;

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
    loadHome();
});

// AUTH
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

// NAVIGATION
function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewName}`).style.display = 'block';
    currentView = viewName;
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showMessage(message, type) {
    const div = document.createElement('div');
    div.className = type;
    div.textContent = message;
    document.querySelector('.container').prepend(div);
    setTimeout(() => div.remove(), 5000);
}

// COOLDOWN
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

// SANITIZE
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// HOME
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
            div.onclick = () => loadCategory(cat.id);
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
        loadHome();
    }
}

// CATEGORY
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
        <a href="#" onclick="loadHome(); return false;">← Back to Home</a>
    `;

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
            div.onclick = () => loadBoard(board.id);
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
        loadCategory(currentCategory);
    }
}

// BOARD
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
        <a href="#" onclick="loadCategory(${board.category_id}); return false;">← Back to ${sanitizeHTML(board.categories.name)}</a>
    `;

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
            div.onclick = () => loadThread(thread.id);
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
        loadBoard(currentBoard);
    }
}

// THREAD
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
        <a href="#" onclick="loadBoard(${thread.boards.id}); return false;">← Back to ${sanitizeHTML(thread.boards.code)}</a>
    `;

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

// EVENT LISTENERS
function setupEventListeners() {
    // Navigation
    document.getElementById('nav-home').onclick = (e) => {
        e.preventDefault();
        loadHome();
    };

    document.getElementById('nav-boards').onclick = (e) => {
        e.preventDefault();
        loadHome();
    };

    document.getElementById('nav-login').onclick = (e) => {
        e.preventDefault();
        showView('login');
    };

    document.getElementById('nav-register').onclick = (e) => {
        e.preventDefault();
        showView('register');
    };

    document.getElementById('nav-logout').onclick = (e) => {
        e.preventDefault();
        logout();
    };

    // Forms
    document.getElementById('form-login').onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        await login(username, password);
    };

    document.getElementById('form-register').onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        await register(username, password);
    };

    // Buttons
    document.getElementById('btn-create-category').onclick = () => {
        showModal('modal-create-category');
    };

    document.getElementById('btn-create-board').onclick = () => {
        showModal('modal-create-board');
    };

    document.getElementById('btn-create-thread').onclick = () => {
        showModal('modal-create-thread');
    };

    document.getElementById('btn-submit-category').onclick = () => {
        const name = document.getElementById('input-category-name').value;
        if (name.trim()) {
            createCategory(name);
            document.getElementById('input-category-name').value = '';
        }
    };

    document.getElementById('btn-submit-board').onclick = () => {
        const name = document.getElementById('input-board-name').value;
        const code = document.getElementById('input-board-code').value;
        const desc = document.getElementById('input-board-desc').value;
        if (name.trim() && code.trim()) {
            createBoard(name, code, desc);
            document.getElementById('input-board-name').value = '';
            document.getElementById('input-board-code').value = '';
            document.getElementById('input-board-desc').value = '';
        }
    };

    document.getElementById('btn-submit-thread').onclick = () => {
        const title = document.getElementById('input-thread-title').value;
        const content = document.getElementById('input-thread-content').value;
        if (title.trim() && content.trim()) {
            createThread(title, content);
            document.getElementById('input-thread-title').value = '';
            document.getElementById('input-thread-content').value = '';
        }
    };

    document.getElementById('btn-submit-reply').onclick = () => {
        const content = document.getElementById('reply-content').value;
        if (content.trim()) {
            createPost(content);
        }
    };

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = function() {
            this.parentElement.parentElement.style.display = 'none';
        };
    });

    // Close modals on outside click
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}
