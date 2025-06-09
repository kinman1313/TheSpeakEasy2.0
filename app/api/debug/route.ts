import { NextResponse } from "next/server"

export async function GET() {
    try {
        const env = {
            NODE_ENV: process.env.NODE_ENV,
            HAS_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
            HAS_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
            HAS_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
            PROJECT_ID_VALUE: process.env.FIREBASE_PROJECT_ID || "MISSING",
            CLIENT_EMAIL_VALUE: process.env.FIREBASE_CLIENT_EMAIL || "MISSING",
            PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
        }

        // Test Firebase Admin initialization
        let adminInitError = null;
        try {
            const { adminAuth } = await import("@/lib/firebase-admin");
            // Try to use a basic admin function
            await adminAuth.verifyIdToken("test-token-that-will-fail");
        } catch (error) {
            adminInitError = error instanceof Error ? error.message : String(error);
        }

        return NextResponse.json({
            environment: env,
            adminInitError,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        return NextResponse.json({
            error: "Debug endpoint failed",
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
} 