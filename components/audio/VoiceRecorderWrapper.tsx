// components/audio/VoiceRecorderWrapper.tsx
import React from 'react'
import { VoiceRecorder } from './VoiceRecorder'

interface VoiceRecorderWrapperProps {
    onRecordingComplete: (audioBlob: Blob) => void
}

export default function VoiceRecorderWrapper({ onRecordingComplete }: VoiceRecorderWrapperProps) {
    return <VoiceRecorder onRecordingComplete={onRecordingComplete} />
}
