"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X } from "lucide-react"

// Common emoji categories
const emojis = {
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  gestures: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚", "🖐️", "✋"],
  people: ["👨", "👩", "👧", "👦", "👶", "👵", "👴", "👮", "💂", "👷", "👸", "👳", "👲", "🧕", "🧔", "👱", "👼"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧"],
  food: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅"],
  activities: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "⛳"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🛴", "🚲", "🛵", "🏍️"],
  objects: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸"],
  symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "♥️", "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💌", "❣️"],
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState("smileys")

  return (
    <div className="bg-background border rounded-lg shadow-lg w-64 h-80">
      <div className="flex justify-between items-center p-2 border-b">
        <h3 className="text-sm font-medium">Emoji</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-5 h-10">
          <TabsTrigger value="smileys" className="text-lg p-0">
            😀
          </TabsTrigger>
          <TabsTrigger value="gestures" className="text-lg p-0">
            👍
          </TabsTrigger>
          <TabsTrigger value="people" className="text-lg p-0">
            👨
          </TabsTrigger>
          <TabsTrigger value="animals" className="text-lg p-0">
            🐶
          </TabsTrigger>
          <TabsTrigger value="food" className="text-lg p-0">
            🍏
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="h-56">
          {Object.entries(emojis).map(([category, categoryEmojis]) => (
            <TabsContent key={category} value={category} className="m-0">
              <div className="grid grid-cols-7 gap-1 p-2">
                {categoryEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => onEmojiSelect(emoji)}
                    className="text-xl hover:bg-accent rounded p-1 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  )
}

