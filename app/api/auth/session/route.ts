import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic";

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function GET(request: NextRequest) {
    try {
        await limiter.check(request, 60, "GET_SESSION")

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        
        // Use decodedToken to provide session information
        return NextResponse.json({ 
            success: true,
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email || null,
                emailVerified: ('email_verified' in decodedToken) ? decodedToken.email_verified : false
            }
        })
    } catch (error) {
        console.error("Session verification error:", error)
        return NextResponse.json({ error: "Session verification failed" }, { status: 401 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json()

        // Verify the token using adminAuth directly
        const decodedToken = await adminAuth.verifyIdToken(token)
        
        // Log successful verification for security audit
        console.log(`Session cookie created for user: ${decodedToken.uid}`)

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