"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore"
import { Plus, Users, Hash, MessageCircle, Search, Settings } from "lucide-react"
import { RoomMemberManager } from "./RoomMemberManager"

interface Room {
    id: string
    name: string
    isPrivate: boolean
    ownerId: string
    members: string[]
    createdAt: Date
    updatedAt: Date
    lastMessage?: {
        text: string
        timestamp: Date
        userId: string
        userName: string
    }
}

interface User {
    id: string
    displayName: string
    email: string
    photoURL?: string
}

interface DirectMessage {
    id: string
    participants: string[]
    lastMessage?: {
        text: string
        timestamp: Date
        userId: string
        userName: string
    }
}

interface RoomManagerProps {
    currentRoomId: string | null
    onRoomSelect: (roomId: string, roomType: 'room' | 'dm') => void
    onLobbySelect: () => void
}

export function RoomManager({ currentRoomId, onRoomSelect, onLobbySelect }: RoomManagerProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [rooms, setRooms] = useState<Room[]>([])
    const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)
    const [isUserSearchOpen, setIsUserSearchOpen] = useState(false)
    const [newRoomName, setNewRoomName] = useState("")
    const [isPrivateRoom, setIsPrivateRoom] = useState(false)
    const [userSearchQuery, setUserSearchQuery] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [selectedRoomForManagement, setSelectedRoomForManagement] = useState<string | null>(null)

    // Fetch user's rooms
    useEffect(() => {
        if (!user || !db) return

        const roomsRef = collection(db, "rooms")
        const q = query(
            roomsRef,
            where("members", "array-contains", user.uid)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            })) as Room[]
            // Sort client-side by updatedAt
            roomsData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            setRooms(roomsData)
        })

        return unsubscribe
    }, [user])

    // Fetch direct messages
    useEffect(() => {
        if (!user || !db) return

        const dmRef = collection(db, "directMessages")
        const q = query(
            dmRef,
            where("participants", "array-contains", user.uid)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dmsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as DirectMessage[]
            // Sort client-side by updatedAt if available
            dmsData.sort((a, b) => {
                const aTime = a.lastMessage?.timestamp?.getTime() || 0
                const bTime = b.lastMessage?.timestamp?.getTime() || 0
                return bTime - aTime
            })
            setDirectMessages(dmsData)
        })

        return unsubscribe
    }, [user])

    // Fetch all users for DM search
    useEffect(() => {
        if (!db) return

        const usersRef = collection(db, "users")
        const q = query(usersRef, limit(50)) // Limit to 50 users for performance

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as User[]
            setUsers(usersData.filter(u => u.id !== user?.uid)) // Exclude current user
        })

        return unsubscribe
    }, [user])

    const createRoom = async () => {
        if (!user || !newRoomName.trim()) return

        setIsCreating(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newRoomName.trim(),
                    isPrivate: isPrivateRoom,
                    members: [user.uid]
                })
            })

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json()
                } catch {
                    errorData = await response.text()
                }
                console.error('Room creation API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: errorData,
                    headers: Object.fromEntries(response.headers)
                })
                throw new Error(`Failed to create room: ${response.status} - ${JSON.stringify(errorData)}`)
            }

            const { id } = await response.json()
            toast({
                title: "Room Created",
                description: `"${newRoomName}" has been created successfully.`,
            })

            setNewRoomName("")
            setIsPrivateRoom(false)
            setIsCreateRoomOpen(false)
            onRoomSelect(id, 'room')
        } catch (error) {
            console.error('Error creating room:', error)
            toast({
                title: "Error",
                description: "Failed to create room. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsCreating(false)
        }
    }

    const startDirectMessage = async (targetUser: User) => {
        if (!user) return

        try {
            // Check if DM already exists
            const existingDM = directMessages.find(dm =>
                dm.participants.includes(targetUser.id) && dm.participants.includes(user.uid)
            )

            if (existingDM) {
                onRoomSelect(existingDM.id, 'dm')
                setIsUserSearchOpen(false)
                return
            }

            // Create new DM
            const token = await user.getIdToken()
            const response = await fetch('/api/direct-messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: targetUser.id
                })
            })

            if (!response.ok) {
                throw new Error('Failed to create direct message')
            }

            const { id } = await response.json()
            onRoomSelect(id, 'dm')
            setIsUserSearchOpen(false)
            toast({
                title: "Direct Message Started",
                description: `Started conversation with ${targetUser.displayName}.`,
            })
        } catch (error) {
            console.error('Error starting DM:', error)
            toast({
                title: "Error",
                description: "Failed to start direct message. Please try again.",
                variant: "destructive",
            })
        }
    }

    const filteredUsers = users.filter(user =>
        user.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    )

    const getOtherParticipantName = (dm: DirectMessage) => {
        const otherUserId = dm.participants.find(id => id !== user?.uid)
        const otherUser = users.find(u => u.id === otherUserId)
        return otherUser?.displayName || "Unknown User"
    }

    const getOtherParticipantAvatar = (dm: DirectMessage) => {
        const otherUserId = dm.participants.find(id => id !== user?.uid)
        const otherUser = users.find(u => u.id === otherUserId)
        return otherUser?.photoURL
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Conversations</h2>
                    <div className="flex gap-2">
                        <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="btn-glass neon-glow text-white">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-card">
                                <DialogHeader>
                                    <DialogTitle className="text-white">Create New Room</DialogTitle>
                                    <DialogDescription className="text-slate-300">
                                        Create a new room for group conversations. Choose between public and private rooms.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="room-name" className="text-white">Room Name</Label>
                                        <Input
                                            id="room-name"
                                            value={newRoomName}
                                            onChange={(e) => setNewRoomName(e.target.value)}
                                            placeholder="Enter room name"
                                            className="glass text-white placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="private-room"
                                            checked={isPrivateRoom}
                                            onCheckedChange={setIsPrivateRoom}
                                        />
                                        <Label htmlFor="private-room" className="text-white">Private Room</Label>
                                    </div>
                                    <Button
                                        onClick={createRoom}
                                        disabled={!newRoomName.trim() || isCreating}
                                        className="w-full glass hover:glass-darker"
                                    >
                                        {isCreating ? "Creating..." : "Create Room"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isUserSearchOpen} onOpenChange={setIsUserSearchOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="btn-glass neon-glow text-white">
                                    <MessageCircle className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-card">
                                <DialogHeader>
                                    <DialogTitle className="text-white">Start Direct Message</DialogTitle>
                                    <DialogDescription className="text-slate-300">
                                        Search for users to start a private conversation with them.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            placeholder="Search users..."
                                            className="pl-10 glass text-white placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {filteredUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                onClick={() => startDirectMessage(user)}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.photoURL} />
                                                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-white text-sm font-medium">{user.displayName}</p>
                                                    <p className="text-slate-400 text-xs">{user.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Lobby Button */}
                <Button
                    variant={currentRoomId === null ? "secondary" : "ghost"}
                    onClick={onLobbySelect}
                    className={`w-full justify-start btn-glass ${currentRoomId === null ? "neon-glow bg-indigo-600/50 text-white" : "text-slate-300 hover:text-white"
                        }`}
                >
                    <Hash className="h-4 w-4 mr-2" />
                    Lobby
                </Button>
            </div>

            {/* Rooms and DMs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Rooms Section */}
                {rooms.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Rooms
                        </h3>
                        <div className="space-y-1">
                            {rooms.map((room) => (
                                <div key={room.id} className="flex items-center gap-1">
                                    <Button
                                        variant={currentRoomId === room.id ? "secondary" : "ghost"}
                                        onClick={() => onRoomSelect(room.id, 'room')}
                                        className={`flex-1 justify-start glass ${currentRoomId === room.id
                                            ? "bg-indigo-600/50 text-white"
                                            : "text-slate-300 hover:text-white"
                                            }`}
                                    >
                                        <Hash className="h-4 w-4 mr-2" />
                                        <span className="truncate">{room.name}</span>
                                        {room.isPrivate && (
                                            <span className="ml-auto text-xs">🔒</span>
                                        )}
                                    </Button>
                                    {room.ownerId === user?.uid && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedRoomForManagement(room.id)}
                                            className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-1"
                                            title="Manage Room"
                                        >
                                            <Settings className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Direct Messages Section */}
                {directMessages.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Direct Messages
                        </h3>
                        <div className="space-y-1">
                            {directMessages.map((dm) => (
                                <Button
                                    key={dm.id}
                                    variant={currentRoomId === dm.id ? "secondary" : "ghost"}
                                    onClick={() => onRoomSelect(dm.id, 'dm')}
                                    className={`w-full justify-start glass ${currentRoomId === dm.id
                                        ? "bg-indigo-600/50 text-white"
                                        : "text-slate-300 hover:text-white"
                                        }`}
                                >
                                    <Avatar className="h-6 w-6 mr-2">
                                        <AvatarImage src={getOtherParticipantAvatar(dm)} />
                                        <AvatarFallback className="text-xs">
                                            {getOtherParticipantName(dm)[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">{getOtherParticipantName(dm)}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Room Management Dialog */}
            {selectedRoomForManagement && (
                <Dialog
                    open={!!selectedRoomForManagement}
                    onOpenChange={(open) => !open && setSelectedRoomForManagement(null)}
                >
                    <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Room Management</DialogTitle>
                            <DialogDescription>
                                Manage room members and settings.
                            </DialogDescription>
                        </DialogHeader>
                        <RoomMemberManager
                            roomId={selectedRoomForManagement}
                            isOwner={true}
                            onClose={() => setSelectedRoomForManagement(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
} 