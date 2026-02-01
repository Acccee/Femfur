// quick-reply.js - Quick Reply Module

import { t } from './i18n.js';

// Create floating quick reply button
function createQuickReplyButton() {
    const button = document.createElement('button');
    button.id = 'quickReplyBtn';
    button.className = 'quick-reply-btn';
    button.innerHTML = '💬';
    button.title = t('quickReply', 'Quick Reply');
    button.style.display = 'none';
    
    button.addEventListener('click', () => {
        scrollToReplyForm();
    });
    
    document.body.appendChild(button);
    return button;
}

// Show/hide quick reply button based on scroll
function initQuickReplyButton() {
    const button = document.getElementById('quickReplyBtn') || createQuickReplyButton();
    const threadView = document.getElementById('threadView');
    
    if (!threadView) return;
    
    window.addEventListener('scroll', () => {
        const isThreadView = threadView.style.display !== 'none';
        const scrollPosition = window.scrollY;
        
        if (isThreadView && scrollPosition > 300) {
            button.style.display = 'flex';
        } else {
            button.style.display = 'none';
        }
    });
}

// Scroll to reply form smoothly
function scrollToReplyForm() {
    const replyForm = document.querySelector('.reply-form');
    if (replyForm) {
        replyForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const replyText = document.getElementById('replyText');
        if (replyText) {
            replyText.focus();
        }
    }
}

// Add keyboard shortcut for quick reply
function initQuickReplyShortcut() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit reply
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const replyText = document.getElementById('replyText');
            if (replyText && replyText === document.activeElement) {
                const submitBtn = document.getElementById('submitReply');
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        }
        
        // R key to focus reply field (when not typing)
        if (e.key === 'r' && !isTyping()) {
            e.preventDefault();
            scrollToReplyForm();
        }
    });
}

// Check if user is currently typing in an input
function isTyping() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'TEXTAREA' || 
           activeElement.isContentEditable;
}

export { initQuickReplyButton, initQuickReplyShortcut, scrollToReplyForm };
