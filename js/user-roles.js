// user-roles.js - Универсальная версия
export const ADMIN_USERS = [1, "1"]; // Добавили оба варианта
export const VERIFIED_USERS = [];

export function isAdmin(userId) {
    if (!userId) return false;
    // Принудительно превращаем ID в строку для сравнения
    return ADMIN_USERS.some(id => String(id) === String(userId));
}

export function isVerified(userId) {
    if (!userId) return false;
    return VERIFIED_USERS.some(id => String(id) === String(userId)) || isAdmin(userId);
}

export function getUserBadge(userId) {
    if (isAdmin(userId)) {
        return '<span class="verified-badge admin-badge" title="Administrator">✓</span>';
    } else if (isVerified(userId)) {
        return '<span class="verified-badge verified-badge-blue" title="Verified User">✓</span>';
    }
    return '';
}
