export const dynamic = "force-dynamic";
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { initAdmin } from "@/lib/firebase-admin"


export async function GET() {
  try {
    // Initialize Firebase Admin
    const app = initAdmin()

    // Only proceed if we have a valid app
    if (!app || typeof app.name !== "string") {
      return NextResponse.json({ status: "unauthenticated", reason: "Firebase Admin not initialized" }, { status: 401 })
    }

    const auth = getAuth(app)

    // Get the session cookie
    const sessionCookie = cookies().get("__session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ status: "unauthenticated" }, { status: 401 })
    }

    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)

    return NextResponse.json({
      status: "authenticated",
      user: {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        displayName: decodedClaims.name,
        photoURL: decodedClaims.picture,
      },
    })
  } catch (error: unknown) {
    console.error("Error verifying session:", error)
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    const app = initAdmin()

    // Only proceed if we have a valid app
    if (!app || typeof app.name !== "string") {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const auth = getAuth(app)

    const { token } = await request.json()

    // Verify the token
    const decodedToken = await auth.verifyIdToken(token)

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await auth.createSessionCookie(token, { expiresIn })

    // Set the cookie
    cookies().set("__session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

    return NextResponse.json({ status: "success" })
  } catch (error: unknown) {
    console.error("Error setting session:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE() {
  // Clear the session cookie
  cookies().delete("__session")
  return NextResponse.json({ status: "success" })
}

