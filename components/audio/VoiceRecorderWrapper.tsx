// components/audio/VoiceRecorderWrapper.tsx
import React from 'react'
import { VoiceRecorder } from './VoiceRecorder'

interface VoiceRecorderWrapperProps {
    onRecordingComplete: (audioBlob: Blob) => void
}

const VoiceRecorderWrapper: React.FC<VoiceRecorderWrapperProps> = ({ onRecordingComplete }) => {
    return <VoiceRecorder onRecordingComplete={onRecordingComplete} />
}

export default VoiceRecorderWrapper
