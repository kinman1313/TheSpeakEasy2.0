import type { Metadata } from "next"
import { RoomClient } from "./room-client"

interface RoomPageProps {
  params: Promise<{
    id: string
  }>
}

export const metadata: Metadata = {
  title: "Room",
  description: "Chat room page",
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params
  return <RoomClient roomId={id} />
}