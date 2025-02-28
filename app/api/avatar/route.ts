import { type NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 60, "CACHE_TOKEN") // 60 requests per minute

    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get("name") || "User"
    const size = Number.parseInt(searchParams.get("size") || "40")
    const colors = [
      "#00f3ff", // neon blue
      "#39ff14", // neon green
      "#ff0099", // neon pink
      "#9400d3", // neon purple
    ]

    // Generate consistent color based on name
    const colorIndex = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    const backgroundColor = colors[colorIndex]

    // Generate SVG avatar
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
        <text
          x="50%"
          y="50%"
          text-anchor="middle"
          dy=".1em"
          fill="white"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="${size * 0.5}"
          font-weight="bold"
        >
          ${name.charAt(0).toUpperCase()}
        </text>
      </svg>
    `

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Avatar generation error:", error)
    return NextResponse.json({ error: "Failed to generate avatar" }, { status: 500 })
  }
}