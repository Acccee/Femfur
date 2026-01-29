// Supabase Configuration
// ВАЖНО: Замените эти значения на ваши реальные ключи из Supabase Dashboard
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase;
let currentBoard = null;
let currentThread = null;

// Initialize Supabase
function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('⚠️ Пожалуйста, настройте Supabase ключи в app.js');
        return false;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
}

// Board definitions
const boards = {
    anime: { name: 'Аниме & Манга', description: 'Обсуждение аниме и манги' },
    jp: { name: 'Японская культура', description: 'Всё о Японии' },
    otaku: { name: 'Отаку культура', description: 'Отаку жизнь' },
    v: { name: 'Видеоигры', description: 'Обсуждение видеоигр' },
    vr: { name: 'Ретро игры', description: 'Старые игры' },
    vm: { name: 'Видеоигры/Мультиплеер', description: 'Мультиплеерные игры' },
    tech: { name: 'Технологии', description: 'Технологии и программирование' },
    mu: { name: 'Музыка', description: 'Музыка и музыканты' },
    tv: { name: 'ТВ и Кино', description: 'Фильмы и сериалы' },
    lit: { name: 'Литература', description: 'Книги и чтение' },
    art: { name: 'Искусство', description: 'Рисование и творчество' },
    design: { name: 'Дизайн', description: 'Графический дизайн' },
    photo: { name: 'Фотография', description: 'Фото и фотография' },
    b: { name: 'Random', description: 'Случайные темы' },
    pol: { name: 'Политика', description: 'Политические дискуссии' },
    news: { name: 'Новости', description: 'Новости мира' }
};

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} д назад`;
    
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generatePostId() {
    return Math.floor(Math.random() * 1000000000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPostText(text) {
    let formatted = escapeHtml(text);
    
    // Greentext
    formatted = formatted.replace(/^&gt;(.+)$/gm, '<span class="greentext">&gt;$1</span>');
    
    // Links
    formatted = formatted.replace(/&gt;&gt;(\d+)/g, '<a href="#" class="quote-link" data-post-id="$1">&gt;&gt;$1</a>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
}

function showHome() {
    showPage('home');
    currentBoard = null;
    currentThread = null;
}

async function showBoard(boardCode) {
    if (!supabase) {
        alert('Supabase не настроен. Пожалуйста, добавьте ваши ключи в app.js');
        return;
    }

    currentBoard = boardCode;
    currentThread = null;
    showPage('board');
    
    const board = boards[boardCode];
    document.getElementById('board-title').textContent = `/${boardCode}/ - ${board.name}`;
    
    await loadThreads(boardCode);
}

async function showThread(threadId) {
    if (!supabase) return;
    
    currentThread = threadId;
    showPage('thread');
    
    await loadThread(threadId);
}

// Supabase operations
async function loadThreads(boardCode) {
    const container = document.getElementById('threads-container');
    container.innerHTML = '<div class="loading">Загрузка тредов...</div>';
    
    try {
        const { data: threads, error } = await supabase
            .from('threads')
            .select(`
                *,
                posts:posts(count)
            `)
            .eq('board', boardCode)
            .order('bumped_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (!threads || threads.length === 0) {
            container.innerHTML = '<div class="loading">Нет тредов. Создайте первый!</div>';
            return;
        }
        
        container.innerHTML = threads.map(thread => `
            <div class="thread-preview" data-thread-id="${thread.id}">
                <div class="post-header">
                    <span class="post-name">Аноним</span>
                    <span class="post-date">${formatDate(thread.created_at)}</span>
                    <span class="post-no">№${thread.id}</span>
                </div>
                ${thread.subject ? `<div class="post-subject">${escapeHtml(thread.subject)}</div>` : ''}
                ${thread.image_url ? `<img src="${thread.image_url}" class="post-image" alt="Изображение">` : ''}
                <div class="post-text">${formatPostText(thread.text)}</div>
                <div class="thread-stats">
                    Ответов: ${thread.posts ? thread.posts[0].count : 0}
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        document.querySelectorAll('.thread-preview').forEach(preview => {
            preview.addEventListener('click', () => {
                const threadId = preview.dataset.threadId;
                showThread(threadId);
            });
        });
    } catch (error) {
        console.error('Error loading threads:', error);
        container.innerHTML = `<div class="loading">Ошибка загрузки: ${error.message}</div>`;
    }
}

async function loadThread(threadId) {
    const container = document.getElementById('thread-container');
    container.innerHTML = '<div class="loading">Загрузка треда...</div>';
    
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
        
        // Render thread
        let html = `
            <div class="post op-post">
                <div class="post-header">
                    <span class="post-name">Аноним</span>
                    <span class="post-date">${formatDate(thread.created_at)}</span>
                    <span class="post-no">№${thread.id}</span>
                </div>
                ${thread.subject ? `<div class="post-subject">${escapeHtml(thread.subject)}</div>` : ''}
                ${thread.image_url ? `<img src="${thread.image_url}" class="post-image" alt="Изображение">` : ''}
                <div class="post-text">${formatPostText(thread.text)}</div>
            </div>
        `;
        
        if (posts && posts.length > 0) {
            html += posts.map(post => `
                <div class="post reply-post">
                    <div class="post-header">
                        <span class="post-name">Аноним</span>
                        <span class="post-date">${formatDate(post.created_at)}</span>
                        <span class="post-no">№${post.id}</span>
                    </div>
                    ${post.image_url ? `<img src="${post.image_url}" class="post-image" alt="Изображение">` : ''}
                    <div class="post-text">${formatPostText(post.text)}</div>
                </div>
            `).join('');
        }
        
        container.innerHTML = html;
        
        // Show reply form
        showReplyForm();
    } catch (error) {
        console.error('Error loading thread:', error);
        container.innerHTML = `<div class="loading">Ошибка загрузки: ${error.message}</div>`;
    }
}

function showReplyForm() {
    const container = document.getElementById('reply-form-container');
    container.innerHTML = `
        <h3>Ответить в тред</h3>
        <form id="reply-form">
            <textarea id="reply-text" placeholder="Текст сообщения" required maxlength="2000"></textarea>
            <input type="file" id="reply-image" accept="image/*">
            <button type="submit" class="btn-primary">Отправить</button>
        </form>
    `;
    
    document.getElementById('reply-form').addEventListener('submit', handleReplySubmit);
}

// Form handlers
async function handleThreadSubmit(e) {
    e.preventDefault();
    
    if (!supabase) {
        alert('Supabase не настроен');
        return;
    }
    
    const subject = document.getElementById('thread-subject').value.trim();
    const text = document.getElementById('thread-text').value.trim();
    const imageFile = document.getElementById('thread-image').files[0];
    
    if (!text) {
        alert('Введите текст сообщения');
        return;
    }
    
    try {
        let imageUrl = null;
        
        // Upload image if provided
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, imageFile);
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
            
            imageUrl = urlData.publicUrl;
        }
        
        // Create thread
        const { data: thread, error: threadError } = await supabase
            .from('threads')
            .insert({
                board: currentBoard,
                subject: subject || null,
                text: text,
                image_url: imageUrl,
                bumped_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (threadError) throw threadError;
        
        // Close modal and reload board
        closeThreadModal();
        await loadThreads(currentBoard);
        
        alert('Тред создан!');
    } catch (error) {
        console.error('Error creating thread:', error);
        alert(`Ошибка создания треда: ${error.message}`);
    }
}

async function handleReplySubmit(e) {
    e.preventDefault();
    
    if (!supabase) return;
    
    const text = document.getElementById('reply-text').value.trim();
    const imageFile = document.getElementById('reply-image').files[0];
    
    if (!text) {
        alert('Введите текст сообщения');
        return;
    }
    
    try {
        let imageUrl = null;
        
        // Upload image if provided
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, imageFile);
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
            
            imageUrl = urlData.publicUrl;
        }
        
        // Create post
        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                thread_id: currentThread,
                text: text,
                image_url: imageUrl
            })
            .select()
            .single();
        
        if (postError) throw postError;
        
        // Update thread bump time
        await supabase
            .from('threads')
            .update({ bumped_at: new Date().toISOString() })
            .eq('id', currentThread);
        
        // Reload thread
        await loadThread(currentThread);
        
        document.getElementById('reply-text').value = '';
        document.getElementById('reply-image').value = '';
    } catch (error) {
        console.error('Error creating reply:', error);
        alert(`Ошибка создания ответа: ${error.message}`);
    }
}

// Modal handlers
function openThreadModal() {
    document.getElementById('thread-modal').classList.add('active');
}

function closeThreadModal() {
    document.getElementById('thread-modal').classList.remove('active');
    document.getElementById('thread-form').reset();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    const supabaseReady = initSupabase();
    
    if (!supabaseReady) {
        console.error('❌ Supabase не инициализирован. Следуйте инструкциям в README.md');
    }
    
    // Navigation handlers
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page === 'home') showHome();
        });
    });
    
    document.querySelectorAll('[data-board]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const board = link.dataset.board;
            showBoard(board);
        });
    });
    
    // New thread button
    document.getElementById('new-thread-btn').addEventListener('click', openThreadModal);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeThreadModal);
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('thread-modal');
        if (e.target === modal) {
            closeThreadModal();
        }
    });
    
    // Thread form
    document.getElementById('thread-form').addEventListener('submit', handleThreadSubmit);
    
    // Back to board button
    document.getElementById('back-to-board').addEventListener('click', () => {
        if (currentBoard) {
            showBoard(currentBoard);
        } else {
            showHome();
        }
    });
});
