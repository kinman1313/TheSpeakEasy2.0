export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { initAdmin } from "@/lib/firebase-admin"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    await limiter.check(request, 30, "UPLOAD_FILE") // 30 uploads per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Firebase Admin if not already initialized
    initAdmin()

    const decodedToken = await getAuth().verifyIdToken(token)
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!["image", "audio"].includes(type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Process file upload logic here
    // ... rest of your upload handling code ...

    return NextResponse.json({ url: "uploaded-file-url" })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

