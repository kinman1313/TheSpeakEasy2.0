export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
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

export async function POST(request: NextRequest) {
    try {
        await limiter.check(request, 60, "SEND_MESSAGE") // 60 messages per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        const { roomId, text, attachments = [] } = await request.json()

        if (!roomId) {
            return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
        }

        if (!text?.trim() && attachments.length === 0) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 })
        }

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
        console.error("Message creation error:", error)
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        await limiter.check(request, 60, "GET_MESSAGES") // 60 requests per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)

        // Get query parameters
        const roomId = request.nextUrl.searchParams.get("roomId")

        if (!roomId) {
            return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
        }

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

        const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10)
        const before = request.nextUrl.searchParams.get("before")

        // Query messages
        let query = adminDb.collection("messages")
            .where("roomId", "==", roomId)
            .orderBy("createdAt", "desc")
            .limit(limit)

        if (before) {
            // Get the message to use as a cursor
            const cursorDoc = await adminDb.collection("messages").doc(before).get()
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc)
            }
        }

        const snapshot = await query.get()
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