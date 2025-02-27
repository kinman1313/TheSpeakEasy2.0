// components/ChatApp.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatRoom } from './ChatRoom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { UserProfile } from './UserProfile'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { useAuth } from './AuthProvider'

export function ChatApp() {
    const { user } = useAuth()
    const [rooms, setRooms] = useState([])
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [showUserProfile, setShowUserProfile] = useState(false)
    const [activeCall, setActiveCall] = useState(null)

    useEffect(() => {
        if (!user) return

        // Fetch rooms the user is a member of
        const roomsRef = collection(db, 'rooms')
        const q = query(
            roomsRef,
            where('members', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setRooms(roomsData)

            // Select the first room by default if none is selected
            if (roomsData.length > 0 && !selectedRoom) {
                setSelectedRoom(roomsData[0])
            }
        })

        return () => unsubscribe()
    }, [user, selectedRoom])

    const handleRoomSelect = (room) => {
        setSelectedRoom(room)
    }

    const handleCallStart = (callInfo) => {
        setActiveCall(callInfo)
    }

    const handleCallEnd = () => {
        setActiveCall(null)
    }

    return (
        <div className="flex h-screen p-4 overflow-hidden">
            <Sidebar
                rooms={rooms}
                selectedRoom={selectedRoom}
                onRoomSelect={handleRoomSelect}
                onShowUserProfile={() => setShowUserProfile(true)}
                activeCall={activeCall}
            />

            {selectedRoom && (
                <ChatRoom
                    room={selectedRoom}
                    onCallStart={handleCallStart}
                    onCallEnd={handleCallEnd}
                    activeCall={activeCall}
                />
            )}

            <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
                <DialogContent className="bg-opacity-90 backdrop-filter backdrop-blur-lg border-neon-blue">
                    <UserProfile onClose={() => setShowUserProfile(false)} />
                </DialogContent>
            </Dialog>
        </div>
    )
}