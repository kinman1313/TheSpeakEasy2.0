import { useRoom } from '@/components/room/RoomProvider';
import { PATTERNS } from '@/lib/themes';
import { cn } from '@/lib/utils';

const RoomContainer = () => {
    const { room } = useRoom();
    const currentPattern = PATTERNS.find(p => p.id === room?.pattern) || PATTERNS[0];

    return (
        <div
            className={cn(
                "relative h-full w-full overflow-hidden",
                currentPattern.className
            )}
            style={currentPattern.id !== 'none' ? {
                backgroundSize: '200px 200px',
                backgroundRepeat: 'repeat'
            } : {}}
        >
            {/* ... existing room content */}
        </div>
    );
};

export default RoomContainer; 