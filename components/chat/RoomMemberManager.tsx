"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
// Badge component not available - using inline styling
import { db } from "@/lib/firebase"
import { collection, query, onSnapshot, doc, getDoc, limit } from "firebase/firestore"
import { UserPlus, UserMinus, Settings, Search, Crown } from "lucide-react"

interface User {
    id: string
    displayName: string
    email: string
    photoURL?: string
}

interface RoomMember extends User {
    role: 'owner' | 'member'
    joinedAt: Date
}

interface Room {
    id: string
    name: string
    isPrivate: boolean
    ownerId: string
    members: string[]
}

interface RoomMemberManagerProps {
    roomId: string
    isOwner: boolean
    onClose: () => void
}

export function RoomMemberManager({ roomId, isOwner, onClose }: RoomMemberManagerProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [room, setRoom] = useState<Room | null>(null)
    const [members, setMembers] = useState<RoomMember[]>([])
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Fetch room data
    useEffect(() => {
        if (!roomId || !db) return

        const roomRef = doc(db, "rooms", roomId)
        const unsubscribe = onSnapshot(roomRef, (doc) => {
            if (doc.exists()) {
                setRoom({
                    id: doc.id,
                    ...doc.data(),
                } as Room)
            }
        })

        return unsubscribe
    }, [roomId])

    // Fetch room members
    useEffect(() => {
        if (!room || !db) return

        const fetchMembers = async () => {
            setIsLoading(true)
            try {
                const memberPromises = room.members.map(async (memberId) => {
                    const userRef = doc(db, "users", memberId)
                    const userSnap = await getDoc(userRef)

                    if (userSnap.exists()) {
                        return {
                            id: memberId,
                            ...userSnap.data(),
                            role: memberId === room.ownerId ? 'owner' : 'member',
                            joinedAt: new Date(),
                        } as RoomMember
                    }
                    return {
                        id: memberId,
                        displayName: "Unknown User",
                        email: "",
                        role: 'member' as const,
                        joinedAt: new Date(),
                    }
                })

                const memberDetails = await Promise.all(memberPromises)
                setMembers(memberDetails)
            } catch (error) {
                console.error("Error fetching members:", error)
                toast({
                    title: "Error",
                    description: "Failed to load room members.",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchMembers()
    }, [room, db, toast])

    // Fetch all users for invitation
    useEffect(() => {
        if (!db) return

        const usersRef = collection(db, "users")
        const q = query(usersRef, limit(100))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as User[]

            const availableUsers = usersData.filter(u =>
                u.id !== user?.uid &&
                !room?.members.includes(u.id)
            )
            setAllUsers(availableUsers)
        })

        return unsubscribe
    }, [user, room, db])

    const inviteUser = async (targetUser: User) => {
        if (!user || !room) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/rooms/${roomId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    memberId: targetUser.id,
                    action: 'add'
                })
            })

            if (!response.ok) {
                throw new Error('Failed to invite user')
            }

            toast({
                title: "User Invited",
                description: `${targetUser.displayName} has been added to the room.`,
            })

            setIsInviteDialogOpen(false)
            setSearchQuery("")
        } catch (error) {
            console.error('Error inviting user:', error)
            toast({
                title: "Error",
                description: "Failed to invite user. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const removeUser = async (targetUser: RoomMember) => {
        if (!user || !room || targetUser.role === 'owner') return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/rooms/${roomId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    memberId: targetUser.id,
                    action: 'remove'
                })
            })

            if (!response.ok) {
                throw new Error('Failed to remove user')
            }

            toast({
                title: "User Removed",
                description: `${targetUser.displayName} has been removed from the room.`,
            })
        } catch (error) {
            console.error('Error removing user:', error)
            toast({
                title: "Error",
                description: "Failed to remove user. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const filteredUsers = allUsers.filter(user =>
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!room) {
        return <div className="p-4 text-center text-white">Loading room...</div>
    }

    return (
        <div className="space-y-6">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Manage "{room.name}"
                </DialogTitle>
            </DialogHeader>

            {/* Room Info */}
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-white">{room.name}</h3>
                        <p className="text-sm text-slate-400">
                            {room.isPrivate ? "🔒 Private Room" : "🌐 Public Room"} • {members.length} members
                        </p>
                    </div>
                    {isOwner && (
                        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="glass hover:glass-darker">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Invite Users
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass">
                                <DialogHeader>
                                    <DialogTitle className="text-white">Invite Users to Room</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search users..."
                                            className="pl-10 glass text-white placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {filteredUsers.length === 0 ? (
                                            <p className="text-center text-slate-400 py-4">
                                                {searchQuery ? "No users found" : "All users are already in this room"}
                                            </p>
                                        ) : (
                                            filteredUsers.map((targetUser) => (
                                                <div
                                                    key={targetUser.id}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={targetUser.photoURL} />
                                                            <AvatarFallback>{targetUser.displayName[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-white text-sm font-medium">{targetUser.displayName}</p>
                                                            <p className="text-slate-400 text-xs">{targetUser.email}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => inviteUser(targetUser)}
                                                        disabled={isLoading}
                                                        className="glass hover:glass-darker"
                                                    >
                                                        <UserPlus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Members List */}
            <div className="space-y-3">
                <h4 className="text-lg font-medium text-white">Room Members ({members.length})</h4>

                {isLoading ? (
                    <div className="text-center py-4">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto" />
                        <p className="text-slate-400 text-sm mt-2">Loading members...</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={member.photoURL} />
                                        <AvatarFallback>{member.displayName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-medium">{member.displayName}</p>
                                            {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500" />}
                                        </div>
                                        <p className="text-slate-400 text-sm">{member.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {member.role === 'owner' ? (
                                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-600 border border-yellow-500/30">Owner</span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50">Member</span>
                                    )}
                                    {isOwner && member.role !== 'owner' && member.id !== user?.uid && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeUser(member)}
                                            disabled={isLoading}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-600/20 border-red-600/50"
                                        >
                                            <UserMinus className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50">
                <Button variant="outline" onClick={onClose} className="glass">
                    Close
                </Button>
            </div>
        </div>
    )
} 