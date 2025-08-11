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
                            <div className="space-y-2">
                                <Label className="text-neon-white">Room Privacy</Label>
                                <div className="flex items-center">
                                    <Switch
                                        checked={isPrivate}
                                        onCheckedChange={setIsPrivate}
                                        className="mr-2"
                                        disabled={!isFirebaseReady}
                                    />
                                    <span className="text-neon-white">{isPrivate ? "Private" : "Public"}</span>
                                </div>
                            </div>
                        )}

                        {isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="add-member" className="text-neon-white">
                                    Add Member
                                </Label>
                                <div className="flex items-center">
                                    <Input
                                        id="add-member"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        placeholder="Enter member's email"
                                        className="flex-grow bg-opacity-30 border-neon-blue text-neon-white"
                                        disabled={!isFirebaseReady}
                                    />
                                    <Button
                                        className="ml-2 px-4 py-2 text-sm text-neon-blue bg-opacity-30 hover:bg-opacity-50"
                                        onClick={addMember}
                                        disabled={!newMemberEmail.trim() || !isFirebaseReady}
                                    >
                                        <UserPlus className="mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        )}

                        {members.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-neon-white">Room Members</Label>
                                <ul className="space-y-2">
                                    {members.map((member) => (
                                        <li key={member.id} className="flex items-center">
                                            {/* Fixed Avatar usage: use AvatarImage + AvatarFallback instead of passing src to Avatar */}
                                            <Avatar className="w-8 h-8 mr-2">
                                                <AvatarImage
                                                    src={member.photoURL ?? undefined}
                                                    alt={member.displayName}
                                                />
                                                <AvatarFallback>
                                                    {(member.displayName || "?").slice(0,2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-neon-white">{member.displayName}</span>
                                            {isAdmin && (
                                                <Button
                                                    className="ml-2 px-2 py-1 text-xs text-neon-blue bg-opacity-30 hover:bg-opacity-50"
                                                    onClick={() => removeMember(member.id)}
                                                    disabled={!isFirebaseReady}
                                                >
                                                    <UserMinus className="mr-1" />
                                                    Remove
                                                </Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button
                                className="px-4 py-2 text-sm text-neon-blue bg-opacity-30 hover:bg-opacity-50"
                                onClick={updateRoomSettings}
                                disabled={!roomName.trim() || (isAdmin && !isFirebaseReady)}
                            >
                                Save
                            </Button>
                            <Button
                                className="ml-2 px-4 py-2 text-sm text-neon-blue bg-opacity-30 hover:bg-opacity-50"
                                onClick={handleClose}
                            >
                                Close
                            </Button>
                        </div>

                        {isAdmin && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    className="px-4 py-2 text-sm text-neon-blue bg-opacity-30 hover:bg-opacity-50"
                                    onClick={copyInviteLink}
                                >
                                    {copied ? (
                                        <span>
                                            <Check className="mr-1" />
                                            Copied
                                        </span>
                                    ) : (
                                        <span>
                                            <Copy className="mr-1" />
                                            Copy Invite Link
                                        </span>
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}