import { supabaseClient } from './supabaseClient.js';

// Get thread by ID
async function getThread(threadId) {
    try {
        const { data, error } = await supabaseClient
            .from('threads')
            .select('*')
            .eq('id', threadId)
            .single();
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error loading thread:', error);
        throw error;
    }
}

// Get all replies for a thread
async function getThreadReplies(threadId) {
    try {
        const { data, error } = await supabaseClient
            .from('replies')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error loading replies:', error);
        throw error;
    }
}

// Create reply
async function createReply(threadId, comment, imageUrl) {
    try {
        const { data, error } = await supabaseClient
            .from('replies')
            .insert([{
                thread_id: threadId,
                comment: comment,
                image_url: imageUrl || null
            }])
            .select();
        
        if (error) throw error;
        
        return data[0];
    } catch (error) {
        console.error('Error creating reply:', error);
        throw error;
    }
}

// Upload image to Supabase Storage
async function uploadImage(file, bucket = 'images') {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        // Upload file
        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${month}/${day}/${year}(${getDayName(date)})${hours}:${minutes}:${seconds}`;
}

// Get day name
function getDayName(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export {
    getThread,
    getThreadReplies,
    createReply,
    uploadImage,
    formatDate,
    formatFileSize
};
