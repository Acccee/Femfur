// profile.js – User Profile Module  (v5 — themes, badges, levels, bio)

import { supabaseClient } from './supabaseClient.js';
import { getUserByHash, generateUserHash } from './auth.js';
import { t } from './i18n.js';

// ─── Load full profile data ──────────────────────────────────────
async function loadUserProfile(userHash) {
    try {
        const user = await getUserByHash(userHash);
        if (!user) return null;

        const { data: threads } = await supabaseClient
            .from('threads')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_anonymous', false)
            .order('created_at', { ascending: false });

        const { data: replies } = await supabaseClient
            .from('replies')
            .select(`
                *,
                thread:thread_id (
                    id,
                    title,
                    board
                )
            `)
            .eq('user_id', user.id)
            .eq('is_anonymous', false)
            .order('created_at', { ascending: false });

        return {
            user,
            threads: threads || [],
            replies: replies || []
        };
    } catch (error) {
        console.error('Error loading user profile:', error);
        return null;
    }
}

// ─── Compute gamification data locally ──────────────────────────
function computeGamification(threads, replies) {
    const totalPosts  = threads.length + replies.length;
    const level       = Math.min(100, Math.floor(1 + totalPosts * 2.5));  // 1-100
    const reputation  = threads.length * 10 + replies.length * 3;
    const progress    = ((level % 10) / 10) * 100; // progress within current 10-level band

    // ── Badge logic ────────────────────────────────────────
    const badges = [];
    if (totalPosts >= 1)   badges.push({ id: 'newcomer',  icon: '🌱', label: 'Newcomer' });
    if (totalPosts >= 10)  badges.push({ id: 'active',    icon: '🔥', label: 'Active' });
    if (totalPosts >= 50)  badges.push({ id: 'regular',   icon: '⭐', label: 'Regular' });
    if (totalPosts >= 100) badges.push({ id: 'veteran',   icon: '🏅', label: 'Veteran' });
    if (threads.length >= 5) badges.push({ id: 'creator', icon: '✏️', label: 'Creator' });
    if (replies.length >= 20) badges.push({ id: 'helper', icon: '💬', label: 'Helper' });
    if (reputation >= 500) badges.push({ id: 'respected',icon: '💎', label: 'Respected' });
    if (level >= 50)       badges.push({ id: 'halfway',   icon: '🎯', label: 'Halfway' });
    if (level >= 90)       badges.push({ id: 'legend',    icon: '👑', label: 'Legend' });
    if (threads.length >= 1 && replies.length >= 1)
                           badges.push({ id: 'balanced',  icon: '⚖️',  label: 'Balanced' });

    return { level, reputation, progress, badges };
}

// ─── Theme palette map ───────────────────────────────────────────
const THEME_PALETTES = {
    default:  { bg: '#eef2ff', card: '#d6daf0', text: '#000', accent: '#af0a0f' },
    minimal:  { bg: '#f5f5f5', card: '#ffffff', text: '#222', accent: '#333333' },
    colorful: { bg: '#fff0f6', card: '#ffe4f0', text: '#000', accent: '#e91e8c' },
    dark:     { bg: '#1a1a2e', card: '#16213e', text: '#eee', accent: '#e94560' },
    neon:     { bg: '#0a0a1a', card: '#111133', text: '#eee', accent: '#39ff14' }
};

// ─── Render profile ──────────────────────────────────────────────
function renderUserProfile(profileData) {
    const profileContent = document.getElementById('profileContent');

    if (!profileData || !profileData.user) {
        profileContent.innerHTML = `<div class="error">${t('error_load')}</div>`;
        return;
    }

    const { user, threads, replies } = profileData;
    const gamification = computeGamification(threads, replies);

    const avatarUrl = user.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23999"%3E?%3C/text%3E%3C/svg%3E';

    const currentUserData = JSON.parse(localStorage.getItem('femfur_user') || 'null');
    const isOwnProfile   = currentUserData && currentUserData.id === user.id;

    // ── Resolve theme ──────────────────────────────────────
    const preset     = user.theme_preset || 'default';
    const palette    = THEME_PALETTES[preset] || THEME_PALETTES.default;
    const accentColor = user.theme_color || palette.accent;

    // ── Banner ─────────────────────────────────────────────
    const bannerHtml = user.banner_url
        ? `<div class="profile-banner" style="background-image:url('${user.banner_url}');"></div>`
        : `<div class="profile-banner profile-banner-placeholder" style="background:linear-gradient(135deg, ${accentColor}, ${palette.bg});"></div>`;

    // ── Badges HTML ────────────────────────────────────────
    const badgesHtml = gamification.badges.length > 0
        ? `<div class="profile-badges">
            ${gamification.badges.map(b =>
                `<span class="badge badge-${b.id}" title="${b.label}">${b.icon} <span class="badge-label">${b.label}</span></span>`
            ).join('')}
           </div>`
        : '';

    // ── Level bar ──────────────────────────────────────────
    const levelHtml = `
        <div class="profile-level">
            <div class="level-label">Level <strong>${gamification.level}</strong></div>
            <div class="level-bar-bg">
                <div class="level-bar-fill" style="width:${gamification.progress}%; background:${accentColor};"></div>
            </div>
        </div>`;

    // ── Custom CSS scoped ──────────────────────────────────
    const customCssHtml = user.custom_css
        ? `<style>.profile-themed { ${user.custom_css} }</style>`
        : '';

    const html = `
        ${customCssHtml}
        <div class="profile-themed"
             style="--profile-bg:${palette.bg}; --profile-card:${palette.card}; --profile-text:${palette.text}; --profile-accent:${accentColor};">
            ${bannerHtml}
            <div class="profile-header">
                <img src="${avatarUrl}" alt="${escapeHtml(user.nickname)}" class="profile-avatar">
                <div class="profile-info">
                    <h2 style="color:${accentColor};">${escapeHtml(user.nickname)}</h2>
                    ${user.status ? `<div class="profile-status">${escapeHtml(user.status)}</div>` : ''}
                    ${user.bio    ? `<div class="profile-bio">${escapeHtml(user.bio)}</div>` : ''}
                    <div class="profile-meta">
                        ${t('memberSince')}: ${formatDate(user.created_at)}
                    </div>
                    <div class="profile-meta">
                        ${t('threads')}: ${threads.length} | ${t('posts')}: ${replies.length}
                    </div>
                    <div class="profile-reputation">
                        <span>⭐ Reputation: <strong>${gamification.reputation}</strong></span>
                    </div>
                    ${isOwnProfile ? `<button id="editProfileBtn" class="btn-primary" style="margin-top:10px; background:${accentColor};" data-i18n="editProfile">Edit Profile</button>` : ''}
                </div>
            </div>

            ${levelHtml}
            ${badgesHtml}

            <div class="profile-tabs">
                <button class="active" data-tab="all">${t('allActivity')}</button>
                <button data-tab="threads">${t('userThreads')}</button>
                <button data-tab="posts">${t('userPosts')}</button>
            </div>

            <div class="profile-content">
                <div id="profileTabContent"></div>
            </div>
        </div>
    `;

    profileContent.innerHTML = html;

    // ── Edit button handler ────────────────────────────────
    if (isOwnProfile) {
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => openEditProfileModal(user));
        }
    }

    // ── Tab switching ──────────────────────────────────────
    const tabs = profileContent.querySelectorAll('.profile-tabs button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderProfileTab(tab.getAttribute('data-tab'), threads, replies);
        });
    });

    renderProfileTab('all', threads, replies);
}

// ─── Open edit modal (populate all fields) ──────────────────────
function openEditProfileModal(user) {
    const modal = document.getElementById('editProfileModal');

    // Avatar preview
    const currentAvatarDiv = document.getElementById('currentAvatar');
    currentAvatarDiv.innerHTML = user.avatar_url
        ? `<img src="${user.avatar_url}" alt="Current avatar" style="max-width:100px; border-radius:50%;">`
        : '<p>No avatar set</p>';

    // Banner preview
    const currentBannerDiv = document.getElementById('currentBanner');
    currentBannerDiv.innerHTML = user.banner_url
        ? `<img src="${user.banner_url}" alt="Current banner" style="max-width:100%; height:80px; object-fit:cover; border-radius:4px;">`
        : '<p>No banner set</p>';

    // Bio
    const bioField = document.getElementById('editBio');
    bioField.value = user.bio || '';
    updateBioCharCount();

    // Status
    document.getElementById('editStatus').value = user.status || '';

    // Theme presets
    const presetBtns = document.querySelectorAll('.theme-preset');
    presetBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === (user.theme_preset || 'default'));
    });

    // Color
    document.getElementById('editThemeColor').value = user.theme_color || '#af0a0f';

    // Custom CSS
    document.getElementById('editCustomCss').value = user.custom_css || '';

    modal.style.display = 'block';
}

// ─── Bio character counter ───────────────────────────────────────
function updateBioCharCount() {
    const bioField = document.getElementById('editBio');
    const counter  = document.getElementById('bioCharCount');
    if (bioField && counter) {
        counter.textContent = `${bioField.value.length} / 500`;
    }
}

// ─── Tab content renderer ────────────────────────────────────────
function renderProfileTab(tabName, threads, replies) {
    const tabContent = document.getElementById('profileTabContent');
    let html = '';

    if (tabName === 'all') {
        const allActivity = [
            ...threads.map(t => ({ ...t, type: 'thread' })),
            ...replies.map(r => ({ ...r, type: 'reply' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        html = allActivity.length === 0
            ? `<div class="empty-state">${t('no_activity')}</div>`
            : allActivity.map(item => item.type === 'thread' ? renderThreadItem(item) : renderReplyItem(item)).join('');

    } else if (tabName === 'threads') {
        html = threads.length === 0
            ? `<div class="empty-state">${t('no_threads')}</div>`
            : threads.map(renderThreadItem).join('');

    } else if (tabName === 'posts') {
        html = replies.length === 0
            ? `<div class="empty-state">${t('no_replies')}</div>`
            : replies.map(renderReplyItem).join('');
    }

    tabContent.innerHTML = html;
}

function renderThreadItem(item) {
    return `
        <div class="thread-item" onclick="window.location.hash='${item.board}-${item.id}'">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml((item.content || '').substring(0, 200))}${(item.content || '').length > 200 ? '...' : ''}</p>
            <div class="thread-meta">
                <span>${t('created')}: ${formatDate(item.created_at)}</span>
                <span>/${item.board}/</span>
            </div>
        </div>`;
}

function renderReplyItem(item) {
    return `
        <div class="reply-item" onclick="window.location.hash='${item.thread.board}-${item.thread_id}'">
            <div class="reply-text">${escapeHtml(item.content)}</div>
            <div class="reply-meta">
                ${t('created')}: ${formatDate(item.created_at)} |
                In: ${escapeHtml(item.thread.title)} (/${item.thread.board}/)
            </div>
        </div>`;
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export { loadUserProfile, renderUserProfile, openEditProfileModal, updateBioCharCount };
