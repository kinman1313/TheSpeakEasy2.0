// app/room/[roomId]/page.tsx
import type { Metadata } from 'next';
import { RoomClient } from './room-client';

export const metadata: Metadata = {
  title: 'Room',
  description: 'Chat room page',
};

interface RoomPageProps {
  params: { roomId: string }; // params are synchronous; no Promise wrapper
}

export default function RoomPage({ params }: RoomPageProps) {
  // Destructure roomId from the dynamic route
  const { roomId } = params;
  return <RoomClient roomId={roomId} />;
}
