// components/audio/VoiceRecorderWrapper.tsx
import React from 'react'
import { VoiceRecorder } from './VoiceRecorder'

interface VoiceRecorderWrapperProps {
    onRecordingComplete: (audioBlob: Blob) => void
    onClose: () => void
}

const VoiceRecorderWrapper: React.FC<VoiceRecorderWrapperProps> = ({ onRecordingComplete, onClose }) => {
    return <VoiceRecorder onRecordingComplete={onRecordingComplete} onClose={onClose} />
}

export default VoiceRecorderWrapper
