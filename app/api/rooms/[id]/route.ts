export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
// Import the admin services directly
import { adminDb, adminAuth } from "@/lib/firebase-admin"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await limiter.check(request, 30, "UPDATE_ROOM") // 30 updates per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use adminAuth directly
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Use adminDb with admin SDK methods
    const roomRef = adminDb.collection("rooms").doc(params.id)
    const roomSnap = await roomRef.get()

    if (!roomSnap.exists) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const roomData = roomSnap.data()
    if (roomData?.ownerId !== decodedToken.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { name, description } = await request.json()

    // Update room using admin SDK
    await roomRef.update({
      name,
      description,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Room update error:", error)
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await limiter.check(request, 10, "DELETE_ROOM") // 10 deletes per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use adminAuth directly
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Use adminDb with admin SDK methods
    const roomRef = adminDb.collection("rooms").doc(params.id)
    const roomSnap = await roomRef.get()

    if (!roomSnap.exists) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const roomData = roomSnap.data()
    if (roomData?.ownerId !== decodedToken.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete room using admin SDK
    await roomRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Room deletion error:", error)
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await limiter.check(request, 60, "GET_ROOM") // 60 requests per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use adminAuth directly
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Use adminDb with admin SDK methods
    const roomRef = adminDb.collection("rooms").doc(params.id)
    const roomSnap = await roomRef.get()

    if (!roomSnap.exists) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const roomData = roomSnap.data()
    if (!roomData?.members?.includes(decodedToken.uid) && roomData?.ownerId !== decodedToken.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ room: { id: roomSnap.id, ...roomData } })
  } catch (error) {
    console.error("Room fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 })
  }
}