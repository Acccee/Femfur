// media-parser.js - Enhanced Media Detection and Embedding Module

// Supported media types
const MEDIA_PATTERNS = {
    gif: /\.(gif)($|\?)/i,
    image: /\.(jpg|jpeg|png|webp|bmp)($|\?)/i,
    video: /\.(mp4|webm|ogg)($|\?)/i,
    
    // Giphy URLs
    giphy: /giphy\.com\/(gifs|media)\/([a-zA-Z0-9_-]+)/i,
    giphyDirect: /media[0-9]?\.giphy\.com\/media\/([a-zA-Z0-9_-]+)\/giphy\.gif/i,
    
    // Tenor GIFs
    tenor: /tenor\.com\/view\/([a-zA-Z0-9_-]+)/i,
    tenorDirect: /media\.tenor\.com\/[^/]+\/([a-zA-Z0-9_-]+)\.gif/i,
    
    // Imgur
    imgur: /imgur\.com\/(gallery\/)?([a-zA-Z0-9]+)/i,
    imgurDirect: /i\.imgur\.com\/([a-zA-Z0-9]+)\.(gif|jpg|png|webp)/i,
    
    // Common CDNs
    discordCdn: /cdn\.discordapp\.com\/attachments\/[0-9]+\/[0-9]+\/[^?]+\.(gif|png|jpg|webp)/i,
    
    // Direct media URLs
    directMedia: /(https?:\/\/[^\s<]+\.(gif|jpg|jpeg|png|webp|mp4|webm))/i
};

// Check if URL is a media file
function isMediaUrl(url) {
    return MEDIA_PATTERNS.directMedia.test(url) ||
           MEDIA_PATTERNS.giphy.test(url) ||
           MEDIA_PATTERNS.giphyDirect.test(url) ||
           MEDIA_PATTERNS.tenor.test(url) ||
           MEDIA_PATTERNS.tenorDirect.test(url) ||
           MEDIA_PATTERNS.imgur.test(url) ||
           MEDIA_PATTERNS.imgurDirect.test(url) ||
           MEDIA_PATTERNS.discordCdn.test(url);
}

// Get media type from URL
function getMediaType(url) {
    if (MEDIA_PATTERNS.gif.test(url) || 
        MEDIA_PATTERNS.giphy.test(url) || 
        MEDIA_PATTERNS.giphyDirect.test(url) ||
        MEDIA_PATTERNS.tenor.test(url) ||
        MEDIA_PATTERNS.tenorDirect.test(url)) {
        return 'gif';
    }
    if (MEDIA_PATTERNS.video.test(url)) {
        return 'video';
    }
    if (MEDIA_PATTERNS.image.test(url)) {
        return 'image';
    }
    return null;
}

// Convert service URLs to direct media URLs
async function resolveMediaUrl(url) {
    // Giphy - extract ID and use direct media URL
    const giphyMatch = url.match(MEDIA_PATTERNS.giphy);
    if (giphyMatch) {
        const gifId = giphyMatch[2];
        return `https://media.giphy.com/media/${gifId}/giphy.gif`;
    }
    
    const giphyDirectMatch = url.match(MEDIA_PATTERNS.giphyDirect);
    if (giphyDirectMatch) {
        return url; // Already direct
    }
    
    // Tenor - for direct tenor links, return as-is
    const tenorDirectMatch = url.match(MEDIA_PATTERNS.tenorDirect);
    if (tenorDirectMatch) {
        return url;
    }
    
    // Imgur - convert to direct URL
    const imgurMatch = url.match(MEDIA_PATTERNS.imgur);
    if (imgurMatch) {
        const imgurId = imgurMatch[2];
        // Default to gif, could be improved with API call
        return `https://i.imgur.com/${imgurId}.gif`;
    }
    
    const imgurDirectMatch = url.match(MEDIA_PATTERNS.imgurDirect);
    if (imgurDirectMatch) {
        return url; // Already direct
    }
    
    // Discord CDN
    if (MEDIA_PATTERNS.discordCdn.test(url)) {
        return url;
    }
    
    // Direct media URL
    if (MEDIA_PATTERNS.directMedia.test(url)) {
        return url;
    }
    
    return null;
}

// Create media embed HTML
function createMediaEmbed(url, mediaType, options = {}) {
    const {
        maxWidth = 400,
        maxHeight = 300,
        showLink = true,
        className = 'embedded-media'
    } = options;
    
    const safeUrl = escapeHtml(url);
    const linkHtml = showLink ? `<div class="media-source"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">🔗 ${truncateUrl(url)}</a></div>` : '';
    
    switch (mediaType) {
        case 'gif':
        case 'image':
            return `
                <div class="${className} media-${mediaType}">
                    <img src="${safeUrl}" 
                         alt="Embedded ${mediaType}" 
                         loading="lazy"
                         style="max-width: ${maxWidth}px; max-height: ${maxHeight}px;"
                         onerror="this.parentElement.innerHTML='<div class=\\'media-error\\'>❌ Failed to load ${mediaType}</div>'">
                    ${linkHtml}
                </div>`;
        
        case 'video':
            return `
                <div class="${className} media-video">
                    <video controls 
                           style="max-width: ${maxWidth}px; max-height: ${maxHeight}px;"
                           preload="metadata">
                        <source src="${safeUrl}" type="video/mp4">
                        Your browser does not support video playback.
                    </video>
                    ${linkHtml}
                </div>`;
        
        default:
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="auto-link">${safeUrl}</a>`;
    }
}

// Parse text and embed media
async function parseAndEmbedMedia(text, options = {}) {
    if (!text) return text;
    
    const lines = text.split('\n');
    const processedLines = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if line is a standalone media URL
        if (isMediaUrl(trimmedLine) && !trimmedLine.includes(' ')) {
            try {
                const resolvedUrl = await resolveMediaUrl(trimmedLine);
                if (resolvedUrl) {
                    const mediaType = getMediaType(resolvedUrl);
                    const embed = createMediaEmbed(resolvedUrl, mediaType, options);
                    processedLines.push(embed);
                    continue;
                }
            } catch (error) {
                console.error('Failed to embed media:', error);
            }
        }
        
        // Keep line as-is if not standalone media URL
        processedLines.push(line);
    }
    
    return processedLines.join('\n');
}

// Enhanced link parser that checks for media
async function parseLinksWithMedia(text, options = {}) {
    if (!text) return text;
    
    // First, handle standalone media URLs (on their own line)
    const mediaEmbedded = await parseAndEmbedMedia(text, options);
    
    // Then, handle inline URLs that aren't embedded
    const urlPattern = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
    
    const parts = mediaEmbedded.split(/(<div class="embedded-media[^>]*>[\s\S]*?<\/div>)/g);
    
    return parts.map(part => {
        // Skip already embedded media
        if (part.startsWith('<div class="embedded-media')) {
            return part;
        }
        
        // Parse remaining URLs as links
        return part.replace(urlPattern, (match) => {
            // Don't double-link already processed URLs
            if (part.includes(`href="${match}"`)) {
                return match;
            }
            
            return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="auto-link">${match}</a>`;
        });
    }).join('');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

export {
    isMediaUrl,
    getMediaType,
    resolveMediaUrl,
    createMediaEmbed,
    parseAndEmbedMedia,
    parseLinksWithMedia
};
