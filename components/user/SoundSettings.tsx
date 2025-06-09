"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Volume2, VolumeX, Play } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/toast'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { soundManager } from '@/lib/soundManager'

interface SoundOption {
    id: string
    name: string
    file: string
}

interface SoundSettings {
    enabled: boolean
    messageSound: string
    callSound: string
    dmSound: string
    volume: number
}

const MESSAGE_SOUNDS: SoundOption[] = [
    { id: 'message1', name: 'Classic', file: '/sounds/message1.mp3' },
    { id: 'message2', name: 'Soft Chime', file: '/sounds/message2.mp3' },
    { id: 'message3', name: 'Bubble Pop', file: '/sounds/message3.mp3' },
    { id: 'message4', name: 'Digital', file: '/sounds/message4.mp3' },
]

const CALL_SOUNDS: SoundOption[] = [
    { id: 'call1', name: 'Classic Ring', file: '/sounds/call1.mp3' },
    { id: 'call2', name: 'Modern', file: '/sounds/call2.mp3' },
    { id: 'call3', name: 'Gentle', file: '/sounds/call3.mp3' },
]

const DM_SOUNDS: SoundOption[] = [
    { id: 'dm1', name: 'Notification', file: '/sounds/dm1.mp3' },
    { id: 'dm2', name: 'Whisper', file: '/sounds/dm2.mp3' },
    { id: 'dm3', name: 'Alert', file: '/sounds/dm3.mp3' },
]

export function SoundSettings() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [soundSettings, setSoundSettings] = useState<SoundSettings>({
        enabled: true,
        messageSound: 'message1',
        callSound: 'call1',
        dmSound: 'dm1',
        volume: 0.7,
    })
    const [isSaving, setIsSaving] = useState(false)

    // Load user's sound settings
    useEffect(() => {
        if (!user) return

        const loadSettings = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid))
                if (userDoc.exists()) {
                    const data = userDoc.data()
                    if (data.soundSettings) {
                        setSoundSettings(data.soundSettings)
                    }
                }
            } catch (error) {
                console.error('Error loading sound settings:', error)
            }
        }

        loadSettings()
    }, [user])

    // Play sound preview
    const playSound = (soundFile: string) => {
        if (!soundSettings.enabled) {
            toast({
                title: "Sounds Disabled",
                description: "Enable sounds to preview",
            })
            return
        }

        const audio = new Audio(soundFile)
        audio.volume = soundSettings.volume
        audio.play().catch(err => {
            console.error('Error playing sound:', err)
            toast({
                title: "Error",
                description: "Could not play sound",
                variant: "destructive",
            })
        })
    }

    // Save settings to Firebase
    const saveSettings = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                soundSettings: soundSettings
            })

            // Store in localStorage for quick access
            localStorage.setItem('soundSettings', JSON.stringify(soundSettings))

            // Update soundManager with new settings
            soundManager.updateSettings(soundSettings)

            toast({
                title: "Settings Saved",
                description: "Your sound preferences have been updated",
            })
        } catch (error) {
            console.error('Error saving settings:', error)
            toast({
                title: "Error",
                description: "Failed to save settings",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleToggle = (enabled: boolean) => {
        setSoundSettings({ ...soundSettings, enabled })
    }

    const handleSoundChange = (type: 'messageSound' | 'callSound' | 'dmSound', value: string) => {
        setSoundSettings({ ...soundSettings, [type]: value })
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const volume = parseFloat(e.target.value)
        setSoundSettings({ ...soundSettings, volume })
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Sound Settings</h3>

                {/* Master toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                        {soundSettings.enabled ? (
                            <Volume2 className="h-5 w-5 text-indigo-400" />
                        ) : (
                            <VolumeX className="h-5 w-5 text-slate-400" />
                        )}
                        <Label htmlFor="sound-toggle" className="text-white cursor-pointer">
                            Enable Sounds
                        </Label>
                    </div>
                    <Switch
                        id="sound-toggle"
                        checked={soundSettings.enabled}
                        onCheckedChange={handleToggle}
                        className="data-[state=checked]:bg-indigo-500"
                    />
                </div>

                {/* Volume control */}
                <div className="space-y-2 mb-6">
                    <Label className="text-white">Volume</Label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={soundSettings.volume}
                            onChange={handleVolumeChange}
                            disabled={!soundSettings.enabled}
                            className="flex-1"
                            aria-label="Volume control"
                        />
                        <span className="text-sm text-slate-400 w-12">
                            {Math.round(soundSettings.volume * 100)}%
                        </span>
                    </div>
                </div>

                {/* Sound selections */}
                <div className={`space-y-4 ${!soundSettings.enabled ? 'opacity-50' : ''}`}>
                    {/* Message sound */}
                    <div className="space-y-2">
                        <Label className="text-white">Message Sound</Label>
                        <div className="flex gap-2">
                            <Select
                                value={soundSettings.messageSound}
                                onValueChange={(value) => handleSoundChange('messageSound', value)}
                                disabled={!soundSettings.enabled}
                            >
                                <SelectTrigger className="flex-1 glass text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass-card">
                                    {MESSAGE_SOUNDS.map((sound) => (
                                        <SelectItem key={sound.id} value={sound.id}>
                                            {sound.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    const sound = MESSAGE_SOUNDS.find(s => s.id === soundSettings.messageSound)
                                    if (sound) playSound(sound.file)
                                }}
                                disabled={!soundSettings.enabled}
                                className="text-indigo-400 hover:text-indigo-300"
                            >
                                <Play className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Call sound */}
                    <div className="space-y-2">
                        <Label className="text-white">Call Sound</Label>
                        <div className="flex gap-2">
                            <Select
                                value={soundSettings.callSound}
                                onValueChange={(value) => handleSoundChange('callSound', value)}
                                disabled={!soundSettings.enabled}
                            >
                                <SelectTrigger className="flex-1 glass text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass-card">
                                    {CALL_SOUNDS.map((sound) => (
                                        <SelectItem key={sound.id} value={sound.id}>
                                            {sound.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    const sound = CALL_SOUNDS.find(s => s.id === soundSettings.callSound)
                                    if (sound) playSound(sound.file)
                                }}
                                disabled={!soundSettings.enabled}
                                className="text-indigo-400 hover:text-indigo-300"
                            >
                                <Play className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* DM sound */}
                    <div className="space-y-2">
                        <Label className="text-white">Direct Message Sound</Label>
                        <div className="flex gap-2">
                            <Select
                                value={soundSettings.dmSound}
                                onValueChange={(value) => handleSoundChange('dmSound', value)}
                                disabled={!soundSettings.enabled}
                            >
                                <SelectTrigger className="flex-1 glass text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass-card">
                                    {DM_SOUNDS.map((sound) => (
                                        <SelectItem key={sound.id} value={sound.id}>
                                            {sound.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    const sound = DM_SOUNDS.find(s => s.id === soundSettings.dmSound)
                                    if (sound) playSound(sound.file)
                                }}
                                disabled={!soundSettings.enabled}
                                className="text-indigo-400 hover:text-indigo-300"
                            >
                                <Play className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Save button */}
                <Button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="w-full mt-6 glass hover:glass-darker"
                >
                    {isSaving ? "Saving..." : "Save Sound Settings"}
                </Button>
            </div>
        </div>
    )
} 