export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"

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

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await limiter.check(request, 60, "GET_ROOM") // 60 requests per minute

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

        // Check if user is a member of the room
        if (!roomData.members.includes(decodedToken.uid)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        return NextResponse.json({
            id,
            ...roomData
        })
    } catch (error) {
        console.error("Room fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await limiter.check(request, 30, "UPDATE_ROOM") // 30 updates per minute

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

        // Check if user is the owner of the room
        if (roomData.ownerId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { name, isPrivate } = await request.json()
        const updates: Record<string, any> = { updatedAt: new Date().toISOString() }

        if (name !== undefined) updates.name = name.trim()
        if (isPrivate !== undefined) updates.isPrivate = !!isPrivate

        await roomRef.update(updates)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Room update error:", error)
        return NextResponse.json({ error: "Failed to update room" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await limiter.check(request, 10, "DELETE_ROOM") // 10 deletions per minute

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

        // Check if user is the owner of the room
        if (roomData.ownerId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Delete room
        await roomRef.delete()

        // TODO: Delete associated messages and other data

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Room deletion error:", error)
        return NextResponse.json({ error: "Failed to delete room" }, { status: 500 })
    }
}