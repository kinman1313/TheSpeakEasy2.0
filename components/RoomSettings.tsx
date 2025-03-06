"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { toast } from "sonner"
import { UserPlus, UserMinus, Copy, Check } from "lucide-react"

interface RoomSettingsProps {
    roomId: string
    onClose: () => void
}

interface Member {
    id: string
    displayName: string
    email: string
    photoURL: string | null
}

export function RoomSettings({ roomId, onClose }: RoomSettingsProps) {
    const { user } = useAuth()
    const [roomName, setRoomName] = useState<string>("")
    const [isPrivate, setIsPrivate] = useState<boolean>(false)
    const [members, setMembers] = useState<Member[]>([])
    const [newMemberEmail, setNewMemberEmail] = useState<string>("")
    const [isAdmin, setIsAdmin] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [copied, setCopied] = useState<boolean>(false)

    useEffect(() => {
        const fetchRoomData = async () => {
            if (!user) return

            try {
                setIsLoading(true)
                const roomRef = doc(db, "rooms", roomId)
                const roomSnap = await getDoc(roomRef)

                if (roomSnap.exists()) {
                    const roomData = roomSnap.data()
                    setRoomName(roomData.name)
                    setIsPrivate(roomData.isPrivate || false)

                    // Fetch member details
                    const memberPromises = roomData.members.map(async (memberId: string) => {
                        const userRef = doc(db, "users", memberId)
                        const userSnap = await getDoc(userRef)
                        if (userSnap.exists()) {
                            return {
                                id: memberId,
                                ...userSnap.data(),
                            } as Member
                        }
                        return { id: memberId, displayName: "Unknown User", email: "", photoURL: null }
                    })

                    const memberDetails = await Promise.all(memberPromises)
                    setMembers(memberDetails)

                    // Check if current user is admin (creator) of the room
                    setIsAdmin(roomData.createdBy === user.uid)
                }
            } catch (error) {
                console.error("Error fetching room data:", error)
                toast.error("Could not load room settings")
            } finally {
                setIsLoading(false)
            }
        }

        if (roomId) {
            fetchRoomData()
        }
    }, [roomId, user])

    const updateRoomSettings = async () => {
        if (!roomName.trim()) {
            toast.error("Room name cannot be empty")
            return
        }

        try {
            const roomRef = doc(db, "rooms", roomId)
            await updateDoc(roomRef, {
                name: roomName,
                isPrivate,
                updatedAt: new Date(),
            })

            toast.success("Room settings have been updated successfully")
            onClose()
        } catch (error) {
            console.error("Error updating room settings:", error)
            toast.error("Could not update room settings. Please try again.")
        }
    }

    const addMember = async () => {
        if (!newMemberEmail.trim()) return

        try {
            // Find user by email
            const usersRef = collection(db, "users")
            const q = query(usersRef, where("email", "==", newMemberEmail.trim()))
            const querySnapshot = await getDocs(q)

            if (querySnapshot.empty) {
                toast.error("No user found with that email address")
                return
            }

            const newMember = querySnapshot.docs[0]
            const newMemberId = newMember.id

            // Check if already a member
            if (members.some((member) => member.id === newMemberId)) {
                toast.error("This user is already a member of the room")
                return
            }

            // Add to room members
            const roomRef = doc(db, "rooms", roomId)
            await updateDoc(roomRef, {
                members: arrayUnion(newMemberId),
            })

            // Update local state
            const newMemberData = {
                id: newMemberId,
                ...newMember.data(),
            } as Member
            setMembers([...members, newMemberData])
            setNewMemberEmail("")

            toast.success(`${newMemberData.displayName || newMemberData.email} has been added to the room`)
        } catch (error) {
            console.error("Error adding member:", error)
            toast.error("Could not add member. Please try again.")
        }
    }

    const removeMember = async (memberId: string) => {
        if (!user) return

        try {
            // Don't allow removing yourself if you're the admin
            if (memberId === user.uid && isAdmin) {
                toast.error("You cannot remove yourself as the room admin")
                return
            }

            // Remove from room members
            const roomRef = doc(db, "rooms", roomId)
            await updateDoc(roomRef, {
                members: arrayRemove(memberId),
            })

            // Update local state
            setMembers(members.filter((member) => member.id !== memberId))
            toast.success("Member has been removed from the room")
        } catch (error) {
            console.error("Error removing member:", error)
            toast.error("Could not remove member. Please try again.")
        }
    }

    const copyInviteLink = () => {
        const inviteLink = `${window.location.origin}/invite/${roomId}`
        navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        toast.success("Invite link copied to clipboard")

        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-neon-blue glow-blue">Room Settings</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
                {isLoading ? (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="room-name" className="text-neon-white">
                                Room Name
                            </Label>
                            <Input
                                id="room-name"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                placeholder="Enter room name"
                                className="bg-opacity-30 border-neon-blue text-neon-white"
                                disabled={!isAdmin}
                            />
                        </div>

                        {isAdmin && (
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is-private" className="text-neon-white">
                                    Private Room
                                </Label>
                                <Switch id="is-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-neon-white">Invite Link</Label>
                            <div className="flex space-x-2">
                                <Input
                                    value={`${window.location.origin}/invite/${roomId}`}
                                    readOnly
                                    className="bg-opacity-30 border-neon-white text-neon-white"
                                />
                                <Button variant="outline" className="border-neon-green text-neon-green" onClick={copyInviteLink}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-neon-white">Members ({members.length})</Label>
                            <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-gray-800 bg-opacity-50 rounded-md">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between bg-gray-700 bg-opacity-50 p-2 rounded"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.photoURL || `/placeholder.svg?height=32&width=32`} />
                                                <AvatarFallback>{member.displayName?.[0] || "?"}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-sm font-medium text-neon-white">
                                                    {member.displayName || "Unknown User"}
                                                </div>
                                                <div className="text-xs text-neon-green">
                                                    {member.id === user?.uid ? "You" : ""}
                                                    {member.id === user?.uid && isAdmin ? " (Admin)" : ""}
                                                </div>
                                            </div>
                                        </div>

                                        {isAdmin && member.id !== user?.uid && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeMember(member.id)}
                                                className="text-neon-red h-8 w-8"
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="new-member" className="text-neon-white">
                                    Add Member
                                </Label>
                                <div className="flex space-x-2">
                                    <Input
                                        id="new-member"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        placeholder="Enter email address"
                                        className="bg-opacity-30 border-neon-blue text-neon-white"
                                    />
                                    <Button onClick={addMember} className="bg-neon-green text-black">
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={onClose} className="border-neon-red text-neon-red">
                    Cancel
                </Button>
                {isAdmin && (
                    <Button onClick={updateRoomSettings} className="bg-neon-green text-black" disabled={isLoading}>
                        Save Changes
                    </Button>
                )}
            </div>
        </>
    )
}

export default RoomSettings
