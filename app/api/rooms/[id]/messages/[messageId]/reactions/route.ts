export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"

interface MessageData {
    roomId?: string;
    reactions?: Record<string, string[]>;
    [key: string]: any;
}

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; messageId: string } }
) {
    try {
        await limiter.check(request, 120, "UPDATE_ROOM_MESSAGE_REACTION")

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        const { emoji, action } = await request.json()
        const { id: roomId, messageId } = params

        if (!messageId || !emoji || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (action !== 'add' && action !== 'remove') {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        // Verify user has access to this room
        const roomRef = adminDb.collection("rooms").doc(roomId)
        const roomSnap = await roomRef.get()

        if (!roomSnap.exists) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        const roomData = roomSnap.data() as { members?: string[] }
        if (!roomData?.members?.includes(decodedToken.uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        // Get the message
        const messageRef = adminDb.collection("messages").doc(messageId)
        const messageSnap = await messageRef.get()

        if (!messageSnap.exists) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 })
        }

        const messageData = messageSnap.data() as MessageData

        // Verify message belongs to this room
        if (messageData?.roomId !== roomId) {
            return NextResponse.json({ error: "Message not in this room" }, { status: 403 })
        }

        // Update reactions
        const reactions = messageData?.reactions || {}

        if (action === 'add') {
            if (!reactions[emoji]) {
                reactions[emoji] = []
            }
            if (!reactions[emoji].includes(decodedToken.uid)) {
                reactions[emoji].push(decodedToken.uid)
            }
        } else {
            if (reactions[emoji]) {
                reactions[emoji] = reactions[emoji].filter((uid: string) => uid !== decodedToken.uid)
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji]
                }
            }
        }

        await messageRef.update({ reactions })

        return NextResponse.json({ success: true, reactions })
    } catch (error) {
        console.error("Room message reaction update error:", error)
        return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 })
    }
} 