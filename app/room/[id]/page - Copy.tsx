import type { Metadata } from "next"
import { RoomClient } from "./room-client"

interface RoomPageProps {
  params: {
    id: string
  }
}

export const metadata: Metadata = {
  title: "Room",
  description: "Chat room page",
}

export default function RoomPage({ params }: RoomPageProps) {
  return <RoomClient roomId={params.id} />
}