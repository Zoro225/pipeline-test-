import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const roleHome: Record<string, string> = {
  ADMIN: "/admin",
  STAFF: "/staff",
  STUDENT: "/student",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Logged-in users shouldn't see the login/signup pages again.
  if (isAuthPage && token) {
    const home = roleHome[token.role as string] ?? "/";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (isAuthPage) {
    return NextResponse.next();
  }

  const protectedPrefixes: Record<string, string[]> = {
    "/admin": ["ADMIN"],
    "/staff": ["STAFF"],
    "/student": ["STUDENT"],
  };

  for (const prefix of Object.keys(protectedPrefixes)) {
    if (pathname.startsWith(prefix)) {
      if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const allowedRoles = protectedPrefixes[prefix];
      if (!allowedRoles.includes(token.role as string)) {
        const home = roleHome[token.role as string] ?? "/";
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/student/:path*", "/login", "/signup"],
};
