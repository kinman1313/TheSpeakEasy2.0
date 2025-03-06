export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase"
import { doc, getDoc, arrayUnion, arrayRemove, updateDoc } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"
import { initAdmin } from "@/lib/firebase-admin"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await limiter.check(request, 30, "MANAGE_ROOM_MEMBERS") // 30 operations per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const roomRef = doc(db, "rooms", params.id)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const roomData = roomSnap.data()
    if (roomData.ownerId !== decodedToken.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { memberId, action } = await request.json()

    if (!memberId || !["add", "remove"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Update room members
    await updateDoc(roomRef, {
      members: action === "add" ? arrayUnion(memberId) : arrayRemove(memberId),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Room members update error:", error)
    return NextResponse.json({ error: "Failed to update room members" }, { status: 500 })
  }
}

