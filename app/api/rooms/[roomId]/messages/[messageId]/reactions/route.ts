import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

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

        const messageRef = adminDb.collection("rooms").doc(roomId)
            .collection("messages").doc(messageId)

        const messageDoc = await messageRef.get()
        if (!messageDoc.exists) {
            return NextResponse.json(
                { error: "Message not found" },
                { status: 404 }
            )
        }

        const messageData = messageDoc.data()
        const reactions = messageData?.reactions || {}

        if (action === "add") {
            if (!reactions[emoji]) {
                reactions[emoji] = [userId]
            } else if (!reactions[emoji].includes(userId)) {
                reactions[emoji] = [...reactions[emoji], userId]
            }
        } else if (action === "remove") {
            if (reactions[emoji]?.includes(userId)) {
                reactions[emoji] = reactions[emoji].filter(id => id !== userId)
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji]
                }
            }
        }

        await messageRef.update({ reactions })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error updating reaction:", error)
        return NextResponse.json(
            { error: "Failed to update reaction" },
            { status: 500 }
        )
    }
} 