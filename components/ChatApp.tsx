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
import VideoCallView from "@/components/chat/VideoCallView"
import VoiceRecorder from "@/components/chat/VoiceRecorder"
import AudioPlayer from "@/components/chat/AudioPlayer"
import GiphyPicker from "@/components/chat/GiphyPicker"
import UserProfileModal from "@/components/user/UserProfileModal" // Import UserProfileModal
import { uploadVoiceMessage } from "@/lib/storage"
import { Image as ImageIcon, User as UserIcon } from "lucide-react"; // Added UserIcon
import Image from "next/image" // Import Next.js Image component
import { cn } from "@/lib/utils" // Import cn utility function

// Initialize Firestore only if app is defined
const db = app ? getFirestore(app) : undefined

export default function ChatApp() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [textMessage, setTextMessage] = useState("")
  const [showGiphyPicker, setShowGiphyPicker] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false); // State for profile modal
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
          if (peerConnection && (peerConnection as RTCPeerConnection).signalingState === 'have-local-offer') {
            try {
              await (peerConnection as RTCPeerConnection).setRemoteDescription(new RTCSessionDescription(answer));
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
            (peerConnection as RTCPeerConnection).addIceCandidate(new RTCIceCandidate(candidate))
              .catch((e: Error) => console.error("Error adding received ICE candidate:", e));
          }
        },
        (fromUserId, fromUserName) => { // onCallDeclinedReceivedCb
            toast({
                title: "Call Declined",
                description: `${fromUserName || 'The other user'} declined the call.`,
            });
            // Note: These functions might not exist in the WebRTC context, will be handled in the provider
            // setActiveCallTargetUserId(null); // From WebRTCProvider, if exposed, or manage locally
            // setActiveCallTargetUserName(null); // From WebRTCProvider
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
    if (!textMessage.trim() || !user || isSending) return
    // Disable submit if isSending (already handled by button's disabled state, but good for direct calls)

    try {
      await sendMessage(textMessage, user)
      setTextMessage("")
    } catch (error) {
      // Error is handled by the useEffect for sendMessageError
    }
  }

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to send a voice message.", variant: "destructive" });
      return;
    }
    if (!audioBlob || audioBlob.size === 0) {
      toast({ title: "Recording Error", description: "Recorded audio is empty.", variant: "destructive" });
      return;
    }

    const uploadingToast = toast({ title: "Voice Message", description: "Uploading voice message..." });

    try {
      const downloadURL = await uploadVoiceMessage(user.uid, audioBlob);
      console.log("Voice message uploaded:", downloadURL, "Duration:", duration, "seconds");

      // Update toast to show sending
      uploadingToast.update && uploadingToast.update({
        id: uploadingToast.id,
        title: "Voice Message",
        description: "Sending voice message...",
      });

      // Call sendMessage with voice message details
      // Using an empty string for text, as the UI will primarily render the audio player
      await sendMessage("", user, {
        voiceMessageUrl: downloadURL,
        voiceMessageDuration: duration
      });

      toast({
        title: "Voice Message Sent",
        description: `Duration: ${duration}s.`,
        variant: "default"
      });

    } catch (error) { // Catches errors from upload or sendMessage (if sendMessage is modified to throw)
      console.error("Failed to send voice message:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not send voice message.";

      uploadingToast.update && uploadingToast.update({
        id: uploadingToast.id,
        title: "Failed to Send",
        description: errorMessage,
        variant: "destructive",
      });
      // If the toast doesn't have update (e.g. if first toast failed to show), show a new one
      if (!uploadingToast.update) {
        toast({
            title: "Failed to Send",
            description: errorMessage,
            variant: "destructive",
        });
      }
    }
  };

  const handleSelectGif = async (gifUrl: string) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to send a GIF.", variant: "destructive" });
      return;
    }
    try {
      await sendMessage("", user, { gifUrl });
      toast({ title: "GIF Sent!", variant: "default" });
    } catch (error) {
      console.error("Error sending GIF:", error);
      toast({ title: "Error Sending GIF", description: "Could not send the GIF.", variant: "destructive" });
    }
    setShowGiphyPicker(false);
  };

  const handleCloseGiphyPicker = () => {
    setShowGiphyPicker(false);
  };

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
    <> {/* Use Fragment to allow multiple top-level elements (modal and main layout) */}
    <div className="flex h-[calc(100vh-4rem)]">
      {/* User List Sidebar */}
      <div className="w-64 border-r bg-background hidden md:block p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
            <Avatar className="h-10 w-10">
                <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"}/>
                <AvatarFallback>{user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div>
                <p className="text-sm font-semibold">{user?.displayName || "Current User"}</p>
                <p className="text-xs text-muted-foreground">Edit Profile</p>
            </div>
        </div>
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
              <Button variant="default" onClick={acceptCall} className="flex-1 bg-green-600 hover:bg-green-700">Accept</Button>
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
                className={`px-3 py-2 rounded-lg ${ msg.gifUrl ? 'p-0 bg-transparent max-w-sm' : 'max-w-xs' } ${ // Special styling for GIF messages
                  msg.userId === user.uid
                    ? (msg.gifUrl ? '' : 'bg-primary text-primary-foreground')
                    : (msg.gifUrl ? '' : 'bg-muted')
                }`}
              >
                <p className="text-sm font-medium">{msg.userName}</p>
                {/* Conditional rendering for GIF, then voice, then text */}
                {msg.gifUrl ? (
                  <Image
                    src={msg.gifUrl}
                    alt="User GIF"
                    width={250} // Example width, adjust as needed
                    height={150} // Example height, adjust based on typical GIF aspect ratios
                    className="mt-1 rounded-md object-contain max-w-full"
                    unoptimized
                  />
                ) : msg.voiceMessageUrl ? (
                  <AudioPlayer
                    audioUrl={msg.voiceMessageUrl}
                    initialDuration={msg.voiceMessageDuration}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                )}
                <p className={cn("text-xs opacity-70 mt-1", msg.gifUrl ? "px-2 pb-1" : "")}> {/* Add padding back for timestamp if GIF */}
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
          <form onSubmit={handleFormSubmit} className="p-4 border-t bg-background">
            <div className="flex items-center gap-2">
              <Input
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                placeholder={firebaseStatus === "ready" ? "Type your message..." : "Chat unavailable"}
                disabled={firebaseStatus !== "ready" || isSending || webRTCCallStatus !== 'idle'}
                className="flex-1"
              />

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowGiphyPicker(true)}
                      disabled={firebaseStatus !== "ready" || isSending || webRTCCallStatus !== 'idle'}
                      aria-label="Send a GIF"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ImageIcon size={22} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Send GIF</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <VoiceRecorder
                onRecordingComplete={handleRecordingComplete}
                disabled={firebaseStatus !== "ready" || isSending || webRTCCallStatus !== 'idle'}
              />

              <Button
                type="submit"
                disabled={(!textMessage.trim() && !showGiphyPicker) || firebaseStatus !== "ready" || isSending || webRTCCallStatus !== 'idle'}
                aria-label="Send message"
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        </TooltipProvider>

        {showGiphyPicker && (
          <GiphyPicker
            onSelectGif={handleSelectGif}
            onClose={handleCloseGiphyPicker}
          />
        )}
      </div>
    </div>
    <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
    />
    </>
  )
}