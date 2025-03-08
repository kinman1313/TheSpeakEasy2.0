import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { rateLimit } from "@/lib/rate-limit"
import { initAdmin } from "@/lib/firebase-admin"

// Define the Room interface
interface Room {
    id?: string
    name: string
    description?: string
    ownerId: string
    members: string[]
    createdAt: string | Date
    updatedAt: string | Date
}

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await limiter.check(request, 30, "UPDATE_ROOM") // 30 updates per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Initialize Firebase Admin if not already initialized
        initAdmin()

        const decodedToken = await getAuth().verifyIdToken(token)
        const roomRef = doc(db, "rooms", params.id)
        const roomSnap = await getDoc(roomRef)

        if (!roomSnap.exists()) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        // Type assertion to ensure roomData has the correct type
        const roomData = roomSnap.data() as Room

        if (roomData.ownerId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { name, description } = await request.json()

        // Update room
        await updateDoc(roomRef, {
            name,
            description,
            updatedAt: new Date().toISOString(),
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Room update error:", error)
        return NextResponse.json({ error: "Failed to update room" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await limiter.check(request, 10, "DELETE_ROOM") // 10 deletes per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Initialize Firebase Admin if not already initialized
        initAdmin()

        const decodedToken = await getAuth().verifyIdToken(token)
        const roomRef = doc(db, "rooms", params.id)
        const roomSnap = await getDoc(roomRef)

        if (!roomSnap.exists()) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        // Type assertion to ensure roomData has the correct type
        const roomData = roomSnap.data() as Room

        if (roomData.ownerId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Delete room
        await deleteDoc(roomRef)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Room deletion error:", error)
        return NextResponse.json({ error: "Failed to delete room" }, { status: 500 })
    }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await limiter.check(request, 60, "GET_ROOM") // 60 requests per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Initialize Firebase Admin if not already initialized
        initAdmin()

        const decodedToken = await getAuth().verifyIdToken(token)
        const roomRef = doc(db, "rooms", params.id)
        const roomSnap = await getDoc(roomRef)

        if (!roomSnap.exists()) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        // Type assertion to ensure roomData has the correct type
        const roomData = roomSnap.data() as Room

        if (!roomData.members?.includes(decodedToken.uid) && roomData.ownerId !== decodedToken.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        return NextResponse.json({ room: { id: roomSnap.id, ...roomData } })
    } catch (error) {
        console.error("Room fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 })
    }
}

