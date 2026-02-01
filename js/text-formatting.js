// text-formatting.js - Text Formatting Module (Markdown-like)

import { parseLinks } from './link-parser.js';

// Format text with markdown-like syntax
function formatText(text) {
    if (!text) return '';
    
    let formatted = text;
    
    // Escape HTML first
    formatted = escapeHtml(formatted);
    
    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Monospace/Code: `text`
    formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Code block: ```text```
    formatted = formatted.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
    
    // Strikethrough: ~~text~~
    formatted = formatted.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Spoiler: ||text||
    formatted = formatted.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
    
    // Color text: [color:red]text[/color] or [#FF0000]text[/color]
    formatted = formatted.replace(/\[color:(\w+)\](.+?)\[\/color\]/g, '<span style="color: $1">$2</span>');
    formatted = formatted.replace(/\[(#[0-9A-Fa-f]{6})\](.+?)\[\/color\]/g, '<span style="color: $1">$2</span>');
    
    // Greentext: >text (at start of line)
    formatted = formatted.replace(/^&gt;(.+)$/gm, '<span class="greentext">&gt;$1</span>');
    
    // Quote: >>number
    formatted = formatted.replace(/&gt;&gt;(\d+)/g, '<span class="thread-quote" data-reply-num="$1">&gt;&gt;$1</span>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Parse URLs and make them clickable (AFTER all other formatting)
    formatted = parseLinks(formatted);
    
    return formatted;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add formatting toolbar to textarea
function addFormattingToolbar(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    const toolbar = document.createElement('div');
    toolbar.className = 'formatting-toolbar';
    toolbar.innerHTML = `
        <button type="button" class="format-btn" data-format="bold" title="Bold (Ctrl+B)">
            <strong>B</strong>
        </button>
        <button type="button" class="format-btn" data-format="italic" title="Italic (Ctrl+I)">
            <em>I</em>
        </button>
        <button type="button" class="format-btn" data-format="code" title="Code">
            <code>{'{ }'}</code>
        </button>
        <button type="button" class="format-btn" data-format="strike" title="Strikethrough">
            <del>S</del>
        </button>
        <button type="button" class="format-btn" data-format="spoiler" title="Spoiler">
            ||•||
        </button>
        <button type="button" class="format-btn" data-format="color" title="Color">
            🎨
        </button>
        <button type="button" class="format-btn" data-format="greentext" title="Greentext">
            &gt;
        </button>
    `;
    
    // Insert toolbar before textarea
    textarea.parentNode.insertBefore(toolbar, textarea);
    
    // Add click handlers
    toolbar.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const format = btn.dataset.format;
            applyFormatting(textarea, format);
        });
    });
    
    // Keyboard shortcuts
    textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
                e.preventDefault();
                applyFormatting(textarea, 'bold');
            } else if (e.key === 'i') {
                e.preventDefault();
                applyFormatting(textarea, 'italic');
            }
        }
    });
}

// Apply formatting to selected text
function applyFormatting(textarea, format) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch (format) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            cursorOffset = selectedText ? formattedText.length : 2;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            cursorOffset = selectedText ? formattedText.length : 1;
            break;
        case 'code':
            formattedText = `\`${selectedText}\``;
            cursorOffset = selectedText ? formattedText.length : 1;
            break;
        case 'strike':
            formattedText = `~~${selectedText}~~`;
            cursorOffset = selectedText ? formattedText.length : 2;
            break;
        case 'spoiler':
            formattedText = `||${selectedText}||`;
            cursorOffset = selectedText ? formattedText.length : 2;
            break;
        case 'color':
            const color = prompt('Enter color (red, blue, #FF0000, etc.):');
            if (color) {
                formattedText = `[color:${color}]${selectedText}[/color]`;
                cursorOffset = selectedText ? formattedText.length : `[color:${color}]`.length;
            } else {
                return;
            }
            break;
        case 'greentext':
            formattedText = `>${selectedText}`;
            cursorOffset = formattedText.length;
            break;
        default:
            return;
    }
    
    textarea.value = before + formattedText + after;
    
    // Set cursor position
    if (selectedText) {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + cursorOffset;
    } else {
        textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
    }
    
    textarea.focus();
}

// Show formatting help
function showFormattingHelp() {
    const helpText = `
**Форматирование текста:**

**Жирный**: **текст** или __текст__
*Курсив*: *текст* или _текст_
\`Моноширинный\`: \`текст\`
~~Зачеркнутый~~: ~~текст~~
||Спойлер||: ||текст||

**Цвет**: [color:red]текст[/color] или [#FF0000]текст[/color]

**Цитата**: >>123 (номер поста)

**Greentext**: >текст в начале строки

**Код блок**:
\`\`\`
многострочный
код
\`\`\`

**Горячие клавиши:**
Ctrl+B - Жирный
Ctrl+I - Курсив
    `.trim();
    
    alert(helpText);
}

export {
    formatText,
    escapeHtml,
    addFormattingToolbar,
    applyFormatting,
    showFormattingHelp
};
