export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { FieldValue } from "firebase-admin/firestore"
// Add this interface to define the room data structure
interface RoomData {
    ownerId: string;
    members: string[];
    [key: string]: any; // Allow other properties
}

interface MessageData {
    text?: string;
    senderId?: string;
    uid?: string;
    roomId?: string;
    dmId?: string;
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
        const { roomId, text, attachments = [], replyToId, expirationTimer, imageUrl, gifUrl, voiceMessageUrl, voiceMessageDuration, fileUrl, fileName, fileSize, fileType } = await request.json()

        if (!text?.trim() && attachments.length === 0 && !imageUrl && !gifUrl && !voiceMessageUrl && !fileUrl) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 })
        }

        // Get user information for the message
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
        const userData = userDoc.exists ? userDoc.data() : {}
        const userName = userData?.displayName || (decodedToken as any).name || decodedToken.email || 'Anonymous'
        const userPhotoURL = userData?.photoURL || (decodedToken as any).picture || null
        const userChatColor = (userData && 'chatColor' in userData && userData.chatColor) ? userData.chatColor : '#00f3ff';

        // Handle lobby messages (roomId === 'lobby' or no roomId)
        if (!roomId || roomId === 'lobby') {
            // Create lobby message in Firestore
            const messagesRef = adminDb.collection("messages")
            const messageData: any = {
                text: text?.trim() || "",
                attachments,
                senderId: decodedToken.uid,
                uid: decodedToken.uid, // For backward compatibility
                userName: userName,
                displayName: userName,
                photoURL: userPhotoURL,
                chatColor: userChatColor,
                createdAt: FieldValue.serverTimestamp(),
                status: 'sent', // Set proper status
                readBy: [decodedToken.uid], // Mark as read by sender
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

            const newMessage = await messagesRef.add(messageData)
            return NextResponse.json({ id: newMessage.id })
        }

        // Handle room messages (existing logic)
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
        const messageData: any = {
            text: text?.trim() || "",
            attachments,
            senderId: decodedToken.uid,
            roomId,
            userName: userName,
            displayName: userName,
            photoURL: userPhotoURL,
            chatColor: userChatColor,
            createdAt: FieldValue.serverTimestamp(),
            status: 'sent', // Set proper status
            readBy: [decodedToken.uid], // Mark as read by sender
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

        const newMessage = await messagesRef.add(messageData)

        // Update room's updatedAt timestamp
        await roomRef.update({
            updatedAt: FieldValue.serverTimestamp(),
        })

        return NextResponse.json({ id: newMessage.id })
    } catch (error) {
        console.error("Message creation error:", error)
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }
}

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
        const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10)
        const before = request.nextUrl.searchParams.get("before")

        // Handle lobby messages (no roomId or roomId === 'lobby')
        if (!roomId || roomId === 'lobby') {
            // Query lobby messages (messages without roomId or dmId)
            let query = adminDb.collection("messages")
                .where("roomId", "==", null) // Lobby messages have no roomId
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
        }

        // Handle room messages (existing logic)
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

        // Query room messages
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

export async function PATCH(request: NextRequest) {
    try {
        await limiter.check(request, 60, "EDIT_MESSAGE") // 60 edits per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        const { messageId, text, action } = await request.json()

        if (!messageId) {
            return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
        }

        if (action === 'edit') {
            if (!text?.trim()) {
                return NextResponse.json({ error: "Message text is required" }, { status: 400 })
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

            // Verify user owns the message
            if (messageData?.senderId !== decodedToken.uid && messageData?.uid !== decodedToken.uid) {
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

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Message edit error:", error)
        return NextResponse.json({ error: "Failed to edit message" }, { status: 500 })
    }
}