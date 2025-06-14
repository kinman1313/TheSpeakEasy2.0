import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await limiter.check(request, 30, "DELETE_MESSAGE") // 30 deletions per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: messageId } = params
        const decodedToken = await adminAuth.verifyIdToken(token)

        // Get the message
        const messageRef = adminDb.collection("messages").doc(messageId)
        const messageSnap = await messageRef.get()

        if (!messageSnap.exists) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 })
        }

        const messageData = messageSnap.data()
        if (!messageData) {
            return NextResponse.json({ error: "Message data not found" }, { status: 404 })
        }

        // Check if user is the sender of the message
        const senderId = (messageData as any).senderId || (messageData as any).uid
        if (senderId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Delete the message
        await messageRef.delete()

        console.log(`Deleted message ${messageId} by user ${decodedToken.uid}`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Message deletion error:", error)
        return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
    }
} 