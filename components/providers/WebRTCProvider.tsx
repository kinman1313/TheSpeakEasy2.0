"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

const configuration = {
  iceServers: [ { urls: 'stun:stun.l.google.com:19302' } ],
};

export type CallStatus =
  | 'idle'
  | 'requestingMedia'
  | 'creatingOffer'
  | 'waitingForAnswer'
  | 'receivingCall'
  | 'processingOffer'
  | 'creatingAnswer'
  | 'processingAnswer'
  | 'active'
  | 'error'
  | 'callEnded'
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
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  toggleLocalAudio: () => void;
  toggleLocalVideo: () => void;
  requestMediaPermissions: () => Promise<boolean>;
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
  closePeerConnection: (isInitiator?: boolean, reason?: CallStatus) => void;
  setCallStatus: React.Dispatch<React.SetStateAction<CallStatus>>;
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
  const { user: currentUser } = useAuth();
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isInitialized, setIsInitialized] = useState(false);

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
  const offerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store Firebase functions for dynamic imports
  const firebaseFunctions = useRef<{
    rtdb: any;
    ref: any;
    set: any;
    onValue: any;
    push: any;
    off: any;
    remove: any;
    serverTimestamp: any;
  } | null>(null);

  // Initialize Firebase functions on client side only
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const [
          { rtdb },
          { ref, set, onValue, push, off, remove, serverTimestamp }
        ] = await Promise.all([
          import('@/lib/firebase'),
          import('firebase/database')
        ]);

        if (!rtdb) {
          console.error("RTDB not available");
          setSignalingError(new Error("Firebase Realtime Database not available"));
          return;
        }

        firebaseFunctions.current = {
          rtdb,
          ref,
          set,
          onValue,
          push,
          off,
          remove,
          serverTimestamp
        };

        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing WebRTC Firebase:", error);
        setSignalingError(new Error("Failed to initialize WebRTC Firebase"));
      }
    };

    initializeFirebase();
  }, []);

  const clearOfferTimeout = () => {
    if (offerTimeoutRef.current) {
      clearTimeout(offerTimeoutRef.current);
      offerTimeoutRef.current = null;
    }
  };

  const clearDisconnectedTimeout = () => {
    if (disconnectedTimeoutRef.current) {
      clearTimeout(disconnectedTimeoutRef.current);
      disconnectedTimeoutRef.current = null;
    }
  };

  const initializePeerConnection = useCallback((currentUserId: string, peerId: string): RTCPeerConnection => {
    if (!firebaseFunctions.current?.rtdb) {
      const err = new Error("RTDB not available");
      setSignalingError(err); setCallStatus("error"); throw err;
    }

    const { rtdb, ref, set, push } = firebaseFunctions.current;

    if (peerConnection) {
        console.log("Closing existing peer connection before creating a new one in initializePeerConnection.");
    }

    const pc = new RTCPeerConnection(configuration);
    console.log(`RTCPeerConnection created for peer: ${peerId}`);

    pc.onicecandidate = (event) => {
      if (event.candidate && peerId) {
        const candidatePath = `signaling/${peerId}/iceCandidates/${currentUserId}`;
        const candidateRef = push(ref(rtdb, candidatePath));
        set(candidateRef, event.candidate.toJSON()).catch((e: Error) => {
            console.error("Error sending ICE candidate:", e);
            setSignalingError(new Error(`Failed to send ICE candidate: ${e.message}`));
        });
      }
    };
    
    pc.ontrack = (event) => {
        console.log("Remote track received:", event.streams[0]);
        if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
        }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`Peer Connection State with ${peerId}: ${pc.connectionState}`);
      switch (pc.connectionState) {
        case 'connected':
          console.log(`WebRTC: Peer connection to ${peerId} established.`);
          clearDisconnectedTimeout();
          setCallStatus('active');
          setSignalingError(null);
          if (activeCallTargetUserId !== peerId && callerUserId !== peerId) {
            console.warn(`Connected to ${peerId}, but current active/caller is ${activeCallTargetUserId || callerUserId}`);
          }
          break;
        case 'disconnected':
          console.warn(`WebRTC: Peer connection to ${peerId} disconnected.`);
          clearDisconnectedTimeout();
          disconnectedTimeoutRef.current = setTimeout(() => {
            if (peerConnection?.connectionState === 'disconnected') {
              console.error(`WebRTC: Connection to ${peerId} timed out after disconnection.`);
              setSignalingError(new Error("Connection lost. Please try ending the call and starting again."));
              setCallStatus('error');
            }
          }, 15000);
          break;
        case 'failed':
          console.error(`WebRTC: Peer connection to ${peerId} failed.`);
          clearDisconnectedTimeout();
          if (callStatus !== 'callEnded' && callStatus !== 'idle' && callStatus !== 'callDeclined') {
            setSignalingError(new Error(`Call connection with ${peerId} failed.`));
            setCallStatus('error');
          }
          break;
        case 'closed':
          console.log(`WebRTC: Peer connection to ${peerId} closed.`);
          clearDisconnectedTimeout();
          if (callStatus !== 'idle' && callStatus !== 'callEnded' && callStatus !== 'callDeclined' && callStatus !== 'error') {
            console.warn(`WebRTC: Connection with ${peerId} closed unexpectedly. Current status: ${callStatus}`);
            setCallStatus('callEnded');
          }
          break;
        case 'new':
        case 'connecting':
          console.log(`WebRTC: Peer connection to ${peerId} is ${pc.connectionState}.`);
          clearDisconnectedTimeout();
          break;
        default:
          console.log(`WebRTC: Peer connection to ${peerId} state: ${pc.connectionState}.`);
          break;
      }
    };
    setPeerConnection(pc);
    return pc;
  }, [callStatus, activeCallTargetUserId, callerUserId, peerConnection]);

  const resetCallState = useCallback(() => {
    clearOfferTimeout();
    clearDisconnectedTimeout();
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    remoteStream?.getTracks().forEach(track => track.stop());
    setRemoteStream(null);

    setCallStatus('idle');
    setActiveCallTargetUserId(null);
    setActiveCallTargetUserName(null);
    setIncomingOffer(null);
    setCallerUserId(null);
    setCallerUserName(null);
    setIsLocalAudioMuted(false);
    setIsLocalVideoEnabled(true);
    setSignalingError(null);
  }, [localStream, remoteStream]);

  const closePeerConnection = useCallback((_isInitiatorCleanUp = false, reason?: CallStatus) => {
    console.log(`Closing peer connection and related state. Reason: ${reason || 'general cleanup'}`);

    if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        if (peerConnection.signalingState !== 'closed') {
            peerConnection.close();
        }
    }
    setPeerConnection(null);
    resetCallState();

    if (reason) {
        setCallStatus(reason);
    }
  }, [peerConnection, resetCallState]);

  const sendOffer = async (targetUserId: string, currentUserId: string, currentUserName: string | null | undefined, offer: RTCSessionDescriptionInit) => {
    if (!firebaseFunctions.current) { 
      setSignalingError(new Error("Firebase not initialized")); 
      throw new Error("Firebase not initialized"); 
    }
    
    const { rtdb, ref, set, serverTimestamp } = firebaseFunctions.current;
    
    const offerPath = `signaling/${targetUserId}/offer`;
    const payload: SignalingPayload = {
        type: 'offer', sdp: offer.sdp, senderId: currentUserId, senderName: currentUserName || "Anonymous",
        receiverId: targetUserId, timestamp: serverTimestamp()
    };
    try {
        await set(ref(rtdb, offerPath), payload);
        setCallStatus('waitingForAnswer');
    } catch (e: any) {
        console.error("Error sending offer:", e);
        setSignalingError(new Error(`Failed to send offer: ${e.message}`));
        setCallStatus('error');
    }
  };

  const sendAnswer = async (targetId: string, currentUserId: string, currentUserName: string | null | undefined, answer: RTCSessionDescriptionInit) => {
    if (!firebaseFunctions.current) { 
      setSignalingError(new Error("Firebase not initialized")); 
      throw new Error("Firebase not initialized"); 
    }
    
    const { rtdb, ref, set, serverTimestamp } = firebaseFunctions.current;
    
    const answerPath = `signaling/${targetId}/answer`;
    const payload: SignalingPayload = {
        type: 'answer', sdp: answer.sdp, senderId: currentUserId, senderName: currentUserName || "Anonymous",
        receiverId: targetId, timestamp: serverTimestamp()
    };
    try {
        await set(ref(rtdb, answerPath), payload);
    } catch (e: any) {
        console.error("Error sending answer:", e);
        setSignalingError(new Error(`Failed to send answer: ${e.message}`));
        setCallStatus('error');
    }
  };

  const requestMediaPermissionsHandleErrors = async (): Promise<boolean> => {
    const currentPermissions = await checkMediaPermissions();
    if (currentPermissions.cam === 'denied' || currentPermissions.mic === 'denied') {
        setSignalingError(new Error("Camera/microphone access denied. Enable in browser settings."));
        setCallStatus('error');
        return false;
    }
    setCallStatus('requestingMedia');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setCameraPermission('granted');
        setMicrophonePermission('granted');
        return true;
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
        return false;
    }
  };

  const initiateCall = async (targetId: string, targetName?: string) => {
    if (!currentUser) { setCallStatus('error'); setSignalingError(new Error("User not authenticated.")); return; }
    if (!isInitialized) { setCallStatus('error'); setSignalingError(new Error("WebRTC not initialized.")); return; }
    if (callStatus !== 'idle') {
      console.warn("Call attempt while not idle. Current status:", callStatus);
      setSignalingError(new Error(`Cannot start a new call. Current call status: ${callStatus}`));
      return;
    }
    clearOfferTimeout();

    const mediaAllowed = await requestMediaPermissionsHandleErrors();
    if (!mediaAllowed) { return; }

    if (!localStream) {
        console.error("Local stream not available after permission grant.");
        setSignalingError(new Error("Failed to acquire media stream."));
        setCallStatus('error');
        closePeerConnection(false, 'error');
        return;
    }

    setCallStatus('creatingOffer');
    setActiveCallTargetUserId(targetId);
    setActiveCallTargetUserName(targetName || "User");

    try {
      const pc = initializePeerConnection(currentUser.uid, targetId);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);

      if (pc.localDescription) {
        await sendOffer(targetId, currentUser.uid, currentUser.displayName, pc.localDescription);

        offerTimeoutRef.current = setTimeout(async () => {
          if (callStatus === 'waitingForAnswer' as CallStatus) {
            console.warn(`No answer from ${targetName || targetId} within timeout.`);
            setSignalingError(new Error(`No answer from ${targetName || targetId}. Call timed out.`));
            if (firebaseFunctions.current) {
              const { rtdb, ref, remove } = firebaseFunctions.current;
              const offerPath = `signaling/${targetId}/offer`;
              remove(ref(rtdb, offerPath)).catch((e: Error) => console.warn("Could not remove timed out offer", e));
            }
            closePeerConnection(true, 'error');
          }
        }, 30000);
      } else throw new Error("Local description failed.");
    } catch (err: any) {
      console.error("Error initiating call (after media grant):", err);
      setSignalingError(err); setCallStatus('error'); closePeerConnection(false, 'error');
    }
  };

  const acceptCall = async () => {
    if (!currentUser || !incomingOffer || !callerUserId) {
      setSignalingError(new Error("Cannot accept: missing info.")); setCallStatus('error'); return;
    }
    if (!isInitialized) { setCallStatus('error'); setSignalingError(new Error("WebRTC not initialized.")); return; }
    
    clearOfferTimeout();

    const mediaAllowed = await requestMediaPermissionsHandleErrors();
    if (!mediaAllowed) {
        declineCall();
        return;
    }

    if (!localStream) {
        console.error("Local stream not available after permission grant for acceptCall.");
        setSignalingError(new Error("Failed to acquire media stream for accepting call."));
        setCallStatus('error');
        closePeerConnection(false, 'error');
        return;
    }

    try {
      const pc = initializePeerConnection(currentUser.uid, callerUserId);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      setCallStatus('processingOffer');
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

      setCallStatus('creatingAnswer');
      const answerDesc = await pc.createAnswer();
      await pc.setLocalDescription(answerDesc);

      if (pc.localDescription) {
        await sendAnswer(callerUserId, currentUser.uid, currentUser.displayName, pc.localDescription);
      } else throw new Error("Local description for answer failed.");

      setActiveCallTargetUserId(callerUserId);
      setActiveCallTargetUserName(callerUserName || "User");
      setIncomingOffer(null); setCallerUserId(null); setCallerUserName(null);
    } catch (err: any) {
      console.error("Error accepting call (after media grant):", err);
      setSignalingError(err); setCallStatus('error'); closePeerConnection(false, 'error');
    }
  };

  const declineCall = async () => {
    const currentCallerId = callerUserId;
    setIncomingOffer(null);
    setCallerUserId(null);
    setCallerUserName(null);
    setCallStatus('idle');

    if (!currentUser || !currentCallerId || !firebaseFunctions.current) {
        console.warn("Cannot decline call: missing required data.");
        return;
    }
    
    const { rtdb, ref, set, remove, serverTimestamp } = firebaseFunctions.current;
    
    console.log(`Declining call from ${currentCallerId}`);
    try {
      const declinePath = `signaling/${currentCallerId}/callDeclined/${currentUser.uid}`;
      await set(ref(rtdb, declinePath),
        { declinedByUserId: currentUser.uid, declinedByUserName: currentUser.displayName || "Anonymous", timestamp: serverTimestamp() } as CallDeclinedPayload
      );
      const offerPath = `signaling/${currentUser.uid}/offer`;
      await remove(ref(rtdb, offerPath));
    } catch (err: any) {
        console.error("Error sending decline signal or removing offer:", err);
        setSignalingError(new Error(`Failed to properly decline call: ${err.message}`));
    }
  };

  const hangUpCall = async () => {
    console.log("Hang Up Call invoked.");
    const peerToSignalHangUp = activeCallTargetUserId || callerUserId;
    if (currentUser && peerToSignalHangUp && firebaseFunctions.current) {
        console.log(`Sending callEnd signal to ${peerToSignalHangUp}`);
        const hangUpPath = `signaling/${peerToSignalHangUp}/callEnd/${currentUser.uid}`;
        try {
            const { rtdb, ref, set, serverTimestamp } = firebaseFunctions.current;
            await set(ref(rtdb, hangUpPath), { endedBy: currentUser.uid, timestamp: serverTimestamp() });
        } catch (e:any) {
            console.error("Error sending hangUp signal:", e);
            setSignalingError(new Error(`Failed to send hang up signal: ${e.message}`));
        }
    }
    const wasInitiator = !!activeCallTargetUserId;
    closePeerConnection(wasInitiator, 'callEnded');
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
        if(camResult.onchange) camResult.onchange = () => setCameraPermission(camResult.state);

        const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        micState = micResult.state;
        setMicrophonePermission(micResult.state);
        if(micResult.onchange) micResult.onchange = () => setMicrophonePermission(micResult.state);
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

  const requestMediaPermissions = async (): Promise<boolean> => {
    return requestMediaPermissionsHandleErrors();
  };

  const listenForSignalingMessages = useCallback((
    currentUserId: string,
    onOfferReceivedCb: (offer: RTCSessionDescriptionInit, fromUserId: string, fromUserName?: string) => void,
    onAnswerReceivedCb: (answer: RTCSessionDescriptionInit, fromUserId: string) => void,
    onRemoteIceCandidateReceivedCb: (candidate: RTCIceCandidateInit) => void,
    onCallDeclinedReceivedCb: (fromUserId: string, fromUserName?: string) => void,
    onCallEndedSignalCb: () => void
  ) => {
    if (!firebaseFunctions.current) {
      console.error("Firebase not initialized for signaling");
      return () => {};
    }

    const { rtdb, ref, onValue, off } = firebaseFunctions.current;

    // Listen for offers
    const offerRef = ref(rtdb, `signaling/${currentUserId}/offer`);
    const offerListener = onValue(offerRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data && data.type === 'offer') {
        onOfferReceivedCb(data, data.senderId, data.senderName);
      }
    });

    // Listen for answers
    const answerRef = ref(rtdb, `signaling/${currentUserId}/answer`);
    const answerListener = onValue(answerRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data && data.type === 'answer') {
        onAnswerReceivedCb(data, data.senderId);
      }
    });

    // Listen for ICE candidates
    const iceCandidatesRef = ref(rtdb, `signaling/${currentUserId}/iceCandidates`);
    const iceCandidatesListener = onValue(iceCandidatesRef, (snapshot: any) => {
      const candidates = snapshot.val();
      if (candidates) {
        Object.values(candidates).forEach((candidateData: any) => {
          if (candidateData) {
            onRemoteIceCandidateReceivedCb(candidateData);
          }
        });
      }
    });

    // Listen for call declined
    const callDeclinedRef = ref(rtdb, `signaling/${currentUserId}/callDeclined`);
    const callDeclinedListener = onValue(callDeclinedRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        Object.values(data).forEach((declineData: any) => {
          if (declineData) {
            onCallDeclinedReceivedCb(declineData.declinedByUserId, declineData.declinedByUserName);
          }
        });
      }
    });

    // Listen for call ended
    const callEndRef = ref(rtdb, `signaling/${currentUserId}/callEnd`);
    const callEndListener = onValue(callEndRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        onCallEndedSignalCb();
      }
    });

    // Return cleanup function
    return () => {
      off(offerRef, offerListener);
      off(answerRef, answerListener);
      off(iceCandidatesRef, iceCandidatesListener);
      off(callDeclinedRef, callDeclinedListener);
      off(callEndRef, callEndListener);
    };
  }, []);

  const contextValue: WebRTCContextType = {
    peerConnection,
    localStream,
    remoteStream,
    callStatus,
    activeCallTargetUserId,
    activeCallTargetUserName,
    incomingOffer,
    callerUserId,
    callerUserName,
    isLocalAudioMuted,
    isLocalVideoEnabled,
    cameraPermission,
    microphonePermission,
    signalingError,
    setLocalStream,
    initializePeerConnection,
    initiateCall,
    acceptCall,
    declineCall,
    toggleLocalAudio,
    toggleLocalVideo,
    requestMediaPermissions,
    sendOffer,
    sendAnswer,
    listenForSignalingMessages,
    closePeerConnection,
    setCallStatus,
    hangUpCall,
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};
