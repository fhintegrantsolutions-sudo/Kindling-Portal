import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths reachable without a session.
const PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/portal-privacy",
  "/request-access",
  "/login",
  "/forgot-password",
  // Auto-generated share-card image — must be fetchable by link-preview
  // crawlers (iMessage, Slack, social), which have no session.
  "/opengraph-image",
];

// Path *prefixes* reachable without a session (any sub-path).
const PUBLIC_PREFIXES = ["/setup-participation/"];

// Paths reachable with or without a session — the recovery / invite flows
// authenticate via exchangeCodeForSession, so the user IS signed in by the
// time they reach these pages. We just don't want to bounce them away.
const TRANSIENT_PATHS = ["/reset-password", "/account-setup", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  const isTransient = TRANSIENT_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!user && !isPublic && !isTransient) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
