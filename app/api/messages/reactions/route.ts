export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"

interface MessageData {
    roomId?: string;
    dmId?: string;
    reactions?: Record<string, string[]>;
    [key: string]: any;
}

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function PATCH(request: NextRequest) {
    try {
        await limiter.check(request, 120, "UPDATE_LOBBY_MESSAGE_REACTION") // 120 reactions per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        const { messageId, emoji, action } = await request.json()

        if (!messageId || !emoji || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (action !== 'add' && action !== 'remove') {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        // Get the message
        const messageRef = adminDb.collection("messages").doc(messageId)
        const messageSnap = await messageRef.get()

        if (!messageSnap.exists) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 })
        }

        const messageData = messageSnap.data() as MessageData

        // Verify this is a lobby message (no roomId or dmId)
        if (messageData?.roomId || messageData?.dmId) {
            return NextResponse.json({ error: "This endpoint is only for lobby messages" }, { status: 403 })
        }

        // Log message data for debugging
        console.log('Lobby message data:', {
            id: messageId,
            hasRoomId: !!messageData?.roomId,
            hasDmId: !!messageData?.dmId,
            hasUserId: !!(messageData as any)?.userId,
            hasSenderId: !!messageData?.senderId,
            fields: Object.keys(messageData || {})
        })

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
        console.error("Lobby message reaction update error:", error)
        return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 })
    }
} 