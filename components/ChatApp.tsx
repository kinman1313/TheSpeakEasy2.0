"use client"

import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { app, db } from "@/lib/firebase"
import { useToast } from "@/components/ui/toast"
import { isToday, isYesterday, format, isValid } from 'date-fns'
import { useRoomMessages, Message } from "@/lib/hooks/useRoomMessages"
import { useRoomSendMessage } from "@/lib/hooks/useRoomSendMessage"
import { MessageReactions } from "@/components/chat/MessageReactions"
import UserList from "@/components/chat/UserList"
import { RoomManager } from "@/components/chat/RoomManager"
import { useWebRTC } from "@/components/providers/WebRTCProvider"
import VideoCallView from "@/components/chat/VideoCallView"
import { VoiceRecorder } from "@/components/chat/VoiceRecorder"
import { AudioPlayer } from "@/components/chat/AudioPlayer"
import GiphyPicker from "@/components/chat/GiphyPicker"
import UserProfileModal from "@/components/user/UserProfileModal"
import { uploadVoiceMessage } from "@/lib/storage"
import { Image as ImageIcon, User as UserIcon, LogOut, Wifi, WifiOff, RefreshCw, Hash, Users, MessageCircle } from "lucide-react"
import { signOut } from "firebase/auth"
import { getAuthInstance } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export default function ChatApp() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [textMessage, setTextMessage] = useState("")
  const [showGiphyPicker, setShowGiphyPicker] = useState<boolean>(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false)
  const [firebaseStatus, setFirebaseStatus] = useState<"initializing" | "ready" | "error">("initializing")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Room management state
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentRoomType, setCurrentRoomType] = useState<'lobby' | 'room' | 'dm'>('lobby')
  const [currentRoomName, setCurrentRoomName] = useState<string>("Lobby")

  // Hook for fetching messages (room-aware)
  const { messages, error: messagesError, isConnected, isLoading, retryConnection } = useRoomMessages(
    db,
    firebaseStatus,
    currentRoomId,
    currentRoomType
  )

  // Hook for sending messages (room-aware)
  const { sendMessage, isSending, error: sendMessageError } = useRoomSendMessage(
    db,
    firebaseStatus,
    currentRoomId,
    currentRoomType
  )

  // WebRTC Context
  const {
    callStatus: webRTCCallStatus,
    activeCallTargetUserName,
    localStream,
    remoteStream,
    callerUserName,
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
        (_, fromUserId, fromUserName) => {
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
        (_, fromUserName) => {
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
    return undefined
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

  // Effect to handle errors from useRoomMessages hook
  useEffect(() => {
    if (messagesError) {
      console.error("Error from useRoomMessages hook:", messagesError)

      if (!messagesError.message.includes('transport errored') && !messagesError.message.includes('Failed to connect after')) {
        toast({
          title: "Chat Error",
          description: messagesError.message || "Could not load messages. Please try refreshing.",
          variant: "destructive",
        })
      } else if (messagesError.message.includes('Failed to connect after')) {
        toast({
          title: "Connection Failed",
          description: "Unable to connect to chat server. Please check your internet connection and try again.",
          variant: "destructive",
        })
      }
    }
  }, [messagesError, toast])

  // Effect to handle connection status changes
  useEffect(() => {
    if (!isConnected && !isLoading && firebaseStatus === 'ready') {
      toast({
        title: "Connection Lost",
        description: "Trying to reconnect to chat...",
        variant: "destructive",
      })
    } else if (isConnected && firebaseStatus === 'ready') {
      console.log("Chat connection restored")
    }
  }, [isConnected, isLoading, firebaseStatus, toast])

  // Effect to handle errors from useRoomSendMessage hook
  useEffect(() => {
    if (sendMessageError) {
      console.error("Error from useRoomSendMessage hook:", sendMessageError)
      toast({
        title: "Error Sending Message",
        description: sendMessageError.message || "Could not send your message. Please try again.",
        variant: "destructive",
      })
    }
  }, [sendMessageError, toast])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Room management functions
  const handleRoomSelect = (roomId: string, roomType: 'room' | 'dm') => {
    setCurrentRoomId(roomId)
    setCurrentRoomType(roomType)

    // For demo purposes, set room name. In a real app, you'd fetch this from the room data
    if (roomType === 'room') {
      setCurrentRoomName(`Room ${roomId.slice(-6)}`)
    } else {
      setCurrentRoomName("Direct Message")
    }
  }

  const handleLobbySelect = () => {
    setCurrentRoomId(null)
    setCurrentRoomType('lobby')
    setCurrentRoomName("Lobby")
  }

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

  const handleLogout = async () => {
    try {
      const auth = getAuthInstance()
      if (auth) {
        await signOut(auth)
        toast({
          title: "Signed Out",
          description: "You have been successfully signed out.",
        })
        router.push("/login")
      }
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
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
              <span className="text-sm font-medium text-white">{message.userName}</span>
              <span className="text-xs text-slate-400">{formattedDate}</span>
            </div>
            <div className={`rounded-lg px-4 py-2 ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'
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

  if (firebaseStatus === "initializing") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Initializing chat...</p>
        </div>
      </div>
    )
  }

  if (firebaseStatus === "error") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to initialize chat</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const getRoomIcon = () => {
    if (currentRoomType === 'lobby') return <Hash className="h-5 w-5" />
    if (currentRoomType === 'room') return <Users className="h-5 w-5" />
    if (currentRoomType === 'dm') return <MessageCircle className="h-5 w-5" />
    return <Hash className="h-5 w-5" />
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Room Manager Sidebar */}
      <div className="w-80 border-r border-slate-700/50">
        <RoomManager
          currentRoomId={currentRoomId}
          onRoomSelect={handleRoomSelect}
          onLobbySelect={handleLobbySelect}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 border-b border-slate-700/50 flex items-center justify-between px-4 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md glass">
          <div className="flex items-center gap-3">
            {getRoomIcon()}
            <h1 className="text-xl font-semibold text-white">{currentRoomName}</h1>

            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="flex items-center gap-2 text-yellow-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Connecting...</span>
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-2 text-green-400">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">Disconnected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={retryConnection}
                    className="text-red-400 hover:text-white hover:bg-red-600/50 text-xs h-6 px-2"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300 mr-2">
              {user?.displayName || user?.email || "User"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsProfileModalOpen(true)}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              <UserIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-300 hover:text-white hover:bg-red-600/50"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-900/20 to-slate-800/30">
          {/* Connection Status Banner */}
          {!isConnected && !isLoading && firebaseStatus === 'ready' && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600/50 rounded-lg glass">
              <div className="flex items-center gap-2 text-red-300">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Connection lost. Messages may not be up to date.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryConnection}
                  className="text-red-300 hover:text-white hover:bg-red-600/50 text-xs h-6 px-2 ml-auto"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600/50 rounded-lg glass">
              <div className="flex items-center gap-2 text-yellow-300">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading messages...</span>
              </div>
            </div>
          )}

          {messages.length === 0 && !isLoading && (
            <div className="text-center text-slate-400 mt-8">
              <div className="mb-4">
                {getRoomIcon()}
              </div>
              <p className="text-lg font-medium mb-2">
                {currentRoomType === 'lobby' && "Welcome to the Lobby!"}
                {currentRoomType === 'room' && "Welcome to this room!"}
                {currentRoomType === 'dm' && "Start your conversation!"}
              </p>
              <p className="text-sm">
                {currentRoomType === 'lobby' && "This is the main chat room where everyone can talk."}
                {currentRoomType === 'room' && "This is a private room. Only members can see messages here."}
                {currentRoomType === 'dm' && "Messages here are private between you and the other person."}
              </p>
            </div>
          )}

          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700/50 p-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-md">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <Input
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              placeholder={`Message ${currentRoomName}...`}
              className="flex-1 glass text-white placeholder:text-slate-400 border-slate-600/50 focus:border-indigo-500/50"
            />
            <Button
              type="submit"
              disabled={isSending}
              className="glass hover:glass-darker neon-glow text-white"
            >
              Send
            </Button>
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGiphyPicker(true)}
              className="glass hover:glass-darker text-slate-300 hover:text-white border-slate-600/50"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* User List - moved to right side for better UX */}
      <div className="w-64 border-l border-slate-700/50 bg-gradient-to-b from-slate-900/90 to-slate-800/90 backdrop-blur-md">
        <UserList />
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