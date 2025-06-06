"use client"

import React, { useState, useEffect } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button"; // Import Button
import { Video } from "lucide-react"; // Import an icon
import { useAuth } from '@/components/auth/AuthProvider';
import { useWebRTC } from '@/components/providers/WebRTCProvider'; // Import useWebRTC

export interface UserStatus {
  isOnline: boolean;
  lastChanged: number; // Firestore ServerTimestamp is a number after resolution
  userName?: string;
  photoURL?: string;
  uid?: string; // Keep track of UID for key prop and potential future use
}

export default function UserList() {
  const { user: currentUser } = useAuth();
  const { initiateCall, callStatus } = useWebRTC(); // Get WebRTC context
  const [onlineUsers, setOnlineUsers] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!rtdb) {
      setError(new Error("Realtime Database is not available."));
      setLoading(false);
      return;
    }

    // Query for users who are online
    // Note: Firebase RTDB queries are somewhat limited.
    // For "isOnline: true", we might need to fetch all and filter client-side,
    // or structure data to allow server-side filtering if performance becomes an issue.
    // orderByChild('isOnline').equalTo(true) might work if 'isOnline' is consistently present.
    const statusRef = query(ref(rtdb, 'status'), orderByChild('isOnline'), equalTo(true));
    // const statusRef = ref(rtdb, 'status'); // Alternative: Fetch all and filter client-side

    const unsubscribe = onValue(statusRef,
      (snapshot) => {
        const usersData = snapshot.val();
        const loadedUsers: UserStatus[] = [];
        if (usersData) {
          Object.keys(usersData).forEach((uid) => {
            // const userData = usersData[uid] as Omit<UserStatus, 'uid'>;
            // if (userData.isOnline) { // Client-side filter if not done by query
            loadedUsers.push({
              uid: uid,
              ...usersData[uid]
            });
            // }
          });
        }
        // Filter out the current user from the list
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
  }, [currentUser?.uid]); // Rerun if current user changes, for filtering self out

  if (!rtdb) {
    return <div className="p-4 text-sm text-muted-foreground">User list unavailable (RTDB not configured).</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading user list...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">Error loading user list: {error.message}</div>;
  }

  const filteredOnlineUsers = onlineUsers.filter(u => u.uid !== currentUser?.uid);

  if (filteredOnlineUsers.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No other users currently online.</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-lg font-semibold mb-2">Online Users</h3>
      <ul className="space-y-2">
        {filteredOnlineUsers.map((user) => (
          <li key={user.uid} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || ""} alt={user.userName || 'User'} />
                <AvatarFallback>{user.userName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.userName || 'Anonymous User'}</span>
            </div>
            {user.uid && ( // Ensure user.uid is defined before showing button
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (user.uid) { // Check uid again for type safety inside onClick
                    initiateCall(user.uid, user.userName || "Anonymous");
                  }
                }}
                disabled={callStatus !== 'idle'}
                aria-label={`Call ${user.userName || 'Anonymous User'}`}
                className="p-1 h-auto"
              >
                <Video size={18} />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
