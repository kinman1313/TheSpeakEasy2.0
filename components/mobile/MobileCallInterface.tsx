import React, { useState } from 'react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/lib/haptics';

interface MobileCallInterfaceProps {
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onEndCall: () => void;
  isInCall: boolean;
}

export const MobileCallInterface = ({ 
  onVoiceCall, 
  onVideoCall, 
  onEndCall, 
  isInCall 
}: MobileCallInterfaceProps) => {
  const { buttonPress, error } = useHaptics();

  const handleCall = (type: 'voice' | 'video') => {
    buttonPress();
    if (type === 'voice') onVoiceCall();
    else onVideoCall();
  };

  const handleEndCall = () => {
    error();
    onEndCall();
  };

  if (isInCall) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <Button
          onClick={handleEndCall}
          variant="destructive"
          size="lg"
          className="rounded-full p-4"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex space-x-4 p-4">
      <Button
        onClick={() => handleCall('voice')}
        variant="outline"
        size="lg"
        className="flex-1"
      >
        <Phone className="w-5 h-5 mr-2" />
        Voice Call
      </Button>
      <Button
        onClick={() => handleCall('video')}
        variant="default"
        size="lg"
        className="flex-1"
      >
        <Video className="w-5 h-5 mr-2" />
        Video Call
      </Button>
    </div>
  );
};