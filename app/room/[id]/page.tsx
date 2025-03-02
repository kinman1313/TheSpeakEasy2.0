import type { Metadata } from "next"
import { Room } from "@/components/room/room"
import { RoomProvider } from "@/components/room/room-provider"

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
  return (
    <RoomProvider roomId={params.id}>
      <Room roomId={params.id} />
    </RoomProvider>
  )
}

