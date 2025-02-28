"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SmilePlus } from "lucide-react"
import { useAuth } from "./AuthProvider"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { toast } from "sonner"

// Define types
interface Message {
    id: string
    reactions?: {
        [key: string]: string[] // emoji: userIds[]
    }
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"] as const

export function MessageReactions({ message }: { message: Message }) {
    const { user } = useAuth()
    const [showReactions, setShowReactions] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    const addReaction = async (emoji: string) => {
        if (!user) return

        setIsUpdating(true)
        try {
            const messageRef = doc(db, "messages", message.id)
            const reactions = { ...message.reactions } || {}

            // Check if user already reacted with this emoji
            const userReactions = Object.entries(reactions).find(([key, users]) => key === emoji && users.includes(user.uid))

            if (userReactions) {
                // Remove user's reaction
                const updatedUsers = userReactions[1].filter((uid) => uid !== user.uid)

                if (updatedUsers.length === 0) {
                    // If no users left, remove the emoji key
                    delete reactions[emoji]
                } else {
                    // Otherwise update the users array
                    reactions[emoji] = updatedUsers
                }
                toast.success("Reaction removed")
            } else {
                // Add user's reaction
                if (reactions[emoji]) {
                    reactions[emoji] = [...reactions[emoji], user.uid]
                } else {
                    reactions[emoji] = [user.uid]
                }
                toast.success("Reaction added")
            }

            await updateDoc(messageRef, { reactions })
            setShowReactions(false)
        } catch (error) {
            console.error("Error updating reaction:", error)
            toast.error("Failed to update reaction")
        } finally {
            setIsUpdating(false)
        }
    }

    // Get all reactions for display
    const messageReactions = message.reactions || {}
    const hasReactions = Object.keys(messageReactions).length > 0

    return (
        <div className="mt-2">
            <div className="flex flex-wrap gap-1 items-center">
                {hasReactions &&
                    Object.entries(messageReactions).map(([emoji, users]) => (
                        <Button
                            key={emoji}
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 py-1 text-xs rounded-full transition-colors
                            ${users.includes(user?.uid || "")
                                    ? "bg-neon-purple bg-opacity-30 hover:bg-neon-purple hover:bg-opacity-40"
                                    : "bg-gray-800 bg-opacity-50 hover:bg-gray-700"
                                }`}
                            onClick={() => addReaction(emoji)}
                            disabled={isUpdating}
                            aria-label={`${emoji} reaction (${users.length} ${users.length === 1 ? "person" : "people"})`}
                        >
                            <span role="img" aria-label={`${emoji} emoji`}>
                                {emoji}
                            </span>{" "}
                            <span className="ml-1">{users.length}</span>
                        </Button>
                    ))}

                <Popover open={showReactions} onOpenChange={setShowReactions}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 rounded-full transition-colors
                                ${showReactions
                                    ? "bg-neon-yellow bg-opacity-30 hover:bg-neon-yellow hover:bg-opacity-40"
                                    : "bg-gray-800 bg-opacity-50 hover:bg-gray-700"
                                }`}
                            disabled={isUpdating}
                            aria-label="Add reaction"
                        >
                            <SmilePlus className="h-3 w-3" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-auto p-2 bg-opacity-90 backdrop-filter backdrop-blur-lg border-neon-yellow"
                        sideOffset={5}
                    >
                        <div className="flex gap-1">
                            {REACTIONS.map((emoji) => (
                                <Button
                                    key={emoji}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-lg hover:bg-neon-yellow hover:bg-opacity-20"
                                    onClick={() => addReaction(emoji)}
                                    disabled={isUpdating}
                                    aria-label={`Add ${emoji} reaction`}
                                >
                                    <span role="img" aria-hidden="true">
                                        {emoji}
                                    </span>
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}

