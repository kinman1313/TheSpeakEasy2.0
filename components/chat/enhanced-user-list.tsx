"use client"

import React, { useState, useEffect } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, MessageCircle, UserPlus, Search } from "lucide-react";
import { useAuth } from '@/components/auth/AuthProvider';
import { useWebRTC } from '@/components/providers/WebRTCProvider';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

export interface UserStatus {
    isOnline: boolean;
    lastChanged: number;
    userName?: string;
    photoURL?: string;
    uid?: string;
}

interface EnhancedUserListProps {
    showDMButton?: boolean;
    showInviteButton?: boolean;
    roomId?: string; // For inviting users to a specific room
}

export default function EnhancedUserList({ 
    showDMButton = true, 
    showInviteButton = false,
    roomId 
}: EnhancedUserListProps) {
    const { user: currentUser } = useAuth();
    const { initiateCall, callStatus } = useWebRTC();
    const router = useRouter();
    const [onlineUsers, setOnlineUsers] = useState<UserStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    useEffect(() => {
        if (!rtdb) {
            setError(new Error("Realtime Database is not available."));
            setLoading(false);
            return;
        }

        const statusRef = query(ref(rtdb, 'status'), orderByChild('isOnline'), equalTo(true));

        const unsubscribe = onValue(statusRef,
            (snapshot) => {
                const usersData = snapshot.val();
                const loadedUsers: UserStatus[] = [];
                if (usersData) {
                    Object.keys(usersData).forEach((uid) => {
                        loadedUsers.push({
                            uid: uid,
                            ...usersData[uid]
                        });
                    });
                }
                setOnlineUsers(loadedUsers.filter(u => u.uid !== currentUser?.uid));
                setLoading(false);
                setError(null);
            },
            (err: Error) => {
                console.error("Error fetching user statuses:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser?.uid]);

    // Create or get DM room between two users
    const createDMRoom = async (targetUserId: string, targetUserName: string) => {
        if (!currentUser) {
            toast.error("You must be logged in to start a DM");
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            
            // Create a DM room name that's consistent regardless of who creates it
            const roomName = `${currentUser.displayName || currentUser.email} & ${targetUserName}`;
            
            const response = await fetch("/api/rooms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: roomName,
                    isPrivate: true,
                    members: [currentUser.uid, targetUserId],
                    isDM: true, // Mark as DM room
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create DM");
            }

            toast.success(`Started DM with ${targetUserName}`);
            router.push(`/room/${data.id}`);
        } catch (error) {
            console.error("Error creating DM:", error);
            toast.error("Failed to start DM");
        }
    };

    // Invite user to current room
    const inviteUserToRoom = async (targetUserId: string, targetUserName: string) => {
        if (!currentUser || !roomId) {
            toast.error("Cannot invite user to room");
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            
            const response = await fetch(`/api/rooms/${roomId}/members`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    memberId: targetUserId,
                    action: "add",
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to invite user");
            }

            toast.success(`${targetUserName} has been invited to the room`);
            setInviteModalOpen(false);
        } catch (error) {
            console.error("Error inviting user:", error);
            toast.error(error instanceof Error ? error.message : "Failed to invite user");
        }
    };

    const filteredUsers = onlineUsers.filter(user => 
        user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!rtdb) {
        return <div className="p-4 text-sm text-muted-foreground">User list unavailable (RTDB not configured).</div>;
    }

    if (loading) {
        return <div className="p-4 text-sm text-muted-foreground">Loading user list...</div>;
    }

    if (error) {
        return <div className="p-4 text-sm text-destructive">Error loading user list: {error.message}</div>;
    }

    if (filteredUsers.length === 0 && searchTerm) {
        return (
            <div className="p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="text-center text-muted-foreground">
                    <p className="text-sm">No users found matching "{searchTerm}"</p>
                </div>
            </div>
        );
    }

    if (filteredUsers.length === 0) {
        return <div className="p-4 text-sm text-muted-foreground">No other users currently online.</div>;
    }

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Online Users</h3>
                {showInviteButton && (
                    <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite Users to Room</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {filteredUsers.map((user) => (
                                        <div key={user.uid} className="flex items-center justify-between p-2 rounded-md border">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.photoURL || ""} alt={user.userName || 'User'} />
                                                    <AvatarFallback>{user.userName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{user.userName || 'Anonymous User'}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => user.uid && inviteUserToRoom(user.uid, user.userName || "Anonymous")}
                                            >
                                                Invite
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>

            <ul className="space-y-2">
                {filteredUsers.map((user) => (
                    <li key={user.uid} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL || ""} alt={user.userName || 'User'} />
                                <AvatarFallback>{user.userName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.userName || 'Anonymous User'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {showDMButton && user.uid && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => createDMRoom(user.uid!, user.userName || "Anonymous")}
                                    aria-label={`Start DM with ${user.userName || 'Anonymous User'}`}
                                    className="p-1 h-auto"
                                >
                                    <MessageCircle size={16} />
                                </Button>
                            )}
                            {user.uid && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        if (user.uid) {
                                            initiateCall(user.uid, user.userName || "Anonymous");
                                        }
                                    }}
                                    disabled={callStatus !== 'idle'}
                                    aria-label={`Call ${user.userName || 'Anonymous User'}`}
                                    className="p-1 h-auto"
                                >
                                    <Video size={16} />
                                </Button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}