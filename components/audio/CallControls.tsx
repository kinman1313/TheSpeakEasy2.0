// components/CallControls.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, MonitorOff } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { db } from '@/lib/firebase'
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner' // Updated to use sonner

export function CallControls({ isVideo, roomId, onEnd }) {
    const { user } = useAuth()
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [participants, setParticipants] = useState([])
    const localVideoRef = useRef(null)
    const screenShareRef = useRef(null)
    const peerConnections = useRef({})
    const localStream = useRef(null)
    const screenStream = useRef(null)
    const remoteStreams = useRef({})

    useEffect(() => {
        startCall()

        // Set up call participants listener
        const callsRef = collection(db, 'calls')
        const roomCallsRef = doc(callsRef, roomId)
        const participantsRef = collection(roomCallsRef, 'participants')

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
                    if (remoteStreams.current[id]) {
                        delete remoteStreams.current[id]
                    }
                }
            })
        })

        // Set up signaling channel
        const signalRef = collection(roomCallsRef, 'signals')
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
            stopCall()
            unsubscribe()
            signalUnsubscribe()

            // Remove participant when leaving
            const participantRef = doc(participantsRef, user.uid)
            deleteDoc(participantRef)
        }
    }, [roomId, user, isVideo])

    const startCall = async () => {
        try {
            const constraints = {
                audio: true,
                video: isVideo
            }

            localStream.current = await navigator.mediaDevices.getUserMedia(constraints)

            if (localVideoRef.current && isVideo) {
                localVideoRef.current.srcObject = localStream.current
            }
        } catch (error) {
            console.error('Error starting call:', error)
            toast.error('Could not access your camera or microphone. Please check permissions.')
        }
    }

    const stopCall = () => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop())
        }

        if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => track.stop())
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

        if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => {
                pc.addTrack(track, screenStream.current)
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
            if (!remoteStreams.current[participantId]) {
                remoteStreams.current[participantId] = new MediaStream()
            }

            const stream = remoteStreams.current[participantId]
            event.streams[0].getTracks().forEach(track => {
                if (!stream.getTracks().find(t => t.id === track.id)) {
                    stream.addTrack(track)
                }
            })

            // Create or update video element for this participant
            const videoElement = document.getElementById(`remote-video-${participantId}`)
            if (videoElement) {
                videoElement.srcObject = stream
            } else {
                const newVideoElement = document.createElement('video')
                newVideoElement.id = `remote-video-${participantId}`
                newVideoElement.autoplay = true
                newVideoElement.playsInline = true
                newVideoElement.srcObject = stream
                document.getElementById('remote-videos')?.appendChild(newVideoElement)
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
            toast.error('Error establishing connection')
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
                    toast.error('Error connecting to peer')
                }
                break

            case 'answer':
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.answer))
                } catch (error) {
                    console.error('Error handling answer:', error)
                    toast.error('Error establishing connection')
                }
                break

            case 'ice-candidate':
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
                } catch (error) {
                    console.error('Error handling ICE candidate:', error)
                }
                break
        }
    }

    const sendSignal = async (signal) => {
        try {
            const callsRef = collection(db, 'calls')
            const roomCallsRef = doc(callsRef, roomId)
            const signalRef = collection(roomCallsRef, 'signals')

            await addDoc(signalRef, {
                ...signal,
                timestamp: new Date()
            })
        } catch (error) {
            console.error('Error sending signal:', error)
            toast.error('Error sending signal to peer')
        }
    }

    const toggleMute = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled
                setIsMuted(!track.enabled)
            })
        }
    }

    const toggleVideo = () => {
        if (localStream.current) {
            localStream.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled
                setIsVideoEnabled(!isVideoEnabled)
            })
        }
    }

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            if (screenStream.current) {
                screenStream.current.getTracks().forEach(track => track.stop())
                screenStream.current = null
            }
            if (screenShareRef.current) {
                screenShareRef.current.srcObject = null
            }
            setIsScreenSharing(false)
        } else {
            try {
                screenStream.current = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                })

                if (screenShareRef.current) {
                    screenShareRef.current.srcObject = screenStream.current
                }

                // Add screen share tracks to all peer connections
                Object.values(peerConnections.current).forEach(pc => {
                    screenStream.current.getTracks().forEach(track => {
                        pc.addTrack(track, screenStream.current)
                    })
                })

                screenStream.current.getVideoTracks()[0].onended = () => {
                    toggleScreenShare()
                }

                setIsScreenSharing(true)
            } catch (error) {
                console.error('Error sharing screen:', error)
                toast.error('Could not share screen. Please check permissions.')
            }
        }
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    {participants.map(participant => (
                        <div key={participant.id} className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={participant.photoURL || `/placeholder.svg?height=32&width=32`} />
                                <AvatarFallback>{participant.displayName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                                {participant.id === user.uid ? 'You' : participant.displayName}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleMute}
                        className={`${isMuted ? 'bg-destructive/20 text-destructive' : ''}`}
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>

                    {isVideo && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleVideo}
                            className={`${!isVideoEnabled ? 'bg-destructive/20 text-destructive' : ''}`}
                        >
                            {!isVideoEnabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleScreenShare}
                        className={`${isScreenSharing ? 'bg-primary/20 text-primary' : ''}`}
                    >
                        {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={stopCall}
                    >
                        <PhoneOff className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Local video preview */}
            {isVideo && (
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="fixed bottom-20 right-4 w-48 rounded-lg shadow-lg"
                />
            )}

            {/* Screen share preview */}
            {isScreenSharing && (
                <video
                    ref={screenShareRef}
                    autoPlay
                    playsInline
                    muted
                    className="fixed bottom-20 right-56 w-48 rounded-lg shadow-lg"
                />
            )}

            {/* Remote videos container */}
            <div id="remote-videos" className="grid grid-cols-2 gap-4 mt-4" />
        </div>
    )
}