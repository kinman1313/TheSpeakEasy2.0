"use client"

import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { app, db, rtdb } from "@/lib/firebase"
import { useToast } from "@/components/ui/toast"
import { isToday, isYesterday, format, isValid } from 'date-fns'
import { useRoomMessages, Message } from "@/lib/hooks/useRoomMessages"
import { useRoomSendMessage } from "@/lib/hooks/useRoomSendMessage"
import { MessageReactions } from "@/components/chat/MessageReactions"
import UserList from "@/components/chat/UserList"
import { RoomManager } from "@/components/chat/RoomManager"
import { useWebRTC } from "@/components/providers/WebRTCProvider"
import VideoCallView from "@/components/chat/VideoCallView"
import { IncomingCallDialog } from "@/components/chat/IncomingCallDialog"
import { AudioPlayer } from "@/components/chat/AudioPlayer"
import GiphyPicker from "@/components/chat/GiphyPicker"
import UserSettingsModal from "@/components/user/UserSettingsModal"
import { MessageInput } from "@/components/MessageInput"
import { uploadVoiceMessage } from "@/lib/storage"
import { User as UserIcon, LogOut, Wifi, WifiOff, RefreshCw, Hash, Users, MessageCircle, Settings, Menu, X, Phone, Video } from "lucide-react"
import { signOut } from "firebase/auth"
import { getAuthInstance } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { UserSettingsDialog } from "@/components/user/UserSettingsDialog"
import { soundManager } from "@/lib/soundManager"
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database'

export default function ChatApp() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [showGiphyPicker, setShowGiphyPicker] = useState<boolean>(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false)
  const [firebaseStatus, setFirebaseStatus] = useState<"initializing" | "ready" | "error">("initializing")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousMessageCount = useRef<number>(0)

  // Room management state
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentRoomType, setCurrentRoomType] = useState<'lobby' | 'room' | 'dm'>('lobby')
  const [currentRoomName, setCurrentRoomName] = useState<string>("Lobby")

  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserList, setShowUserList] = useState(false)
  const [showMobileCallPicker, setShowMobileCallPicker] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Array<{ uid: string, userName?: string, photoURL?: string }>>([])

  // Effect to fetch online users for mobile call picker
  useEffect(() => {
    if (!rtdb || !user) return

    const statusRef = query(ref(rtdb, 'status'), orderByChild('isOnline'), equalTo(true))
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const usersData = snapshot.val()
      const loadedUsers: Array<{ uid: string, userName?: string, photoURL?: string }> = []

      if (usersData) {
        Object.keys(usersData).forEach((uid) => {
          if (uid !== user.uid) { // Filter out current user
            loadedUsers.push({
              uid,
              userName: usersData[uid].userName,
              photoURL: usersData[uid].photoURL
            })
          }
        })
      }
      setOnlineUsers(loadedUsers)
    })

    return unsubscribe
  }, [user, rtdb])

  // Effect to close mobile overlays when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setShowMobileCallPicker(false)
      }
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsMobileMenuOpen(false)
        setShowUserList(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Hook for fetching messages (room-aware)
  const { messages, error: messagesError, isConnected, isLoading, retryConnection } = useRoomMessages(
    db,
    firebaseStatus,
    currentRoomId,
    currentRoomType
  )

  // Hook for sending messages (room-aware)
  const { sendMessage, error: sendMessageError } = useRoomSendMessage(
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
    acceptCall,
    declineCall,
    isLocalAudioMuted,
    isLocalVideoEnabled,
    toggleLocalAudio,
    toggleLocalVideo,
    initiateCall,
    initiateAudioCall,
  } = useWebRTC()

  // Effect for WebRTC signaling listeners
  useEffect(() => {
    if (user && firebaseStatus === 'ready' && webRTCCallStatus !== 'active' && peerConnection !== null) {
      console.log("ChatApp: Setting up WebRTC signaling listeners for user:", user.uid)
      const cleanupListeners = listenForSignalingMessages(
        user.uid,
        (_, fromUserId, fromUserName) => {
          console.log(`ChatApp: Incoming call offer from ${fromUserName || fromUserId}`)
          soundManager.playCall()
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
          setCallStatus('idle')
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

  // Scroll to bottom when messages change and play sound for new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

    // Play sound for new messages from others
    if (messages.length > previousMessageCount.current && previousMessageCount.current > 0) {
      const newMessages = messages.slice(previousMessageCount.current)
      const hasNewMessageFromOthers = newMessages.some(msg => msg.userId !== user?.uid)

      if (hasNewMessageFromOthers) {
        if (currentRoomType === 'dm') {
          soundManager.playDM()
        } else {
          soundManager.playMessage()
        }
      }
    }

    previousMessageCount.current = messages.length
  }, [messages, user, currentRoomType])

  // Room management functions
  const handleRoomSelect = (roomId: string, roomType: 'room' | 'dm') => {
    setCurrentRoomId(roomId)
    setCurrentRoomType(roomType)
    setIsMobileMenuOpen(false) // Close mobile menu when selecting room

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
    setIsMobileMenuOpen(false) // Close mobile menu when selecting lobby
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

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return

    console.log('Adding reaction:', { messageId, emoji, currentRoomId, currentRoomType })

    try {
      const token = await user.getIdToken()

      // Use different API endpoint based on message type
      let apiUrl: string
      if (currentRoomType === 'lobby') {
        apiUrl = '/api/messages/reactions'
      } else if (currentRoomType === 'dm') {
        apiUrl = `/api/direct-messages/${currentRoomId}/messages`
      } else {
        apiUrl = `/api/rooms/${currentRoomId}/messages`
      }

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId,
          emoji,
          action: 'add'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to add reaction:', response.status, errorText)
        toast({
          title: "Error",
          description: `Failed to add reaction: ${response.status}`,
          variant: "destructive"
        })
      } else {
        const result = await response.json()
        console.log('Reaction added successfully:', result)
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive"
      })
    }
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!user) return

    console.log('Removing reaction:', { messageId, emoji, currentRoomId, currentRoomType })

    try {
      const token = await user.getIdToken()

      // Use different API endpoint based on message type
      let apiUrl: string
      if (currentRoomType === 'lobby') {
        apiUrl = '/api/messages/reactions'
      } else if (currentRoomType === 'dm') {
        apiUrl = `/api/direct-messages/${currentRoomId}/messages`
      } else {
        apiUrl = `/api/rooms/${currentRoomId}/messages`
      }

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId,
          emoji,
          action: 'remove'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to remove reaction:', response.status, errorText)
        toast({
          title: "Error",
          description: `Failed to remove reaction: ${response.status}`,
          variant: "destructive"
        })
      } else {
        const result = await response.json()
        console.log('Reaction removed successfully:', result)
      }
    } catch (error) {
      console.error('Error removing reaction:', error)
      toast({
        title: "Error",
        description: "Failed to remove reaction",
        variant: "destructive"
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
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3 md:mb-4`}
      >
        <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%] md:max-w-[80%]`}>
          <Avatar className="h-6 w-6 md:h-8 md:w-8 shrink-0">
            <AvatarImage src={message.userPhotoURL || undefined} />
            <AvatarFallback className="text-xs">{message.userName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} min-w-0`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs md:text-sm font-medium text-white truncate">{message.userName}</span>
              <span className="text-xs text-slate-400 shrink-0">{formattedDate}</span>
            </div>
            <div className={`rounded-lg px-3 md:px-4 py-2 min-w-0 ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'
              }`}>
              {message.text && <p className="whitespace-pre-wrap text-sm md:text-base break-words">{message.text}</p>}
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
            <div className="mt-1">
              <MessageReactions
                messageId={message.id}
                reactions={message.reactions || {}}
                currentUserId={user?.uid || ''}
                onReact={handleReaction}
                onRemoveReaction={handleRemoveReaction}
              />
            </div>
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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex flex-col">
      {/* Mobile Layout */}
      <div className="flex-1 flex relative">
        {/* Room Manager Sidebar - Mobile Overlay / Desktop Fixed */}
        <div className={`
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 
          fixed md:relative z-40 md:z-auto
          w-80 h-full md:h-auto
          glass-panel rounded-none md:rounded-xl glass-float md:mr-4
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'shadow-2xl' : ''}
        `}>
          <RoomManager
            currentRoomId={currentRoomId}
            onRoomSelect={handleRoomSelect}
            onLobbySelect={handleLobbySelect}
          />
        </div>

        {/* Mobile Overlay Background */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-2">
          {/* Chat Header */}
          <div className="h-14 md:h-16 glass-card rounded-none md:rounded-xl flex items-center justify-between px-3 md:px-6 neon-glow md:mb-6">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-300 hover:text-green-400 hover:bg-green-500/20 shrink-0"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {getRoomIcon()}
              <h1 className="text-lg md:text-xl font-semibold text-white truncate">{currentRoomName}</h1>

              {/* Connection Status Indicator - Hidden on small screens */}
              <div className="hidden sm:flex items-center gap-2">
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
                      className="text-red-400 hover:text-red-300 hover:bg-red-600/20 text-xs h-6 px-2"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              {/* Mobile Call Button - Show only when there are online users */}
              {onlineUsers.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-green-400 hover:text-green-300 hover:bg-green-500/20"
                  onClick={() => setShowMobileCallPicker(!showMobileCallPicker)}
                  title="Make Call"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )}

              {/* User List Toggle - Mobile Only */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-slate-300 hover:text-green-400 hover:bg-green-500/20"
                onClick={() => setShowUserList(!showUserList)}
                title="Toggle User List"
              >
                <Users className="h-4 w-4" />
              </Button>

              {/* Hide user name on very small screens */}
              <span className="hidden sm:block text-sm text-slate-300 mr-2 truncate max-w-32">
                {user?.displayName || user?.email || "User"}
              </span>

              <UserSettingsDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-300 hover:text-green-400 hover:bg-green-500/20"
                    title="Settings"
                  >
                    <Settings className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsProfileModalOpen(true)}
                className="text-slate-300 hover:text-green-400 hover:bg-green-500/20"
              >
                <UserIcon className="h-4 md:h-5 w-4 md:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-slate-300 hover:text-red-400 hover:bg-red-600/20"
                title="Sign Out"
              >
                <LogOut className="h-4 md:h-5 w-4 md:w-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area with Mobile User List */}
          <div className="flex-1 flex flex-col md:flex-row md:gap-6 min-h-0">
            {/* Messages Container */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Mobile User List Overlay */}
              {showUserList && (
                <div className="lg:hidden">
                  <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowUserList(false)} />
                  <div className="fixed right-0 top-0 h-full w-80 glass-panel z-50 shadow-2xl">
                    <div className="flex items-center justify-between p-4 border-b border-slate-600">
                      <h2 className="text-lg font-semibold text-white">Online Users</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowUserList(false)}
                        className="text-slate-300 hover:text-green-400 hover:bg-green-500/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <UserList />
                  </div>
                </div>
              )}

              {/* Mobile Call Picker Overlay */}
              {showMobileCallPicker && (
                <div className="md:hidden">
                  <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileCallPicker(false)} />
                  <div className="fixed bottom-0 left-0 right-0 glass-panel z-50 rounded-t-xl max-h-96">
                    <div className="flex items-center justify-between p-4 border-b border-slate-600">
                      <h2 className="text-lg font-semibold text-white">Call Someone</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowMobileCallPicker(false)}
                        className="text-slate-300 hover:text-green-400 hover:bg-green-500/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-80">
                      {onlineUsers.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          No users online to call
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {onlineUsers.map((onlineUser) => (
                            <div key={onlineUser.uid} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 touch-manipulation">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={onlineUser.photoURL || ""} alt={onlineUser.userName || 'User'} />
                                  <AvatarFallback>{onlineUser.userName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                                </Avatar>
                                <span className="text-white font-medium">{onlineUser.userName || 'Anonymous User'}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    initiateAudioCall(onlineUser.uid, onlineUser.userName || "Anonymous")
                                    setShowMobileCallPicker(false)
                                  }}
                                  disabled={webRTCCallStatus !== 'idle'}
                                  className="p-3 min-h-11 min-w-11 text-green-400 hover:text-green-300 hover:bg-green-500/20 touch-manipulation"
                                  title="Voice Call"
                                >
                                  <Phone size={20} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    initiateCall(onlineUser.uid, onlineUser.userName || "Anonymous")
                                    setShowMobileCallPicker(false)
                                  }}
                                  disabled={webRTCCallStatus !== 'idle'}
                                  className="p-3 min-h-11 min-w-11 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 touch-manipulation"
                                  title="Video Call"
                                >
                                  <Video size={20} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 glass-card rounded-none md:rounded-xl overflow-y-auto p-3 md:p-6 md:mb-6">
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
                        className="text-red-300 hover:text-red-200 hover:bg-red-600/20 text-xs h-6 px-2 ml-auto"
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
              <div className="glass-card rounded-none md:rounded-xl p-3 md:p-4">
                <MessageInput
                  onSend={async (message: string) => {
                    if (!user) return
                    await sendMessage(message, user)
                  }}
                  onVoiceRecording={handleRecordingComplete}
                  onGifSelect={() => setShowGiphyPicker(true)}
                />
              </div>
            </div>

            {/* Desktop User List - Hidden on Mobile */}
            <div className="hidden lg:block w-64 glass-panel rounded-xl glass-float">
              <UserList />
            </div>
          </div>
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

      {/* Incoming Call Dialog */}
      <IncomingCallDialog
        open={webRTCCallStatus === 'receivingCall'}
        callerName={callerUserName || 'Unknown User'}
        onAcceptVideo={async () => {
          try {
            await acceptCall()
          } catch (error) {
            console.error('Error accepting video call:', error)
            toast({
              title: "Call Error",
              description: "Failed to accept call. Please try again.",
              variant: "destructive",
            })
          }
        }}
        onAcceptAudio={async () => {
          try {
            await acceptCall()
          } catch (error) {
            console.error('Error accepting audio call:', error)
            toast({
              title: "Call Error",
              description: "Failed to accept call. Please try again.",
              variant: "destructive",
            })
          }
        }}
        onDecline={async () => {
          try {
            await declineCall()
          } catch (error) {
            console.error('Error declining call:', error)
            toast({
              title: "Call Error",
              description: "Failed to decline call.",
              variant: "destructive",
            })
          }
        }}
      />

      {/* User Settings Modal */}
      {isProfileModalOpen && (
        <UserSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
        />
      )}
    </div>
  )
}