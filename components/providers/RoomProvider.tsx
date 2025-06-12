import { createContext, useContext, ReactNode } from 'react';
import { Room } from '../../types/room';

type RoomContextType = {
    currentRoom: Room | null;
    setCurrentRoom: (room: Room | null) => void;
};

const RoomContext = createContext<RoomContextType>({
    currentRoom: null,
    setCurrentRoom: () => { },
});

export function RoomProvider({ children }: { children: ReactNode }) {
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

    return (
        <RoomContext.Provider value={{ currentRoom, setCurrentRoom }}>
            {children}
        </RoomContext.Provider>
    );
}

export const useRoom = () => useContext(RoomContext); 