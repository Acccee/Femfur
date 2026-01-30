// supabaseClient.js - Supabase Client Configuration

// ВАЖНО: Замените эти значения на свои из Supabase проекта
const SUPABASE_URL = 'https://httzzyjltrfzagkipojv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dHp6eWpsdHJmemFna2lwb2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTY0NTksImV4cCI6MjA4NTI5MjQ1OX0.o210K6q3HRNbRsDgTEYlzMYGUm1Gk0cgYWMj4zGe3j0';

// Создаём единственный экземпляр клиента Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Storage bucket name
const STORAGE_BUCKET = 'image';

// Helper function to upload image
async function uploadImage(file, path) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${path}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabaseClient.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);
        
        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Helper function to get image URL
function getImageUrl(path) {
    if (!path) return null;
    
    const { data } = supabaseClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
    
    return data.publicUrl;
}

// Экспортируем клиент и утилиты для использования в других файлах
export { supabaseClient, STORAGE_BUCKET, uploadImage, getImageUrl };
