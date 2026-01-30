// i18n.js - Internationalization Module

let currentLang = 'en';
let translations = {};

// Load translations for a language
async function loadLanguage(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        const data = await response.json();
        translations = data;
        currentLang = lang;
        localStorage.setItem('preferred_language', lang);
        applyTranslations();
        return true;
    } catch (error) {
        console.error('Failed to load language:', error);
        return false;
    }
}

// Apply translations to the page
function applyTranslations() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });

    // Translate placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            element.placeholder = translations[key];
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = currentLang;
}

// Get translation by key
function t(key, fallback = '') {
    return translations[key] || fallback || key;
}

// Initialize i18n on page load
async function initI18n() {
    const savedLang = localStorage.getItem('preferred_language') || 'en';
    
    // Set select value
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = savedLang;
        
        // Add event listener for language changes
        langSelect.addEventListener('change', async (e) => {
            await loadLanguage(e.target.value);
        });
    }
    
    await loadLanguage(savedLang);
}

// Export functions
export { initI18n, t, loadLanguage, currentLang };
