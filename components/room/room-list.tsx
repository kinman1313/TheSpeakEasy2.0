"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CreateRoomModal } from "./create-room-modal"
import { Hash, Lock, Users, Clock } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Room {
  id: string
  name: string
  isPrivate: boolean
  ownerId: string
  members: string[]
  createdAt: Date
  updatedAt: Date
}

interface RoomListProps {
  selectedRoomId?: string
  onRoomSelect?: (roomId: string) => void
}

export function RoomList({ selectedRoomId, onRoomSelect }: RoomListProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRooms = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/rooms", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch rooms")
      }

      const roomsData = data.rooms.map((room: any) => ({
        ...room,
        createdAt: new Date(room.createdAt._seconds * 1000),
        updatedAt: new Date(room.updatedAt._seconds * 1000),
      }))

      setRooms(roomsData)
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast.error("Failed to load rooms")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [user])

  const handleRoomClick = (roomId: string) => {
    if (onRoomSelect) {
      onRoomSelect(roomId)
    } else {
      router.push(`/room/${roomId}`)
    }
  }

  const handleRoomCreated = (roomId: string) => {
    fetchRooms() // Refresh the room list
    handleRoomClick(roomId) // Navigate to the new room
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Rooms</h2>
        <CreateRoomModal onRoomCreated={handleRoomCreated} />
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {rooms.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No rooms yet.</p>
              <p className="text-xs">Create your first room to get started!</p>
            </div>
          ) : (
            rooms.map((room) => (
              <Button
                key={room.id}
                variant={selectedRoomId === room.id ? "secondary" : "ghost"}
                className="w-full justify-start h-auto p-3"
                onClick={() => handleRoomClick(room.id)}
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className="flex-shrink-0 mt-1">
                    {room.isPrivate ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{room.name}</span>
                      <div className="flex items-center space-x-1">
                        {room.isPrivate && (
                          <Badge variant="secondary" className="text-xs">
                            Private
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {room.members.length}
                        </span>
                        <Users className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(room.updatedAt, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}