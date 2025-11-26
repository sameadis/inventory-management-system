import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

/**
 * Auth callback route
 * Handles OAuth and email confirmation callbacks from Supabase
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to inventory page after successful authentication
  return NextResponse.redirect(new URL("/inventory", requestUrl.origin));
}

