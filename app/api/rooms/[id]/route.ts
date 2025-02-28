import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

// Get single room details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    await limiter.check(request, 30, "GET_ROOM") // 30 requests per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const roomRef = doc(db, "rooms", params.id)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const roomData = roomSnap.data()

    // Check if user is a member of the room
    if (!roomData.members.includes(decodedToken.uid)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({
      id: roomSnap.id,
      ...roomData,
    })
  } catch (error) {
    console.error("Room fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 })
  }
}

// Update room settings
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    await limiter.check(request, 20, "UPDATE_ROOM") // 20 updates per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const { name, isPrivate, description } = await request.json()

    const roomRef = doc(db, "rooms", params.id)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Check if user is the room creator
    if (roomSnap.data().createdBy !== decodedToken.uid) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    await updateDoc(roomRef, {
      ...(name && { name: name.trim() }),
      ...(typeof isPrivate === "boolean" && { isPrivate }),
      ...(description && { description: description.trim() }),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Room update error:", error)
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 })
  }
}

// Delete room
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    await limiter.check(request, 10, "DELETE_ROOM") // 10 deletions per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const roomRef = doc(db, "rooms", params.id)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Check if user is the room creator
    if (roomSnap.data().createdBy !== decodedToken.uid) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    await deleteDoc(roomRef)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Room deletion error:", error)
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 })
  }
}

// Update room members
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    await limiter.check(request, 20, "UPDATE_MEMBERS") // 20 member updates per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const { action, userId } = await request.json()

    if (!["add", "remove"].includes(action) || !userId) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    const roomRef = doc(db, "rooms", params.id)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const roomData = roomSnap.data()

    // Check if user is the room creator or has admin rights
    if (roomData.createdBy !== decodedToken.uid) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    // Don't allow removing the room creator
    if (action === "remove" && userId === roomData.createdBy) {
      return NextResponse.json({ error: "Cannot remove room creator" }, { status: 400 })
    }

    await updateDoc(roomRef, {
      members: action === "add" ? arrayUnion(userId) : arrayRemove(userId),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Member update error:", error)
    return NextResponse.json({ error: "Failed to update members" }, { status: 500 })
  }
}

