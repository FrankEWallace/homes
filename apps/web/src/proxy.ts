import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate seeker-only routes on the presence of a session cookie. This is a UX
 * redirect only — real authorization is enforced by the backend on every API
 * call (CLAUDE.md rule 3). A stale/expired token still routes here and is
 * rejected server-side, sending the user back to sign in.
 */
const PROTECTED = ["/favorites", "/saved-searches", "/account", "/dashboard"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const hasSession = req.cookies.has("homes_at");
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/favorites/:path*",
    "/saved-searches/:path*",
    "/account/:path*",
    "/dashboard/:path*",
  ],
};
