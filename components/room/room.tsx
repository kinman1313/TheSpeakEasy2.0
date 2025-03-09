"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRoom } from "./room-provider"
import { useAuth } from "@/components/auth/AuthProvider"
import { ChatInterface } from "@/components/chat-interface"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

interface RoomProps {
  roomId: string
}

export function Room({ roomId }: RoomProps) {
  const { room, isLoading, error } = useRoom()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && room && user) {
      // Check if user has access to the room
      const hasAccess = room.members.includes(user.uid) || room.ownerId === user.uid
      if (!hasAccess) {
        router.push("/")
      }
    }
  }, [isLoading, room, user, router])

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!room || !user) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Room not found or you&apos;re not authenticated.</AlertDescription>
      </Alert>
    )
  }

  return <ChatInterface roomId={roomId} />
}
