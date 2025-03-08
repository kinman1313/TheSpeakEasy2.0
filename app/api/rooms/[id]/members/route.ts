export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { FieldValue } from "firebase-admin/firestore"

// Add this interface to define the room data structure
interface RoomData {
    ownerId: string;
    members: string[];
    name?: string;
    isPrivate?: boolean;
    [key: string]: any; // Allow other properties
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
        await limiter.check(request, 30, "MANAGE_ROOM_MEMBERS") // 30 operations per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = params

        const decodedToken = await adminAuth.verifyIdToken(token)
        const roomRef = adminDb.collection("rooms").doc(id)
        const roomSnap = await roomRef.get()

        if (!roomSnap.exists) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        // Add this type assertion to tell TypeScript about the structure
        const roomData = roomSnap.data() as RoomData;

        if (roomData.ownerId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { memberId, action } = await request.json()

        if (!memberId || !["add", "remove"].includes(action)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 })
        }

        // Update room members using adminDb
        await roomRef.update({
            members: action === "add"
                ? FieldValue.arrayUnion(memberId)
                : FieldValue.arrayRemove(memberId),
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Room members update error:", error)

        // Provide more detailed error message for Firebase Admin initialization issues
        if (error instanceof Error && error.message.includes("Firebase Admin not initialized")) {
            return NextResponse.json({
                error: "Server configuration error",
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            }, { status: 500 })
        }

        return NextResponse.json({ error: "Failed to update room members" }, { status: 500 })
    }
}