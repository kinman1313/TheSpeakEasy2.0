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
        console.log("Room creation attempt started")
        console.log("Environment check:", {
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            nodeEnv: process.env.NODE_ENV
        })

        await limiter.check(request, 30, "CREATE_ROOM") // 30 creations per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            console.log("No authorization token provided")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        console.log("Authorization token received, verifying...")

        const decodedToken = await adminAuth.verifyIdToken(token)
        console.log("Token verified for user:", decodedToken.uid)

        const { name, isPrivate, members = [] } = await request.json()
        console.log("Room data:", { name, isPrivate, membersCount: members.length })

        if (!name?.trim()) {
            console.log("Room name validation failed")
            return NextResponse.json({ error: "Room name is required" }, { status: 400 })
        }

        console.log("Creating room in Firestore...")
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

        console.log("Room created successfully with ID:", newRoom.id)
        return NextResponse.json({ id: newRoom.id })
    } catch (error) {
        console.error("Room creation error:", error)
        console.error("Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        })
        return NextResponse.json({
            error: "Failed to create room",
            details: process.env.NODE_ENV === "development" ? error instanceof Error ? error.message : String(error) : undefined
        }, { status: 500 })
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