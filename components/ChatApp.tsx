"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { ImprovedVideoCallView } from "@/components/chat/ImprovedVideoCallView"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { app, db, rtdb } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useRoomMessages } from "@/lib/hooks/useRoomMessages"
import { useRoomSendMessage } from "@/lib/hooks/useRoomSendMessage"
import UserList from "@/components/chat/UserList"
import { RoomManager } from "@/components/chat/RoomManager"
import { useWebRTC } from "@/components/providers/WebRTCProvider"
import { IncomingCallDialog } from "@/components/chat/IncomingCallDialog"
import { useCallNotifications } from "@/lib/callNotifications"
import GiphyPicker from "@/components/chat/GiphyPicker"
import { MessageInput } from "@/components/MessageInput"
import { Message as MessageComponent } from "@/components/chat/Message"
import { OptimizedMessage } from '@/components/chat/OptimizedMessage'
import { TypingIndicator } from "@/components/chat/TypingIndicator"
import { ThreadView } from "@/components/chat/ThreadView"
import { uploadVoiceMessage } from "@/lib/storage"
import { TypingIndicatorService } from "@/lib/typingIndicators"
import { MessageExpirationService } from "@/lib/messageExpiration"
import { pushNotificationService } from "@/lib/pushNotifications"
import { type ExpirationTimer } from "@/lib/types"
import type { Message as ChatMessage } from "@/lib/types"
import { 
  User as UserIcon, 
  LogOut, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Hash, 
  Users, 
  MessageCircle, 
  Menu, 
  X, 
  Phone, 
  Video,
  Search,
  ChevronDown 
} from "lucide-react"
import { signOut } from "firebase/auth"
import { getAuthInstance } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { UserSettingsDialog } from "@/components/user/UserSettingsDialog"
import { RoomHeader } from '@/components/chat/room-header'
import { soundManager } from "@/lib/soundManager"
import { AudioTestUtils } from "@/lib/audioTest"
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database'
import { Timestamp } from 'firebase/firestore'
import { usePullToRefresh } from "@/hooks/usePullToRefresh"
import { useMobileNotifications } from "@/lib/mobileNotifications"
import { useHaptics } from "@/lib/haptics"

type ThreadParentMessage = ChatMessage & { threadId: string }

interface OutgoingMessageData {
  text: string
  userName: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  fileType?: string
  imageUrl?: string
  voiceMessageUrl?: string
  gifUrl?: string
  replyToId?: string
  expirationTimer: ExpirationTimer
  threadId?: string
  status: 'sending' | string
  expiresAt: Timestamp | null
  replyToMessage?: {
    id: string
    text: string
    userName?: string
    timestamp: any
  }
}

interface ChatAppProps {
  enhanced?: boolean
}

export default function ChatApp({ enhanced = false }: ChatAppProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Mobile features
  const { success: hapticSuccess } = useHaptics()
  const { startIncomingCall } = useCallNotifications()
  const { showMessage, showCall } = useMobileNotifications()
  const [showGiphyPicker, setShowGiphyPicker] = useState<boolean>(false)
  const [firebaseStatus, setFirebaseStatus] = useState<"initializing" | "ready" | "error">("initializing")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousMessageCount = useRef<number>(0)

  // Room management state
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentRoomType, setCurrentRoomType] = useState<'lobby' | 'room' | 'dm'>('lobby')
  const [currentRoomName, setCurrentRoomName] = useState<string>("Lobby")
  const [selectedThread, setSelectedThread] = useState<ThreadParentMessage | null>(null)

  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserList, setShowUserList] = useState(false)
  const [showMobileCallPicker, setShowMobileCallPicker] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Array<{ uid: string, userName?: string, photoURL?: string }>>([])

  // New feature states
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null)

  // Enhanced UI state
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  // Initialize sound manager on first user interaction
  useEffect(() => {
    soundManager.initializeOnUserInteraction()
  }, [])

  // Initialize push notifications on app start
  useEffect(() => {
    const initializePushNotifications = async () => {
      if (!user) return undefined

      try {
        const result = await pushNotificationService.requestPermission()
        if (result.permission === 'granted' && result.token) {
          await pushNotificationService.storeFCMToken(user.uid, result.token)

          // Listen for foreground messages
          const unsubscribe = pushNotificationService.onForegroundMessage((payload) => {
            const { notification } = payload
            if (notification) {
              pushNotificationService.showLocalNotification(
                notification.title || 'New Message',
                {
                  body: notification.body,
                  data: payload.data
                }
              )
            }
          })

          // Store unsubscribe function for cleanup
          if (unsubscribe) {
            return unsubscribe
          }
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error)
      }

      return undefined
    }

    initializePushNotifications()
  }, [user])

  // Initialize message expiration timers
  useEffect(() => {
    if (firebaseStatus === 'ready') {
      MessageExpirationService.initializeExpirationTimers()
    }

    // Cleanup on unmount
    return () => {
      MessageExpirationService.cleanup()
    }
  }, [firebaseStatus])

  // Set up typing indicators
  useEffect(() => {
    if (!user) return

    const roomId = currentRoomType === 'lobby' ? 'lobby' : currentRoomId
    if (!roomId && currentRoomType !== 'lobby') return

    // Cleanup on unmount
    return () => {
      if (user) {
        TypingIndicatorService.stopTyping(user.uid, roomId || 'lobby')
      }
    }
  }, [user, currentRoomId, currentRoomType])

  // Cleanup typing indicators on room change
  useEffect(() => {
    return () => {
      if (user && currentRoomId) {
        const roomId = currentRoomType === 'lobby' ? 'lobby' : currentRoomId
        TypingIndicatorService.stopTyping(user.uid, roomId || 'lobby')
      }
    }
  }, [currentRoomId, currentRoomType, user])

  // Effect to fetch online users for mobile call picker
  useEffect(() => {
    if (!rtdb || !user) return

    const statusRef = query(ref(rtdb, 'status'), orderByChild('isOnline'), equalTo(true))
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const usersData = snapshot.val()
      const loadedUsers: Array<{ uid: string, userName?: string, photoURL?: string }> = []

      if (usersData) {
        Object.keys(usersData).forEach((uid) => {
          if (uid !== user.uid) {
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
    // rtdb is a stable module singleton; excluding it prevents unnecessary lint warning
  }, [user])

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

  // Pull-to-refresh for messages
  const {
    containerRef: messagesContainerRef,
    isRefreshing,
    refreshIndicatorStyle,
    isThresholdReached
  } = usePullToRefresh({
    onRefresh: async () => {
      await hapticSuccess()
      await retryConnection()
    },
    enabled: true
  })

  // Hook for sending messages (room-aware)
  const { sendMessage, error: sendMessageError } = useRoomSendMessage(
    db,
    firebaseStatus,
    currentRoomId,
    currentRoomType
  )

  // WebRTC Hooks
  const {
    peerConnection, localStream, remoteStream, callStatus: webRTCCallStatus,
    activeCallTargetUserName, callerUserName, isLocalAudioMuted, isLocalVideoEnabled,
    initiateCall, initiateAudioCall, acceptCall, declineCall, hangUpCall, toggleLocalAudio, toggleLocalVideo,
    listenForSignalingMessages, closePeerConnection, setCallStatus
  } = useWebRTC()

  console.log('ChatApp: Current webRTCCallStatus from hook:', webRTCCallStatus)

  // Debug: Run audio diagnostics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('🔧 Running audio diagnostics for user:', user.uid);
      AudioTestUtils.runFullAudioDiagnostic().catch(console.error);
    }
  }, [user]);

  // Enhanced scroll detection for scroll-to-bottom button
  const SCROLL_BOTTOM_THRESHOLD = 100; // px, adjust as needed

  useEffect(() => {
    if (!enhanced) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_BOTTOM_THRESHOLD;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [enhanced, messagesContainerRef.current]);

  // Effect for WebRTC signaling listeners
  useEffect(() => {
    if (user && firebaseStatus === 'ready' && webRTCCallStatus !== 'connected' && peerConnection !== null) {
      console.log("ChatApp: Setting up WebRTC signaling listeners for user:", user.uid)
      const cleanupListeners = listenForSignalingMessages(
        user.uid,
        async (_offer: RTCSessionDescriptionInit, fromUserId: string, fromUserName?: string) => {
          console.log(`ChatApp: Incoming call offer from ${fromUserName || fromUserId}`)
          
          // Start enhanced call notification
          try {
            await startIncomingCall({
              callerName: fromUserName || 'Unknown User',
              isVideo: true, // We'll detect this properly later
              onAnswer: () => {
                // This will be handled by the accept call button
              },
              onDecline: () => {
                // This will be handled by the decline call button
              }
            });
          } catch (error) {
            console.error('Error starting call notification:', error);
          }

          // Legacy sound for compatibility
          soundManager.playCall()

          // Show mobile notification for incoming call
          showCall(fromUserName || "Unknown User", true)

          toast({
            title: "Incoming Call",
            description: `Call from ${fromUserName || "Unknown User"}`,
          })
        },
        async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
          console.log(`ChatApp: Received answer from ${fromUserId}`)
          console.log(`ChatApp: PeerConnection state: ${peerConnection?.signalingState}`)
          console.log(`ChatApp: WebRTC call status: ${webRTCCallStatus}`)

          if (!peerConnection) {
            console.warn("Received answer but no peer connection exists")
            return
          }

          if (peerConnection.signalingState === 'have-local-offer') {
            try {
              console.log("ChatApp: Setting remote description from answer")
              await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
              console.log("ChatApp: Successfully set remote description")
            } catch (error) {
              console.error("Error setting remote description from answer:", error)
              toast({ title: "Call Error", description: "Failed to connect (answer processing).", variant: "destructive" })
              setCallStatus('error')
            }
          } else if (peerConnection.signalingState === 'stable') {
            console.warn("Received answer but peer connection is already stable (answer already processed)")
          } else if (peerConnection.signalingState === 'closed') {
            console.warn("Received answer but peer connection is closed")
          } else {
            console.warn(`Received answer but not in 'have-local-offer' state. Current state: ${peerConnection.signalingState}`)
          }
        },
        (candidate: RTCIceCandidateInit) => {
          console.log("ChatApp: Received remote ICE candidate")
          if (
            peerConnection &&
            candidate &&
            candidate.sdpMid !== null &&
            candidate.sdpMid !== undefined &&
            candidate.sdpMLineIndex !== null &&
            candidate.sdpMLineIndex !== undefined
          ) {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
              .catch((e: Error) => console.error("Error adding received ICE candidate:", e))
          } else {
            console.warn("Received invalid ICE candidate, skipping:", candidate)
          }
        },
        (_declinePayload: unknown, fromUserName?: string) => {
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
  }, [user, firebaseStatus, listenForSignalingMessages, peerConnection, toast, setCallStatus, closePeerConnection, webRTCCallStatus, startIncomingCall])

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
    // Enhanced smooth scroll to bottom
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end",
        inline: "nearest"
      })
    }

    // Play sound for new messages from others
    if (messages.length > previousMessageCount.current && previousMessageCount.current > 0) {
      const newMessages = messages.slice(previousMessageCount.current) as ChatMessage[]
      const hasNewMessageFromOthers = newMessages.some((msg: ChatMessage) => msg.uid !== user?.uid)

      if (hasNewMessageFromOthers) {
        const latestMessage = newMessages[newMessages.length - 1]

        // Show mobile notification for new message
        if (latestMessage && !document.hasFocus()) {
          showMessage(
            latestMessage.userName || "Unknown User",
            latestMessage.text || "New message",
            { roomId: currentRoomId, roomType: currentRoomType }
          )
        }

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

  // Enhanced message sending with file support, threading, and expiration
  const handleSendMessage = async (
    messageText: string,
    options?: {
      fileUrl?: string
      fileName?: string
      fileSize?: number
      fileType?: string
      imageUrl?: string
      voiceMessageUrl?: string
      gifUrl?: string
      replyToId?: string
      expirationTimer?: ExpirationTimer
      threadId?: string
      status?: string
    }
  ) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to send a message.", variant: "destructive" })
      return
    }

    try {
      // Calculate expiration date if timer is set
      let expiresAt: Date | null = null
      if (options?.expirationTimer && options.expirationTimer !== 'never') {
        expiresAt = MessageExpirationService.calculateExpirationDate(options.expirationTimer)
      }

      // Prepare message data
      const messageData: OutgoingMessageData = {
        text: messageText,
        userName: user.displayName || user.email || 'Anonymous',
        fileUrl: options?.fileUrl,
        fileName: options?.fileName,
        fileSize: options?.fileSize,
        fileType: options?.fileType,
        imageUrl: options?.imageUrl,
        voiceMessageUrl: options?.voiceMessageUrl,
        gifUrl: options?.gifUrl,
        replyToId: options?.replyToId,
        threadId: options?.threadId,
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        expirationTimer: options?.expirationTimer || 'never',
        status: 'sending'
      }

      // Add reply context if replying
      if (options?.replyToId && replyToMessage) {
        messageData.replyToMessage = {
          id: replyToMessage.id,
            text: replyToMessage.text || '',
            userName: replyToMessage.userName || replyToMessage.displayName,
            timestamp: replyToMessage.createdAt
        }
      }

      // Send message and get the message ID
      const messageId = await sendMessage(messageText, user, messageData)

      if (messageId) {
        console.log('Message sent successfully with ID:', messageId)
      }

      // Schedule expiration if needed
      if (expiresAt && messageId) {
        MessageExpirationService.scheduleMessageExpiration(messageId, expiresAt)
      }

      // Clear reply state
      setReplyToMessage(null)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error Sending Message",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      })
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
      await handleSendMessage("", {
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

    if (!gifUrl) {
      toast({ title: "Error", description: "No GIF URL provided.", variant: "destructive" })
      return
    }

    try {
      console.log("Sending GIF with URL:", gifUrl)
      await handleSendMessage("", { gifUrl })
      setShowGiphyPicker(false)
    } catch (error) {
      console.error("Error sending GIF:", error)
      toast({
        title: "Error Sending GIF",
        description: error instanceof Error ? error.message : "Could not send your GIF. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCloseGiphyPicker = (): void => {
    setShowGiphyPicker(false)
  }

  // Message action handlers
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      let apiUrl: string
      if (currentRoomType === 'lobby') {
        apiUrl = '/api/messages'
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
          text: newText,
          action: 'edit'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to edit message: ${response.status}`)
      }

      toast({
        title: "Message Edited",
        description: "Your message has been updated.",
      })
    } catch (error) {
      console.error("Error editing message:", error)
      toast({
        title: "Edit Error",
        description: "Could not edit message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      let apiUrl: string
      if (currentRoomType === 'lobby') {
        apiUrl = `/api/messages/${messageId}`
      } else if (currentRoomType === 'dm') {
        apiUrl = `/api/direct-messages/${currentRoomId}/messages/${messageId}`
      } else {
        apiUrl = `/api/rooms/${currentRoomId}/messages/${messageId}`
      }

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.status}`)
      }

      toast({
        title: "Message Deleted",
        description: "Your message has been removed.",
      })
    } catch (error) {
      console.error("Error deleting message:", error)
      toast({
        title: "Delete Error",
        description: "Could not delete message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyToMessage(message)
  }

  // Add ID-based wrapper for components that emit only messageId (e.g., OptimizedMessage)
  const handleReplyToMessageById = React.useCallback((messageId: string) => {
    const msg = messages.find((m: any) => m.id === messageId)
    if (msg) {
      handleReplyToMessage(msg as ChatMessage)
    }
  }, [messages, handleReplyToMessage])

  const handleCancelReply = () => {
    setReplyToMessage(null)
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

  // Updated message reactions endpoints
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Find the message to check current reactions
      const message = messages.find((m: any) => m.id === messageId);
      if (!message) return;

      // Determine if user has already reacted with this emoji
      const userReactions = message.reactions?.[emoji] || [];
      const hasReacted = userReactions.includes(user.uid);
      const action = hasReacted ? 'remove' : 'add';

      const token = await user.getIdToken()
      let apiUrl: string

      // Determine the correct API endpoint based on room type
      if (currentRoomType === 'lobby') {
        apiUrl = '/api/messages/reactions'
      } else if (currentRoomType === 'dm') {
        apiUrl = `/api/direct-messages/${currentRoomId}/messages/${messageId}/reactions`
      } else {
        apiUrl = `/api/rooms/${currentRoomId}/messages/${messageId}/reactions`
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
          action
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to ${action} reaction`)
      }

      toast({
        title: action === 'add' ? "Reaction Added" : "Reaction Removed",
        description: `${action === 'add' ? 'Added' : 'Removed'} ${emoji} reaction ${action === 'add' ? 'to' : 'from'} message`,
      });
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Updated: memoized to avoid re-creation each render (fixes dependency churn)
  const handleExpire = useCallback(async (messageId: string, duration: number) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/messages/${messageId}/expire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ minutes: duration })
      })
      if (!response.ok) throw new Error('Failed to set message expiration')
      toast({
        title: "Message Expiration Set",
        description: `Message will expire in ${duration} minutes`,
      })
    } catch (error) {
      console.error('Error setting message expiration:', error)
      toast({
        title: "Error",
        description: "Failed to set message expiration",
        variant: "destructive",
      })
    }
  }, [user, toast])

  // Open a thread from either a Message object or a messageId (flexible to satisfy differing component prop types)
  const handleOpenThread = React.useCallback((messageOrMessageId: any) => {
    // Normalize to message object
    let message: any
    if (typeof messageOrMessageId === 'string') {
      const id = messageOrMessageId
      if (!id) return
      message = messages.find((m: any) => m.id === id)
    } else if (messageOrMessageId && typeof messageOrMessageId === 'object') {
      message = messageOrMessageId
    }

    if (!message) return

    const threadParent: ThreadParentMessage = {
      ...(message as ChatMessage),
      threadId: (message as any).threadId || message.id
    }
    setSelectedThread(threadParent)
  }, [messages])

  const handleBackToChat = () => {
    setSelectedThread(null)
  }

  // Enhanced scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end",
        inline: "nearest"
      })
    }
  }

  // Utility function to normalize timestamps to Firestore-like format
  const normalizeTimestamp = (timestamp: any) => {
    if (!timestamp) {
      const now = new Date();
      return {
        toDate: () => now,
        seconds: Math.floor(now.getTime() / 1000),
        nanoseconds: (now.getTime() % 1000) * 1_000_000
      };
    }

    if (typeof timestamp.toDate === 'function') {
      // Already a Firestore Timestamp-like object
      return timestamp;
    }

    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date();
    }

    return {
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: (date.getTime() % 1000) * 1_000_000
    };
  };

  // Render a single message (fixed: previously corrupted into normalizeTimestamp)
  const renderMessage = React.useCallback((message: any) => {
    const isCurrentUser = message.uid === user?.uid;

    if (enhanced) {
      return (
        <OptimizedMessage
          key={message.id}
          id={message.id}
          text={message.text}
          // FIX: currentUserId must be a string, not boolean
          currentUserId={user?.uid || ''}
          timestamp={normalizeTimestamp(message.createdAt)}
          // Attachments / media
          fileUrl={message.fileUrl}
          fileName={message.fileName}
          fileType={message.fileType}
          fileSize={message.fileSize}
          imageUrl={message.imageUrl}
          gifUrl={message.gifUrl}
          audioUrl={message.audioUrl}
          voiceMessageUrl={message.voiceMessageUrl}
          mp3Url={message.mp3Url}
          chatColor={message.chatColor}
          // Thread / meta
            threadCount={message.threadCount}
          reactions={message.reactions}
          replyTo={message.replyToMessage}
          expiresAt={message.expiresAt}
          // Actions
          onReply={handleReplyToMessageById}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onReact={handleReaction}
          onCopy={(text: string) => {
            navigator.clipboard.writeText(text);
            toast({
              title: "Copied",
              description: "Message text copied to clipboard",
            });
          }}
          onFlag={() => {
            toast({
              title: "Message Reported",
              description: "Thank you for reporting this message",
            });
          }}
          onExpire={handleExpire}
          onThreadClick={handleOpenThread}
        />
      );
    } else {
      return (
        <MessageComponent
          key={message.id}
          message={message}
          isCurrentUser={isCurrentUser}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onReply={handleReplyToMessage}
          onReaction={handleReaction}
          onExpire={handleExpire}
          onThreadClick={handleOpenThread}
        />
      );
    }
  }, [user?.uid, enhanced, handleReplyToMessageById, handleReplyToMessage, handleEditMessage, handleDeleteMessage, handleReaction, handleExpire, toast, handleOpenThread]);

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

  // Adapt replyToMessage to the shape MessageInput expects
  const replyPreview = replyToMessage
    ? {
        id: replyToMessage.id,
        text: replyToMessage.text || '',
        userName: replyToMessage.userName || (replyToMessage as any).displayName || 'Unknown'
      }
    : undefined

  // Enhanced version with glass effects and improved UI
  if (enhanced) {
    return (
      <div className="h-screen flex flex-col bg-transparent chatapp-enhanced-root" data-testid="chatapp-enhanced-root">
        {/* Header with Glass Effect */}
        <header className="glass-panel border-b-0 rounded-b-3xl px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                className="icon-btn md:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open mobile menu"
                title="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10 ring-2 ring-white/20">
                    <AvatarImage src={user?.photoURL || ""} />
                    <AvatarFallback>{user?.displayName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background" />
                </div>
                
                <div>
                  <h1 className="font-semibold text-white">SpeakEasy</h1>
                  <p className="text-xs text-white/60">
                    {onlineUsers.length} online
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="icon-btn" aria-label="Search messages" title="Search messages">
                <Search className="w-5 h-5" />
                <span className="tooltip">Search</span>
              </button>
              {/* Settings Button */}
              <button
                className="icon-btn"
                aria-label="User settings"
                title="User settings"
                onClick={() => setShowSettingsDialog(true)}
              >
                <UserIcon className="w-5 h-5" />
                <span className="tooltip">Settings</span>
              </button>
              {onlineUsers.length > 0 && (
                <>
                  <button 
                    className="icon-btn"
                    onClick={() => setShowMobileCallPicker(true)}
                    aria-label="Start voice call"
                    title="Start voice call"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="tooltip">Call</span>
                  </button>
                  <button 
                    className="icon-btn"
                    onClick={() => setShowMobileCallPicker(true)}
                    aria-label="Start video call"
                    title="Start video call"
                  >
                    <Video className="w-5 h-5" />
                    <span className="tooltip">Video</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
        
        {/* Messages Area with Improved Scrolling */}
        <main className="flex-1 overflow-hidden relative">
          <div 
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto custom-scrollbar overscroll-contain"
          >
            {/* Pull-to-refresh indicator */}
            <div
              className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full flex items-center justify-center refresh-indicator"
              style={refreshIndicatorStyle}
            ></div>
              <div className={`w-8 h-8 rounded-full border-2 border-green-500 ${isRefreshing ? 'animate-spin border-t-transparent' : ''} ${isThresholdReached ? 'bg-green-500/20' : ''}`}>
                {!isRefreshing && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4 p-4">
              {messages.map(renderMessage)}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              aria-label="Scroll to latest messages"
              title="Scroll to latest messages"
              className="absolute bottom-20 right-4 glass-panel p-3 rounded-full shadow-lg hover:scale-105 transition-transform z-10"
            >
              <ChevronDown className="w-5 h-5 text-white" />
              <span className="sr-only">Scroll to latest messages</span>
            </button>
          )}
        </main>

        {/* Enhanced Message Input */}
        <footer className="glass-panel border-t-0 rounded-t-3xl px-4 py-3">
          <MessageInput
            onSend={handleSendMessage}
            onVoiceRecording={handleRecordingComplete}
            onGifSelect={() => setShowGiphyPicker(true)}
            replyToMessage={replyPreview}
            onCancelReply={handleCancelReply}
            currentUserId={user?.uid}
            currentUserName={user?.displayName || user?.email || 'Anonymous'}
            roomId={currentRoomType === 'lobby' ? 'lobby' : currentRoomId || undefined}
            enhanced={true}
          />
        </footer>

        {/* Typing Indicators */}
        <TypingIndicator
          roomId={currentRoomType === 'lobby' ? 'lobby' : currentRoomId || ''}
          currentUserId={user.uid}
          className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-2"
        />

        {/* Enhanced Video Call View for Enhanced Mode */}
        {webRTCCallStatus !== 'idle' && (
          <ImprovedVideoCallView />
        )}

        {/* User Settings Dialog */}
        {showSettingsDialog && (
          <UserSettingsDialog
          />
        )}

      </div>
    )
  }

  // Original UI (unchanged from your version)
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
          {/* Use RoomHeader component when available, otherwise use the original header */}
          <div className="flex items-center justify-between md:mb-6">
            {/* If RoomHeader is used, add settings button to its right */}
            <RoomHeader
              roomName={currentRoomName}
              roomType={currentRoomType}
              isConnected={isConnected}
              isLoading={isLoading}
              onMenuToggle={() => setIsMobileMenuOpen(true)}
              onRetryConnection={retryConnection}
              user={{
                displayName: user.displayName || undefined,
                email: user.email || undefined
              }}
              onlineUsers={onlineUsers}
              onLogout={handleLogout}
              showUserList={showUserList}
              onToggleUserList={setShowUserList}
              showMobileCallPicker={showMobileCallPicker}
              onToggleMobileCallPicker={setShowMobileCallPicker}
              // initiateCall prop removed (not in RoomHeaderProps)
              webRTCCallStatus={webRTCCallStatus}
              className="md:mb-6"
            />
            {/* Settings Button for original header */}
            <button
              className="icon-btn ml-2"
              aria-label="User settings"
              title="User settings"
              onClick={() => setShowSettingsDialog(true)}
            >
              <UserIcon className="w-5 h-5" />
              <span className="tooltip">Settings</span>
            </button>
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
                                  title={webRTCCallStatus !== 'idle' ? 'Call in progress' : 'Voice Call'}
                                >
                                  <Phone size={20} />
                                  <span className="sr-only">
                                    {webRTCCallStatus !== 'idle' ? 'Call in progress' : 'Voice Call'}
                                  </span>
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
                                  title={webRTCCallStatus !== 'idle' ? 'Call in progress' : 'Video Call'}
                                >
                                  <Video size={20} />
                                  <span className="sr-only">
                                    {webRTCCallStatus !== 'idle' ? 'Call in progress' : 'Video Call'}
                                  </span>
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
              <div
                ref={messagesContainerRef}
                className="flex-1 glass-card rounded-none md:rounded-xl overflow-y-auto p-3 md:p-6 md:pb-6 pb-28 md:mb-6 relative scroll-smooth messages-container messages-scrollbar"
                style={{
                  scrollBehavior: 'smooth',
                  scrollSnapType: 'y proximity',
                }}
              >
                {/* Pull-to-refresh indicator */}
                <div
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full flex items-center justify-center refresh-indicator"
                  style={refreshIndicatorStyle}
                >
                  <div className={`w-8 h-8 rounded-full border-2 border-green-500 ${isRefreshing ? 'animate-spin border-t-transparent' : ''} ${isThresholdReached ? 'bg-green-500/20' : ''}`}>
                    {!isRefreshing && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
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

                {selectedThread ? (
                  <ThreadView
                    threadId={selectedThread.threadId}
                    parentMessage={selectedThread}
                    messages={messages.filter((m: any) => m.threadId === selectedThread.threadId)}
                    currentUser={{
                      uid: user.uid,
                      displayName: user.displayName || user.email || 'Anonymous',
                      photoURL: user.photoURL
                    }}
                    onClose={handleBackToChat}
                    onSendMessage={(content: string) => handleSendMessage(content, { threadId: selectedThread.threadId })}
                    onDeleteMessage={handleDeleteMessage}
                    onReply={handleReplyToMessage}
                    onExpire={handleExpire}
                    // FIX: ThreadView already supplies a string id
                    onThreadClick={handleOpenThread}
                  />
                ) : (
                  <div className="space-y-4 message-list" style={{ scrollSnapType: 'y proximity' }}>
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} style={{ scrollSnapAlign: 'end' }} />
                  </div>
                )}

                {/* Typing Indicators */}
                <TypingIndicator
                  roomId={currentRoomType === 'lobby' ? 'lobby' : currentRoomId || ''}
                  currentUserId={user.uid}
                  className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-2"
                />
              </div>

              {/* Input Area */}
              <div className="glass-card rounded-none md:rounded-xl p-3 md:p-4">
                <MessageInput
                  onSend={handleSendMessage}
                  onVoiceRecording={handleRecordingComplete}
                  onGifSelect={() => setShowGiphyPicker(true)}
                  replyToMessage={replyPreview}
                  onCancelReply={handleCancelReply}
                  currentUserId={user?.uid}
                  currentUserName={user?.displayName || user?.email || 'Anonymous'}
                  roomId={currentRoomType === 'lobby' ? 'lobby' : currentRoomId || undefined}
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
        <ImprovedVideoCallView />
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
        open={webRTCCallStatus === 'ringing'}
        callerName={callerUserName || 'Unknown User'}
        isVideo={true}
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
    </div>
  )
}