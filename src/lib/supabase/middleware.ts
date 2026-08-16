import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/update-password") ||
    pathname.startsWith("/auth");
  const isPendingRoute = pathname.startsWith("/pending-approval");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (!user) return supabaseResponse;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_approved")
    .eq("id", user.id)
    .maybeSingle();

  const isApproved =
    profile?.is_approved === true && profile.role !== "pending";

  if (!isApproved && !isPendingRoute && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/pending-approval";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isApproved && isPendingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = profile.role === "accounting" ? "/attendance" : "/";
    return NextResponse.redirect(url);
  }

  if (
    profile?.role === "accounting" &&
    !isAuthRoute &&
    !isPendingRoute &&
    !pathname.startsWith("/attendance") &&
    !pathname.startsWith("/personnel") &&
    !pathname.startsWith("/profile")
  ) {
    const permissionModule = pathname.startsWith("/projects") ? "projects"
      : pathname.startsWith("/work-plans") ? "work_plans"
      : pathname.startsWith("/imalatlar") ? "productions"
      : pathname.startsWith("/vehicles") ? "vehicles"
      : pathname.startsWith("/inventory") ? "inventory"
      : pathname.startsWith("/custody") ? "custody" : null;
    const { data: allowed } = permissionModule
      ? await supabase.rpc("has_module_write_permission", { p_module: permissionModule })
      : { data: false };
    if (allowed !== true) {
      const url = request.nextUrl.clone();
      url.pathname = "/attendance";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (
    (pathname.startsWith("/users") || pathname.startsWith("/settings")) &&
    profile?.role !== "site_chief"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "accounting" ? "/attendance" : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isWriteOnlyRoute =
    pathname === "/projects/new" ||
    /^\/projects\/[^/]+\/edit$/.test(pathname) ||
    pathname === "/work-plans/new" ||
    /^\/work-plans\/[^/]+\/edit$/.test(pathname);
  if (isWriteOnlyRoute) {
    const permissionModule = pathname.startsWith("/work-plans")
      ? "work_plans"
      : "projects";
    const { data: canWrite } = await supabase.rpc(
      "has_module_write_permission",
      { p_module: permissionModule }
    );
    if (canWrite !== true) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.startsWith("/work-plans")
        ? "/work-plans"
        : "/projects";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (
    isApproved &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = profile.role === "accounting" ? "/attendance" : "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
