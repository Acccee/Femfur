// gif-picker.js – GIPHY GIF Picker Integration

// API-ключ GIPHY
const GIPHY_API_KEY = 'klPbJhZNWOjGSvJBKXA43BVR6c61wRSh';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

// ─── Initialize on DOM ready ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const gifBtn    = document.getElementById('gifPickerBtn');
    const gifPanel  = document.getElementById('gifPickerPanel');
    const gifSearch = document.getElementById('gifSearchInput');

    if (!gifBtn) return;

    // Toggle panel
    gifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = gifPanel.style.display !== 'none';
        gifPanel.style.display = open ? 'none' : 'flex';
        if (!open && gifSearch) gifSearch.focus();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (gifPanel && !gifPanel.contains(e.target) && e.target !== gifBtn) {
            gifPanel.style.display = 'none';
        }
    });

    // Search on Enter or after 600 ms debounce
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
                const q = gifSearch.value.trim();
                if (q.length > 0) searchGifs(q);
            }, 600);
        });
    }
});

// ─── Search GIPHY ────────────────────────────────────────────────
async function searchGifs(query) {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;

    gifResults.innerHTML = '<div class="gif-loading">Searching…</div>';

    try {
        // У GIPHY параметры: api_key, q, limit
        const url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error(`GIPHY API ${res.status}`);
        
        const json = await res.json();
        // Данные GIPHY находятся в поле .data
        renderGifs(json.data || []);
    } catch (err) {
        console.error('GIPHY search error:', err);
        gifResults.innerHTML = '<div class="gif-error">Failed to load GIFs. Check your API key.</div>';
    }
}

// ─── Render GIF grid ─────────────────────────────────────────────
function renderGifs(gifs) {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;

    if (gifs.length === 0) {
        gifResults.innerHTML = '<div class="gif-empty">No GIFs found.</div>';
        return;
    }

    gifResults.innerHTML = gifs.map(gif => {
        // У GIPHY берем фиксированную высоту для превью и оригинальный URL для вставки
        const thumb = gif.images?.fixed_height_small?.url || gif.images?.original?.url;
        const gifUrl = gif.images?.original?.url; 

        return `
            <div class="gif-item" data-url="${escapeHtml(gifUrl)}" data-thumb="${escapeHtml(thumb)}">
                <img src="${escapeHtml(thumb)}" alt="${escapeHtml(gif.title)}" loading="lazy">
            </div>`;
    }).join('');

    // Click handlers
    gifResults.querySelectorAll('.gif-item').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            insertGifUrl(url);

            const panel = document.getElementById('gifPickerPanel');
            if (panel) panel.style.display = 'none';
        });
    });
}

// ─── Insert GIF URL into active textarea ─────────────────────────
function insertGifUrl(url) {
    const targets = ['replyText', 'newThreadContent', 'editThreadContent'];
    for (const id of targets) {
        const ta = document.getElementById(id);
        if (ta && (ta === document.activeElement || ta.offsetParent !== null)) {
            const start = ta.selectionStart;
            const end   = ta.selectionEnd;
            const text  = ta.value;
            ta.value = text.substring(0, start) + url + '\n' + text.substring(end);
            ta.selectionStart = ta.selectionEnd = start + url.length + 1;
            ta.focus();
            return;
        }
    }
    const fallback = document.getElementById('replyText');
    if (fallback) {
        fallback.value += (fallback.value ? '\n' : '') + url;
        fallback.focus();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
