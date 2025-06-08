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
        await limiter.check(request, 30, "CREATE_DM") // 30 DMs per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        const { targetUserId } = await request.json()

        if (!targetUserId) {
            return NextResponse.json({ error: "Target user ID is required" }, { status: 400 })
        }

        if (targetUserId === decodedToken.uid) {
            return NextResponse.json({ error: "Cannot create DM with yourself" }, { status: 400 })
        }

        // Check if DM already exists
        const existingDMQuery = await adminDb.collection("directMessages")
            .where("participants", "array-contains", decodedToken.uid)
            .get()

        for (const doc of existingDMQuery.docs) {
            const data = doc.data() as { participants: string[] }
            if (data.participants && data.participants.includes(targetUserId)) {
                // DM already exists, return the existing ID
                return NextResponse.json({ id: doc.id, existing: true })
            }
        }

        // Create new DM
        const dmRef = adminDb.collection("directMessages")
        const newDM = await dmRef.add({
            participants: [decodedToken.uid, targetUserId],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        return NextResponse.json({ id: newDM.id })
    } catch (error) {
        console.error("DM creation error:", error)
        return NextResponse.json({ error: "Failed to create direct message" }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        await limiter.check(request, 60, "GET_DMS") // 60 requests per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)

        // Query DMs using adminDb
        const dmsRef = adminDb.collection("directMessages")
        const snapshot = await dmsRef
            .where("participants", "array-contains", decodedToken.uid)
            .orderBy("updatedAt", "desc")
            .get()

        const dms = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        return NextResponse.json({ dms })
    } catch (error) {
        console.error("DMs fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch direct messages" }, { status: 500 })
    }
} 