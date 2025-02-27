import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 10, "CREATE_ROOM") // 10 room creations per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const { name, isPrivate, members = [] } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    // Create room in Firestore
    const roomsRef = collection(db, "rooms")
    const newRoom = await addDoc(roomsRef, {
      name: name.trim(),
      isPrivate: Boolean(isPrivate),
      members: [decodedToken.uid, ...members],
      createdBy: decodedToken.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ id: newRoom.id })
  } catch (error) {
    console.error("Room creation error:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 30, "GET_ROOMS") // 30 requests per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const roomsRef = collection(db, "rooms")
    const q = query(roomsRef, where("members", "array-contains", decodedToken.uid))
    const snapshot = await getDocs(q)

    const rooms = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error("Room fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}

