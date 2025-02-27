// components/VoiceChat.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { db } from '@/lib/firebase'
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from './ui/use-toast'

export function VoiceChat({ roomId, onEnd }) {
    const { user } = useAuth()
    const [isMuted, setIsMuted] = useState(false)
    const [participants, setParticipants] = useState([])
    const peerConnections = useRef({})
    const localStream = useRef(null)
    const { toast } = useToast()

    useEffect(() => {
        startVoiceChat()

        // Set up voice chat participants listener
        const voiceChatsRef = collection(db, 'voice_chats')
        const roomVoiceChatsRef = doc(voiceChatsRef, roomId)
        const participantsRef = collection(roomVoiceChatsRef, 'participants')

        const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
            const participantsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setParticipants(participantsData)

            // Handle new participants
            participantsData.forEach(participant => {
                if (participant.id !== user.uid && !peerConnections.current[participant.id]) {
                    createPeerConnection(participant.id)
                }
            })

            // Handle participants that left
            Object.keys(peerConnections.current).forEach(id => {
                if (!participantsData.find(p => p.id === id)) {
                    if (peerConnections.current[id]) {
                        peerConnections.current[id].close()
                        delete peerConnections.current[id]
                    }
                }
            })
        })

        // Set up signaling channel
        const signalRef = collection(roomVoiceChatsRef, 'signals')
        const signalUnsubscribe = onSnapshot(signalRef, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const signal = change.doc.data()
                    if (signal.to === user.uid) {
                        handleSignal(signal)
                    }
                }
            })
        })

        // Register as participant
        const registerParticipant = async () => {
            const participantRef = doc(participantsRef, user.uid)
            await setDoc(participantRef, {
                displayName: user.displayName || user.email,
                photoURL: user.photoURL,
                joinedAt: new Date()
            })
        }

        registerParticipant()

        return () => {
            stopVoiceChat()
            unsubscribe()
            signalUnsubscribe()

            // Remove participant when leaving
            const participantRef = doc(participantsRef, user.uid)
            deleteDoc(participantRef)
        }
    }, [roomId, user])

    const startVoiceChat = async () => {
        try {
            const constraints = {
                audio: true,
                video: false
            }

            localStream.current = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (error) {
            console.error('Error starting voice chat:', error)
            toast({
                title: 'Voice Chat Error',
                description: 'Could not access your microphone. Please check permissions.',
                variant: 'destructive',
            })
        }
    }

    const stopVoiceChat = () => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop())
        }

        // Close all peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close())
        peerConnections.current = {}

        onEnd()
    }

    const createPeerConnection = async (participantId) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        })

        peerConnections.current[participantId] = pc

        // Add local tracks to the connection
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                pc.addTrack(track, localStream.current)
            })
        }

        // Handle ICE candidates
        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    from: user.uid,
                    to: participantId
                })
            }
        }

        // Handle incoming tracks
        pc.ontrack = event => {
            // Create audio element for this participant
            const audioElement = document.getElementById(`remote-audio-${participantId}`)
            if (audioElement) {
                audioElement.srcObject = event.streams[0]
            } else {
                const newAudioElement = document.createElement('audio')
                newAudioElement.id = `remote-audio-${participantId}`
                newAudioElement.autoplay = true
                newAudioElement.srcObject = event.streams[0]
                document.body.appendChild(newAudioElement)
            }
        }

        // Create and send offer
        try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            sendSignal({
                type: 'offer',
                offer: pc.localDescription,
                from: user.uid,
                to: participantId
            })
        } catch (error) {
            console.error('Error creating offer:', error)
        }

        return pc
    }

    const handleSignal = async (signal) => {
        const { type, from } = signal

        if (!peerConnections.current[from]) {
            await createPeerConnection(from)
        }

        const pc = peerConnections.current[from]

        switch (type) {
            case 'offer':
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.offer))
                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)

                    sendSignal({
                        type: 'answer',
                        answer: pc.localDescription,
                        from: user.uid,
                        to: from
                    })
                } catch (error) {
                    console.error('Error handling offer:', error)
                }
                break

            case 'answer':
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.answer))
                } catch (error) {
                    console.error('Error handling answer:', error)
                }
                break

            case 'ice-candidate':
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
                } catch (error) {
                    console.error('Error handling ICE candidate:', error)
                }
                break

            default:
                console.warn('Unknown signal type:', type)
        }
    }

    const sendSignal = async (signal) => {
        try {
            const voiceChatsRef = collection(db, 'voice_chats')
            const roomVoiceChatsRef = doc(voiceChatsRef, roomId)
            const signalRef = collection(roomVoiceChatsRef, 'signals')

            await addDoc(signalRef, {
                ...signal,
                timestamp: new Date()
            })
        } catch (error) {
            console.error('Error sending signal:', error)
        }
    }

    const toggleMute = () => {
        if (localStream.current) {
            const audioTracks = localStream.current.getAudioTracks()
            audioTracks.forEach(track => {
                track.enabled = !track.enabled
            })
            setIsMuted(!isMuted)
        }
    }

    return (
        <div className="p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg mb-4">
            <div className="flex flex-wrap gap-4 mb-4">
                {/* Voice chat participants */}
                <div className="flex flex-wrap gap-4 w-full">
                    {participants.map(participant => (
                        <div key={participant.id} className="flex items-center space-x-2 bg-gray-800 p-2 rounded-lg">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={participant.photoURL || `/placeholder.svg?height=40&width=40`} />
                                <AvatarFallback>{participant.displayName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="text-sm font-medium text-neon-white">
                                    {participant.id === user.uid ? 'You' : participant.displayName}
                                </div>
                                <div className="text-xs text-neon-green">
                                    {participant.id === user.uid && isMuted ? 'Muted' : 'Speaking'}
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
                >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                    variant="outline"
                    size="icon"
                    className="bg-neon-red bg-opacity-30 text-neon-red"
                    onClick={stopVoiceChat}
                >
                    <PhoneOff className="h-5 w-5" />
                </Button>
            </div>
        </div>
    )
}