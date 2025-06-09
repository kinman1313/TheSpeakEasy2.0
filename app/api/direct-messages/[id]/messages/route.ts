import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { Timestamp } from "firebase-admin/firestore"

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await limiter.check(request, 60, "SEND_DM_MESSAGE") // 60 messages per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: dmId } = await params
        const decodedToken = await adminAuth.verifyIdToken(token)

        // Check if user is a participant in the DM
        const dmRef = adminDb.collection("directMessages").doc(dmId)
        const dmSnap = await dmRef.get()

        if (!dmSnap.exists) {
            return NextResponse.json({ error: "Direct message not found" }, { status: 404 })
        }

        const dmData = dmSnap.data() as { participants: string[] }

        if (!dmData.participants || !dmData.participants.includes(decodedToken.uid)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { text, attachments = [] } = await request.json()

        if (!text?.trim() && attachments.length === 0) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 })
        }

        // Create message in Firestore
        const messagesRef = adminDb.collection("messages")
        const messageData = {
            text: text?.trim() || "",
            attachments,
            senderId: decodedToken.uid,
            dmId,
            createdAt: Timestamp.now(),
        }
        const newMessage = await messagesRef.add(messageData)

        // Update DM's updatedAt timestamp
        await dmRef.update({
            updatedAt: Timestamp.now(),
        })

        return NextResponse.json({ id: newMessage.id })
    } catch (error) {
        console.error("DM message creation error:", error)
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await limiter.check(request, 60, "GET_DM_MESSAGES") // 60 requests per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: dmId } = await params
        const decodedToken = await adminAuth.verifyIdToken(token)

        // Check if user is a participant in the DM
        const dmRef = adminDb.collection("directMessages").doc(dmId)
        const dmSnap = await dmRef.get()

        if (!dmSnap.exists) {
            return NextResponse.json({ error: "Direct message not found" }, { status: 404 })
        }

        const dmData = dmSnap.data() as { participants: string[] }

        if (!dmData.participants || !dmData.participants.includes(decodedToken.uid)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Get messages for this DM
        const messagesRef = adminDb.collection("messages")
        const messagesQuery = messagesRef
            .where("dmId", "==", dmId)
            .orderBy("createdAt", "asc")
            .limit(100) // Limit to last 100 messages

        const messagesSnap = await messagesQuery.get()
        const messages = messagesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        return NextResponse.json({ messages })
    } catch (error) {
        console.error("DM messages fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await limiter.check(request, 120, "UPDATE_DM_MESSAGE_REACTION") // 120 reactions per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: dmId } = await params
        const decodedToken = await adminAuth.verifyIdToken(token)

        // Check if user is a participant in the DM
        const dmRef = adminDb.collection("directMessages").doc(dmId)
        const dmSnap = await dmRef.get()

        if (!dmSnap.exists) {
            return NextResponse.json({ error: "Direct message not found" }, { status: 404 })
        }

        const dmData = dmSnap.data() as { participants: string[] }

        if (!dmData.participants || !dmData.participants.includes(decodedToken.uid)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

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

        const messageData = messageSnap.data() as { dmId?: string; reactions?: Record<string, string[]> }
        if (messageData?.dmId !== dmId) {
            return NextResponse.json({ error: "Message not in this direct message" }, { status: 403 })
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
        console.error("DM message reaction update error:", error)
        return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 })
    }
} 