// Application State
let currentUser = null;
let currentThreadId = null;

// ==================== THEME SYSTEM ====================
class ThemeManager {
    constructor() {
        this.themes = ['light', 'dark', 'mono'];
        this.currentThemeIndex = 0;
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        this.setupEventListeners();
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentThemeIndex = this.themes.indexOf(theme);
        this.updateThemeButton();
    }

    cycleTheme() {
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
        this.setTheme(this.themes[this.currentThemeIndex]);
    }

    updateThemeButton() {
        const btn = document.getElementById('themeToggle');
        const icons = { light: '☀️', dark: '🌙', mono: '⬛' };
        btn.textContent = icons[this.themes[this.currentThemeIndex]];
    }

    setupEventListeners() {
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.cycleTheme();
        });
    }
}

// ==================== SETTINGS MANAGER ====================
class SettingsManager {
    constructor() {
        this.settings = {
            fontSize: 'medium',
            density: 'normal',
            animations: true
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.applySettings();
        this.setupEventListeners();
    }

    loadSettings() {
        const saved = localStorage.getItem('userSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('userSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    applySettings() {
        document.documentElement.setAttribute('data-font-size', this.settings.fontSize);
        document.documentElement.setAttribute('data-density', this.settings.density);
        document.documentElement.setAttribute('data-animations', this.settings.animations);

        // Update UI controls
        document.getElementById('fontSizeSetting').value = this.settings.fontSize;
        document.getElementById('densitySetting').value = this.settings.density;
        document.getElementById('animationsSetting').checked = this.settings.animations;
    }

    setupEventListeners() {
        document.getElementById('fontSizeSetting').addEventListener('change', (e) => {
            this.settings.fontSize = e.target.value;
            this.saveSettings();
        });

        document.getElementById('densitySetting').addEventListener('change', (e) => {
            this.settings.density = e.target.value;
            this.saveSettings();
        });

        document.getElementById('animationsSetting').addEventListener('change', (e) => {
            this.settings.animations = e.target.checked;
            this.saveSettings();
        });
    }
}

// ==================== MODAL MANAGER ====================
class ModalManager {
    static open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    static setupCloseButtons() {
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }
}

// ==================== MESSAGE DISPLAY ====================
function showMessage(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// ==================== AUTHENTICATION ====================
async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showMessage('authMessage', 'Заполните все поля', 'error');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: `${username}@miracula.local`,
            password: password
        });

        if (error) throw error;

        currentUser = { username, id: data.user.id };
        updateUIForAuthState(true);
        showMessage('authMessage', 'Вход выполнен успешно!', 'success');
        
        setTimeout(() => {
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
        }, 1000);

    } catch (error) {
        showMessage('authMessage', 'Неверное имя пользователя или пароль', 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showMessage('authMessage', 'Заполните все поля', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('authMessage', 'Пароль должен содержать минимум 6 символов', 'error');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: `${username}@miracula.local`,
            password: password,
            options: {
                data: { username: username }
            }
        });

        if (error) throw error;

        showMessage('authMessage', 'Регистрация успешна! Теперь войдите.', 'success');
        
    } catch (error) {
        showMessage('authMessage', 'Ошибка регистрации. Попробуйте другое имя.', 'error');
    }
}

function updateUIForAuthState(isAuthenticated) {
    const authBtn = document.getElementById('authBtn');
    const createThreadBtn = document.getElementById('createThreadBtn');

    if (isAuthenticated) {
        authBtn.textContent = 'Выйти';
        authBtn.onclick = handleLogout;
        createThreadBtn.style.display = 'block';
    } else {
        authBtn.textContent = 'Войти';
        authBtn.onclick = showAuthSection;
        createThreadBtn.style.display = 'none';
    }
}

function handleLogout() {
    supabase.auth.signOut();
    currentUser = null;
    updateUIForAuthState(false);
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('authSection').style.display = 'none';
    loadThreads();
}

function showAuthSection() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('authSection').style.display = 'block';
}

// ==================== THREAD CREATION - FIXED VALIDATION ====================
async function handleCreateThread(e) {
    e.preventDefault();

    // FIXED: Proper validation that doesn't interfere with other forms
    const titleInput = document.getElementById('threadTitle');
    const contentInput = document.getElementById('threadContent');
    const imageInput = document.getElementById('threadImage');
    const anonymousCheckbox = document.getElementById('postAnonymously');

    // Get trimmed values
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const isAnonymous = anonymousCheckbox.checked;

    // Clear any previous messages
    const messageElement = document.getElementById('threadMessage');
    messageElement.style.display = 'none';

    // CRITICAL FIX: Validate only the actual thread form fields
    if (!title || !content) {
        showMessage('threadMessage', 'Заполните все обязательные поля', 'error');
        return;
    }

    if (!currentUser && !isAnonymous) {
        showMessage('threadMessage', 'Войдите или отметьте "Опубликовать анонимно"', 'error');
        return;
    }

    try {
        // Handle image upload if present
        let imageUrl = null;
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        // Create thread in database
        const { data, error } = await supabase
            .from('threads')
            .insert([{
                title: title,
                content: content,
                author: isAnonymous ? 'Аноним' : currentUser.username,
                user_id: currentUser ? currentUser.id : null,
                image_url: imageUrl,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        showMessage('threadMessage', 'Тред создан успешно!', 'success');
        
        // Reset form
        document.getElementById('createThreadForm').reset();
        
        // Close modal and reload threads
        setTimeout(() => {
            ModalManager.close('createThreadModal');
            loadThreads();
        }, 1000);

    } catch (error) {
        console.error('Error creating thread:', error);
        showMessage('threadMessage', 'Ошибка создания треда. Попробуйте снова.', 'error');
    }
}

// ==================== THREAD LOADING ====================
async function loadThreads() {
    const threadList = document.getElementById('threadList');
    threadList.innerHTML = '<div class="loading">Загрузка тредов</div>';

    try {
        const { data: threads, error } = await supabase
            .from('threads')
            .select(`
                *,
                posts(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!threads || threads.length === 0) {
            threadList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Пока нет тредов. Создайте первый!</p>';
            return;
        }

        threadList.innerHTML = threads.map(thread => `
            <div class="thread-item" onclick="openThread('${thread.id}')">
                <div class="thread-header">
                    <div>
                        <h3 class="thread-title">${escapeHtml(thread.title)}</h3>
                        <div class="thread-meta">
                            ${escapeHtml(thread.author)} • ${formatDate(thread.created_at)}
                        </div>
                    </div>
                </div>
                <div class="thread-preview">${escapeHtml(thread.content)}</div>
                ${thread.image_url ? `<img src="${thread.image_url}" class="thread-image" alt="Thread image">` : ''}
                <div class="thread-stats">
                    <span>💬 ${thread.posts?.[0]?.count || 0} ответов</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading threads:', error);
        threadList.innerHTML = '<p style="text-align: center; color: var(--error-color); padding: 40px;">Ошибка загрузки тредов</p>';
    }
}

// ==================== THREAD VIEW ====================
async function openThread(threadId) {
    currentThreadId = threadId;
    ModalManager.open('threadModal');

    const threadView = document.getElementById('threadView');
    threadView.innerHTML = '<div class="loading">Загрузка треда</div>';

    try {
        // Load thread
        const { data: thread, error: threadError } = await supabase
            .from('threads')
            .select('*')
            .eq('id', threadId)
            .single();

        if (threadError) throw threadError;

        // Load posts
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        if (postsError) throw postsError;

        // Display thread
        document.getElementById('threadModalTitle').textContent = thread.title;

        let html = `
            <div class="post-item">
                <div class="post-header">
                    <strong>${escapeHtml(thread.author)}</strong>
                    <span>${formatDate(thread.created_at)}</span>
                </div>
                <div class="post-content">${escapeHtml(thread.content)}</div>
                ${thread.image_url ? `<img src="${thread.image_url}" style="max-width: 100%; margin-top: 10px; border-radius: 6px;" alt="Thread image">` : ''}
            </div>
        `;

        if (posts && posts.length > 0) {
            html += '<h4 style="margin: 20px 0 10px; color: var(--text-secondary);">Ответы:</h4>';
            html += posts.map(post => `
                <div class="post-item">
                    <div class="post-header">
                        <strong>${escapeHtml(post.author)}</strong>
                        <span>${formatDate(post.created_at)}</span>
                    </div>
                    <div class="post-content">${escapeHtml(post.content)}</div>
                </div>
            `).join('');
        }

        threadView.innerHTML = html;

        // Show reply section if authenticated
        if (currentUser) {
            document.getElementById('replySection').style.display = 'block';
        }

    } catch (error) {
        console.error('Error loading thread:', error);
        threadView.innerHTML = '<p style="color: var(--error-color);">Ошибка загрузки треда</p>';
    }
}

// ==================== REPLY HANDLING ====================
async function handleReply(e) {
    e.preventDefault();

    const content = document.getElementById('replyContent').value.trim();

    if (!content) {
        showMessage('replyMessage', 'Введите текст ответа', 'error');
        return;
    }

    if (!currentUser) {
        showMessage('replyMessage', 'Войдите, чтобы оставить ответ', 'error');
        return;
    }

    try {
        const { error } = await supabase
            .from('posts')
            .insert([{
                thread_id: currentThreadId,
                content: content,
                author: currentUser.username,
                user_id: currentUser.id,
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;

        document.getElementById('replyContent').value = '';
        showMessage('replyMessage', 'Ответ добавлен!', 'success');
        
        // Reload thread
        setTimeout(() => {
            openThread(currentThreadId);
        }, 1000);

    } catch (error) {
        console.error('Error posting reply:', error);
        showMessage('replyMessage', 'Ошибка отправки ответа', 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} д. назад`;

    return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    const themeManager = new ThemeManager();
    const settingsManager = new SettingsManager();
    ModalManager.setupCloseButtons();

    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            currentUser = {
                username: session.user.user_metadata.username || session.user.email.split('@')[0],
                id: session.user.id
            };
            updateUIForAuthState(true);
        } else {
            updateUIForAuthState(false);
        }
        loadThreads();
    });

    // Auth event listeners
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);
    document.getElementById('cancelAuthBtn').addEventListener('click', () => {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    });

    // Modal triggers
    document.getElementById('settingsBtn').addEventListener('click', () => {
        ModalManager.open('settingsModal');
    });

    document.getElementById('changelogBtn').addEventListener('click', () => {
        ModalManager.open('changelogModal');
    });

    document.getElementById('createThreadBtn').addEventListener('click', () => {
        ModalManager.open('createThreadModal');
    });

    // Form submissions
    document.getElementById('createThreadForm').addEventListener('submit', handleCreateThread);
    document.getElementById('replyForm').addEventListener('submit', handleReply);

    // Cancel buttons
    document.querySelector('.cancel-thread').addEventListener('click', () => {
        ModalManager.close('createThreadModal');
        document.getElementById('createThreadForm').reset();
    });

    // Enter key for login
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
});
