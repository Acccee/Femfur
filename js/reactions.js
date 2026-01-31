// reactions.js - Reactions System Module

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

// Reaction types with their emoji representations
const REACTION_TYPES = {
    skull: '💀',
    clown: '🤡',
    based: 'based',
    cringe: 'cringe',
    schizo: 'schizo'
};

// Get reactions for a target (thread or reply)
async function getReactions(targetType, targetId) {
    try {
        const { data, error } = await supabaseClient
            .from('reactions')
            .select('*')
            .eq('target_type', targetType)
            .eq('target_id', targetId);
        
        if (error) throw error;
        
        // Group reactions by type and count
        const reactionCounts = {};
        Object.keys(REACTION_TYPES).forEach(type => {
            reactionCounts[type] = {
                count: 0,
                userReacted: false,
                users: []
            };
        });
        
        const user = await getCurrentUser();
        
        data.forEach(reaction => {
            if (reactionCounts[reaction.reaction_type]) {
                reactionCounts[reaction.reaction_type].count++;
                reactionCounts[reaction.reaction_type].users.push(reaction.user_id);
                
                if (user && reaction.user_id === user.id) {
                    reactionCounts[reaction.reaction_type].userReacted = true;
                }
            }
        });
        
        return reactionCounts;
    } catch (error) {
        console.error('Error getting reactions:', error);
        return {};
    }
}

// Add or remove reaction
async function toggleReaction(targetType, targetId, reactionType) {
    try {
        const user = await getCurrentUser();
        
        if (!user) {
            const { t } = await import('./i18n.js');
            throw new Error(t('error_login_required', 'You must be logged in to react'));
        }
        
        // Check if user already reacted with this type
        const { data: existing, error: checkError } = await supabaseClient
            .from('reactions')
            .select('id')
            .eq('user_id', user.id)
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .eq('reaction_type', reactionType)
            .single();
        
        if (existing) {
            // Remove reaction
            const { error: deleteError } = await supabaseClient
                .from('reactions')
                .delete()
                .eq('id', existing.id);
            
            if (deleteError) throw deleteError;
            return { action: 'removed' };
        } else {
            // Add reaction
            const { error: insertError } = await supabaseClient
                .from('reactions')
                .insert([{
                    user_id: user.id,
                    target_type: targetType,
                    target_id: targetId,
                    reaction_type: reactionType
                }]);
            
            if (insertError) throw insertError;
            return { action: 'added' };
        }
    } catch (error) {
        console.error('Error toggling reaction:', error);
        throw error;
    }
}

// Render reactions UI for a target
async function renderReactions(targetType, targetId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const reactions = await getReactions(targetType, targetId);
    
    let html = '<div class="reactions-container">';
    
    Object.entries(REACTION_TYPES).forEach(([type, display]) => {
        const reactionData = reactions[type] || { count: 0, userReacted: false };
        const activeClass = reactionData.userReacted ? 'active' : '';
        const countDisplay = reactionData.count > 0 ? ` ${reactionData.count}` : '';
        
        html += `
            <button 
                class="reaction-btn ${activeClass}" 
                data-reaction="${type}"
                data-target-type="${targetType}"
                data-target-id="${targetId}"
                title="${type}"
            >
                <span class="reaction-emoji">${display}</span>${countDisplay}
            </button>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const reactionType = btn.dataset.reaction;
            const targetType = btn.dataset.targetType;
            const targetId = btn.dataset.targetId;
            
            try {
                await toggleReaction(targetType, targetId, reactionType);
                // Refresh reactions display
                await renderReactions(targetType, targetId, containerId);
            } catch (error) {
                console.error('Reaction error:', error);
                alert(error.message);
            }
        });
    });
}

// Render inline reactions (compact version)
function renderInlineReactions(targetType, targetId, reactions) {
    if (!reactions) return '';
    
    let html = '<div class="reactions-inline">';
    
    Object.entries(REACTION_TYPES).forEach(([type, display]) => {
        const reactionData = reactions[type];
        if (reactionData && reactionData.count > 0) {
            const activeClass = reactionData.userReacted ? 'active' : '';
            html += `
                <span class="reaction-inline ${activeClass}" data-reaction="${type}" data-target-type="${targetType}" data-target-id="${targetId}">
                    ${display} ${reactionData.count}
                </span>
            `;
        }
    });
    
    html += '</div>';
    return html;
}

export { 
    REACTION_TYPES, 
    getReactions, 
    toggleReaction, 
    renderReactions,
    renderInlineReactions
};
