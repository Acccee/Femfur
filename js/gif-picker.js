// gif-picker.js – Tenor GIF Picker Integration

// ⚠️  Replace with your own Tenor API key:
// https://developers.tenor.com/
const TENOR_API_KEY = 'YOUR_TENOR_API_KEY_HERE';

const TENOR_BASE = 'https://api.tenor.com/v2';

// ─── Initialize on DOM ready ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const gifBtn    = document.getElementById('gifPickerBtn');
    const gifPanel  = document.getElementById('gifPickerPanel');
    const gifSearch = document.getElementById('gifSearchInput');
    const gifResults= document.getElementById('gifResults');

    if (!gifBtn) return; // not on a page with the GIF picker

    // Toggle panel
    gifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = gifPanel.style.display !== 'none';
        gifPanel.style.display = open ? 'none' : 'flex';
        if (!open && gifSearch) gifSearch.focus();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!gifPanel.contains(e.target) && e.target !== gifBtn) {
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

// ─── Search Tenor ────────────────────────────────────────────────
async function searchGifs(query) {
    const gifResults = document.getElementById('gifResults');
    if (!gifResults) return;

    gifResults.innerHTML = '<div class="gif-loading">Searching…</div>';

    // If key is placeholder, show message
    if (TENOR_API_KEY === 'YOUR_TENOR_API_KEY_HERE') {
        gifResults.innerHTML = `
            <div class="gif-no-key">
                <p>🔑 Tenor API key not configured.</p>
                <p>Open <code>js/gif-picker.js</code> and replace <code>YOUR_TENOR_API_KEY_HERE</code> with your key from <a href="https://developers.tenor.com/" target="_blank">developers.tenor.com</a></p>
            </div>`;
        return;
    }

    try {
        const url = `${TENOR_BASE}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=12`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Tenor API ${res.status}`);
        const json = await res.json();
        renderGifs(json.results || []);
    } catch (err) {
        console.error('Tenor search error:', err);
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
        // Use the tinygif or gif media (smallest preview)
        const media  = gif.media_object || gif.media;
        const thumb  = media?.tinygif?.url || media?.gif?.url || '';
        const gifUrl = gif.url || '';                 // e.g. https://tenor.com/view/...

        return `
            <div class="gif-item" data-url="${escapeHtml(gifUrl)}" data-thumb="${escapeHtml(thumb)}">
                <img src="${escapeHtml(thumb)}" alt="gif" loading="lazy">
            </div>`;
    }).join('');

    // Click handlers — insert URL into textarea
    gifResults.querySelectorAll('.gif-item').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            insertGifUrl(url);

            // Close panel
            const panel = document.getElementById('gifPickerPanel');
            if (panel) panel.style.display = 'none';
        });
    });
}

// ─── Insert GIF URL into active textarea ─────────────────────────
function insertGifUrl(url) {
    // Try replyText first, then newThreadContent
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
    // Fallback: append to replyText
    const fallback = document.getElementById('replyText');
    if (fallback) {
        fallback.value += (fallback.value ? '\n' : '') + url;
        fallback.focus();
    }
}

// ─── Helper ──────────────────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
