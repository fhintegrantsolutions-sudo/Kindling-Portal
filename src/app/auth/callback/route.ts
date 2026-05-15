import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Supabase emits two URL shapes for confirmation links:
//   1. PKCE / sign-in callback   →  ?code=…
//   2. Email OTP confirmations   →  ?token_hash=…&type=recovery|signup|…
// Recovery emails use shape (2) in modern Supabase, so we have to support
// both flows here or the reset link silently drops users back at /login.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=invalid_link`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=invalid_link`);
    }
    // For a recovery confirmation, override the default `next` so the user
    // lands on the password-reset form even if the email template didn't
    // include `&next=/reset-password`.
    const dest = type === "recovery" ? "/reset-password" : next;
    return NextResponse.redirect(`${origin}${dest}`);
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
