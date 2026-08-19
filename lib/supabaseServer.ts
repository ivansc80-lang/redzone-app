import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const fetchNoStore: typeof fetch = (input, init = {}) =>
  fetch(input, {
    ...init,
    cache: 'no-store',
  });

export const supabaseServer = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchNoStore,
    },
  }
);
