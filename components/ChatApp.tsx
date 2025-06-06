"use client"

import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getFirestore } from "firebase/firestore"
import { app } from "@/lib/firebase"
import { useToast } from "@/components/ui/toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { isToday, isYesterday, format, isValid } from 'date-fns'
import { useMessages, Message } from "@/lib/hooks/useMessages"
import { useSendMessage } from "@/lib/hooks/useSendMessage"
import { useToggleReaction } from "@/lib/hooks/useToggleReaction"
import { MessageReactions } from "@/components/chat/MessageReactions"
import { UserList } from "@/components/chat/UserList"
import { useWebRTC } from "@/components/providers/WebRTCProvider"
import VideoCallView from "@/components/chat/VideoCallView"
import { VoiceRecorder } from "@/components/chat/VoiceRecorder"
import { AudioPlayer } from "@/components/chat/AudioPlayer"
import GiphyPicker from "@/components/chat/GiphyPicker"
import UserProfileModal from "@/components/user/UserProfileModal"
import { uploadVoiceMessage } from "@/lib/storage"
import { Image as ImageIcon, User as UserIcon } from "lucide-react"

// Initialize Firestore only on the client side
const db = typeof window !== "undefined" ? getFirestore(app) : undefined

export default function ChatApp() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [textMessage, setTextMessage] = useState("")
  const [showGiphyPicker, setShowGiphyPicker] = useState<boolean>(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false)
  const [firebaseStatus, setFirebaseStatus] = useState<"initializing" | "ready" | "error">("initializing")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Hook for fetching messages
  const { messages, error: messagesError } = useMessages(db, firebaseStatus)
  // Hook for sending messages
  const { sendMessage, isSending, error: sendMessageError } = useSendMessage(db, firebaseStatus)
  // Hook for toggling reactions
  const { toggleReaction, isUpdating: isUpdatingReaction, error: reactionError } = useToggleReaction(db, firebaseStatus)
  // WebRTC Context
  const {
    callStatus: webRTCCallStatus,
    activeCallTargetUserName,
    localStream,
    remoteStream,
    callerUserName,
    acceptCall,
    declineCall,
    listenForSignalingMessages,
    peerConnection,
    setCallStatus,
    closePeerConnection,
    hangUpCall,
    isLocalAudioMuted,
    isLocalVideoEnabled,
    toggleLocalAudio,
    toggleLocalVideo,
  } = useWebRTC()

  // Effect for WebRTC signaling listeners
  useEffect(() => {
    if (user && firebaseStatus === 'ready' && webRTCCallStatus !== 'active' && peerConnection !== null) {
      console.log("ChatApp: Setting up WebRTC signaling listeners for user:", user.uid)
      const cleanupListeners = listenForSignalingMessages(
        user.uid,
        (offer, fromUserId, fromUserName) => {
          console.log(`ChatApp: Incoming call offer from ${fromUserName || fromUserId}`)
          toast({
            title: "Incoming Call",
            description: `Call from ${fromUserName || "Unknown User"}. Check call UI.`,
          })
        },
        async (answer, fromUserId) => {
          console.log(`ChatApp: Received answer from ${fromUserId}`)
          if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
            try {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            } catch (error) {
              console.error("Error setting remote description from answer:", error)
              toast({ title: "Call Error", description: "Failed to connect (answer processing).", variant: "destructive" })
              setCallStatus('error')
            }
          } else {
            console.warn("Received answer but not in 'have-local-offer' state or no peerConnection.")
          }
        },
        (candidate) => {
          console.log("ChatApp: Received remote ICE candidate")
          if (peerConnection && candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
              .catch((e: Error) => console.error("Error adding received ICE candidate:", e))
          }
        },
        (fromUserId, fromUserName) => {
          toast({
            title: "Call Declined",
            description: `${fromUserName || 'The other user'} declined the call.`,
          })
          closePeerConnection()
        },
        () => {
          toast({ title: "Call Ended", description: "The other user ended the call." })
          closePeerConnection()
        }
      )
      return cleanupListeners
    }
  }, [user, firebaseStatus, listenForSignalingMessages, peerConnection, toast, setCallStatus, closePeerConnection, webRTCCallStatus])

  // Effect to check Firebase initialization status
  useEffect(() => {
    if (app && db) {
      setFirebaseStatus("ready")
    } else {
      console.error("Firebase app or Firestore db is not initialized.")
      setFirebaseStatus("error")
    }
  }, [])

  // Effect to handle errors from useMessages hook
  useEffect(() => {
    if (messagesError) {
      console.error("Error from useMessages hook:", messagesError)
      toast({
        title: "Chat Error",
        description: messagesError.message || "Could not load messages. Please try refreshing.",
        variant: "destructive",
      })
    }
  }, [messagesError, toast])

  // Effect to handle errors from useSendMessage hook
  useEffect(() => {
    if (sendMessageError) {
      console.error("Error from useSendMessage hook:", sendMessageError)
      toast({
        title: "Error Sending Message",
        description: sendMessageError.message || "Could not send your message. Please try again.",
        variant: "destructive",
      })
    }
  }, [sendMessageError, toast])

  // Effect to handle errors from useToggleReaction hook
  useEffect(() => {
    if (reactionError) {
      console.error("Error from useToggleReaction hook:", reactionError)
      toast({
        title: "Reaction Error",
        description: reactionError.message || "Could not update reaction. Please try again.",
        variant: "destructive",
      })
    }
  }, [reactionError, toast])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!textMessage.trim() || !user || isSending) return

    try {
      await sendMessage(textMessage, user)
      setTextMessage("")
    } catch (error) {
      // Error is handled by the useEffect for sendMessageError
    }
  }

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to send a voice message.", variant: "destructive" })
      return
    }
    if (!audioBlob || audioBlob.size === 0) {
      toast({ title: "Recording Error", description: "Recorded audio is empty.", variant: "destructive" })
      return
    }
    try {
      const downloadURL = await uploadVoiceMessage(user.uid, audioBlob)
      await sendMessage("", user, {
        voiceMessageUrl: downloadURL
      })
    } catch (error) {
      console.error("Error sending voice message:", error)
      toast({
        title: "Error Sending Voice Message",
        description: "Could not send your voice message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelectGif = async (gifUrl: string) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to send a GIF.", variant: "destructive" })
      return
    }

    try {
      await sendMessage("", user, { gifUrl })
      setShowGiphyPicker(false)
    } catch (error) {
      console.error("Error sending GIF:", error)
      toast({
        title: "Error Sending GIF",
        description: "Could not send your GIF. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCloseGiphyPicker = (): void => {
    setShowGiphyPicker(false)
  }

  const renderMessage = (message: Message) => {
    const isCurrentUser = message.userId === user?.uid
    const messageDate = message.timestamp?.toDate()
    const formattedDate = messageDate && isValid(messageDate)
      ? isToday(messageDate)
        ? format(messageDate, 'h:mm a')
        : isYesterday(messageDate)
          ? `Yesterday at ${format(messageDate, 'h:mm a')}`
          : format(messageDate, 'MMM d, h:mm a')
      : ''

    return (
      <div
        key={message.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[80%]`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.userPhotoURL || undefined} />
            <AvatarFallback>{message.userName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{message.userName}</span>
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
            </div>
            <div className={`rounded-lg px-4 py-2 ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
              {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
              {message.voiceMessageUrl && (
                <AudioPlayer src={message.voiceMessageUrl} />
              )}
              {message.gifUrl && (
                <img
                  src={message.gifUrl}
                  alt="GIF"
                  className="max-w-full rounded-lg"
                />
              )}
            </div>
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <MessageReactions
                message={message}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access the chat.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* User List Sidebar */}
      <div className="w-64 border-r bg-background">
        <UserList />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
          <h1 className="text-xl font-semibold">The SpeakEasy</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <UserIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <Input
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" disabled={isSending}>
              Send
            </Button>
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} onClose={() => { }} />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGiphyPicker(true)}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <UserIcon className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Video Call View */}
      {webRTCCallStatus !== 'idle' && (
        <VideoCallView
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleAudio={toggleLocalAudio}
          onToggleVideo={toggleLocalVideo}
          onEndCall={hangUpCall}
          targetUserName={activeCallTargetUserName || callerUserName}
          callStatus={webRTCCallStatus}
          isLocalAudioMuted={isLocalAudioMuted}
          isLocalVideoEnabled={isLocalVideoEnabled}
        />
      )}

      {/* Giphy Picker Modal */}
      {showGiphyPicker && (
        <GiphyPicker
          onSelectGif={handleSelectGif}
          onClose={handleCloseGiphyPicker}
        />
      )}

      {/* User Profile Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
        />
      )}
    </div>
  )
}