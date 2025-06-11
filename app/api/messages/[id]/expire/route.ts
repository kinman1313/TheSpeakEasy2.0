import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { MessageExpirationService } from "@/lib/messageExpiration"

interface MessageData {
    senderId: string;
    roomId?: string;
    dmId?: string;
    expiresAt?: string | null;
    [key: string]: any;
}

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await limiter.check(request, 60, "EXPIRE_MESSAGE") // 60 expirations per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: messageId } = params
        const decodedToken = await adminAuth.verifyIdToken(token)
        const { minutes } = await request.json()

        if (typeof minutes !== 'number' || minutes < 0) {
            return NextResponse.json({ error: "Invalid expiration time" }, { status: 400 })
        }

        // Get the message
        const messageRef = adminDb.collection("messages").doc(messageId)
        const messageSnap = await messageRef.get()

        if (!messageSnap.exists) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 })
        }

        const messageData = messageSnap.data() as MessageData
        if (!messageData) {
            return NextResponse.json({ error: "Message data not found" }, { status: 404 })
        }

        // Check if user is the sender of the message
        if (messageData.uid !== decodedToken.uid && messageData.senderId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Calculate expiration date
        const expirationDate = minutes > 0 ? new Date(Date.now() + minutes * 60 * 1000) : null

        // Update message with expiration date
        await messageRef.update({
            expiresAt: expirationDate ? expirationDate.toISOString() : null
        })

        // Schedule message expiration if needed
        if (expirationDate) {
            const roomType = messageData.roomId ? 'room' : messageData.dmId ? 'dm' : 'lobby'
            const roomId = messageData.roomId || messageData.dmId || 'lobby'
            await MessageExpirationService.scheduleMessageExpiration(messageId, expirationDate, roomId, roomType)
        }

        return NextResponse.json({ success: true, expiresAt: expirationDate })
    } catch (error) {
        console.error("Message expiration error:", error)
        return NextResponse.json({ error: "Failed to expire message" }, { status: 500 })
    }
} 