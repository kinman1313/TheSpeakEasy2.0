"use client"

import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  PhoneIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from "@heroicons/react/24/solid"
import { useState } from "react"

interface CallControlsProps {
  onHangUp: () => void
  isVideo: boolean
}

const CallControls = ({ onHangUp, isVideo }: CallControlsProps) => {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo)

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
  }

  return (
    <div className="flex items-center justify-center space-x-4">
      <button
        onClick={toggleMute}
        className="rounded-full bg-gray-200 p-3 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        {isMuted ? <MicrophoneSlashIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
      </button>
      <button onClick={onHangUp} className="rounded-full bg-red-500 p-4 text-white hover:bg-red-600">
        <PhoneIcon className="h-5 w-5 rotate-135" />
      </button>
      <button
        onClick={toggleVideo}
        className="rounded-full bg-gray-200 p-3 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        {isVideoEnabled ? <VideoCameraIcon className="h-5 w-5" /> : <VideoCameraSlashIcon className="h-5 w-5" />}
      </button>
    </div>
  )
}

export default CallControls

