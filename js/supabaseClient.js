// ВАЖНО: Замените эти значения на свои из Supabase проекта
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Создаём единственный экземпляр клиента Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспортируем клиент для использования в других файлах
export { supabaseClient };
