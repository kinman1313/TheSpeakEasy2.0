import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { MESSAGE_BATCH_SIZE } from "@/lib/constants"

export const dynamic = "force-dynamic";

// Add this interface to define the message data structure
interface MessageData {
    text: string;
    senderId: string;
    roomId: string;
    createdAt: string;
    [key: string]: any; // Allow other properties
}

// Add this interface to define the room data structure
interface RoomData {
    ownerId: string;
    members: string[];
    [key: string]: any; // Allow other properties
}

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await limiter.check(request, 60, "GET_ROOM_MESSAGES") // 60 requests per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: roomId } = params

        const decodedToken = await adminAuth.verifyIdToken(token)

        // Check if user is a member of the room
        const roomRef = adminDb.collection("rooms").doc(roomId)
        const roomSnap = await roomRef.get()

        if (!roomSnap.exists) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        const roomData = roomSnap.data() as RoomData;

        if (!roomData.members.includes(decodedToken.uid)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Get query parameters
        const limit = parseInt(request.nextUrl.searchParams.get("limit") || MESSAGE_BATCH_SIZE.toString(), 10)
        const before = request.nextUrl.searchParams.get("before")

        // Query messages
        let messagesQuery = adminDb.collection("messages")
            .where("roomId", "==", roomId)
            .orderBy("createdAt", "desc")
            .limit(limit)

        if (before) {
            // Get the message to use as a cursor
            const cursorDoc = await adminDb.collection("messages").doc(before).get()
            if (cursorDoc.exists) {
                messagesQuery = messagesQuery.startAfter(cursorDoc)
            }
        }

        const snapshot = await messagesQuery.get()
        const messages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        return NextResponse.json({ messages })
    } catch (error) {
        console.error("Room messages fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await limiter.check(request, 60, "SEND_ROOM_MESSAGE") // 60 messages per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: roomId } = params

        const decodedToken = await adminAuth.verifyIdToken(token)

        // Check if user is a member of the room
        const roomRef = adminDb.collection("rooms").doc(roomId)
        const roomSnap = await roomRef.get()

        if (!roomSnap.exists) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        const roomData = roomSnap.data() as RoomData;

        if (!roomData.members.includes(decodedToken.uid)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { text, attachments = [] } = await request.json()

        if (!text?.trim() && attachments.length === 0) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 })
        }

        // Create message in Firestore
        const messagesRef = adminDb.collection("messages")
        const newMessage = await messagesRef.add({
            text: text?.trim() || "",
            attachments,
            senderId: decodedToken.uid,
            roomId,
            createdAt: new Date().toISOString(),
        })

        // Update room's updatedAt timestamp
        await roomRef.update({
            updatedAt: new Date().toISOString(),
        })

        return NextResponse.json({ id: newMessage.id })
    } catch (error) {
        console.error("Room message creation error:", error)
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }
}