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
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // If we have a user, ensure they have a profile
    if (data?.user) {
      try {
        // Check if profile exists
        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error("Error checking profile:", profileError);
        }

        // If profile doesn't exist, create it
        if (!existingProfile) {
          const { error: insertError } = await supabase
            .from("profiles")
            .insert([
              {
                id: data.user.id,
                role: 'trainer'
              }
            ]);

          if (insertError) {
            console.error("Error creating trainer profile:", insertError);
          }
        }
      } catch (error) {
        console.error("Error ensuring trainer profile:", error);
      }
    }
  }

  // Redirect to the dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
