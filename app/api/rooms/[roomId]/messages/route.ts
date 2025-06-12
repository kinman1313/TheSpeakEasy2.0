import { NextResponse } from "next/server"
import { adminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const MESSAGE_BATCH_SIZE = 10

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
        const messagesRef = db
            .collection("rooms")
            .doc(roomId)
            .collection("messages")
            .orderBy("createdAt", "desc")
            .limit(limit)

        const snapshot = before
            ? await messagesRef.startAfter(await db.doc(`messages/${before}`).get()).get()
            : await messagesRef.get()

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
        const { content, senderId } = await request.json()

        if (!content || !senderId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const decodedToken = await adminAuth.verifyIdToken(senderId)
        const db = getAdminDb()
        const newMessageRef = db
            .collection("rooms")
            .doc(roomId)
            .collection("messages")
            .doc()

        await newMessageRef.set({
            content,
            senderId: decodedToken.uid,
            createdAt: FieldValue.serverTimestamp(),
        })

        return NextResponse.json({ id: newMessageRef.id })
    } catch (error) {
        console.error("Error sending message:", error)
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        )
    }
} 