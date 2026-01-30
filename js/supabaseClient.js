// ВАЖНО: Замените эти значения на свои из Supabase проекта
const SUPABASE_URL = 'https://httzzyjltrfzagkipojv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_H1VbXmNHlctHBFoAPqoHxQ_3Fz_b1u5';

// Создаём единственный экземпляр клиента Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспортируем клиент для использования в других файлах
export { supabaseClient };
