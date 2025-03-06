import React, { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { UserPlus, UserMinus, Copy, Check } from 'lucide-react'

interface Room {
    id: string
    name: string
    members: string[]
    isPrivate: boolean
}

interface RoomSettingsProps {
    room: Room
    onClose: () => void
}

export function RoomSettings({ room, onClose }: RoomSettingsProps) {
    const { user } = useAuth()
    const [roomName, setRoomName] = useState(room.name)
    const [isPrivate, setIsPrivate] = useState(room.isPrivate)
    const [members, setMembers] = useState<{ id: string, displayName: string, photoURL: string | null }[]>([])

    useEffect(() => {
        const fetchMembers = async () => {
            if (!user) return

            const membersData = await Promise.all(
                room.members.map(async (memberId) => {
                    const memberDoc = await getDoc(doc(db, 'users', memberId))
                    if (memberDoc.exists()) {
                        const member = memberDoc.data()
                        return {
                            id: memberId,
                            displayName: member.displayName || 'Unknown',
                            photoURL: member.photoURL || null
                        }
                    } else {
                        return { id: memberId, displayName: 'Unknown', photoURL: null }
                    }
                })
            )

            setMembers(membersData)
        }

        fetchMembers()
    }, [room.members, user])

    const handleRemoveMember = async (memberId: string) => {
        if (!user) return

        try {
            const updatedMembers = room.members.filter(id => id !== memberId)
            await updateDoc(doc(db, 'rooms', room.id), { members: updatedMembers })
            setMembers(prev => prev.filter(member => member.id !== memberId))
        } catch (error) {
            console.error('Error removing member:', error)
        }
    }

    const handleSave = async () => {
        if (!user) return

        try {
            await updateDoc(doc(db, 'rooms', room.id), {
                name: roomName,
                isPrivate
            })
            onClose()
        } catch (error) {
            console.error('Error saving room settings:', error)
        }
    }

    return (
        <div className="room-settings">
            <h2>Room Settings</h2>
            <button onClick={onClose}>Close</button>
            <div>
                <label>Room Name</label>
                <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                />
            </div>
            <div>
                <label>Private Room</label>
                <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                />
            </div>
            <h3>Members</h3>
            <ul>
                {members.map(member => (
                    <li key={member.id}>
                        <span>{member.displayName}</span>
                        <Button onClick={() => handleRemoveMember(member.id)}>Remove</Button>
                    </li>
                ))}
            </ul>
            <Button onClick={handleSave}>Save</Button>
        </div>
    )
}

export default RoomSettings

