import { NextResponse } from "next/server"
import { adminAuth, getAdminDb } from "@/lib/firebase-admin"

export async function PATCH(
    request: Request,
    { params }: { params: { roomId: string; messageId: string } }
) {
    try {
        const { roomId, messageId } = params
        const { emoji, action, userId } = await request.json()

        if (!emoji || !action || !userId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const db = getAdminDb()
        const messageRef = db.collection("rooms").doc(roomId)
            .collection("messages").doc(messageId)

        const messageDoc = await messageRef.get()
        if (!messageDoc.exists) {
            return NextResponse.json(
                { error: "Message not found" },
                { status: 404 }
            )
        }

        const messageData = messageDoc.data()
        if (!messageData) {
            return NextResponse.json(
                { error: "Message data not found" },
                { status: 404 }
            )
        }

        const decodedToken = await adminAuth.verifyIdToken(userId)
        let reactions = messageData.reactions || {}

        if (action === "add") {
            if (!reactions[emoji]) {
                reactions[emoji] = []
            }
            if (!reactions[emoji].includes(decodedToken.uid)) {
                reactions[emoji].push(decodedToken.uid)
            }
        } else if (action === "remove") {
            if (reactions[emoji]) {
                reactions[emoji] = reactions[emoji].filter(
                    (uid: string) => uid !== decodedToken.uid
                )
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji]
                }
            }
        }

        await messageRef.update({ reactions })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error updating reactions:", error)
        return NextResponse.json(
            { error: "Failed to update reactions" },
            { status: 500 }
        )
    }
} 