
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Get the session cookie
        const sessionCookie = cookies().get("__session")?.value

        if (!sessionCookie) {
            return NextResponse.json({ status: "unauthenticated" }, { status: 401 })
        }

        // Verify the session cookie using adminAuth directly
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)

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
        const { token } = await request.json()

        // Verify the token using adminAuth directly
        const decodedToken = await adminAuth.verifyIdToken(token)

        // Create session cookie
        const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn })

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