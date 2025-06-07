import type { Metadata } from "next"
import { RoomDashboard } from "@/components/room/room-dashboard"

export const metadata: Metadata = {
  title: "Rooms | The SpeakEasy",
  description: "Chat rooms and direct messages",
}

export default function RoomsPage() {
  return <RoomDashboard />
}