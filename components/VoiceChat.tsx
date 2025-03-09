'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from '@/lib/firebase'
import {
    collection,
    doc,
    onSnapshot,
    setDoc,
    deleteDoc,
    getDocs,
    type Firestore
} from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface VoiceChatProps {
    roomId: string
    redirectUrl?: string // URL to redirect to after ending the call
}

interface Participant {
    id: string
    displayName: string
    photoURL: string
}

export function VoiceChat({ roomId, redirectUrl = "/" }: VoiceChatProps) {
    const { user } = useAuth()
    const router = useRouter()
    const [isMuted, setIsMuted] = useState(false)
    const [participants, setParticipants] = useState<Participant[]>([])
    const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({})
    const localStream = useRef<MediaStream | null>(null)

    // Check if Firebase is initialized
    const isFirebaseReady = typeof window !== 'undefined' && !!db;

    const startVoiceChat = useCallback(async () => {
        try {
            const constraints = {
                audio: true,
                video: false,
            }

            localStream.current = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (error) {
            console.error('Error starting voice chat:', error)
            toast.error('Could not access your microphone. Please check permissions.')
        }
    }, [])

    const toggleMute = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled
                setIsMuted(!track.enabled)
            })
        }
    }

    const handleEndCall = () => {
        router.push(redirectUrl);
    }

    const stopVoiceChat = useCallback(() => {
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => {
                track.stop()
            })
            localStream.current = null
        }

        // Clean up Firebase and Peer connections
        endCallProcedure()
        handleEndCall()
    }, [redirectUrl, router])

    const endCallProcedure = async () => {
        // Skip if Firebase is not initialized
        if (!isFirebaseReady || !db) return;

        // Clean up Firebase and Peer connections
        try {
            // Use type assertion to tell TypeScript that db is definitely a Firestore instance
            const firestore = db as Firestore;

            // Remove the room document
            await deleteDoc(doc(firestore, 'voiceChatRooms', roomId))

            // Remove all participants from the participants collection
            const participantsCollection = collection(firestore, 'voiceChatRooms', roomId, 'participants')
            const participantsSnapshot = await getDocs(participantsCollection)
            participantsSnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref)
            })
        } catch (error) {
            console.error('Error ending voice chat:', error)
        }
    }

    useEffect(() => {
        if (!user || !isFirebaseReady || !db) return;

        let unsubscribe: (() => void) | undefined;

        // Use an IIFE to handle the async function
        (async () => {
            try {
                // Use type assertion to tell TypeScript that db is definitely a Firestore instance
                const firestore = db as Firestore;

                await setDoc(doc(firestore, 'voiceChatRooms', roomId), {
                    initiatorId: user.uid,
                    createdAt: new Date(),
                })

                await setDoc(doc(firestore, 'voiceChatRooms', roomId, 'participants', user.uid), {
                    id: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    joinedAt: new Date(),
                })

                await startVoiceChat();

                const participantsCollection = collection(firestore, 'voiceChatRooms', roomId, 'participants')

                unsubscribe = onSnapshot(participantsCollection, (snapshot) => {
                    const updatedParticipants = snapshot.docs.map((doc) => doc.data() as Participant)
                    setParticipants(updatedParticipants)
                })
            } catch (error) {
                console.error('Error initializing voice chat:', error)
                toast.error('Failed to initialize voice chat')
            }
        })().catch(error => {
            console.error('Error in voice chat initialization:', error)
            toast.error('Failed to initialize voice chat')
        });

        return () => {
            if (unsubscribe) {
                unsubscribe()
            }
            stopVoiceChat()
        }
    }, [roomId, user, startVoiceChat, stopVoiceChat, isFirebaseReady, db])

    // Early return if not in browser
    if (typeof window === 'undefined') {
        return null;
    }

    return (
        <div className="p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg mb-4">
            <div className="flex flex-wrap gap-4 mb-4">
                {/* Voice chat participants */}
                <div className="flex flex-wrap gap-4 w-full">
                    {participants.map((participant) => (
                        <div key={participant.id} className="flex items-center space-x-2 bg-gray-800 p-2 rounded-lg">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={participant.photoURL || `/placeholder.svg?height=40&width=40`} />
                                <AvatarFallback>{participant.displayName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="text-sm font-medium text-neon-white">
                                    {participant.id === user?.uid ? 'You' : participant.displayName}
                                </div>
                                <div className="text-xs text-neon-green">
                                    {participant.id === user?.uid && isMuted ? 'Muted' : 'Speaking'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center space-x-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleMute}
                    className={`${isMuted ? 'bg-neon-red bg-opacity-30 text-neon-red' : 'text-neon-white'}`}
                    disabled={!isFirebaseReady}
                >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                    variant="outline"
                    size="icon"
                    className="bg-neon-red bg-opacity-30 text-neon-red"
                    onClick={stopVoiceChat}
                    disabled={!isFirebaseReady}
                >
                    <PhoneOff className="h-5 w-5" />
                </Button>
            </div>
        </div>
    )
}