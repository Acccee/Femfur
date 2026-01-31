// cooldowns.js - Dynamic Cooldown Management

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

// Cooldown durations based on karma status (in seconds)
const COOLDOWN_CONFIG = {
    'create_thread': {
        'trusted': 5,
        'neutral': 30,
        'unstable': 120,
        'restricted': 300
    },
    'create_reply': {
        'trusted': 2,
        'neutral': 10,
        'unstable': 60,
        'restricted': 180
    },
    'add_reaction': {
        'trusted': 1,
        'neutral': 3,
        'unstable': 15,
        'restricted': 60
    },
    'create_group': {
        'trusted': 3600,
        'neutral': 7200,
        'unstable': 86400,
        'restricted': 86400
    },
    'join_group': {
        'trusted': 10,
        'neutral': 60,
        'unstable': 300,
        'restricted': 600
    }
};

// Check if action is on cooldown
async function checkCooldown(actionType) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return false;
        }
        
        // Check global admin role (no cooldowns)
        const { data: userData } = await supabaseClient
            .from('users')
            .select('global_role')
            .eq('id', user.id)
            .single();
        
        if (userData && userData.global_role === 'admin') {
            return true; // Admins bypass cooldowns
        }
        
        // Check cooldown in database
        const { data } = await supabaseClient
            .from('cooldowns')
            .select('cooldown_until')
            .eq('user_id', user.id)
            .eq('action_type', actionType)
            .maybeSingle();
        
        if (!data) {
            return true; // No cooldown set
        }
        
        const cooldownEnd = new Date(data.cooldown_until).getTime();
        const now = Date.now();
        
        if (now >= cooldownEnd) {
            // Cooldown expired, remove it
            await supabaseClient
                .from('cooldowns')
                .delete()
                .eq('user_id', user.id)
                .eq('action_type', actionType);
            
            return true;
        }
        
        return false; // Still on cooldown
    } catch (error) {
        console.error('Error checking cooldown:', error);
        return false;
    }
}

// Get remaining cooldown time in seconds
async function getRemainingCooldown(actionType) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return 0;
        }
        
        const { data } = await supabaseClient
            .from('cooldowns')
            .select('cooldown_until')
            .eq('user_id', user.id)
            .eq('action_type', actionType)
            .maybeSingle();
        
        if (!data) {
            return 0;
        }
        
        const cooldownEnd = new Date(data.cooldown_until).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
        
        return remaining;
    } catch (error) {
        console.error('Error getting remaining cooldown:', error);
        return 0;
    }
}

// Set cooldown for user action
async function setCooldown(actionType, customSeconds = null) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return;
        }
        
        let seconds;
        
        if (customSeconds !== null) {
            // Use custom cooldown
            seconds = customSeconds;
        } else {
            // Calculate cooldown based on karma status
            const { data: userData } = await supabaseClient
                .from('users')
                .select('karma_status, spam_score')
                .eq('id', user.id)
                .single();
            
            if (!userData) {
                seconds = 30; // Default
            } else {
                const karmaStatus = userData.karma_status || 'neutral';
                const baseSeconds = COOLDOWN_CONFIG[actionType]?.[karmaStatus] || 30;
                
                // Apply spam multiplier
                const spamMultiplier = (userData.spam_score > 0.5) ? 2 : 1;
                seconds = baseSeconds * spamMultiplier;
            }
        }
        
        const cooldownUntil = new Date(Date.now() + seconds * 1000).toISOString();
        
        // Insert or update cooldown
        const { error } = await supabaseClient
            .from('cooldowns')
            .upsert({
                user_id: user.id,
                action_type: actionType,
                cooldown_until: cooldownUntil
            }, {
                onConflict: 'user_id,action_type'
            });
        
        if (error) {
            console.error('Error setting cooldown:', error);
        }
    } catch (error) {
        console.error('Error in setCooldown:', error);
    }
}

// Format remaining time for display
function formatCooldownTime(seconds) {
    if (seconds < 60) {
        return t('cooldown_seconds', '{seconds}s', { seconds });
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return t('cooldown_minutes', '{minutes}m', { minutes });
    } else {
        const hours = Math.floor(seconds / 3600);
        return t('cooldown_hours', '{hours}h', { hours });
    }
}

// Show cooldown error message
async function showCooldownError(actionType) {
    const remaining = await getRemainingCooldown(actionType);
    const timeStr = formatCooldownTime(remaining);
    
    const messages = {
        'create_thread': t('cooldown_create_thread', 'Please wait {time} before creating another thread', { time: timeStr }),
        'create_reply': t('cooldown_create_reply', 'Please wait {time} before replying again', { time: timeStr }),
        'add_reaction': t('cooldown_add_reaction', 'Please wait {time} before reacting again', { time: timeStr }),
        'create_group': t('cooldown_create_group', 'Please wait {time} before creating another group', { time: timeStr }),
        'join_group': t('cooldown_join_group', 'Please wait {time} before joining another group', { time: timeStr })
    };
    
    return messages[actionType] || t('cooldown_generic', 'Please wait {time}', { time: timeStr });
}

// Client-side cooldown timer UI (optional)
class CooldownTimer {
    constructor(actionType, containerElement) {
        this.actionType = actionType;
        this.container = containerElement;
        this.interval = null;
    }
    
    async start() {
        this.update();
        this.interval = setInterval(() => this.update(), 1000);
    }
    
    async update() {
        const remaining = await getRemainingCooldown(this.actionType);
        
        if (remaining <= 0) {
            this.stop();
            this.container.textContent = '';
            return;
        }
        
        const timeStr = formatCooldownTime(remaining);
        this.container.textContent = t('cooldown_remaining', 'Cooldown: {time}', { time: timeStr });
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export {
    checkCooldown,
    getRemainingCooldown,
    setCooldown,
    formatCooldownTime,
    showCooldownError,
    CooldownTimer,
    COOLDOWN_CONFIG
};
