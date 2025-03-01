import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Allow access to static files and API routes
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/static")
  ) {
    return NextResponse.next()
  }

  // Allow access to auth-related pages
  if (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/reset-password")) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get("auth")

  // Redirect to login if no auth cookie is present
  if (!authCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

