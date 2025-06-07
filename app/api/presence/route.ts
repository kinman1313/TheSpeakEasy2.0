import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { FieldValue } from "firebase-admin/firestore"

export const dynamic = "force-dynamic";

// Define types for our data structures
interface PresenceData {
    status: string;
    lastSeen: FirebaseFirestore.Timestamp | null;
}

interface UserData {
    presence?: PresenceData;
    [key: string]: any; // Allow other properties
}

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
    try {
        await limiter.check(request, 60, "UPDATE_PRESENCE") // 60 updates per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const decodedToken = await adminAuth.verifyIdToken(token)
        const { status } = await request.json()

        // Update user presence in Firestore
        const userRef = adminDb.collection("users").doc(decodedToken.uid)

        await userRef.update({
            presence: {
                status: status || "online",
                lastSeen: FieldValue.serverTimestamp(),
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Presence update error:", error)
        return NextResponse.json({ error: "Failed to update presence" }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        await limiter.check(request, 60, "GET_PRESENCE") // 60 requests per minute

        const token = request.headers.get("Authorization")?.split("Bearer ")[1]
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await adminAuth.verifyIdToken(token)
        const userId = request.nextUrl.searchParams.get("userId")

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }

        // Get user presence from Firestore
        const userRef = adminDb.collection("users").doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Cast the data to our UserData type
        const userData = userDoc.data() as UserData;

        // Default presence object
        const defaultPresence: PresenceData = {
            status: "offline",
            lastSeen: null
        };

        return NextResponse.json({
            presence: userData?.presence || defaultPresence
        })
    } catch (error) {
        console.error("Presence update error:", error);
        if ((error as any)?.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: "Authentication token expired" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to update presence" }, { status: 500 })


    }
}

