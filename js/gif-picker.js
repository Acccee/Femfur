
const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY_HERE';

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

// ─── Initialize on DOM ready ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const gifBtn    = document.getElementById('gifPickerBtn');
    const gifPanel  = document.getElementById('gifPickerPanel');
    const gifSearch = document.getElementById('gifSearchInput');
    const gifResults= document.getElementById('gifResults');

    if (!gifBtn) return;

    gifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = gifPanel.style.display !== 'none';
        gifPanel.style.display = open ? 'none' : 'flex';
        if (!open && gifSearch) gifSearch.focus();
    });

    document.addEventListener('click', (e) => {
        if (!gifPanel.contains(e.target) && e.target !== gifBtn) {
            gifPanel.style.display = 'none';
        }
    });

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

    gifResults.innerHTML = '<div class="gif-loading">Поиск…</div>';

    if (GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY_HERE') {
        gifResults.innerHTML = `
            <div class="gif-no-key">
                <p>🔑 GIPHY API key not configured.</p>
                <p>Open <code>js/gif-picker.js</code> and replace <code>YOUR_GIPHY_API_KEY_HERE</code> with your key from <a href="https://developers.giphy.com/dashboard/" target="_blank">developers.giphy.com</a></p>
            </div>`;
        return;
    }

    try {
        // GIPHY search endpoint: https://api.giphy.com/v1/gifs/search
        const url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=pg`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`GIPHY API ${res.status}`);
        const json = await res.json();
        renderGifs(json.data || []); // GIPHY использует поле 'data'
    } catch (err) {
        console.error('GIPHY search error:', err);
        gifResults.innerHTML = '<div class="gif-error">Ошибка загрузки GIF. Проверьте ваш API-ключ.</div>';
    }
}

// ─── Render GIF grid ─────────────────────────────────────────────
function renderGifs(gifs) {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;

    if (gifs.length === 0) {
        gifResults.innerHTML = '<div class="gif-empty">Ничего не найдено.</div>';
        return;
    }

    gifResults.innerHTML = gifs.map(gif => {
        // GIPHY использует другую структуру объектов изображений
        const thumbUrl  = gif.images.fixed_height_small_still.url || ''; // Маленькая превьюшка
        const gifUrl    = gif.url || '';                 // Ссылка на страницу GIPHY

        return `
            <div class="gif-item" data-url="${escapeHtml(gifUrl)}" data-thumb="${escapeHtml(thumbUrl)}">
                <img src="${escapeHtml(thumbUrl)}" alt="gif" loading="lazy">
            </div>`;
    }).join('');

    gifResults.querySelectorAll('.gif-item').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            insertGifUrl(url);

            const panel = document.getElementById('gifPickerPanel');
            if (panel) panel.style.display = 'none';
        });
    });
}

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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
