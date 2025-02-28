import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
  rooms?: Array<{
    id: string
    name: string
    lastMessage?: string
    avatar?: string
  }>
  onRoomSelect?: (roomId: string) => void
  selectedRoomId?: string
}

export function Sidebar({ className, rooms = [], onRoomSelect, selectedRoomId }: SidebarProps) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold text-white">Chat Rooms</h2>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-1">
              {rooms.map((room) => (
                <Button
                  key={room.id}
                  onClick={() => onRoomSelect?.(room.id)}
                  variant={selectedRoomId === room.id ? "secondary" : "ghost"}
                  className={`w-full justify-start transition-all duration-300 ${
                    selectedRoomId === room.id ? "glass neon-glow" : "hover:glass"
                  }`}
                >
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={room.avatar} alt={room.name} />
                    <AvatarFallback>{room.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span>{room.name}</span>
                    {room.lastMessage && (
                      <span className="text-xs text-muted-foreground truncate">{room.lastMessage}</span>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

export default Sidebar

