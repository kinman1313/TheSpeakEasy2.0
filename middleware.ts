import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Add paths that don't require authentication
const publicPaths = [
  "/login",
  "/reset-password",
  "/api",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/icons",
]

export function middleware(request: NextRequest) {
  // Check if the path is public
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // Get Firebase auth session cookie
  const session = request.cookies.get("__session")

  // Allow access to public paths
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Redirect to login if no session exists
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

