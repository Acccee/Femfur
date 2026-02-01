// user-roles.js - User Roles Configuration
// Add user IDs here to grant special roles

/**
 * ADMIN USERS - Orange verified badge + full admin privileges
 * Add user IDs (from Supabase auth.users table) here
 */
export const ADMIN_USERS = [
    // Example: 'uuid-here',
    // 'another-uuid',
];

/**
 * VERIFIED USERS - Blue verified badge
 * Add user IDs here for verified status
 */
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
    return ADMIN_USERS.includes(userId);
}

/**
 * Check if user is verified
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function isVerified(userId) {
    return VERIFIED_USERS.includes(userId) || isAdmin(userId);
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
