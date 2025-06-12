import { NextResponse } from "next/server"
import { adminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const MESSAGE_BATCH_SIZE = 50

export async function GET(
    request: Request,
    { params }: { params: { roomId: string } }
) {
    try {
        const { roomId } = params
        const limit = parseInt(
            new URL(request.url).searchParams.get("limit") || MESSAGE_BATCH_SIZE.toString(),
            10
        )
        const before = new URL(request.url).searchParams.get("before")

        const db = getAdminDb()

        // Query messages from main collection with roomId filter
        let messagesQuery = db
            .collection("messages")
            .where("roomId", "==", roomId)
            .orderBy("createdAt", "desc")
            .limit(limit)

        if (before) {
            const cursorDoc = await db.collection("messages").doc(before).get()
            if (cursorDoc.exists) {
                messagesQuery = messagesQuery.startAfter(cursorDoc)
            }
        }

        const snapshot = await messagesQuery.get()
        const messages = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        }))

        return NextResponse.json(messages)
    } catch (error) {
        console.error("Error fetching messages:", error)
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: { roomId: string } }
) {
    try {
        const { roomId } = params
        const { text, attachments = [], replyToId, expirationTimer } = await request.json()

        if (!text?.trim() && attachments.length === 0) {
            return NextResponse.json(
                { error: "Message content is required" },
                { status: 400 }
            )
        }

        // Get authorization token
        const authHeader = request.headers.get("Authorization")
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await adminAuth.verifyIdToken(token)

        // Get user information
        const db = getAdminDb()
        const userDoc = await db.collection("users").doc(decodedToken.uid).get()
        const userData = userDoc.exists ? userDoc.data() : {}
        const userName = userData?.displayName || (decodedToken as any).name || decodedToken.email || 'Anonymous'
        const userPhotoURL = userData?.photoURL || (decodedToken as any).picture || null

        // Create message in main collection
        const messageData: any = {
            text: text?.trim() || "",
            attachments,
            senderId: decodedToken.uid,
            uid: decodedToken.uid,
            userName: userName,
            displayName: userName,
            photoURL: userPhotoURL,
            roomId: roomId,
            createdAt: FieldValue.serverTimestamp(),
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

        const newMessage = await db.collection("messages").add(messageData)

        // Update room's updatedAt timestamp
        await db.collection("rooms").doc(roomId).update({
            updatedAt: FieldValue.serverTimestamp(),
        })

        return NextResponse.json({ id: newMessage.id })
    } catch (error) {
        console.error("Error sending message:", error)
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        )
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