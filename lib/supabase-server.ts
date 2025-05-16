import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { CookieOptions } from '@supabase/ssr';

export async function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          // In Next.js 14, cookies() returns a Promise that needs to be awaited
          const cookie = await cookieStore.then(store => store.get(name));
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          await cookieStore.then(store => store.set({ name, value, ...options }));
        },
        async remove(name: string, options: CookieOptions) {
          await cookieStore.then(store => store.set({ name, value: '', ...options }));
        },
      },
    }
  );
}
