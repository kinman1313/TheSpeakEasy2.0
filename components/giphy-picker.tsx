"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { GiftIcon as Gif } from "lucide-react"
import { useDebounce } from "@/lib/hooks/use-debounce"
import Image from "next/image"

interface GiphyImage {
  id: string
  title: string
  images: {
    fixed_height: {
      url: string
      width: string
      height: string
    }
  }
}

export function GiphyPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [gifs, setGifs] = useState<GiphyImage[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebounce(search, 500)

  const searchGifs = useCallback(async (query: string) => {
    if (!query) {
      setGifs([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${process.env.NEXT_PUBLIC_GIPHY_API_KEY}&q=${query}&limit=20&rating=g`,
      )
      const data = await response.json()
      setGifs(data.data)
    } catch (error) {
      console.error("Error fetching GIFs:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelect = (gif: GiphyImage) => {
    onSelect(gif.images.fixed_height.url)
    setOpen(false)
  }

  // Search for GIFs when the debounced search value changes
  useEffect(() => {
    searchGifs(debouncedSearch)
  }, [debouncedSearch, searchGifs])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Gif className="h-4 w-4" />
          <span className="sr-only">Add GIF</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-lg border-none">
        <DialogHeader>
          <DialogTitle>Search GIFs</DialogTitle>
          <DialogDescription>Search and select a GIF to add to your message.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input placeholder="Search GIFs..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="col-span-2 text-center py-4">Loading...</div>
            ) : (
              gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="relative aspect-video overflow-hidden rounded-lg hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={`Select GIF: ${gif.title}`}
                  title={gif.title}
                >
                  <Image
                    src={gif.images.fixed_height.url || "/placeholder.svg"}
                    alt={gif.title}
                    width={200}
                    height={200}
                    className="object-cover h-auto"
                  />
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

