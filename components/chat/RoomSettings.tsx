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
import { PATTERNS } from '@/lib/themes'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    const [roomPattern, setRoomPattern] = useState<string>('none')
    const [currentPattern, setCurrentPattern] = useState<typeof PATTERNS[number] | null>(null)
    const [patternConfig, setPatternConfig] = useState<{ scale: number; color: string; opacity: number }>({ scale: 100, color: "#000000", opacity: 0.5 })

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
                    setRoomPattern(roomData.pattern || 'none');

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

                    // Fetch current pattern
                    const pattern = PATTERNS.find(p => p.id === roomData.pattern);
                    if (pattern) {
                        setCurrentPattern(pattern);
                        setPatternConfig({
                            scale: 100,
                            color: "#000000",
                            opacity: 0.5
                        });
                    }
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
                pattern: roomPattern,
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
                            <Label htmlFor="room-pattern" className="text-neon-white">
                                Room Background
                            </Label>
                            <Select
                                value={roomPattern}
                                onValueChange={setRoomPattern}
                                disabled={!isAdmin || !isFirebaseReady}
                            >
                                <SelectTrigger className="bg-opacity-30 border-neon-blue text-neon-white">
                                    <SelectValue placeholder="Select a pattern" />
                                </SelectTrigger>
                                <SelectContent className="glass-card max-h-[300px]">
                                    {PATTERNS.map(pattern => (
                                        <SelectItem
                                            key={pattern.id}
                                            value={pattern.id}
                                            className="flex items-center gap-2"
                                        >
                                            {pattern.preview ? (
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={pattern.preview}
                                                        alt=""
                                                        className="w-6 h-6 object-cover rounded"
                                                    />
                                                    <span>{pattern.name}</span>
                                                </div>
                                            ) : (
                                                pattern.name
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {currentPattern && (
                            <div className="relative p-4 bg-muted/10 rounded-lg border border-muted mb-4 overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-medium text-neon-blue">Live Preview</Label>
                                    <div className="text-xs text-muted-foreground">
                                        {currentPattern.name}
                                    </div>
                                </div>

                                <div
                                    className="w-full h-40 rounded-md border border-muted/50 relative overflow-hidden shadow-inner"
                                    style={{
                                        backgroundSize: `${patternConfig.scale}px`,
                                        backgroundImage: currentPattern.id !== 'none'
                                            ? `url("data:image/svg+xml;utf8,${encodeURIComponent(
                                                currentPattern.preview
                                                    .replace(/%23([0-9a-f]{6})/gi, patternConfig.color.replace('#', '%23'))
                                                    .replace(/fill-opacity=\"([0-9.]+)\"/g, `fill-opacity="${patternConfig.opacity}"`)
                                                    .replace(/stroke-opacity=\"([0-9.]+)\"/g, `stroke-opacity="${patternConfig.opacity}"`)
                                            )}")`
                                            : undefined,
                                        backgroundColor: currentPattern.id === 'none' ? 'transparent' : 'hsl(var(--background))',
                                        opacity: patternConfig.opacity
                                    }}
                                >
                                    <div className="absolute inset-0 flex flex-col p-3">
                                        <div className="w-3/4 h-4 bg-muted/50 rounded-full mb-2"></div>
                                        <div className="w-1/2 h-4 bg-muted/30 rounded-full mb-3"></div>

                                        <div className="flex-1 flex items-end gap-2">
                                            <div className="w-8 h-8 rounded-full bg-muted/50"></div>
                                            <div className="flex-1">
                                                <div className="w-full h-10 bg-muted/20 rounded-lg"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute inset-0 pointer-events-none" style={{
                                        background: `
                                            radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 70%),
                                            linear-gradient(to bottom, transparent 60%, hsl(var(--background)/0.8))
                                        `
                                    }}></div>
                                </div>

                                {currentPattern.id !== 'none' && (
                                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                        <span>Subtle</span>
                                        <div className="flex-1 mx-2">
                                            <div className="relative h-1 bg-muted/20 rounded-full overflow-hidden">
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-current"
                                                    style={{
                                                        width: `${patternConfig.opacity * 100}%`,
                                                        backgroundColor: patternConfig.color,
                                                        opacity: 0.5
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <span>Bold</span>
                                    </div>
                                )}
                            </div>
                        )}

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