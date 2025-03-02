import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"
import { MESSAGE_BATCH_SIZE } from "@/lib/constants"
import { initAdmin } from "@/lib/firebase-admin"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 120, "SEND_MESSAGE") // 120 messages per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    // Use getAuth().verifyIdToken
    const decodedToken = await getAuth().verifyIdToken(token)
    const { roomId, text, imageUrl, gifUrl, audioUrl, replyTo } = await request.json()

    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
    }

    if (!text && !imageUrl && !gifUrl && !audioUrl) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    // Create message in Firestore
    const messagesRef = collection(db, "messages")
    const newMessage = await addDoc(messagesRef, {
      roomId,
      text,
      imageUrl,
      gifUrl,
      audioUrl,
      uid: decodedToken.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readBy: [decodedToken.uid],
      replyTo,
    })

    return NextResponse.json({ id: newMessage.id })
  } catch (error) {
    console.error("Message creation error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 30, "GET_MESSAGES") // 30 requests per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    // Use getAuth().verifyIdToken
    const decodedToken = await getAuth().verifyIdToken(token)
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")
    const before = searchParams.get("before")

    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
    }

    // Query messages
    const messagesRef = collection(db, "messages")
    let q = query(messagesRef, where("roomId", "==", roomId), orderBy("createdAt", "desc"), limit(MESSAGE_BATCH_SIZE))

    if (before) {
      q = query(
        messagesRef,
        where("roomId", "==", roomId),
        where("createdAt", "<", new Date(before)),
        orderBy("createdAt", "desc"),
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
    console.error("Message fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

