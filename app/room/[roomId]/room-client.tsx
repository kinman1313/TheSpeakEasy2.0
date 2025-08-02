// app/room/[roomId]/room-client.tsx
'use client';

import { Room } from '@/components/room/room';
import { RoomProvider } from '@/components/room/room-provider';

interface RoomClientProps {
  roomId: string;
}

export function RoomClient({ roomId }: RoomClientProps) {
  return (
    <RoomProvider roomId={roomId}>
      <Room roomId={roomId} />
    </RoomProvider>
  );
}
