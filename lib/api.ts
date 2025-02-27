const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs"

export async function searchGiphy(query: string) {
  const params = new URLSearchParams({
    api_key: process.env.NEXT_PUBLIC_GIPHY_API_KEY!,
    q: query,
    limit: "20",
    rating: "g",
  })

  try {
    const response = await fetch(`${GIPHY_API_BASE}/search?${params}`)
    if (!response.ok) throw new Error("Failed to fetch GIFs")
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error("Error searching GIPHY:", error)
    throw error
  }
}

export async function getTrendingGiphy() {
  const params = new URLSearchParams({
    api_key: process.env.NEXT_PUBLIC_GIPHY_API_KEY!,
    limit: "20",
    rating: "g",
  })

  try {
    const response = await fetch(`${GIPHY_API_BASE}/trending?${params}`)
    if (!response.ok) throw new Error("Failed to fetch trending GIFs")
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error("Error fetching trending GIFs:", error)
    throw error
  }
}

