import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 60, "UPDATE_PRESENCE") // 60 updates per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const { status } = await request.json()

    if (!["online", "offline", "away"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Update user presence
    const userRef = doc(db, "users", decodedToken.uid)
    await updateDoc(userRef, {
      status,
      lastSeen: serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Presence update error:", error)
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 })
  }
}