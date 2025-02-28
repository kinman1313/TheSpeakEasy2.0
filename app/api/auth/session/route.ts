import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth as adminAuth } from "firebase-admin"
import { initAdmin } from "@/lib/firebase-admin"

// Initialize Firebase Admin if it hasn't been initialized
initAdmin()

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    // Verify the token
    const decodedToken = await adminAuth().verifyIdToken(token)

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth().createSessionCookie(token, { expiresIn })

    // Set the cookie
    cookies().set("__session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

    return NextResponse.json({ status: "success" })
  } catch (error) {
    console.error("Error setting session:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE() {
  // Clear the session cookie
  cookies().delete("__session")
  return NextResponse.json({ status: "success" })
}

