import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
];
const REDIRECT_WHEN_AUTHENTICATED = [
  "/login",
  "/register",
  "/forgot-password",
];

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-pathname", request.nextUrl.pathname);
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Keep database authorization out of the middleware request path. App layouts,
  // server pages and Supabase RLS/RPC policies remain the authorization boundary.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isAuthenticated && !isPublicAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    REDIRECT_WHEN_AUTHENTICATED.some((route) => pathname === route)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
