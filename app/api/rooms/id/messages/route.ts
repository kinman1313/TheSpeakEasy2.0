import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, startAfter } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"
import { MESSAGE_BATCH_SIZE } from "@/lib/constants"
import { initAdmin } from "@/lib/firebase-admin"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await limiter.check(request, 30, "GET_ROOM_MESSAGES") // 30 requests per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")

    // Query messages
    const messagesRef = collection(db, "messages")
    let q = query(
      messagesRef,
      where("roomId", "==", params.id),
      orderBy("createdAt", "desc"),
      limit(MESSAGE_BATCH_SIZE),
    )

    if (cursor) {
      q = query(
        messagesRef,
        where("roomId", "==", params.id),
        orderBy("createdAt", "desc"),
        startAfter(new Date(cursor)),
        limit(MESSAGE_BATCH_SIZE),
      )
    }

    const snapshot = await getDocs(q)
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

