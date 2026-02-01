// gif-picker.js – Klipy GIF Picker Integration (Tenor Alternative)

// ⚠️ Получите ваш API ключ здесь: https://partner.klipy.com
const KLIPY_API_KEY = 'yvqj3uv2Z8QVxphbKlqyRjmfQH5dYEqKD6zaOv1MK9JjqzaqZWavDxoMiKvVaMM4';

const KLIPY_BASE = 'https://api.klipy.com';

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

// ─── Search Klipy ────────────────────────────────────────────────
async function searchGifs(query) {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;

    gifResults.innerHTML = '<div class="gif-loading">Поиск…</div>';

    if (KLIPY_API_KEY === 'YOUR_KLIPY_API_KEY_HERE') {
        gifResults.innerHTML = `
            <div class="gif-no-key">
                <p>🔑 API ключ Klipy не настроен.</p>
                <p>Замените <code>YOUR_KLIPY_API_KEY_HERE</code> в файле скрипта ключом из <a href="https://partner.klipy.com" target="_blank">partner.klipy.com</a></p>
            </div>`;
        return;
    }

    try {
        const url = `${KLIPY_BASE}/search?q=${encodeURIComponent(query)}&key=${KLIPY_API_KEY}&limit=12`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Klipy API ${res.status}`);
        const json = await res.json();
        renderGifs(json.results || []);
    } catch (err) {
        console.error('Klipy search error:', err);
        gifResults.innerHTML = '<div class="gif-error">Ошибка загрузки GIF. Проверьте ключ API.</div>';
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
        // Klipy v2 сохраняет структуру Tenor для легкого перехода
        const media = gif.media_formats || gif.media || {};
        const thumb = media.tinygif?.url || media.gif?.url || '';
        const gifUrl = gif.url || '';

        return `
            <div class="gif-item" data-url="${escapeHtml(gifUrl)}" data-thumb="${escapeHtml(thumb)}">
                <img src="${escapeHtml(thumb)}" alt="gif" loading="lazy">
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
