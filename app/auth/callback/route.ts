import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// This route handles the callback from Supabase Auth
// It exchanges the auth code for a session and redirects to the dashboard
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createServerSupabaseClient();
    // Exchange the auth code for a session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to the dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
