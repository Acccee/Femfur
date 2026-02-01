// link-parser.js - Automatic Link Detection and Conversion Module

// Regex patterns for detecting URLs
const URL_PATTERNS = {
    // Full URLs with protocol
    fullUrl: /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi,
    // URLs without protocol (www.example.com)
    wwwUrl: /(www\.[^\s<]+[^<.,:;"')\]\s])/gi,
    // Domain-like patterns (example.com, femfur.space)
    domainUrl: /\b([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/gi
};

// Parse text and convert URLs to clickable links
function parseLinks(text) {
    if (!text) return text;
    
    let parsedText = text;
    
    // First, handle full URLs with protocol
    parsedText = parsedText.replace(URL_PATTERNS.fullUrl, (match) => {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="auto-link">${match}</a>`;
    });
    
    // Then handle www URLs
    parsedText = parsedText.replace(URL_PATTERNS.wwwUrl, (match) => {
        // Skip if already wrapped in <a> tag
        if (parsedText.indexOf(`"${match}"`) > -1) return match;
        return `<a href="https://${match}" target="_blank" rel="noopener noreferrer" class="auto-link">${match}</a>`;
    });
    
    // Finally handle domain-only URLs (like femfur.space)
    parsedText = parsedText.replace(URL_PATTERNS.domainUrl, (match) => {
        // Skip if already wrapped in <a> tag or if it's an email
        if (parsedText.indexOf(`"${match}"`) > -1 || parsedText.indexOf(`>${match}<`) > -1) {
            return match;
        }
        
        // Skip common words that might match domain pattern
        const skipWords = ['etc.com', 'test.com', 'example.com', 'localhost'];
        if (skipWords.includes(match.toLowerCase())) {
            return match;
        }
        
        // Check if it looks like a real domain (has valid TLD)
        const validTLDs = ['com', 'org', 'net', 'edu', 'gov', 'io', 'space', 'ru', 'ua', 'de', 'uk', 'fr', 'co', 'ai', 'app', 'dev'];
        const tld = match.split('.').pop().toLowerCase();
        
        if (validTLDs.includes(tld)) {
            return `<a href="https://${match}" target="_blank" rel="noopener noreferrer" class="auto-link">${match}</a>`;
        }
        
        return match;
    });
    
    return parsedText;
}

// Enhanced version that preserves existing formatting
function parseLinksPreserveFormatting(text) {
    if (!text) return text;
    
    // Split by existing HTML tags to avoid breaking them
    const parts = text.split(/(<[^>]+>)/g);
    
    return parts.map((part, index) => {
        // Skip HTML tags
        if (part.startsWith('<') && part.endsWith('>')) {
            return part;
        }
        
        // Parse links in text content
        return parseLinks(part);
    }).join('');
}

// Detect and parse URLs in user input before saving
function sanitizeAndParseLinks(text) {
    if (!text) return text;
    
    // First escape HTML to prevent XSS
    const div = document.createElement('div');
    div.textContent = text;
    let sanitized = div.innerHTML;
    
    // Then parse links
    return parseLinks(sanitized);
}

export { parseLinks, parseLinksPreserveFormatting, sanitizeAndParseLinks };
