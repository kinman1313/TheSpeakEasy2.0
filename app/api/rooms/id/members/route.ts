import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

// Get room members with details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    await limiter.check(request, 30, "GET_ROOM_MEMBERS") // 30 requests per minute

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

    // Get member details
    const usersRef = collection(db, "users")
    const memberQuery = query(usersRef, where("uid", "in", roomData.members))
    const memberSnap = await getDocs(memberQuery)

    const members = memberSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Filter out sensitive information
      settings: undefined,
      email: undefined,
    }))

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Members fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

