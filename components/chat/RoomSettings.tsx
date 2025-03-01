// components/RoomSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { useAuth } from './auth/AuthProvider'
import { db } from '@/lib/firebase'
import { doc, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { toast } from 'sonner' // Changed from useToast
import { UserPlus, UserMinus, Copy, Check } from 'lucide-react'

export function RoomSettings({ room, onClose }) {
    const { user } = useAuth()
    const [roomName, setRoomName] = useState('')
    const [isPrivate, setIsPrivate] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [members, setMembers] = useState([])
    const [isCreator, setIsCreator] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (room) {
            setRoomName(room.name || '')
            setIsPrivate(room.isPrivate || false)
            setIsCreator(room.createdBy === user.uid)

            // Fetch room members
            const fetchMembers = async () => {
                try {
                    if (!room.members || room.members.length === 0) return

                    const membersData = []

                    for (const memberId of room.members) {
                        const userRef = doc(db, 'users', memberId)
                        const userSnap = await getDoc(userRef)

                        if (userSnap.exists()) {
                            membersData.push({
                                id: memberId,
                                ...userSnap.data()
                            })
                        } else {
                            // Fallback if user document doesn't exist
                            membersData.push({
                                id: memberId,
                                displayName: 'Unknown User',
                                photoURL: null
                            })
                        }
                    }

                    setMembers(membersData)
                } catch (error) {
                    console.error('Error fetching room members:', error)
                    toast.error('Could not load room members')
                }
            }

            fetchMembers()
        }
    }, [room, user])

    const updateRoom = async () => {
        if (!roomName.trim()) {
            toast.error('Room name cannot be empty')
            return
        }

        try {
            const roomRef = doc(db, 'rooms', room.id)
            await updateDoc(roomRef, {
                name: roomName,
                isPrivate: isPrivate,
                updatedAt: new Date()
            })

            toast.success('Room settings have been updated successfully')
            onClose()
        } catch (error) {
            console.error('Error updating room:', error)
            toast.error('Could not update room settings. Please try again.')
        }
    }

    const inviteUser = async () => {
        if (!inviteEmail.trim()) return

        try {
            // Find user by email
            const usersRef = collection(db, 'users')
            const q = query(usersRef, where('email', '==', inviteEmail.trim()))
            const querySnapshot = await getDocs(q)

            if (querySnapshot.empty) {
                toast.error('No user found with that email address')
                return
            }

            const invitedUser = querySnapshot.docs[0]
            const invitedUserId = invitedUser.id

            // Check if user is already a member
            if (room.members && room.members.includes(invitedUserId)) {
                toast.error('This user is already a member of the room')
                return
            }

            // Add user to room members
            const roomRef = doc(db, 'rooms', room.id)
            await updateDoc(roomRef, {
                members: arrayUnion(invitedUserId),
                updatedAt: new Date()
            })

            // Add the new member to the local state
            const userRef = doc(db, 'users', invitedUserId)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists()) {
                setMembers(prev => [...prev, {
                    id: invitedUserId,
                    ...userSnap.data()
                }])
            }

            setInviteEmail('')
            toast.success('User has been added to the room')
        } catch (error) {
            console.error('Error inviting user:', error)
            toast.error('Could not invite user. Please try again.')
        }
    }

    const removeUser = async (memberId) => {
        try {
            const roomRef = doc(db, 'rooms', room.id)
            await updateDoc(roomRef, {
                members: arrayRemove(memberId),
                updatedAt: new Date()
            })

            // Remove the member from the local state
            setMembers(prev => prev.filter(member => member.id !== memberId))
            toast.success('User has been removed from the room')
        } catch (error) {
            console.error('Error removing user:', error)
            toast.error('Could not remove user. Please try again.')
        }
    }

    const copyInviteLink = () => {
        const inviteLink = `${window.location.origin}/invite/${room.id}`
        navigator.clipboard.writeText(inviteLink)
        setCopied(true)

        setTimeout(() => {
            setCopied(false)
        }, 2000)

        toast.success('Invite link copied to clipboard')
    }

    // ... rest of the JSX remains the same ...
    // (The return JSX part is correct in your original code)
}