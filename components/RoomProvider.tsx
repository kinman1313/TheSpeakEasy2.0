"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/components/auth/AuthProvider"

interface Room {
  id: string
  name: string
  description?: string
  ownerId: string
  members: string[]
  createdAt: Date
  updatedAt: Date
}

interface RoomContextType {
  room: Room | null
  isLoading: boolean
  error: Error | null
}

const RoomContext = createContext<RoomContextType>({
  room: null,
  isLoading: true,
  error: null,
})

export function useRoom() {
  return useContext(RoomContext)
}

interface RoomProviderProps {
  roomId: string
  children: React.ReactNode
}

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const roomRef = doc(db, "rooms", roomId)
    const unsubscribe = onSnapshot(
      roomRef,
      (doc) => {
        if (doc.exists()) {
          setRoom({
            id: doc.id,
            ...doc.data(),
          } as Room)
        } else {
          setError(new Error("Room not found"))
        }
        setIsLoading(false)
      },
      (error) => {
        setError(error)
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [roomId, user])

  return <RoomContext.Provider value={{ room, isLoading, error }}>{children}</RoomContext.Provider>
}

