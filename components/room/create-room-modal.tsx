"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Users } from "lucide-react"
import { toast } from "sonner"

interface CreateRoomModalProps {
  onRoomCreated?: (roomId: string) => void
}

export function CreateRoomModal({ onRoomCreated }: CreateRoomModalProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateRoom = async () => {
    if (!user) {
      toast.error("You must be logged in to create a room")
      return
    }

    if (!roomName.trim()) {
      toast.error("Room name is required")
      return
    }

    setIsLoading(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roomName.trim(),
          isPrivate,
          members: [user.uid], // Creator is automatically added
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room")
      }

      toast.success(`Room "${roomName}" created successfully!`)
      setRoomName("")
      setIsPrivate(false)
      setIsOpen(false)
      onRoomCreated?.(data.id)
    } catch (error) {
      console.error("Error creating room:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create room")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create New Room
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="private-room" className="flex flex-col space-y-1">
              <span>Private Room</span>
              <span className="text-sm text-muted-foreground">
                Only invited members can join
              </span>
            </Label>
            <Switch
              id="private-room"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || !roomName.trim()}
            >
              {isLoading ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}