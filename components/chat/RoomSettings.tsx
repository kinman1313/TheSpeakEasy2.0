"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, type Firestore } from "firebase/firestore"
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
import { UserPlus, UserMinus, Copy, Check } from 'lucide-react'
import { useRouter } from "next/navigation"

interface RoomSettingsProps {
    roomId: string
    redirectUrl?: string // URL to redirect to after closing
}

interface Member {
    id: string
    displayName: string
    email: string
    photoURL: string | null
}

export function RoomSettings({ roomId, redirectUrl = "/rooms" }: RoomSettingsProps) {
    const { user } = useAuth()
    const router = useRouter()
    const [roomName, setRoomName] = useState<string>("")
    const [isPrivate, setIsPrivate] = useState<boolean>(false)
    const [members, setMembers] = useState<Member[]>([])
    const [newMemberEmail, setNewMemberEmail] = useState<string>("")
    const [isAdmin, setIsAdmin] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [copied, setCopied] = useState<boolean>(false)

    // Check if Firebase is initialized
    const isFirebaseReady = typeof window !== 'undefined' && !!db;

    useEffect(() => {
        // Use an IIFE (Immediately Invoked Function Expression) to handle the async function
        (async () => {
            if (!user || !isFirebaseReady || !db || !roomId) return;

            try {
                setIsLoading(true);
                // Use type assertion to tell TypeScript that db is definitely a Firestore instance
                const firestore = db as Firestore;

                const roomRef = doc(firestore, "rooms", roomId);
                const roomSnap = await getDoc(roomRef);

                if (roomSnap.exists()) {
                    const roomData = roomSnap.data();
                    setRoomName(roomData.name);
                    setIsPrivate(roomData.isPrivate || false);

                    // Fetch member details
                    const memberPromises = roomData.members.map(async (memberId: string) => {
                        const userRef = doc(firestore, "users", memberId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            return {
                                id: memberId,
                                ...userSnap.data(),
                            } as Member;
                        }
                        return { id: memberId, displayName: "Unknown User", email: "", photoURL: null };
                    });

                    const memberDetails = await Promise.all(memberPromises);
                    setMembers(memberDetails);

                    // Check if current user is admin (creator) of the room
                    setIsAdmin(roomData.createdBy === user.uid);
                }
            } catch (error) {
                console.error("Error fetching room data:", error);
                toast.error("Could not load room settings");
            } finally {
                setIsLoading(false);
            }
        })().catch(error => {
            console.error("Error in fetchRoomData:", error);
            toast.error("Failed to load room settings");
            setIsLoading(false);
        });
    }, [roomId, user, isFirebaseReady, db]);

    const handleClose = () => {
        router.push(redirectUrl);
    }

    const updateRoomSettings = async () => {
        if (!roomName.trim()) {
            toast.error("Room name cannot be empty")
            return
        }

        if (!isFirebaseReady || !db) {
            toast.error("Firebase is not initialized")
            return
        }

        try {
            // Use type assertion to tell TypeScript that db is definitely a Firestore instance
            const firestore = db as Firestore;

            const roomRef = doc(firestore, "rooms", roomId)
            await updateDoc(roomRef, {
                name: roomName,
                isPrivate,
                updatedAt: new Date(),
            })

            toast.success("Room settings have been updated successfully")
            handleClose()
        } catch (error) {
            console.error("Error updating room settings:", error)
            toast.error("Could not update room settings. Please try again.")
        }
    }

    const addMember = async () => {
        if (!newMemberEmail.trim()) return

        if (!isFirebaseReady || !db) {
            toast.error("Firebase is not initialized")
            return
        }

        try {
            // Use type assertion to tell TypeScript that db is definitely a Firestore instance
            const firestore = db as Firestore;

            // Find user by email
            const usersRef = collection(firestore, "users")
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
            const roomRef = doc(firestore, "rooms", roomId)
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

        if (!isFirebaseReady || !db) {
            toast.error("Firebase is not initialized")
            return
        }

        try {
            // Don't allow removing yourself if you're the admin
            if (memberId === user.uid && isAdmin) {
                toast.error("You cannot remove yourself as the room admin")
                return
            }

            // Use type assertion to tell TypeScript that db is definitely a Firestore instance
            const firestore = db as Firestore;

            // Remove from room members
            const roomRef = doc(firestore, "rooms", roomId)
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

    const copyInviteLink = async () => {
    try {
        const inviteLink = `${window.location.origin}/invite/${roomId}`;
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        toast.success("Invite link copied to clipboard");

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        toast.error("Failed to copy invite link to clipboard");
    }
};

    // Early return if not in browser
    if (typeof window === 'undefined') {
        return null;
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
                                disabled={!isAdmin || !isFirebaseReady}
                            />
                        </div>

                        {isAdmin && (
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is-private" className="text-neon-white">
                                    Private Room
                                </Label>
                                <Switch
                                    id="is-private"
                                    checked={isPrivate}
                                    onCheckedChange={setIsPrivate}
                                    disabled={!isFirebaseReady}
                                />
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
                                <Button
                                    variant="outline"
                                    className="border-neon-green text-neon-green"
                                    onClick={copyInviteLink}
                                    disabled={!isFirebaseReady}
                                >
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
                                                disabled={!isFirebaseReady}
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
                                        disabled={!isFirebaseReady}
                                    />
                                    <Button
                                        onClick={addMember}
                                        className="bg-neon-green text-black"
                                        disabled={!isFirebaseReady}
                                    >
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
                <Button
                    variant="outline"
                    onClick={handleClose}
                    className="border-neon-red text-neon-red"
                >
                    Cancel
                </Button>
                {isAdmin && (
                    <Button
                        onClick={updateRoomSettings}
                        className="bg-neon-green text-black"
                        disabled={isLoading || !isFirebaseReady}
                    >
                        Save Changes
                    </Button>
                )}
            </div>
        </>
    )
}

export default RoomSettings