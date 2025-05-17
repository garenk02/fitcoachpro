import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// This route handles the callback from Supabase Auth
// It exchanges the auth code for a session and redirects to the dashboard
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();

    // Exchange the auth code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      // Redirect to login page with error
      const redirectUrl = new URL("/auth/login", request.url);
      redirectUrl.searchParams.set("error", "Authentication failed. Please try again.");
      return NextResponse.redirect(redirectUrl);
    }

    // If we have a user, log the successful authentication
    if (data?.user) {
      console.log("User authenticated successfully:", data.user.id);
      // Profile will be created automatically by the database trigger if it doesn't exist
    } else {
      console.error("No user data returned from exchangeCodeForSession");
    }
  } else {
    console.error("No code parameter found in callback URL");
    // Redirect to login page with error
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("error", "Authentication failed. Please try again.");
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to the dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
