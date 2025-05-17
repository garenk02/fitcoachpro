'use client';

import { createBrowserClient } from '@supabase/ssr';

// Create a single supabase client for browser-side usage
// Using a function to ensure it's only created on the client side
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Return a placeholder during server-side rendering
    return {} as ReturnType<typeof createBrowserClient>;
  }

  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return supabaseInstance;
})();
