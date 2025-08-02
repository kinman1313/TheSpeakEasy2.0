"use client"

import React, { useState, useEffect } from 'react'
import { rtdb } from '@/lib/firebase'
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Video, Phone } from "lucide-react"
import { useAuth } from '@/components/auth/AuthProvider'
import { useWebRTC } from '@/components/providers/WebRTCProvider'

export interface UserStatus {
  isOnline: boolean
  lastChanged: number
  userName?: string
  photoURL?: string
  uid?: string
}

export default function UserList() {
  const { user: currentUser } = useAuth()
  const { initiateCall, initiateAudioCall, callStatus } = useWebRTC()
  const [onlineUsers, setOnlineUsers] = useState<UserStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!rtdb) {
      setError(new Error("Realtime Database is not available."))
      setLoading(false)
      return
    }

    const statusRef = query(ref(rtdb, 'status'), orderByChild('isOnline'), equalTo(true))
    const unsubscribe = onValue(statusRef,
      (snapshot) => {
        const usersData = snapshot.val()
        const loadedUsers: UserStatus[] = []
        if (usersData) {
          Object.keys(usersData).forEach((uid) => {
            loadedUsers.push({
              uid: uid,
              ...usersData[uid]
            })
          })
        }
        setOnlineUsers(loadedUsers.filter(u => u.uid !== currentUser?.uid))
        setLoading(false)
        setError(null)
      },
      (err: Error) => {
        console.error("Error fetching user statuses:", err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentUser?.uid])

  if (!rtdb) {
    return <div className="p-4 text-sm text-muted-foreground">User list unavailable (RTDB not configured).</div>
  }
  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading user list...</div>
  }
  if (error) {
    return <div className="p-4 text-sm text-destructive">Error loading user list: {error.message}</div>
  }

  const filteredOnlineUsers = onlineUsers.filter(u => u.uid !== currentUser?.uid)

  if (filteredOnlineUsers.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No other users currently online.</div>
  }

  return (
    <div className="glass-card p-4 rounded-xl space-y-default">
      <h3 className="text-lg font-semibold">Online Users</h3>
      <ul className="space-y-default">
        {filteredOnlineUsers.map((user) => (
          <li key={user.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 space-x-default">
            <div className="flex items-center space-x-default">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || ""} alt={user.userName || 'User'} />
                <AvatarFallback>{user.userName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.userName || 'Anonymous User'}</span>
            </div>
            {user.uid && (
              <div className="flex space-x-default">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (user.uid) {
                      initiateAudioCall(user.uid, user.userName || "Anonymous")
                    }
                  }}
                  disabled={callStatus !== 'idle'}
                  aria-label={`Voice call ${user.userName || 'Anonymous User'}`}
                  className="p-1 h-auto text-green-500 hover:text-green-400 hover:bg-green-500/20"
                  title="Voice Call"
                >
                  <Phone size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (user.uid) {
                      initiateCall(user.uid, user.userName || "Anonymous")
                    }
                  }}
                  disabled={callStatus !== 'idle'}
                  aria-label={`Video call ${user.userName || 'Anonymous User'}`}
                  className="p-1 h-auto text-blue-500 hover:text-blue-400 hover:bg-blue-500/20"
                  title="Video Call"
                >
                  <Video size={16} />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
