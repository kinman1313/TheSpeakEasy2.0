export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export async function GET() {
    try {
        // Check if adminAuth is available
        if (adminAuth) {
            // Try to list users (limit to 1) to verify the connection works
            await adminAuth.listUsers(1)
            return NextResponse.json({ status: "Firebase Admin initialized successfully" })
        }

        return NextResponse.json({ status: "Firebase Admin mock used (development/build)" })
    } catch (error: unknown) {
        console.error("Error testing Firebase Admin:", error)

        // Type check the error before accessing message property
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}