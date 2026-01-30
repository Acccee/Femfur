// ВАЖНО: Замените эти значения на свои из Supabase проекта
const SUPABASE_URL = 'https://httzzyjltrfzagkipojv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dHp6eWpsdHJmemFna2lwb2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTY0NTksImV4cCI6MjA4NTI5MjQ1OX0.o210K6q3HRNbRsDgTEYlzMYGUm1Gk0cgYWMj4zGe3j0';

// Создаём единственный экземпляр клиента Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспортируем клиент для использования в других файлах
export { supabaseClient };
