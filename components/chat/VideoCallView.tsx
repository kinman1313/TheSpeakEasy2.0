"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertTriangle, Phone } from 'lucide-react'; // Icons
import "@/styles/video-call.css"

// Updated CallStatus type to include all possible states
type CallStatus =
  | "idle"
  | "requestingMedia"
  | "creatingOffer"
  | "waitingForAnswer"
  | "receivingCall"
  | "processingOffer"
  | "creatingAnswer"
  | "processingAnswer"
  | "active"
  | "callEnded"
  | "callDeclined"
  | "connected"
  | "calling"
  | "ringing"
  | "error"

interface VideoCallViewProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  targetUserName: string | null;
  callStatus: CallStatus;
  isLocalAudioMuted: boolean;
  isLocalVideoEnabled: boolean;
  peerConnection: RTCPeerConnection | null;
  setRemoteStream: (stream: MediaStream | null) => void;
}

export default function VideoCallView({
  localStream,
  remoteStream,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  targetUserName,
  callStatus,
  isLocalAudioMuted,
  isLocalVideoEnabled,
  peerConnection,
  setRemoteStream,
}: VideoCallViewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<CallStatus>("idle");

  // Improved stream management
  useEffect(() => {
    if (remoteStream) {
      const audioTracks = remoteStream.getAudioTracks();
      const videoTracks = remoteStream.getVideoTracks();

      if (audioTracks.length > 0) {
        audioTracks[0].enabled = true;
      }

      if (videoTracks.length > 0) {
        videoTracks[0].enabled = true;
      }
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log("Local video stream set");
    }
  }, [localStream]);

  useEffect(() => {
    console.log("VideoCallView: Remote stream effect triggered", {
      hasRemoteStream: !!remoteStream,
      callStatus,
      remoteVideoRef: !!remoteVideoRef.current
    });

    if (remoteVideoRef.current && remoteStream) {
      console.log("VideoCallView: Setting remote video stream", {
        streamId: remoteStream.id,
        trackCount: remoteStream.getTracks().length,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });

      remoteVideoRef.current.srcObject = remoteStream;

      // Log video track details
      remoteStream.getVideoTracks().forEach((track, index) => {
        console.log(`Remote video track ${index}:`, {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings(),
          id: track.id,
          label: track.label
        });
      });

      // Ensure video element can play
      remoteVideoRef.current.onloadedmetadata = () => {
        console.log("Remote video metadata loaded");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.play().catch(error => {
            console.error("Error playing remote video:", error);
          });
        }
      };

      console.log("Remote video stream set");
    } else if (remoteVideoRef.current) {
      // Clear remote video if stream is null (e.g. call ended, other user turned off video)
      console.log("VideoCallView: Clearing remote video stream");
      remoteVideoRef.current.srcObject = null;
    }

    // Handle remote audio separately to ensure it plays
    if (remoteAudioRef.current && remoteStream) {
      console.log("VideoCallView: Setting remote audio stream");
      remoteAudioRef.current.srcObject = remoteStream;

      // Log audio tracks
      const audioTracks = remoteStream.getAudioTracks();
      console.log("Remote audio tracks:", audioTracks.map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings()
      })));

      // Ensure audio element is set up for playback
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.volume = 1.0;

      // Try to play the audio
      remoteAudioRef.current.play().catch(error => {
        console.error("Error playing remote audio:", error);
        // Try to play on user interaction
        const playAudio = () => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.play().catch(e => console.error("Failed to play audio on interaction:", e));
          }
          document.removeEventListener('click', playAudio);
          document.removeEventListener('touchstart', playAudio);
        };
        document.addEventListener('click', playAudio, { once: true });
        document.addEventListener('touchstart', playAudio, { once: true });
      });
    } else if (remoteAudioRef.current) {
      console.log("VideoCallView: Clearing remote audio stream");
      remoteAudioRef.current.srcObject = null;
    }
  }, [remoteStream]);

  const getCallStatusMessage = (): string => {
    switch (callStatus) {
      case 'requestingMedia': return `Requesting media for call with ${targetUserName || 'user'}...`;
      case 'creatingOffer': return `Calling ${targetUserName || 'user'}...`;
      case 'waitingForAnswer': return `Waiting for ${targetUserName || 'user'} to answer...`;
      case 'receivingCall': return `Incoming call from ${targetUserName || 'user'}...`; // targetUserName is caller here
      case 'processingOffer': return `Connecting to ${targetUserName || 'user'}...`;
      case 'creatingAnswer': return `Connecting...`;
      case 'processingAnswer': return `Connecting...`;
      case 'active': return `Connected to ${targetUserName || 'user'}`;
      case 'callDeclined': return `Call declined by ${targetUserName || 'user'}`;
      case 'callEnded': return "Call ended.";
      case 'error': return "Call error. Trying to reconnect or end call.";
      default: return `Call with ${targetUserName || 'user'}`;
    }
  };

  const handleCall = () => {
    setStatus("calling");
  };

  return (
    <div className="video-call-container">
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted />
        <video ref={remoteVideoRef} autoPlay />
      </div>
      <div className="controls">
        <Button onClick={handleCall}>
          <Phone />
        </Button>
      </div>
    </div>
  );
}
