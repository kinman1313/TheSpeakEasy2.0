"use client"

import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getFirestore } from "firebase/firestore" // Only getFirestore is needed here
import { app } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { isToday, isYesterday, format, isValid } from 'date-fns'
import { useMessages, Message } from "@/lib/hooks/useMessages"
import { useSendMessage } from "@/lib/hooks/useSendMessage"
import { useToggleReaction } from "@/lib/hooks/useToggleReaction"
import MessageReactions from "@/components/chat/MessageReactions"
import UserList from "@/components/UserList"
import { useWebRTC } from "@/components/providers/WebRTCProvider"
import VideoCallView from "@/components/chat/VideoCallView" // Import VideoCallView

// Initialize Firestore only if app is defined
const db = app ? getFirestore(app) : undefined

export default function ChatApp() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [textMessage, setTextMessage] = useState("") // Renamed from 'message' to avoid conflict with hook variable
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
    isLocalAudioMuted, // Added
    isLocalVideoEnabled, // Added
    toggleLocalAudio, // Added
    toggleLocalVideo, // Added
  } = useWebRTC();

  // Effect for WebRTC signaling listeners
  useEffect(() => {
    if (user && firebaseStatus === 'ready' && webRTCCallStatus !== 'active' && peerConnection === null) { // Only listen if user is logged in, firebase ready, and not already in an active call or setting up
      console.log("ChatApp: Setting up WebRTC signaling listeners for user:", user.uid);
      const cleanupListeners = listenForSignalingMessages(
        user.uid,
        (offer, fromUserId, fromUserName) => { // onOfferReceivedCb
          // This state update is handled by the provider now
          // setIncomingOfferSdp(offer);
          // setRemotePeerId(fromUserId);
          // setRemotePeerName(fromUserName || "User");
          // setWebRTCCallStatus('receivingCall');
          console.log(`ChatApp: Incoming call offer from ${fromUserName || fromUserId}`);
          toast({
            title: "Incoming Call",
            description: `Call from ${fromUserName || "Unknown User"}. Check call UI.`,
          });
        },
        async (answer, fromUserId) => { // onAnswerReceivedCb
          console.log(`ChatApp: Received answer from ${fromUserId}`);
          if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
            try {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
              // Call status should ideally be updated to 'active' by 'onconnectionstatechange'
              // or within the provider after answer is set.
              // setWebRTCCallStatus('active'); // Not strictly needed here if provider handles it
            } catch (error) {
              console.error("Error setting remote description from answer:", error);
              toast({ title: "Call Error", description: "Failed to connect (answer processing).", variant: "destructive" });
              setCallStatus('error');
            }
          } else {
            console.warn("Received answer but not in 'have-local-offer' state or no peerConnection.");
          }
        },
        (candidate) => { // onRemoteIceCandidateReceivedCb
          console.log("ChatApp: Received remote ICE candidate");
          if (peerConnection && candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
              .catch(e => console.error("Error adding received ICE candidate:", e));
          }
        },
        (fromUserId, fromUserName) => { // onCallDeclinedReceivedCb
            toast({
                title: "Call Declined",
                description: `${fromUserName || 'The other user'} declined the call.`,
            });
            setActiveCallTargetUserId(null); // From WebRTCProvider, if exposed, or manage locally
            setActiveCallTargetUserName(null); // From WebRTCProvider
            closePeerConnection(); // This should reset callStatus to idle
        },
        () => { // onCallEndedSignalCb
          toast({ title: "Call Ended", description: "The other user ended the call." });
          closePeerConnection();
        }
      );
      return cleanupListeners; // Cleanup on unmount or when deps change
    }
  }, [user, firebaseStatus, listenForSignalingMessages, peerConnection, toast, setCallStatus, closePeerConnection, webRTCCallStatus]);


  // Effect to check Firebase initialization status (app and db)
  useEffect(() => {
    if (app && db) {
      setFirebaseStatus("ready")
    } else {
      console.error("Firebase app or Firestore db is not initialized.")
      setFirebaseStatus("error")
    }
  }, []) // Run once on mount

  // Effect to handle errors from useMessages hook
  useEffect(() => {
    if (messagesError) {
      console.error("Error from useMessages hook:", messagesError)
      toast({
        title: "Chat Error",
        description: messagesError.message || "Could not load messages. Please try refreshing.",
        variant: "destructive",
      })
      // Optionally, set firebaseStatus to 'error' if message subscription is critical
      // setFirebaseStatus("error");
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

  // Scroll to bottom when messages change (from useMessages hook)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textMessage.trim() || !user) return // Basic check, hook also checks firebaseStatus

    try {
      await sendMessage(textMessage, user)
      setTextMessage("") // Clear input on successful send
    } catch (error) {
      // Error is already handled by the useEffect for sendMessageError and toast
      // console.error is also in the hook
    }
  }

  // Display loading UI
  if (firebaseStatus === "initializing") {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-lg">Initializing chat...</p>
      </div>
    )
  }

  // Display Firebase error UI
  if (firebaseStatus === "error") {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-lg text-destructive">
          Error: Could not connect to chat services. Please try again later.
        </p>
      </div>
    )
  }

  // Display sign-in prompt if Firebase is ready but user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-lg">Please sign in to use the chat</p>
      </div>
    )
  }

  // Main chat UI (Firebase ready and user authenticated)
  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Changed to flex-row implicitly by children */}
      {/* User List Sidebar */}
      <div className="w-64 border-r bg-background hidden md:block">
        <UserList />
      </div>

      {/* Chat Area & Video Area */}
      <div className="flex flex-col flex-1 relative">
        {/* Video Call View - Renders when callStatus is not 'idle' or 'error' (unless specific error handling in VideoCallView) */}
        {webRTCCallStatus !== 'idle' && webRTCCallStatus !== 'error' && webRTCCallStatus !== 'callEnded' && webRTCCallStatus !== 'callDeclined' && (
          <VideoCallView
            localStream={localStream}
            remoteStream={remoteStream}
            onToggleAudio={toggleLocalAudio}
            onToggleVideo={toggleLocalVideo}
            onEndCall={hangUpCall}
            targetUserName={activeCallTargetUserName || callerUserName} // Show appropriate name
            callStatus={webRTCCallStatus}
            isLocalAudioMuted={isLocalAudioMuted}
            isLocalVideoEnabled={isLocalVideoEnabled}
          />
        )}

        {/* Outgoing Call Status Indicator (retained for non-video-view states or as an alternative) */}
        {/* This might be redundant if VideoCallView handles all these states well. */}
        {/* For now, let's keep it but ensure it doesn't visually clash with VideoCallView. */}
        {/* Or, VideoCallView could be passed these specific messages. */}
        {/* For this step, VideoCallView handles its own status display so this can be simplified/removed. */}
        {/* Let's remove this specific banner as VideoCallView will show status */}

        {/* Incoming Call Notification (Modal or Banner) - This specific UI is outside VideoCallView */}
        {webRTCCallStatus === 'receivingCall' && callerUserName && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 bg-card border-border border rounded-lg shadow-xl z-[60]"> {/* Higher z-index */}
            <p className="text-center font-semibold text-lg mb-1">Incoming Call</p>
            <p className="text-center text-muted-foreground mb-4">From {callerUserName}</p>
            <div className="flex justify-around gap-3">
              <Button variant="success" onClick={acceptCall} className="flex-1">Accept</Button>
              <Button variant="destructive" onClick={declineCall} className="flex-1">Decline</Button>
            </div>
          </div>
        )}

        {/* Message List - Conditionally apply styles if VideoCallView is active */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-4
          ${(webRTCCallStatus !== 'idle' && webRTCCallStatus !== 'error' && webRTCCallStatus !== 'callEnded' && webRTCCallStatus !== 'callDeclined' && (localStream || remoteStream))
            ? 'opacity-10 blur-sm pointer-events-none' // Example: Blur chat when video view is active
            : ''
          }`}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                msg.userId === user.uid ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.userPhotoURL || ""} />
                <AvatarFallback>{msg.userName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div
                className={`px-3 py-2 rounded-lg max-w-xs ${
                  msg.userId === user.uid
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm font-medium">{msg.userName}</p>
                <p className="whitespace-pre-wrap break-words">{msg.text}</p> {/* Style for text wrapping */}
                <p className="text-xs opacity-70 mt-1">
                  {(() => {
                    if (msg.timestamp && typeof msg.timestamp.toDate === 'function') {
                      const date = msg.timestamp.toDate();
                      if (isValid(date)) {
                        if (isToday(date)) {
                          return format(date, 'p');
                        }
                        if (isYesterday(date)) {
                          return `Yesterday ${format(date, 'p')}`;
                        }
                        return format(date, 'Pp');
                      }
                    }
                    return msg.id ? "Invalid date" : "Sending...";
                  })()}
                </p>
                {/* Render MessageReactions component */}
                <MessageReactions
                  messageId={msg.id}
                  currentReactions={msg.reactions}
                  userId={user.uid}
                  toggleReaction={toggleReaction}
                  isUpdatingReaction={isUpdatingReaction}
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <TooltipProvider delayDuration={300}>
          <form onSubmit={handleFormSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder={firebaseStatus === "ready" ? "Type your message..." : (firebaseStatus === "initializing" ? "Connecting to chat..." : "Chat unavailable")}
                    disabled={firebaseStatus !== "ready" || isSending}
                  />
                </TooltipTrigger>
                {(firebaseStatus !== "ready" || isSending) && (
                  <TooltipContent>
                    <p>{isSending ? "Sending message..." : (firebaseStatus === "initializing" ? "Connecting to chat..." : "Chat is currently unavailable")}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="submit" disabled={!textMessage.trim() || firebaseStatus !== "ready" || isSending}>
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </TooltipTrigger>
                {(firebaseStatus !== "ready" || isSending) && (
                  <TooltipContent>
                     <p>{isSending ? "Message is sending" : (firebaseStatus === "initializing" ? "Connecting to chat..." : "Chat is currently unavailable")}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </form>
        </TooltipProvider>
      </div>
    </div>
  )
}