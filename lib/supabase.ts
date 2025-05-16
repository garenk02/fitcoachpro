'use client';

import { createBrowserClient } from '@supabase/ssr';

// Create a single supabase client for browser-side usage
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
