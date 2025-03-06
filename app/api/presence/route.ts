export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"
import { initAdmin } from "@/lib/firebase-admin"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    await limiter.check(request, 30, "UPDATE_PRESENCE") // 30 updates per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const { status } = await request.json()

    if (!["online", "offline", "away"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Update presence in Firestore
    const presenceRef = doc(db, "presence", decodedToken.uid)
    await setDoc(
      presenceRef,
      {
        status,
        lastSeen: new Date().toISOString(),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Presence update error:", error)
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 })
  }
}

