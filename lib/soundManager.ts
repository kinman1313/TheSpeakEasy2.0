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
    private audioContext: AudioContext | null = null;
    private sounds: { [key: string]: AudioBuffer } = {};
    private isInitialized = false;
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

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create audio context only when needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            // Load all sounds
            await Promise.all([
                this.loadSound('message', '/sounds/message.mp3'),
                this.loadSound('dm', '/sounds/dm.mp3'),
                this.loadSound('call', '/sounds/call.mp3')
            ]);

            this.isInitialized = true;
        } catch (error) {
            console.warn('Failed to initialize audio context:', error);
        }
    }

    private async loadSound(name: string, url: string) {
        try {
            if (!this.audioContext) {
                throw new Error('Audio context not initialized');
            }

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.sounds[name] = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.warn(`Failed to load sound ${name}:`, error);
        }
    }

    async playSound(name: string) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.audioContext || !this.sounds[name]) {
                console.warn(`Sound ${name} not available`);
                return;
            }

            const source = this.audioContext.createBufferSource();
            source.buffer = this.sounds[name];
            source.connect(this.audioContext.destination);
            source.start(0);
        } catch (error) {
            console.warn(`Error playing sound ${name}:`, error);
        }
    }

    playMessage() {
        this.playSound('message');
    }

    playDM() {
        this.playSound('dm');
    }

    playCall() {
        this.playSound('call');
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