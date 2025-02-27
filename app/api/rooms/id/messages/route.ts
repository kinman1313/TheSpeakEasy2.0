import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"
import { MESSAGE_BATCH_SIZE } from "@/lib/constants"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

// Get room messages with pagination
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    await limiter.check(request, 30, "GET_ROOM_MESSAGES") // 30 requests per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")

    // Check room membership
    const roomRef = doc(db, "rooms", params.id)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (!roomSnap.data().members.includes(decodedToken.uid)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Query messages
    const messagesRef = collection(db, "messages")
    let q = query(
      messagesRef,
      where("roomId", "==", params.id),
      orderBy("createdAt", "desc"),
      limit(MESSAGE_BATCH_SIZE),
    )

    if (cursor) {
      const cursorDoc = await getDoc(doc(db, "messages", cursor))
      if (cursorDoc.exists()) {
        q = query(
          messagesRef,
          where("roomId", "==", params.id),
          orderBy("createdAt", "desc"),
          startAfter(cursorDoc),
          limit(MESSAGE_BATCH_SIZE),
        )
      }
    }

    const snapshot = await getDocs(q)
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const lastVisible = snapshot.docs[snapshot.docs.length - 1]

    return NextResponse.json({
      messages,
      nextCursor: lastVisible?.id,
      hasMore: snapshot.docs.length === MESSAGE_BATCH_SIZE,
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

