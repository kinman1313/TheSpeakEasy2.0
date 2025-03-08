export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { Timestamp } from "firebase-admin/firestore"

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
    try {
        await limiter.check(request, 30, "CREATE_ROOM") // 30 creations per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        const { name, isPrivate, members = [] } = await request.json()

        if (!name?.trim()) {
            return NextResponse.json({ error: "Room name is required" }, { status: 400 })
        }

        // Create room using adminDb
        const roomsRef = adminDb.collection("rooms")
        const newRoom = await roomsRef.add({
            name: name.trim(),
            isPrivate: !!isPrivate,
            ownerId: decodedToken.uid,
            members: Array.from(new Set([...members, decodedToken.uid])),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        return NextResponse.json({ id: newRoom.id })
    } catch (error) {
        console.error("Room creation error:", error)
        return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        await limiter.check(request, 60, "GET_ROOMS") // 60 requests per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)

        // Query rooms using adminDb
        const roomsRef = adminDb.collection("rooms")
        const snapshot = await roomsRef
            .where("members", "array-contains", decodedToken.uid)
            .orderBy("updatedAt", "desc")
            .get()

        const rooms = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        return NextResponse.json({ rooms })
    } catch (error) {
        console.error("Rooms fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
    }
}