"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { rtdb } from '@/lib/firebase';
import { ref, set, onValue, push, off, remove, serverTimestamp } from 'firebase/database';
import { registerUser, initiateSocketCall } from '@/lib/socket';
import { callNotifications, type CallNotificationOptions } from '@/lib/callNotifications';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'error'
  | 'callDeclined';

export interface SignalingPayload {
  type: 'offer' | 'answer';
  sdp: string | undefined;
  senderId: string;
  senderName?: string;
  receiverId: string;
  timestamp: Object;
}

export interface CallDeclinedPayload {
  declinedByUserId: string;
  declinedByUserName?: string;
  timestamp: Object;
}

interface WebRTCContextType {
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: CallStatus;
  activeCallTargetUserId: string | null;
  activeCallTargetUserName: string | null;
  incomingOffer: RTCSessionDescriptionInit | null;
  callerUserId: string | null;
  callerUserName: string | null;
  isLocalAudioMuted: boolean;
  isLocalVideoEnabled: boolean;
  cameraPermission: 'prompt' | 'granted' | 'denied';
  microphonePermission: 'prompt' | 'granted' | 'denied';
  signalingError: Error | null;
  setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  initializePeerConnection: (currentUserId: string, targetUserId: string) => RTCPeerConnection;
  initiateCall: (targetUserId: string, targetUserName?: string) => Promise<void>;
  initiateAudioCall: (targetUserId: string, targetUserName?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  toggleLocalAudio: () => void;
  toggleLocalVideo: () => void;
  requestMediaPermissions: (audioOnly?: boolean) => Promise<MediaStream | null>;
  sendOffer: (targetUserId: string, currentUserId: string, currentUserDisplayName: string | null | undefined, offer: RTCSessionDescriptionInit) => Promise<void>;
  sendAnswer: (callerUserId: string, currentUserId: string, currentUserDisplayName: string | null | undefined, answer: RTCSessionDescriptionInit) => Promise<void>;
  listenForSignalingMessages: (
    currentUserId: string,
    onOfferReceivedCb: (offer: RTCSessionDescriptionInit, fromUserId: string, fromUserName?: string) => void,
    onAnswerReceivedCb: (answer: RTCSessionDescriptionInit, fromUserId: string) => void,
    onRemoteIceCandidateReceivedCb: (candidate: RTCIceCandidateInit) => void,
    onCallDeclinedReceivedCb: (fromUserId: string, fromUserName?: string) => void,
    onCallEndedSignalCb: () => void
  ) => () => void;
  closePeerConnection: (isInitiator?: boolean, reason?: CallStatus) => void; // Added reason
  setCallStatus: (status: CallStatus) => void;
  hangUpCall: () => Promise<void>;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const useWebRTC = (): WebRTCContextType => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');

  const [activeCallTargetUserId, setActiveCallTargetUserId] = useState<string | null>(null);
  const [activeCallTargetUserName, setActiveCallTargetUserName] = useState<string | null>(null);

  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [callerUserId, setCallerUserId] = useState<string | null>(null);
  const [callerUserName, setCallerUserName] = useState<string | null>(null);

  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState<boolean>(false);
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState<boolean>(true);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [microphonePermission, setMicrophonePermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [signalingError, setSignalingError] = useState<Error | null>(null);

  const activeRTDBListeners = useRef<Array<{ path: string, listener: any }>>([]);
  const offerTimeoutRef = useRef<number | null>(null);
  const disconnectedTimeoutRef = useRef<number | null>(null);
  const callStatusRef = useRef<CallStatus>('idle');
  const currentNotificationId = useRef<string | null>(null);

  // Update ref when state changes
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Register user with socket server when user changes
  useEffect(() => {
    if (user?.uid) {
      registerUser(user.uid);

      // Listen for incoming Socket.IO call notifications
      const socket = require('@/lib/socket').getSocket();
      socket.on('incoming-call', (data: any) => {
        const { callerUserId, callerName, isVideo } = data;
        console.log('Received Socket.IO incoming call from:', callerName, 'with ID:', callerUserId);

        // Only process if we're idle and not already in a call
        if (callStatus === 'idle') {
          // Set caller information for immediate access
          setCallerUserId(callerUserId);
          setCallerUserName(callerName);

          // Start call notification immediately
          const notificationOptions: CallNotificationOptions = {
            callerName: callerName || 'Unknown User',
            isVideo: isVideo || false,
            onAnswer: () => {
              // Will be handled by accept call function
            },
            onDecline: () => {
              // Will be handled by decline call function
            }
          };

          callNotifications.startIncomingCall(notificationOptions).then(notificationId => {
            currentNotificationId.current = notificationId;
          });
        }
      });

      return () => {
        socket.off('incoming-call');
      };
    }

    // Return empty cleanup function if user is not available
    return () => { };
  }, [user?.uid, callStatus]);

  // Clean up any stale offers when component initializes
  useEffect(() => {
    if (user && rtdb && callStatus === 'idle') {
      const offerPath = `signaling/${user.uid}/offer`;
      remove(ref(rtdb, offerPath)).catch(e =>
        console.warn("Could not remove stale offer on init:", e)
      );
    }
  }, [user, rtdb]); // Only run when user or rtdb changes

  const clearOfferTimeout = () => {
    if (offerTimeoutRef.current) {
      window.clearTimeout(offerTimeoutRef.current);
      offerTimeoutRef.current = null;
    }
  };

  const clearDisconnectedTimeout = () => {
    if (disconnectedTimeoutRef.current) {
      window.clearTimeout(disconnectedTimeoutRef.current);
      disconnectedTimeoutRef.current = null;
    }
  };

  const initializePeerConnection = useCallback(
    (currentUserId: string, peerId: string): RTCPeerConnection => {
      if (!rtdb) {
        const err = new Error("RTDB not available");
        setSignalingError(err); setCallStatus("error"); throw err;
      }

      // Ensure any existing peer connection is closed before creating a new one
      if (peerConnection) {
        console.log("Closing existing peer connection before creating a new one in initializePeerConnection.");
        peerConnection.close();
      }

      // Enhanced ICE server configuration for better connectivity
      const enhancedConfiguration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.stunprotocol.org' }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      };

      const pc = new RTCPeerConnection(enhancedConfiguration);
      console.log(`RTCPeerConnection created for peer: ${peerId} with enhanced config`);

      pc.onicecandidate = (event) => {
        if (event.candidate && peerId) {
          console.log("Sending ICE candidate to", peerId, event.candidate);
          const candidatePath = `signaling/${peerId}/iceCandidates/${currentUserId}`;
          const candidateRef = push(ref(rtdb, candidatePath));
          set(candidateRef, {
            candidate: event.candidate.toJSON(),
            timestamp: serverTimestamp()
          }).catch(e => {
            console.error("Error sending ICE candidate:", e);
            setSignalingError(new Error(`Failed to send ICE candidate: ${e.message}`));
          });
        }
      };

      pc.ontrack = (event) => {
        console.log("Remote track received:", {
          trackKind: event.track.kind,
          streamCount: event.streams.length,
          trackId: event.track.id,
          trackLabel: event.track.label
        });

        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          console.log("Remote stream details:", {
            streamId: stream.id,
            trackCount: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            tracks: stream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState
            }))
          });

          // Ensure all tracks are enabled
          stream.getTracks().forEach(track => {
            track.enabled = true;
            console.log(`Enabled ${track.kind} track:`, track.id);
          });

          setRemoteStream(stream);

          // Play call connected sound
          if (callStatus === 'calling' || callStatus === 'ringing') {
            callNotifications.playCallConnectedSound();
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state changed: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
          // Stop any incoming call notifications
          if (currentNotificationId.current) {
            callNotifications.stopIncomingCall(currentNotificationId.current);
            currentNotificationId.current = null;
          }
        } else if (pc.connectionState === 'failed') {
          console.error('Connection failed, attempting to restart ICE');
          pc.restartIce();
        } else if (pc.connectionState === 'disconnected') {
          console.warn('Connection disconnected');
        } else if (pc.connectionState === 'closed') {
          console.log('Connection closed');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed') {
          console.error('ICE connection failed, restarting ICE');
          pc.restartIce();
        }
      };

      setPeerConnection(pc);
      return pc;
    },
    [peerConnection, rtdb, callStatus]
  );

  const resetCallState = useCallback(() => {
    console.log("Resetting call state");

    // Stop any active call notifications
    if (currentNotificationId.current) {
      callNotifications.stopIncomingCall(currentNotificationId.current);
      currentNotificationId.current = null;
    }

    setCallStatus('idle');
    setActiveCallTargetUserId(null);
    setActiveCallTargetUserName(null);
    setIncomingOffer(null);
    setCallerUserId(null);
    setCallerUserName(null);
    setSignalingError(null);
    clearOfferTimeout();
    clearDisconnectedTimeout();
  }, []);

  const closePeerConnection = useCallback((_isInitiatorCleanUp = false, reason?: CallStatus) => {
    console.log(`Closing peer connection and related state. Reason: ${reason || 'general cleanup'}`);

    // Stop any active call notifications
    if (currentNotificationId.current) {
      callNotifications.stopIncomingCall(currentNotificationId.current);
      currentNotificationId.current = null;
    }

    if (peerConnection) {
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      if (peerConnection.signalingState !== 'closed') {
        peerConnection.close();
      }
    }
    setPeerConnection(null);

    // Clean up local stream
    if (localStream) {
      localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setLocalStream(null);
    }

    // Clear remote stream
    setRemoteStream(null);

    resetCallState();

    if (reason) {
      setCallStatus(reason);
    }
  }, [peerConnection, localStream, resetCallState]);


  const sendOffer = async (targetUserId: string, currentUserId: string, currentUserName: string | null | undefined, offer: RTCSessionDescriptionInit) => {
    if (!rtdb) { setSignalingError(new Error("RTDB not available")); throw new Error("RTDB not available"); }
    const offerPath = `signaling/${targetUserId}/offer`;
    const payload: SignalingPayload = {
      type: 'offer', sdp: offer.sdp, senderId: currentUserId, senderName: currentUserName || "Anonymous",
      receiverId: targetUserId, timestamp: serverTimestamp()
    };
    try {
      await set(ref(rtdb, offerPath), payload);
      setCallStatus('calling');
    } catch (e: any) {
      console.error("Error sending offer:", e);
      setSignalingError(new Error(`Failed to send offer: ${e.message}`));
      setCallStatus('error');
    }
  };

  const sendAnswer = async (targetId: string, currentUserId: string, currentUserName: string | null | undefined, answer: RTCSessionDescriptionInit) => {
    if (!rtdb) { setSignalingError(new Error("RTDB not available")); throw new Error("RTDB not available"); }
    const answerPath = `signaling/${targetId}/answer`;
    const payload: SignalingPayload = {
      type: 'answer', sdp: answer.sdp, senderId: currentUserId, senderName: currentUserName || "Anonymous",
      receiverId: targetId, timestamp: serverTimestamp()
    };
    try {
      await set(ref(rtdb, answerPath), payload);
      // setCallStatus('active'); // Let onconnectionstatechange handle this
    } catch (e: any) {
      console.error("Error sending answer:", e);
      setSignalingError(new Error(`Failed to send answer: ${e.message}`));
      setCallStatus('error');
    }
  };

  const initiateCall = async (targetId: string, targetName?: string) => {
    if (!user) { setCallStatus('error'); setSignalingError(new Error("User not authenticated.")); return; }
    if (callStatus !== 'idle') {
      console.warn("Call attempt while not idle. Current status:", callStatus);
      setSignalingError(new Error(`Cannot start a new call. Current call status: ${callStatus}`));
      return;
    }
    clearOfferTimeout();

    // Play dialing sound
    callNotifications.playDialingSound();

    const stream = await requestMediaPermissionsHandleErrors();
    if (!stream) { return; }

    setCallStatus('calling');
    setActiveCallTargetUserId(targetId);
    setActiveCallTargetUserName(targetName || "User");

    try {
      const pc = initializePeerConnection(user.uid, targetId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);

      if (pc.localDescription) {
        await sendOffer(targetId, user.uid, user.displayName, pc.localDescription);

        // Send immediate Socket.IO notification to recipient
        initiateSocketCall(targetId, user.uid, user.displayName || 'Unknown User', true);

        offerTimeoutRef.current = window.setTimeout(async () => {
          console.warn(`No answer from ${targetName || targetId} within timeout.`);
          setSignalingError(new Error(`No answer from ${targetName || targetId}. Call timed out.`));
          const offerPath = `signaling/${targetId}/offer`; // Offer was for targetId  
          remove(ref(rtdb, offerPath)).catch((e: Error) => console.warn("Could not remove timed out offer", e));

          // Play call ended sound for timeout
          callNotifications.playCallEndedSound();

          closePeerConnection(true, 'error');
        }, 30000);
      } else throw new Error("Local description failed.");
    } catch (err: any) {
      console.error("Error initiating call (after media grant):", err);
      setSignalingError(err); setCallStatus('error');
      callNotifications.playCallEndedSound(); // Play error sound
      closePeerConnection(false, 'error');
    }
  };

  const acceptCall = async () => {
    if (!user || !incomingOffer || !callerUserId) {
      setSignalingError(new Error("Cannot accept: missing info.")); setCallStatus('error'); return;
    }

    // Stop incoming call notification
    if (currentNotificationId.current) {
      callNotifications.stopIncomingCall(currentNotificationId.current);
      currentNotificationId.current = null;
    }

    clearOfferTimeout(); // Clear any outgoing offer timeout from this client

    const stream = await requestMediaPermissionsHandleErrors();
    if (!stream) {
      declineCall(); // Auto-decline if permissions are not granted for an incoming call
      return;
    }

    try {
      const pc = initializePeerConnection(user.uid, callerUserId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      setCallStatus('connected');
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

      setCallStatus('connected');
      const answerDesc = await pc.createAnswer();
      await pc.setLocalDescription(answerDesc);

      if (pc.localDescription) {
        await sendAnswer(callerUserId, user.uid, user.displayName, pc.localDescription);
      } else throw new Error("Local description for answer failed.");

      setActiveCallTargetUserId(callerUserId);
      setActiveCallTargetUserName(callerUserName || "User");
      setIncomingOffer(null); setCallerUserId(null); setCallerUserName(null);
    } catch (err: any) {
      console.error("Error accepting call (after media grant):", err);
      setSignalingError(err); setCallStatus('error');
      callNotifications.playCallEndedSound();
      closePeerConnection(false, 'error');
    }
  };

  const declineCall = async () => {
    // Stop incoming call notification
    if (currentNotificationId.current) {
      callNotifications.stopIncomingCall(currentNotificationId.current);
      currentNotificationId.current = null;
    }

    const currentCallerId = callerUserId; // Capture before reset
    setIncomingOffer(null);
    setCallerUserId(null);
    setCallerUserName(null);
    setCallStatus('idle'); // Or 'callDeclined' briefly

    if (!user || !currentCallerId) {
      console.warn("Cannot decline call: no current user or caller ID captured.");
      return;
    }
    console.log(`Declining call from ${currentCallerId}`);
    try {
      const declinePath = `signaling/${currentCallerId}/callDeclined/${user.uid}`;
      await set(ref(rtdb, declinePath),
        { declinedByUserId: user.uid, declinedByUserName: user.displayName || "Anonymous", timestamp: serverTimestamp() } as CallDeclinedPayload
      );
      const offerPath = `signaling/${user.uid}/offer`;
      await remove(ref(rtdb, offerPath));
    } catch (err: any) {
      console.error("Error sending decline signal or removing offer:", err);
      setSignalingError(new Error(`Failed to properly decline call: ${err.message}`));
    }
  };

  const hangUpCall = async () => {
    console.log("Hang Up Call invoked.");

    // Stop any notifications
    if (currentNotificationId.current) {
      callNotifications.stopIncomingCall(currentNotificationId.current);
      currentNotificationId.current = null;
    }

    // Play call ended sound
    callNotifications.playCallEndedSound();

    const peerToSignalHangUp = activeCallTargetUserId || callerUserId;

    // Send hangup signal to the other party
    if (user && peerToSignalHangUp) {
      console.log(`Sending callEnd signal to ${peerToSignalHangUp}`);
      const hangUpPath = `signaling/${peerToSignalHangUp}/callEnd/${user.uid}`;
      try {
        await set(ref(rtdb, hangUpPath), { endedBy: user.uid, timestamp: serverTimestamp() });
      } catch (e: any) {
        console.error("Error sending hangUp signal:", e);
        setSignalingError(new Error(`Failed to send hang up signal: ${e.message}`));
      }
    }

    // Close our own connection and reset state
    const wasInitiator = !!activeCallTargetUserId;
    console.log("Hang Up: Closing local peer connection and resetting state");
    closePeerConnection(wasInitiator, 'idle');
  };

  const toggleLocalAudio = useCallback(() => {
    if (localStream) {
      const audioEnabled = !isLocalAudioMuted;
      localStream.getAudioTracks().forEach(track => track.enabled = audioEnabled);
      setIsLocalAudioMuted(!audioEnabled);
      console.log(`Local audio ${audioEnabled ? 'enabled' : 'disabled'}`);
    }
  }, [localStream, isLocalAudioMuted]);

  const toggleLocalVideo = useCallback(() => {
    if (localStream) {
      const videoEnabled = !isLocalVideoEnabled;
      localStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
      setIsLocalVideoEnabled(videoEnabled);
      console.log(`Local video ${videoEnabled ? 'enabled' : 'disabled'}`);
    }
  }, [localStream, isLocalVideoEnabled]);

  const checkMediaPermissions = async (): Promise<{ cam: PermissionState; mic: PermissionState }> => {
    let camState: PermissionState = 'prompt';
    let micState: PermissionState = 'prompt';
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const camResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
        camState = camResult.state;
        setCameraPermission(camResult.state);
        if (camResult.onchange) camResult.onchange = () => setCameraPermission(camResult.state);

        const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        micState = micResult.state;
        setMicrophonePermission(micResult.state);
        if (micResult.onchange) micResult.onchange = () => setMicrophonePermission(micResult.state);
      } else {
        console.warn("Permissions API not fully supported.");
      }
    } catch (error) {
      console.error("Error querying media permissions:", error);
    }
    return { cam: camState, mic: micState };
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      checkMediaPermissions();
    }
  }, []);

  const requestMediaPermissionsHandleErrors = async (audioOnly = false): Promise<MediaStream | null> => {
    const currentPermissions = await checkMediaPermissions();
    if (currentPermissions.mic === 'denied' || (!audioOnly && currentPermissions.cam === 'denied')) {
      setSignalingError(new Error("Camera/microphone access denied. Enable in browser settings."));
      setCallStatus('error');
      return null;
    }
    setCallStatus('calling');
    try {
      const constraints = audioOnly ?
        {
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        } :
        {
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        };

      console.log("Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Log track details
      stream.getTracks().forEach(track => {
        console.log(`Got ${track.kind} track:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });

      setLocalStream(stream);
      if (!audioOnly) setCameraPermission('granted');
      setMicrophonePermission('granted');
      setIsLocalVideoEnabled(!audioOnly); // Start with video disabled for audio calls
      return stream; // Return the stream directly
    } catch (err: any) {
      console.error("Error acquiring media:", err.name, err.message);
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setSignalingError(new Error("No camera/microphone found."));
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setSignalingError(new Error("Camera/microphone permission denied by user."));
      } else {
        setSignalingError(new Error(`Error accessing media: ${err.message}`));
      }
      setCameraPermission('denied');
      setMicrophonePermission('denied');
      setCallStatus('error');
      setLocalStream(null);
      return null;
    }
  };

  const initiateAudioCall = async (targetId: string, targetName?: string) => {
    if (!user) { setCallStatus('error'); setSignalingError(new Error("User not authenticated.")); return; }
    if (callStatus !== 'idle') {
      console.warn("Call attempt while not idle. Current status:", callStatus);
      setSignalingError(new Error(`Cannot start a new call. Current call status: ${callStatus}`));
      return;
    }
    clearOfferTimeout();

    const stream = await requestMediaPermissionsHandleErrors(true); // Audio only
    if (!stream) { return; }

    setCallStatus('calling');
    setActiveCallTargetUserId(targetId);
    setActiveCallTargetUserName(targetName || "User");

    try {
      const pc = initializePeerConnection(user.uid, targetId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);

      if (pc.localDescription) {
        await sendOffer(targetId, user.uid, user.displayName, pc.localDescription);

        // Send immediate Socket.IO notification to recipient
        initiateSocketCall(targetId, user.uid, user.displayName || 'Unknown User', false);

        offerTimeoutRef.current = window.setTimeout(async () => {
          console.warn(`No answer from ${targetName || targetId} within timeout.`);
          setSignalingError(new Error(`No answer from ${targetName || targetId}. Call timed out.`));
          const offerPath = `signaling/${targetId}/offer`; // Offer was for targetId  
          remove(ref(rtdb, offerPath)).catch(e => console.warn("Could not remove timed out offer", e));
          closePeerConnection(true, 'error');
        }, 30000);
      } else throw new Error("Local description failed.");
    } catch (err: any) {
      console.error("Error initiating audio call (after media grant):", err);
      setSignalingError(err); setCallStatus('error'); closePeerConnection(false, 'error');
    }
  };

  const listenForSignalingMessages = useCallback((
    currentUserId: string,
    onOfferReceivedCb: (offer: RTCSessionDescriptionInit, fromUserId: string, fromUserName?: string) => void,
    onAnswerReceivedCb: (answer: RTCSessionDescriptionInit, fromUserId: string) => void,
    onRemoteIceCandidateReceivedCb: (candidate: RTCIceCandidateInit) => void,
    onCallDeclinedReceivedCb: (fromUserId: string, fromUserName?: string) => void,
    onCallEndedSignalCb: () => void
  ): () => void => {
    if (!rtdb || !currentUserId) {
      console.error("RTDB not available or currentUserId missing for listenForSignalingMessages");
      return () => { };
    }

    // Detach any existing listeners before attaching new ones.
    activeRTDBListeners.current.forEach((listenerInfo: any) =>
      off(ref(rtdb, listenerInfo.path), listenerInfo.listener)
    );
    activeRTDBListeners.current = [];

    const paths = [
      { path: `signaling/${currentUserId}/offer`, type: 'offer' },
      { path: `signaling/${currentUserId}/answer`, type: 'answer' },
      { path: `signaling/${currentUserId}/iceCandidates`, type: 'iceCandidates' },
      { path: `signaling/${currentUserId}/callDeclined`, type: 'callDeclined' },
      { path: `signaling/${currentUserId}/callEnd`, type: 'callEnd' }
    ];

    paths.forEach(pInfo => {
      const dbRef = ref(rtdb, pInfo.path);
      const listener = onValue(dbRef, (snapshot: any) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();

        switch (pInfo.type) {
          case 'offer':
            const offerPayload = data as SignalingPayload;
            if (offerPayload.sdp && offerPayload.senderId && offerPayload.receiverId === currentUserId) {
              const currentCallStatus = callStatusRef.current;
              console.log(`Provider: Received offer from ${offerPayload.senderId}, current call status: ${currentCallStatus}`);

              if (currentCallStatus === 'idle' || currentCallStatus === 'ended' || currentCallStatus === 'callDeclined') {
                console.log("Provider: Processing incoming offer:", offerPayload);

                // Set incoming call state
                setIncomingOffer({ type: 'offer', sdp: offerPayload.sdp });
                setCallerUserId(offerPayload.senderId);
                setCallerUserName(offerPayload.senderName || 'Unknown User');
                setCallStatus('ringing');

                // Start call notification
                const notificationOptions: CallNotificationOptions = {
                  callerName: offerPayload.senderName || 'Unknown User',
                  isVideo: true, // We'll improve this detection later
                  onAnswer: () => {
                    // This will be handled by the accept call function
                  },
                  onDecline: () => {
                    // This will be handled by the decline call function
                  }
                };

                callNotifications.startIncomingCall(notificationOptions).then(notificationId => {
                  currentNotificationId.current = notificationId;
                });

                // Also call the callback for additional handling
                onOfferReceivedCb({ type: 'offer', sdp: offerPayload.sdp }, offerPayload.senderId, offerPayload.senderName);

                // Remove the offer from database after processing
                remove(dbRef).catch((e: Error) => console.warn("Could not remove processed offer", e));
              } else {
                console.warn(`Provider: Ignoring incoming offer from ${offerPayload.senderId}, call status is: ${currentCallStatus}`);
              }
            }
            break;
          case 'answer':
            const answerPayload = data as SignalingPayload;
            if (answerPayload.sdp && answerPayload.senderId && answerPayload.receiverId === currentUserId) {
              console.log("Provider: Received answer:", answerPayload);

              const currentCallStatus = callStatusRef.current;
              if (currentCallStatus === 'calling' || currentCallStatus === 'connected') {
                clearOfferTimeout();
                onAnswerReceivedCb({ type: 'answer', sdp: answerPayload.sdp }, answerPayload.senderId);
                remove(dbRef).catch((e: Error) => console.warn("Could not remove answer signal", e));
              } else {
                console.warn(`Provider: Ignoring answer in unexpected call status: ${currentCallStatus}`);
                remove(dbRef).catch((e: Error) => console.warn("Could not remove stale answer signal", e));
              }
            }
            break;
          case 'iceCandidates':
            snapshot.forEach((senderSnapshot: any) => {
              if (senderSnapshot.key === activeCallTargetUserId || senderSnapshot.key === callerUserId) {
                const candidates = senderSnapshot.val();
                if (candidates) {
                  Object.values(candidates).forEach((candidate) => {
                    if (
                      (candidate as RTCIceCandidate).candidate &&
                      (candidate as RTCIceCandidateInit).sdpMid !== null &&
                      (candidate as RTCIceCandidateInit).sdpMid !== undefined &&
                      (candidate as RTCIceCandidateInit).sdpMLineIndex !== null &&
                      (candidate as RTCIceCandidateInit).sdpMLineIndex !== undefined
                    ) {
                      console.log("Provider: Processing ICE candidate from", senderSnapshot.key);
                      onRemoteIceCandidateReceivedCb(candidate as RTCIceCandidateInit);
                    } else {
                      console.warn("Provider: Skipping invalid ICE candidate:", candidate);
                    }
                  });
                  remove(senderSnapshot.ref).catch((e: Error) => console.warn("Could not remove ICE candidates for sender", e));
                }
              }
            });
            break;
          case 'callDeclined':
            snapshot.forEach((declinerSnapshot: any) => {
              const declineData = declinerSnapshot.val() as CallDeclinedPayload;
              console.log("Provider: Received call declined from:", declineData.declinedByUserId);
              clearOfferTimeout();
              // Stop incoming call notification
              if (currentNotificationId.current) {
                callNotifications.stopIncomingCall(currentNotificationId.current);
                currentNotificationId.current = null;
              }
              onCallDeclinedReceivedCb(declineData.declinedByUserId, declineData.declinedByUserName);
              remove(declinerSnapshot.ref).catch((e: Error) => console.warn("Could not remove decline signal", e));
            });
            break;
          case 'callEnd':
            snapshot.forEach((enderSnapshot: any) => {
              console.log("Provider: Received call ended signal from:", enderSnapshot.key);
              // Stop incoming call notification
              if (currentNotificationId.current) {
                callNotifications.stopIncomingCall(currentNotificationId.current);
                currentNotificationId.current = null;
              }
              // Play call ended sound
              callNotifications.playCallEndedSound();
              closePeerConnection(false, 'idle');
              onCallEndedSignalCb();
              remove(enderSnapshot.ref).catch((e: Error) => console.warn("Could not remove callEnd signal", e));
            });
            break;
        }
      }, (error: Error) => { console.error(`Listener error for ${pInfo.path}:`, error); setSignalingError(error); });
      activeRTDBListeners.current.push({ path: pInfo.path, listener });
    });

    return () => {
      console.log("Cleaning up ALL signaling listeners for user:", currentUserId);
      activeRTDBListeners.current.forEach((listenerInfo: any) =>
        off(ref(rtdb, listenerInfo.path), listenerInfo.listener)
      );
      activeRTDBListeners.current = [];
    };
  }, [rtdb, initializePeerConnection, activeCallTargetUserId, callerUserId, peerConnection]);

  // Update ICE candidate handling
  useEffect(() => {
    if (!peerConnection) return;

    const handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        // Send candidate through Firebase
        const candidateRef = ref(rtdb, `calls/${activeCallTargetUserId}/candidate`);
        set(candidateRef, {
          type: 'candidate',
          candidate: event.candidate,
          from: user?.uid
        });
      }
    };

    const handleConnectionStateChange = () => {
      console.log('Connection state changed:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'disconnected' ||
        peerConnection.connectionState === 'closed') {
        setCallStatus('error');
      }
    };

    const handleIceConnectionStateChange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
    };

    peerConnection.addEventListener('icecandidate', handleIceCandidate);
    peerConnection.addEventListener('connectionstatechange', handleConnectionStateChange);
    peerConnection.addEventListener('iceconnectionstatechange', handleIceConnectionStateChange);

    return () => {
      peerConnection.removeEventListener('icecandidate', handleIceCandidate);
      peerConnection.removeEventListener('connectionstatechange', handleConnectionStateChange);
      peerConnection.removeEventListener('iceconnectionstatechange', handleIceConnectionStateChange);
    };
  }, [peerConnection, activeCallTargetUserId, user?.uid, rtdb]);

  // Update stream handling
  useEffect(() => {
    if (!peerConnection) return;

    const handleTrack = (event: RTCTrackEvent) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnection.addEventListener('track', handleTrack);

    return () => {
      peerConnection.removeEventListener('track', handleTrack);
    };
  }, [peerConnection]);

  const contextValue: WebRTCContextType = {
    peerConnection, localStream, remoteStream, callStatus,
    activeCallTargetUserId, activeCallTargetUserName,
    incomingOffer, callerUserId, callerUserName,
    isLocalAudioMuted, isLocalVideoEnabled,
    cameraPermission, microphonePermission,
    signalingError, setLocalStream, initializePeerConnection,
    initiateCall, initiateAudioCall, acceptCall, declineCall, hangUpCall,
    toggleLocalAudio, toggleLocalVideo,
    requestMediaPermissions: requestMediaPermissionsHandleErrors,
    sendOffer, sendAnswer, listenForSignalingMessages,
    closePeerConnection, setCallStatus,
  };

  return <WebRTCContext.Provider value={contextValue}>{children}</WebRTCContext.Provider>;
};
