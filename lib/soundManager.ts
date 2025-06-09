interface SoundSettings {
    enabled: boolean
    messageSound: string
    callSound: string
    dmSound: string
    volume: number
}

const DEFAULT_SOUNDS = {
    message1: '/sounds/message1.mp3',
    message2: '/sounds/message2.mp3',
    message3: '/sounds/message3.mp3',
    message4: '/sounds/message4.mp3',
    call1: '/sounds/call1.mp3',
    call2: '/sounds/call2.mp3',
    call3: '/sounds/call3.mp3',
    dm1: '/sounds/dm1.mp3',
    dm2: '/sounds/dm2.mp3',
    dm3: '/sounds/dm3.mp3',
}

class SoundManager {
    private settings: SoundSettings | null = null
    private audioCache: Map<string, HTMLAudioElement> = new Map()

    constructor() {
        // Only load settings on client side
        if (typeof window !== 'undefined') {
            this.loadSettings()
        }
    }

    loadSettings() {
        try {
            // Check if we're on the client side
            if (typeof window === 'undefined') {
                // Set default settings for server side
                this.settings = {
                    enabled: true,
                    messageSound: 'message1',
                    callSound: 'call1',
                    dmSound: 'dm1',
                    volume: 0.7,
                }
                return
            }

            const stored = localStorage.getItem('soundSettings')
            if (stored) {
                this.settings = JSON.parse(stored)
            } else {
                this.settings = {
                    enabled: true,
                    messageSound: 'message1',
                    callSound: 'call1',
                    dmSound: 'dm1',
                    volume: 0.7,
                }
            }
        } catch (error) {
            console.error('Error loading sound settings:', error)
            // Fallback to default settings
            this.settings = {
                enabled: true,
                messageSound: 'message1',
                callSound: 'call1',
                dmSound: 'dm1',
                volume: 0.7,
            }
        }
    }

    updateSettings(settings: SoundSettings) {
        this.settings = settings
        // Only save to localStorage on client side
        if (typeof window !== 'undefined') {
            localStorage.setItem('soundSettings', JSON.stringify(settings))
        }
    }

    private getAudio(soundId: string): HTMLAudioElement | null {
        // Check if we're on the client side and have browser APIs
        if (typeof window === 'undefined' || typeof Audio === 'undefined') return null

        if (!this.settings?.enabled) return null

        const soundFile = DEFAULT_SOUNDS[soundId as keyof typeof DEFAULT_SOUNDS]
        if (!soundFile) return null

        if (!this.audioCache.has(soundId)) {
            const audio = new Audio(soundFile)
            this.audioCache.set(soundId, audio)
        }

        const audio = this.audioCache.get(soundId)!
        audio.volume = this.settings.volume
        return audio
    }

    playMessage() {
        if (!this.settings?.enabled) return
        const audio = this.getAudio(this.settings.messageSound)
        if (audio) {
            audio.currentTime = 0
            audio.play().catch(err => console.error('Error playing message sound:', err))
        }
    }

    playCall() {
        if (!this.settings?.enabled) return
        const audio = this.getAudio(this.settings.callSound)
        if (audio) {
            audio.currentTime = 0
            audio.play().catch(err => console.error('Error playing call sound:', err))
        }
    }

    playDM() {
        if (!this.settings?.enabled) return
        const audio = this.getAudio(this.settings.dmSound)
        if (audio) {
            audio.currentTime = 0
            audio.play().catch(err => console.error('Error playing DM sound:', err))
        }
    }

    stopAll() {
        this.audioCache.forEach(audio => {
            audio.pause()
            audio.currentTime = 0
        })
    }
}

// Export singleton instance
export const soundManager = new SoundManager() 