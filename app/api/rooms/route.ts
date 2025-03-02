import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"
import { initAdmin } from "@/lib/firebase-admin"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    await limiter.check(request, 30, "CREATE_ROOM") // 30 creations per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const { name, isPrivate, members = [] } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    // Create room in Firestore
    const roomsRef = collection(db, "rooms")
    const newRoom = await addDoc(roomsRef, {
      name: name.trim(),
      isPrivate: !!isPrivate,
      ownerId: decodedToken.uid,
      members: Array.from(new Set([...members, decodedToken.uid])), // Using Array.from instead of spread
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: newRoom.id })
  } catch (error) {
    console.error("Room creation error:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await limiter.check(request, 60, "GET_ROOMS") // 60 requests per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)

    // Query rooms
    const roomsRef = collection(db, "rooms")
    const q = query(roomsRef, where("members", "array-contains", decodedToken.uid), orderBy("updatedAt", "desc"))

    const snapshot = await getDocs(q)
    const rooms = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error("Rooms fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}

