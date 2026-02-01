// user-roles.js - User Roles Configuration
// Add user IDs here to grant special roles

/**
 * ADMIN USERS - Orange verified badge + full admin privileges
 * Add user IDs (from Supabase auth.users table) here
 */
export const ADMIN_USERS = [
    1, // Ваш ID без кавычек
    "1" // И на всякий случай как строка
];

export const VERIFIED_USERS = [
    // Example: 'uuid-here',
    // 'another-uuid',
];

/**
 * Check if user is admin
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function isAdmin(userId) {
    // Приводим оба значения к строке для надежности
    return ADMIN_USERS.some(adminId => String(adminId) === String(userId));
}

/**
 * Check if user is verified
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function isVerified(userId) {
    return VERIFIED_USERS.some(verifiedId => String(verifiedId) === String(userId)) || isAdmin(userId);
}

/**
 * Get user badge HTML
 * @param {string} userId - User ID
 * @returns {string} Badge HTML or empty string
 */
export function getUserBadge(userId) {
    if (isAdmin(userId)) {
        return '<span class="verified-badge admin-badge" title="Administrator">✓</span>';
    } else if (isVerified(userId)) {
        return '<span class="verified-badge verified-badge-blue" title="Verified User">✓</span>';
    }
    return '';
}
