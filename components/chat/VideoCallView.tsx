"use client"

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertTriangle } from 'lucide-react'; // Icons
import { CallStatus } from '@/components/providers/WebRTCProvider'; // Import CallStatus type
import { cn } from '@/lib/utils';

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
}: VideoCallViewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    } else if (remoteVideoRef.current) {
      // Clear remote video if stream is null (e.g. call ended, other user turned off video)
      remoteVideoRef.current.srcObject = null;
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

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      {/* Status Message Area */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/80 text-foreground px-4 py-2 rounded-md text-sm shadow-lg">
        <p>{getCallStatusMessage()}</p>
      </div>

      {/* Video Area */}
      <div className="relative flex flex-col md:flex-row items-center justify-center w-full h-[calc(100%-10rem)] md:h-auto md:max-h-[80vh] gap-4">
        {/* Remote Video (Main View) */}
        {remoteStream && callStatus === 'active' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full md:max-w-[70vw] md:max-h-[80vh] object-contain rounded-lg border border-gray-700" />
        ) : (
          <div className={cn(
            "w-full h-full md:max-w-[70vw] md:max-h-[80vh] bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center",
            !remoteStream && callStatus === 'active' ? "animate-pulse" : "" // Pulse if active but no remote stream
          )}>
            {(!remoteStream && callStatus === 'active') && <p className="text-gray-400">Waiting for remote video...</p>}
            {(callStatus !== 'active' && callStatus !== 'error' && callStatus !== 'callEnded' && callStatus !== 'callDeclined') && <p className="text-gray-400">{targetUserName || 'Remote User'}</p>}
            {callStatus === 'error' && <AlertTriangle className="w-12 h-12 text-red-500" />}
          </div>
        )}

        {/* Local Video (Picture-in-Picture or Corner) */}
        {localStream && isLocalVideoEnabled && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-6 right-6 w-32 h-24 md:w-48 md:h-36 object-cover rounded-md border-2 border-blue-500 shadow-xl"
          />
        )}
         {/* Placeholder if local video is disabled */}
        {localStream && !isLocalVideoEnabled && (
           <div className="absolute bottom-6 right-6 w-32 h-24 md:w-48 md:h-36 bg-gray-800 rounded-md border-2 border-gray-600 flex items-center justify-center text-white text-xs">
             Camera Off
           </div>
        )}
      </div>

      {/* Controls Area */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-3 md:space-x-4 p-3 bg-background/80 rounded-full shadow-xl">
        <Button variant="outline" onClick={onToggleAudio} size="icon" className="rounded-full w-12 h-12 md:w-14 md:h-14">
          {isLocalAudioMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
          <span className="sr-only">{isLocalAudioMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
        </Button>
        <Button variant="outline" onClick={onToggleVideo} size="icon" className="rounded-full w-12 h-12 md:w-14 md:h-14">
          {isLocalVideoEnabled ? <VideoOff className="w-5 h-5 md:w-6 md:h-6" /> : <Video className="w-5 h-5 md:w-6 md:h-6" />}
          <span className="sr-only">{isLocalVideoEnabled ? 'Disable Video' : 'Enable Video'}</span>
        </Button>
        <Button variant="destructive" onClick={onEndCall} size="icon" className="rounded-full w-14 h-14 md:w-16 md:h-16">
          <PhoneOff className="w-6 h-6 md:w-7 md:h-7" />
          <span className="sr-only">End Call</span>
        </Button>
      </div>
    </div>
  );
}
