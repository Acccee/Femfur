// gamification.js – Badges, Levels, Reputation System

// ─── Badge Catalog (10+ badges) ──────────────────────────────────
export const BADGE_CATALOG = [
    { id: 'newcomer',  icon: '🌱', label: 'Newcomer',  desc: 'Made your first post',         req: { totalPosts: 1 } },
    { id: 'active',    icon: '🔥', label: 'Active',    desc: '10+ posts on the board',       req: { totalPosts: 10 } },
    { id: 'regular',   icon: '⭐', label: 'Regular',   desc: '50+ posts total',              req: { totalPosts: 50 } },
    { id: 'veteran',   icon: '🏅', label: 'Veteran',   desc: '100+ posts total',             req: { totalPosts: 100 } },
    { id: 'creator',   icon: '✏️',  label: 'Creator',   desc: 'Created 5+ threads',           req: { threads: 5 } },
    { id: 'helper',    icon: '💬', label: 'Helper',    desc: '20+ replies posted',           req: { replies: 20 } },
    { id: 'respected', icon: '💎', label: 'Respected', desc: '500+ reputation points',       req: { reputation: 500 } },
    { id: 'halfway',   icon: '🎯', label: 'Halfway',   desc: 'Reached level 50',             req: { level: 50 } },
    { id: 'legend',    icon: '👑', label: 'Legend',    desc: 'Reached level 90',             req: { level: 90 } },
    { id: 'balanced',  icon: '⚖️',  label: 'Balanced',  desc: 'Has both threads and replies', req: { threads: 1, replies: 1 } },
    { id: 'socialite', icon: '🤝', label: 'Socialite', desc: '30+ replies in threads',       req: { replies: 30 } },
    { id: 'master',    icon: '🧙', label: 'Master',    desc: '200+ total posts',             req: { totalPosts: 200 } }
];

// ─── Level computation (1–100) ───────────────────────────────────
export function computeLevel(totalPosts) {
    return Math.min(100, Math.max(1, Math.floor(1 + totalPosts * 2.5)));
}

// ─── Reputation computation ─────────────────────────────────────
export function computeReputation(threadCount, replyCount) {
    return threadCount * 10 + replyCount * 3;
}

// ─── Progress within current level band (0–100%) ────────────────
export function computeProgress(level) {
    return ((level % 10) / 10) * 100;
}

// ─── Evaluate which badges the user has earned ──────────────────
export function evaluateBadges(threadCount, replyCount) {
    const totalPosts = threadCount + replyCount;
    const level      = computeLevel(totalPosts);
    const reputation = computeReputation(threadCount, replyCount);

    return BADGE_CATALOG.filter(badge => {
        const r = badge.req;
        if (r.totalPosts && totalPosts < r.totalPosts)   return false;
        if (r.threads    && threadCount < r.threads)     return false;
        if (r.replies    && replyCount < r.replies)      return false;
        if (r.reputation && reputation < r.reputation)   return false;
        if (r.level      && level < r.level)             return false;
        return true;
    });
}

// ─── Live bio character counter (attaches on load) ───────────────
document.addEventListener('DOMContentLoaded', () => {
    const bioField = document.getElementById('editBio');
    if (bioField) {
        bioField.addEventListener('input', () => {
            const { updateBioCharCount } = require('./profile.js');
            // Fallback: inline update
            const counter = document.getElementById('bioCharCount');
            if (counter) counter.textContent = `${bioField.value.length} / 500`;
        });
    }

    // Also wire up theme preset buttons
    const presetBtns = document.querySelectorAll('.theme-preset');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});
