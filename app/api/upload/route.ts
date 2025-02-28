import { type NextRequest, NextResponse } from "next/server"
import { auth, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { rateLimit } from "@/lib/rate-limit"
import { MAX_FILE_SIZE } from "@/lib/constants"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 20, "FILE_UPLOAD") // 20 uploads per minute

    const token = request.headers.get("Authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await auth.verifyIdToken(token)
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = {
      image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      audio: ["audio/webm", "audio/mp3", "audio/wav"],
    }

    if (!type || !allowedTypes[type as keyof typeof allowedTypes]?.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Generate unique filename
    const extension = file.name.split(".").pop()
    const filename = `${type}/${decodedToken.uid}/${Date.now()}.${extension}`
    const storageRef = ref(storage, filename)

    // Upload file
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}