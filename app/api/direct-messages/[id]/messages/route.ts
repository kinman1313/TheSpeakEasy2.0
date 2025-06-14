import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { FieldValue } from "firebase-admin/firestore"

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

// Helper function to calculate expiration date
function calculateExpirationDate(timer: string): Date | null {
    if (timer === 'never') return null

    const now = new Date()
    switch (timer) {
        case '5m':
            return new Date(now.getTime() + 5 * 60 * 1000)
        case '1h':
            return new Date(now.getTime() + 60 * 60 * 1000)
        case '24h':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000)
        default:
            return null
    }
}

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
        const { text, attachments = [], replyToId, expirationTimer, imageUrl, gifUrl, voiceMessageUrl, voiceMessageDuration, fileUrl, fileName, fileSize, fileType } = await request.json()

        if (!text?.trim() && attachments.length === 0 && !imageUrl && !gifUrl && !voiceMessageUrl && !fileUrl) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 })
        }

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

        // Get user information for the message
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
        const userData = userDoc.exists ? userDoc.data() : {}
        const userName = userData?.displayName || (decodedToken as any).name || decodedToken.email || 'Anonymous'
        const userPhotoURL = userData?.photoURL || (decodedToken as any).picture || null
        const userChatColor = (userData && 'chatColor' in userData && userData.chatColor) ? userData.chatColor : '#00f3ff';

        const messageData: any = {
            text: text?.trim() || "",
            attachments,
            senderId: decodedToken.uid,
            dmId,
            userName: userName,
            displayName: userName,
            photoURL: userPhotoURL,
            chatColor: userChatColor,
            createdAt: FieldValue.serverTimestamp(),
            status: 'sent',
            readBy: [decodedToken.uid],
            reactions: {}
        }

        // Add media content
        if (imageUrl) {
            messageData.imageUrl = imageUrl;
        }

        if (gifUrl) {
            messageData.gifUrl = gifUrl;
        }

        if (voiceMessageUrl) {
            messageData.voiceMessageUrl = voiceMessageUrl;
            if (voiceMessageDuration) {
                messageData.voiceMessageDuration = voiceMessageDuration;
            }
        }

        if (fileUrl) {
            messageData.fileUrl = fileUrl;
            messageData.fileName = fileName;
            messageData.fileSize = fileSize;
            messageData.fileType = fileType;
        }

        // Add reply context if provided
        if (replyToId) {
            messageData.replyToId = replyToId
        }

        // Add expiration timer if provided
        if (expirationTimer && expirationTimer !== 'never') {
            const expirationDate = calculateExpirationDate(expirationTimer)
            if (expirationDate) {
                messageData.expiresAt = expirationDate
                messageData.expirationTimer = expirationTimer
            }
        }

        // Create message in Firestore
        const messagesRef = adminDb.collection("messages")
        const newMessage = await messagesRef.add(messageData)

        // Update DM's updatedAt timestamp
        await dmRef.update({
            updatedAt: FieldValue.serverTimestamp(),
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

        const { messageId, emoji, action, text } = await request.json()

        if (!messageId) {
            return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
        }

        // Get the message
        const messageRef = adminDb.collection("messages").doc(messageId)
        const messageSnap = await messageRef.get()

        if (!messageSnap.exists) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 })
        }

        const messageData = messageSnap.data() as { dmId?: string; senderId?: string; reactions?: Record<string, string[]> }
        if (messageData?.dmId !== dmId) {
            return NextResponse.json({ error: "Message not in this direct message" }, { status: 403 })
        }

        // Handle message editing
        if (action === 'edit') {
            if (!text?.trim()) {
                return NextResponse.json({ error: "Message text is required" }, { status: 400 })
            }

            // Verify user owns the message
            if (messageData?.senderId !== decodedToken.uid) {
                return NextResponse.json({ error: "Unauthorized to edit this message" }, { status: 403 })
            }

            // Update the message
            await messageRef.update({
                text: text.trim(),
                isEdited: true,
                editedAt: FieldValue.serverTimestamp()
            })

            return NextResponse.json({ success: true })
        }

        // Handle reactions
        if (!emoji || !action) {
            return NextResponse.json({ error: "Missing required fields for reaction" }, { status: 400 })
        }

        if (action !== 'add' && action !== 'remove') {
            return NextResponse.json({ error: "Invalid reaction action" }, { status: 400 })
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