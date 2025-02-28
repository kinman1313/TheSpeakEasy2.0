import { NextResponse } from "next/server"
import { auth as adminAuth } from "firebase-admin"
import { initAdmin } from "@/lib/firebase-admin"

export async function GET() {
  try {
    // Initialize Firebase Admin
    initAdmin()

    // Try to list users (this will fail if credentials are invalid)
    await adminAuth().listUsers(1)

    return NextResponse.json({
      status: "success",
      message: "Firebase Admin SDK initialized successfully",
    })
  } catch (error: any) {
    console.error("Firebase Admin Error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
      },
      {
        status: 500,
      },
    )
  }
}

