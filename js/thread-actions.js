// thread-actions.js - Thread Edit and Delete Module

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { t } from './i18n.js';

// Check if user can edit/delete thread
async function canModifyThread(threadId) {
    try {
        const user = await getCurrentUser();
        if (!user) return false;
        
        const { data: thread, error } = await supabaseClient
            .from('threads')
            .select('user_id')
            .eq('id', threadId)
            .single();
        
        if (error) throw error;
        
        return thread.user_id === user.id;
    } catch (error) {
        console.error('Error checking thread permissions:', error);
        return false;
    }
}

// Delete thread
async function deleteThread(threadId) {
    try {
        const canModify = await canModifyThread(threadId);
        if (!canModify) {
            throw new Error(t('error_no_permission', 'You do not have permission to delete this thread'));
        }
        
        const { error } = await supabaseClient
            .from('threads')
            .delete()
            .eq('id', threadId);
        
        if (error) throw error;
        
        return true;
    } catch (error) {
        console.error('Error deleting thread:', error);
        throw error;
    }
}

// Update thread
async function updateThread(threadId, title, content, imageFile) {
    try {
        const canModify = await canModifyThread(threadId);
        if (!canModify) {
            throw new Error(t('error_no_permission', 'You do not have permission to edit this thread'));
        }
        
        const updates = {
            title: title,
            content: content
        };
        
        // Upload new image if provided
        if (imageFile) {
            const { uploadImage } = await import('./supabaseClient.js');
            updates.image_url = await uploadImage(imageFile, 'threads');
        }
        
        const { data, error } = await supabaseClient
            .from('threads')
            .update(updates)
            .eq('id', threadId)
            .select()
            .single();
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error updating thread:', error);
        throw error;
    }
}

// Render edit/delete buttons for thread
async function renderThreadActions(threadId, containerId) {
    const canModify = await canModifyThread(threadId);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const { t } = await import('./i18n.js');
    
    if (canModify) {
        container.innerHTML = `
            <div class="thread-actions">
                <button class="btn-secondary btn-edit" data-thread-id="${threadId}">
                    ✏️ ${t('edit', 'Edit')}
                </button>
                <button class="btn-danger btn-delete" data-thread-id="${threadId}">
                    🗑️ ${t('delete', 'Delete')}
                </button>
            </div>
        `;
        
        // Add event listeners
        container.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditThreadModal(threadId);
        });
        
        container.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteThread(threadId);
        });
    }
}

// Open edit thread modal
async function openEditThreadModal(threadId) {
    try {
        const { t } = await import('./i18n.js');
        
        // Get thread data
        const { data: thread, error } = await supabaseClient
            .from('threads')
            .select('*')
            .eq('id', threadId)
            .single();
        
        if (error) throw error;
        
        // Fill form
        document.getElementById('editThreadId').value = threadId;
        document.getElementById('editThreadTitle').value = thread.title;
        document.getElementById('editThreadContent').value = thread.content || '';
        
        // Add formatting toolbar to edit content
        const editContent = document.getElementById('editThreadContent');
        if (editContent && !editContent.previousElementSibling?.classList.contains('formatting-toolbar')) {
            const { addFormattingToolbar } = await import('./text-formatting.js');
            addFormattingToolbar('editThreadContent');
        }
        
        // Show modal
        document.getElementById('editThreadModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading thread for edit:', error);
        const { t } = await import('./i18n.js');
        alert(t('error_load', 'Failed to load thread'));
    }
}

// Confirm delete thread
function confirmDeleteThread(threadId) {
    if (confirm(t('confirm_delete_thread', 'Are you sure you want to delete this thread? This action cannot be undone.'))) {
        handleDeleteThread(threadId);
    }
}

// Handle delete thread
async function handleDeleteThread(threadId) {
    try {
        await deleteThread(threadId);
        alert(t('success_delete_thread', 'Thread deleted successfully'));
        
        // Redirect to board
        const hash = window.location.hash;
        if (hash.includes('-')) {
            const boardId = hash.split('-')[0].slice(1);
            window.location.hash = boardId;
        } else {
            window.location.hash = '';
        }
    } catch (error) {
        alert(t('error_delete_thread', 'Failed to delete thread: ') + error.message);
    }
}

export {
    canModifyThread,
    deleteThread,
    updateThread,
    renderThreadActions,
    openEditThreadModal,
    confirmDeleteThread
};
