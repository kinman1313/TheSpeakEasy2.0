"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { rtdb } from '@/lib/firebase';
import { ref, set, onValue, push, off, remove, serverTimestamp } from 'firebase/database';

const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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
    if (!rtdb) {
      const err = new Error("RTDB not available");
      setSignalingError(err); setCallStatus("error"); throw err;
    }
    // Ensure any existing peer connection is closed before creating a new one
    if (peerConnection) {
      console.log("Closing existing peer connection before creating a new one in initializePeerConnection.");
      // peerConnection.close(); // This might be too aggressive if we're just re-initializing for a new call partner
    }

    const pc = new RTCPeerConnection(configuration);
    console.log(`RTCPeerConnection created for peer: ${peerId}`);

    pc.onicecandidate = (event) => {
      if (event.candidate && peerId) {
        const candidatePath = `signaling/${peerId}/iceCandidates/${currentUserId}`;
        const candidateRef = push(ref(rtdb, candidatePath));
        set(candidateRef, event.candidate.toJSON()).catch(e => {
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
    setPeerConnection(pc); // Set the new peer connection
    return pc;
  }, [callStatus, activeCallTargetUserId, callerUserId]); // Removed peerConnection from its own init deps.

  const resetCallState = useCallback(() => { // Wrapped in useCallback
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
    // Do not setPeerConnection(null) here, closePeerConnection handles it.
  }, [localStream, remoteStream]); // Dependencies for resetCallState

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
    if (!rtdb) { setSignalingError(new Error("RTDB not available")); throw new Error("RTDB not available"); }
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
    if (!currentUser) { setCallStatus('error'); setSignalingError(new Error("User not authenticated.")); return; }
    if (callStatus !== 'idle') {
      console.warn("Call attempt while not idle. Current status:", callStatus);
      setSignalingError(new Error(`Cannot start a new call. Current call status: ${callStatus}`));
      return;
    }
    clearOfferTimeout();

    const stream = await requestMediaPermissionsHandleErrors();
    if (!stream) { return; }

    setCallStatus('creatingOffer');
    setActiveCallTargetUserId(targetId);
    setActiveCallTargetUserName(targetName || "User");

    try {
      const pc = initializePeerConnection(currentUser.uid, targetId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);

      if (pc.localDescription) {
        await sendOffer(targetId, currentUser.uid, currentUser.displayName, pc.localDescription);

        offerTimeoutRef.current = setTimeout(async () => {
          console.warn(`No answer from ${targetName || targetId} within timeout.`);
          setSignalingError(new Error(`No answer from ${targetName || targetId}. Call timed out.`));
          const offerPath = `signaling/${targetId}/offer`; // Offer was for targetId  
          remove(ref(rtdb, offerPath)).catch(e => console.warn("Could not remove timed out offer", e));
          closePeerConnection(true, 'error');
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
    clearOfferTimeout(); // Clear any outgoing offer timeout from this client

    const stream = await requestMediaPermissionsHandleErrors();
    if (!stream) {
      declineCall(); // Auto-decline if permissions are not granted for an incoming call
      return;
    }

    try {
      const pc = initializePeerConnection(currentUser.uid, callerUserId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

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
    const currentCallerId = callerUserId; // Capture before reset
    setIncomingOffer(null);
    setCallerUserId(null);
    setCallerUserName(null);
    setCallStatus('idle'); // Or 'callDeclined' briefly

    if (!currentUser || !currentCallerId) {
      console.warn("Cannot decline call: no current user or caller ID captured.");
      return;
    }
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
    if (currentUser && peerToSignalHangUp) {
      console.log(`Sending callEnd signal to ${peerToSignalHangUp}`);
      const hangUpPath = `signaling/${peerToSignalHangUp}/callEnd/${currentUser.uid}`;
      try {
        await set(ref(rtdb, hangUpPath), { endedBy: currentUser.uid, timestamp: serverTimestamp() });
      } catch (e: any) {
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
    setCallStatus('requestingMedia');
    try {
      const constraints = audioOnly ? { video: false, audio: true } : { video: true, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    if (!currentUser) { setCallStatus('error'); setSignalingError(new Error("User not authenticated.")); return; }
    if (callStatus !== 'idle') {
      console.warn("Call attempt while not idle. Current status:", callStatus);
      setSignalingError(new Error(`Cannot start a new call. Current call status: ${callStatus}`));
      return;
    }
    clearOfferTimeout();

    const stream = await requestMediaPermissionsHandleErrors(true); // Audio only
    if (!stream) { return; }

    setCallStatus('creatingOffer');
    setActiveCallTargetUserId(targetId);
    setActiveCallTargetUserName(targetName || "User");

    try {
      const pc = initializePeerConnection(currentUser.uid, targetId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);

      if (pc.localDescription) {
        await sendOffer(targetId, currentUser.uid, currentUser.displayName, pc.localDescription);

        offerTimeoutRef.current = setTimeout(async () => {
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
    activeRTDBListeners.current.forEach(l => off(ref(rtdb, l.path), l.listener));
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
      const listener = onValue(dbRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();

        switch (pInfo.type) {
          case 'offer':
            const offerPayload = data as SignalingPayload;
            if (offerPayload.sdp && offerPayload.senderId && offerPayload.receiverId === currentUserId) {
              // Call Collision Handling: Option A (Ignore if not idle)
              if (callStatus === 'idle' || callStatus === 'callEnded' || callStatus === 'callDeclined') {
                console.log("Provider: Received offer:", offerPayload);
                // These are now passed to the callback for ChatApp to handle if needed,
                // but provider also sets its own state for incoming calls.
                onOfferReceivedCb({ type: 'offer', sdp: offerPayload.sdp }, offerPayload.senderId, offerPayload.senderName);
              } else {
                console.warn(`Provider: Ignoring incoming offer from ${offerPayload.senderId}, call status is: ${callStatus}`);
                // TODO: Optionally send a 'busy' signal back to offerPayload.senderId
                // For now, sender's offer timeout should handle this.
                // The offer will remain in RTDB until sender times out and removes it, or callee becomes idle and processes it (if not removed by sender).
              }
            }
            break;
          case 'answer':
            const answerPayload = data as SignalingPayload;
            if (answerPayload.sdp && answerPayload.senderId && answerPayload.receiverId === currentUserId) {
              console.log("Provider: Received answer:", answerPayload);
              clearOfferTimeout(); // Clear offer timeout on receiving an answer
              onAnswerReceivedCb({ type: 'answer', sdp: answerPayload.sdp }, answerPayload.senderId);
              remove(dbRef).catch(e => console.warn("Could not remove answer signal", e));
            }
            break;
          case 'iceCandidates':
            snapshot.forEach((senderSnapshot) => {
              if (senderSnapshot.key === activeCallTargetUserId || senderSnapshot.key === callerUserId) {
                const candidates = senderSnapshot.val();
                if (candidates) {
                  Object.values(candidates).forEach((candidate) => {
                    if ((candidate as RTCIceCandidate).candidate) {
                      onRemoteIceCandidateReceivedCb(candidate as RTCIceCandidateInit);
                    }
                  });
                  remove(senderSnapshot.ref).catch(e => console.warn("Could not remove ICE candidates for sender", e));
                }
              }
            });
            break;
          case 'callDeclined':
            snapshot.forEach((declinerSnapshot) => {
              const declineData = declinerSnapshot.val() as CallDeclinedPayload;
              console.log("Provider: Received call declined from:", declineData.declinedByUserId);
              clearOfferTimeout(); // Clear offer timeout if our call was declined
              onCallDeclinedReceivedCb(declineData.declinedByUserId, declineData.declinedByUserName);
              remove(declinerSnapshot.ref).catch(e => console.warn("Could not remove decline signal", e));
            });
            break;
          case 'callEnd':
            snapshot.forEach((enderSnapshot) => {
              console.log("Provider: Received call ended signal from:", enderSnapshot.key);
              onCallEndedSignalCb();
              remove(enderSnapshot.ref).catch(e => console.warn("Could not remove callEnd signal", e));
            });
            break;
        }
      }, (error) => { console.error(`Listener error for ${pInfo.path}:`, error); setSignalingError(error); });
      activeRTDBListeners.current.push({ path: pInfo.path, listener });
    });

    return () => {
      console.log("Cleaning up ALL signaling listeners for user:", currentUserId);
      activeRTDBListeners.current.forEach(l => off(ref(rtdb, l.path), l.listener));
      activeRTDBListeners.current = [];
    };
  }, [rtdb, callStatus, initializePeerConnection, activeCallTargetUserId, callerUserId, resetCallState]); // Added resetCallState


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
