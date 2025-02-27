"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlusCircle, Settings, LogOut, Phone, Video } from "lucide-react"
import { useAuth } from "./AuthProvider"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { auth } from "@/lib/firebase"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Room {
    id: string
    name: string
    createdBy: string
    members: string[]
    isPrivate: boolean
}

interface ActiveCall {
    roomId: string
    roomName: string
    isVideo: boolean
}

interface SidebarProps {
    rooms: Room[]
    selectedRoom: Room | null
    onRoomSelect: (room: Room) => void
    onShowUserProfile: () => void
    activeCall: ActiveCall | null
}

export function Sidebar({ rooms, selectedRoom, onRoomSelect, onShowUserProfile, activeCall }: SidebarProps) {
    const { user } = useAuth()
    const [showNewRoomDialog, setShowNewRoomDialog] = useState(false)
    const [newRoomName, setNewRoomName] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    const createRoom = async () => {
        if (!newRoomName.trim()) {
            toast.error("Please enter a room name")
            return
        }

        setIsCreating(true)
        try {
            const roomsRef = collection(db, "rooms")
            const newRoom = await addDoc(roomsRef, {
                name: newRoomName.trim(),
                createdBy: user?.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                members: [user?.uid],
                isPrivate: isPrivate,
            })

            toast.success("Room created successfully")
            setNewRoomName("")
            setIsPrivate(false)
            setShowNewRoomDialog(false)

            // Select the newly created room
            onRoomSelect({
                id: newRoom.id,
                name: newRoomName.trim(),
                createdBy: user?.uid || "",
                members: [user?.uid || ""],
                isPrivate: isPrivate,
            })
        } catch (error) {
            console.error("Error creating room:", error)
            toast.error("Failed to create room. Please try again.")
        } finally {
            setIsCreating(false)
        }
    }

    const handleSignOut = async () => {
        try {
            await auth.signOut()
            toast.success("Signed out successfully")
        } catch (error) {
            console.error("Error signing out:", error)
            toast.error("Failed to sign out. Please try again.")
        }
    }

    return (
        <aside className="w-64 mr-4 flex flex-col bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg border border-gray-800">
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-neon-blue glow-blue">Neon Chat</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSignOut}
                        className="text-neon-red hover:text-neon-red/80 hover:bg-neon-red/20"
                        aria-label="Sign out"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>

                <div
                    className="flex items-center mt-4 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                    onClick={onShowUserProfile}
                    role="button"
                    aria-label="View profile settings"
                >
                    <Avatar className="h-10 w-10 mr-2">
                        <AvatarImage src={user?.photoURL || `/api/avatar?name=${encodeURIComponent(user?.displayName || "U")}`} />
                        <AvatarFallback>{user?.displayName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium text-neon-white">{user?.displayName || user?.email}</div>
                        <div className="text-xs text-neon-green">Online</div>
                    </div>
                </div>
            </div>

            {activeCall && (
                <div className="p-4 bg-neon-green bg-opacity-20 border-b border-gray-800">
                    <div className="text-neon-green font-medium mb-1">Active Call</div>
                    <div className="text-sm text-neon-white mb-2">{activeCall.roomName}</div>
                    <div className="flex space-x-2">
                        {activeCall.isVideo ? (
                            <Video className="h-4 w-4 text-neon-orange" aria-label="Video call" />
                        ) : (
                            <Phone className="h-4 w-4 text-neon-yellow" aria-label="Voice call" />
                        )}
                        <span className="text-xs text-neon-white">In progress</span>
                    </div>
                </div>
            )}

            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neon-purple">Rooms</h3>
                    <Dialog open={showNewRoomDialog} onOpenChange={setShowNewRoomDialog}>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-neon-green hover:text-neon-green/80 hover:bg-neon-green/20"
                                aria-label="Create new room"
                            >
                                <PlusCircle className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-opacity-90 backdrop-filter backdrop-blur-lg border-neon-green">
                            <DialogHeader>
                                <DialogTitle className="text-neon-green">Create New Room</DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    createRoom()
                                }}
                                className="space-y-4 mt-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="room-name">Room Name</Label>
                                    <Input
                                        id="room-name"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        placeholder="Enter room name"
                                        className="bg-opacity-30 border-neon-green text-neon-white"
                                        maxLength={50}
                                        required
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="private-room"
                                        checked={isPrivate}
                                        onCheckedChange={setIsPrivate}
                                        aria-label="Make room private"
                                    />
                                    <Label htmlFor="private-room">Private Room</Label>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-neon-green text-black hover:bg-neon-green/80 transition-colors"
                                    disabled={isCreating || !newRoomName.trim()}
                                >
                                    {isCreating ? "Creating..." : "Create Room"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-1 max-h-[calc(100vh-240px)] overflow-y-auto">
                    {rooms.map((room) => (
                        <Button
                            key={room.id}
                            variant="ghost"
                            className={`w-full justify-start transition-colors ${selectedRoom?.id === room.id
                                    ? "bg-neon-purple bg-opacity-30 text-neon-white hover:bg-neon-purple/40"
                                    : "text-gray-300 hover:bg-white/10"
                                }`}
                            onClick={() => onRoomSelect(room)}
                            aria-selected={selectedRoom?.id === room.id}
                            role="tab"
                        >
                            <span aria-hidden="true">{room.isPrivate ? "🔒 " : "# "}</span>
                            {room.name}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-gray-800">
                <Button
                    variant="outline"
                    className="w-full border-neon-blue text-neon-blue hover:bg-neon-blue/20 transition-colors"
                    onClick={onShowUserProfile}
                >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                </Button>
            </div>
        </aside>
    )
}

