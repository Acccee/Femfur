// IMPORTANT: Replace these values with your Supabase project credentials
// You can find these in your Supabase project settings: Settings > API
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Create single Supabase client instance
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
export { supabaseClient };
