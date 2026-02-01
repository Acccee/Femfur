// gif-picker.js – GIPHY GIF Picker Integration (Fixed Version)

// API-ключ GIPHY
const GIPHY_API_KEY = 'klPbJhZNWOjGSvJBKXA43BVR6c61wRSh';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

// ─── Инициализация при загрузке DOM ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const gifBtn    = document.getElementById('gifPickerBtn');
    const gifPanel  = document.getElementById('gifPickerPanel');
    const gifSearch = document.getElementById('gifSearchInput');

    if (!gifBtn) return; // Выход, если на странице нет кнопки выбора GIF

    // Переключение видимости панели
    gifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = gifPanel.style.display === 'flex';
        gifPanel.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen && gifSearch) gifSearch.focus();
    });

    // Закрытие панели при клике вне её области
    document.addEventListener('click', (e) => {
        if (gifPanel && !gifPanel.contains(e.target) && e.target !== gifBtn) {
            gifPanel.style.display = 'none';
        }
    });

    // Поиск при нажатии Enter или через 600мс после ввода (debounce)
    let debounceTimer = null;
    if (gifSearch) {
        gifSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(debounceTimer);
                searchGifs(gifSearch.value.trim());
            }
        });
        gifSearch.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = gifSearch.value.trim();
                if (query.length > 0) searchGifs(query);
            }, 600);
        });
    }
});

// ─── Поиск в GIPHY ─────────────────────────────────────────────
async function searchGifs(query) {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;

    gifResults.innerHTML = '<div class="gif-loading">Searching…</div>';

    try {
        // Параметр rating=g гарантирует безопасный контент
        const url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=15&rating=g`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error(`GIPHY API Error: ${res.status}`);
        
        const json = await res.json();
        renderGifs(json.data || []);
    } catch (err) {
        console.error('GIPHY search error:', err);
        gifResults.innerHTML = '<div class="gif-error">Failed to load GIFs.</div>';
    }
}

// ─── Рендеринг сетки GIF ─────────────────────────────────────────
function renderGifs(gifs) {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;

    if (gifs.length === 0) {
        gifResults.innerHTML = '<div class="gif-empty">No GIFs found.</div>';
        return;
    }

    gifResults.innerHTML = gifs.map(gif => {
        // Для превью используем пожатую версию, чтобы панель быстро грузилась
        const thumb = gif.images?.fixed_height_small?.url || gif.images?.original?.url;
        
        // ВАЖНО: Формируем прямую ссылку i.giphy.com, которая не блокируется на форумах
        const directGifUrl = `https://i.giphy.com/media/${gif.id}/giphy.gif`; 

        return `
            <div class="gif-item" data-url="${escapeHtml(directGifUrl)}" data-thumb="${escapeHtml(thumb)}">
                <img src="${escapeHtml(thumb)}" alt="${escapeHtml(gif.title)}" loading="lazy" style="cursor:pointer; width:100%; display:block;">
            </div>`;
    }).join('');

    // Навешиваем клики на новые элементы
    gifResults.querySelectorAll('.gif-item').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            insertGifUrl(url);

            const panel = document.getElementById('gifPickerPanel');
            if (panel) panel.style.display = 'none';
        });
    });
}

// ─── Вставка ссылки в активное текстовое поле ────────────────────
function insertGifUrl(url) {
    // Список ID полей, в которые можно вставить GIF
    const targets = ['replyText', 'newThreadContent', 'editThreadContent'];
    
    for (const id of targets) {
        const ta = document.getElementById(id);
        // Проверяем, существует ли поле и активно ли оно (или видимо)
        if (ta && (ta === document.activeElement || ta.offsetParent !== null)) {
            const start = ta.selectionStart;
            const end   = ta.selectionEnd;
            const text  = ta.value;
            
            // Вставляем ссылку и добавляем перенос строки
            ta.value = text.substring(0, start) + url + '\n' + text.substring(end);
            
            // Перемещаем курсор в конец вставки
            ta.selectionStart = ta.selectionEnd = start + url.length + 1;
            ta.focus();
            return;
        }
    }
    
    // Резервный вариант: просто добавляем в поле ответа
    const fallback = document.getElementById('replyText');
    if (fallback) {
        fallback.value += (fallback.value ? '\n' : '') + url;
        fallback.focus();
    }
}

// ─── Вспомогательная функция защиты от XSS ────────────────────────
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
