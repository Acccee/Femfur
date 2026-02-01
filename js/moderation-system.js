// moderation-system.js - Enhanced Moderation System
//
// Features:
// - Anti-spam detection
// - Anti-flood protection
// - Raid protection
// - Shadowban functionality
// - Moderation panel with logging
// - Automatic content filtering

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

// ═══════════════════════════════════════════════════════════════
//  SPAM DETECTION
// ═══════════════════════════════════════════════════════════════

const SPAM_PATTERNS = {
    // Excessive caps
    excessiveCaps: /[A-Z]{10,}/g,
    
    // Repeated characters
    repeatedChars: /(.)\1{5,}/g,
    
    // Common spam keywords
    spamKeywords: /(viagra|casino|lottery|bitcoin|crypto|invest|profit|click here|buy now|free money)/gi,
    
    // Excessive links
    excessiveLinks: /(https?:\/\/[^\s]+)/gi,
    
    // Repeated text
    repeatedText: /(.{20,}?)\1{2,}/gi
};

const SPAM_THRESHOLDS = {
    capsRatio: 0.7,        // 70% caps
    repeatedCharsCount: 3,
    spamKeywordsCount: 2,
    linksCount: 5,
    repeatedTextCount: 2
};

function detectSpam(text) {
    if (!text || text.trim().length === 0) return { isSpam: false, reasons: [] };

    const reasons = [];
    let spamScore = 0;

    // Check caps ratio
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars > 0 && capsCount / totalChars > SPAM_THRESHOLDS.capsRatio) {
        reasons.push('excessive_caps');
        spamScore += 2;
    }

    // Check repeated characters
    const repeatedChars = text.match(SPAM_PATTERNS.repeatedChars) || [];
    if (repeatedChars.length >= SPAM_THRESHOLDS.repeatedCharsCount) {
        reasons.push('repeated_characters');
        spamScore += 2;
    }

    // Check spam keywords
    const spamKeywords = text.match(SPAM_PATTERNS.spamKeywords) || [];
    if (spamKeywords.length >= SPAM_THRESHOLDS.spamKeywordsCount) {
        reasons.push('spam_keywords');
        spamScore += 3;
    }

    // Check excessive links
    const links = text.match(SPAM_PATTERNS.excessiveLinks) || [];
    if (links.length >= SPAM_THRESHOLDS.linksCount) {
        reasons.push('excessive_links');
        spamScore += 2;
    }

    // Check repeated text
    const repeatedText = text.match(SPAM_PATTERNS.repeatedText) || [];
    if (repeatedText.length >= SPAM_THRESHOLDS.repeatedTextCount) {
        reasons.push('repeated_text');
        spamScore += 2;
    }

    return {
        isSpam: spamScore >= 3,
        spamScore,
        reasons
    };
}

// ═══════════════════════════════════════════════════════════════
//  FLOOD PROTECTION
// ═══════════════════════════════════════════════════════════════

const floodProtection = new Map();

const FLOOD_LIMITS = {
    postsPerMinute: 5,
    threadsPerHour: 10,
    identicalPostsTimeout: 30000 // 30 seconds
};

function checkFlood(userId, contentType = 'post') {
    if (!userId) return { allowed: true };

    const now = Date.now();
    const userKey = `${userId}_${contentType}`;

    if (!floodProtection.has(userKey)) {
        floodProtection.set(userKey, { posts: [], threads: [] });
    }

    const userData = floodProtection.get(userKey);

    // Clean old entries
    if (contentType === 'post') {
        userData.posts = userData.posts.filter(time => now - time < 60000); // Last minute
        
        if (userData.posts.length >= FLOOD_LIMITS.postsPerMinute) {
            return {
                allowed: false,
                reason: 'flood_posts_per_minute',
                waitTime: Math.ceil((userData.posts[0] + 60000 - now) / 1000)
            };
        }

        userData.posts.push(now);
    } else if (contentType === 'thread') {
        userData.threads = userData.threads.filter(time => now - time < 3600000); // Last hour
        
        if (userData.threads.length >= FLOOD_LIMITS.threadsPerHour) {
            return {
                allowed: false,
                reason: 'flood_threads_per_hour',
                waitTime: Math.ceil((userData.threads[0] + 3600000 - now) / 1000)
            };
        }

        userData.threads.push(now);
    }

    floodProtection.set(userKey, userData);

    return { allowed: true };
}

function checkDuplicateContent(userId, content) {
    const userKey = `${userId}_last_post`;
    const lastPost = floodProtection.get(userKey);

    if (lastPost) {
        const { content: lastContent, time } = lastPost;
        const now = Date.now();

        if (content === lastContent && now - time < FLOOD_LIMITS.identicalPostsTimeout) {
            return {
                isDuplicate: true,
                waitTime: Math.ceil((time + FLOOD_LIMITS.identicalPostsTimeout - now) / 1000)
            };
        }
    }

    floodProtection.set(userKey, { content, time: Date.now() });

    return { isDuplicate: false };
}

// ═══════════════════════════════════════════════════════════════
//  RAID PROTECTION
// ═══════════════════════════════════════════════════════════════

const raidDetection = {
    recentPosts: [],
    suspiciousIPs: new Set(),
    raidMode: false
};

const RAID_THRESHOLDS = {
    postsPerMinute: 20,
    newUsersPerMinute: 10,
    suspiciousPatternCount: 5
};

function detectRaid() {
    const now = Date.now();
    
    // Clean old posts (last minute)
    raidDetection.recentPosts = raidDetection.recentPosts.filter(
        post => now - post.time < 60000
    );

    // Check if raid conditions are met
    if (raidDetection.recentPosts.length >= RAID_THRESHOLDS.postsPerMinute) {
        raidDetection.raidMode = true;
        return { isRaid: true, action: 'rate_limit' };
    }

    // Check for suspicious patterns
    const uniqueUsers = new Set(raidDetection.recentPosts.map(p => p.userId));
    const newUsers = Array.from(uniqueUsers).filter(userId => {
        const userPosts = raidDetection.recentPosts.filter(p => p.userId === userId);
        return userPosts.length >= 5; // New user posting rapidly
    });

    if (newUsers.length >= RAID_THRESHOLDS.newUsersPerMinute) {
        raidDetection.raidMode = true;
        return { isRaid: true, action: 'require_captcha' };
    }

    return { isRaid: false };
}

function addPostToRaidDetection(userId) {
    raidDetection.recentPosts.push({
        userId,
        time: Date.now()
    });

    return detectRaid();
}

// ═══════════════════════════════════════════════════════════════
//  SHADOWBAN SYSTEM
// ═══════════════════════════════════════════════════════════════

async function shadowbanUser(userId, reason, duration = null) {
    try {
        const moderator = await getCurrentUser();
        if (!moderator) throw new Error('Must be logged in');

        const expiresAt = duration ? new Date(Date.now() + duration) : null;

        const { error } = await supabaseClient
            .from('shadowbans')
            .insert({
                user_id: userId,
                reason,
                moderator_id: moderator.id,
                expires_at: expiresAt,
                is_active: true
            });

        if (error) throw error;

        // Log moderation action
        await logModerationAction({
            action: 'shadowban',
            target_user_id: userId,
            moderator_id: moderator.id,
            reason,
            details: { duration }
        });

        return true;
    } catch (error) {
        console.error('Error shadowbanning user:', error);
        throw error;
    }
}

async function removeShadowban(userId) {
    try {
        const moderator = await getCurrentUser();
        if (!moderator) throw new Error('Must be logged in');

        const { error } = await supabaseClient
            .from('shadowbans')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;

        // Log moderation action
        await logModerationAction({
            action: 'remove_shadowban',
            target_user_id: userId,
            moderator_id: moderator.id
        });

        return true;
    } catch (error) {
        console.error('Error removing shadowban:', error);
        throw error;
    }
}

async function isShadowbanned(userId) {
    try {
        const now = new Date();

        const { data, error } = await supabaseClient
            .from('shadowbans')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
            .maybeSingle();

        if (error) throw error;

        return !!data;
    } catch (error) {
        console.error('Error checking shadowban:', error);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
//  MODERATION LOGGING
// ═══════════════════════════════════════════════════════════════

async function logModerationAction(action) {
    try {
        const { error } = await supabaseClient
            .from('moderation_logs')
            .insert({
                action: action.action,
                moderator_id: action.moderator_id,
                target_user_id: action.target_user_id || null,
                target_thread_id: action.target_thread_id || null,
                target_reply_id: action.target_reply_id || null,
                reason: action.reason || null,
                details: action.details || {}
            });

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error logging moderation action:', error);
        return false;
    }
}

async function getModerationLogs(filters = {}) {
    try {
        let query = supabaseClient
            .from('moderation_logs')
            .select(`
                *,
                moderator:moderator_id (
                    id,
                    nickname
                ),
                target_user:target_user_id (
                    id,
                    nickname
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (filters.action) {
            query = query.eq('action', filters.action);
        }

        if (filters.moderatorId) {
            query = query.eq('moderator_id', filters.moderatorId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error loading moderation logs:', error);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
//  CONTENT MODERATION
// ═══════════════════════════════════════════════════════════════

async function moderateContent(content, userId) {
    const checks = {
        spam: false,
        flood: false,
        duplicate: false,
        raid: false,
        shadowbanned: false
    };

    // Check if user is shadowbanned
    if (userId) {
        checks.shadowbanned = await isShadowbanned(userId);
        if (checks.shadowbanned) {
            return { allowed: false, reason: 'shadowbanned', checks };
        }
    }

    // Spam detection
    const spamCheck = detectSpam(content);
    checks.spam = spamCheck.isSpam;
    if (spamCheck.isSpam) {
        return { allowed: false, reason: 'spam', details: spamCheck, checks };
    }

    // Flood protection
    if (userId) {
        const floodCheck = checkFlood(userId, 'post');
        checks.flood = !floodCheck.allowed;
        if (!floodCheck.allowed) {
            return { allowed: false, reason: 'flood', details: floodCheck, checks };
        }

        // Duplicate content check
        const duplicateCheck = checkDuplicateContent(userId, content);
        checks.duplicate = duplicateCheck.isDuplicate;
        if (duplicateCheck.isDuplicate) {
            return { allowed: false, reason: 'duplicate', details: duplicateCheck, checks };
        }
    }

    // Raid detection
    if (userId) {
        const raidCheck = addPostToRaidDetection(userId);
        checks.raid = raidCheck.isRaid;
        if (raidCheck.isRaid) {
            return { allowed: false, reason: 'raid', details: raidCheck, checks };
        }
    }

    return { allowed: true, checks };
}

// ═══════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatWaitTime(seconds) {
    if (seconds < 60) {
        return `${seconds} ${t('seconds', 'seconds')}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} ${t('minutes', 'minutes')}`;
}

export {
    detectSpam,
    checkFlood,
    checkDuplicateContent,
    detectRaid,
    addPostToRaidDetection,
    shadowbanUser,
    removeShadowban,
    isShadowbanned,
    logModerationAction,
    getModerationLogs,
    moderateContent,
    formatWaitTime,
    raidDetection
};
