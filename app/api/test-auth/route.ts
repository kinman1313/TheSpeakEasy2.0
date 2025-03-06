export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { initAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET() {
  try {
    // Initialize Firebase Admin
    const app = initAdmin()

    // Only try to get auth if we have a valid app
    if (app && typeof app.name === "string") {
      const auth = getAuth(app)
      return NextResponse.json({ status: "Firebase Admin initialized successfully" })
    }

    return NextResponse.json({ status: "Firebase Admin mock used (development/build)" })
  } catch (error: unknown) {
    console.error("Error initializing Firebase Admin:", error)

    // Type check the error before accessing message property
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

