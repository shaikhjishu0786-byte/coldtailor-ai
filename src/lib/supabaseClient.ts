import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://scswhjfdfriosvujvqps.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_M8IP2-LrBTJhaumO-zT62g_gGm5ygGv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserProfile = {
  id: string;
  email: string;
  role: 'jobseeker' | 'recruiter';
  trials_used: number;
  is_pro: boolean;
  tier: string;
};
