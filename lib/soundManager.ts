interface SoundSettings {
    enabled: boolean
    messageSound: string
    callSound: string
    dmSound: string
    volume: number
}

interface Sound {
    buffer: AudioBuffer;
    name: string;
}

export class SoundManager {
    private audioContext: AudioContext | null = null;
    private sounds: Record<string, Sound> = {};
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

    updateSettings(newSettings: SoundSettings) {
        this.settings = newSettings
        // Only save to localStorage on client side
        if (typeof window !== 'undefined') {
            localStorage.setItem('soundSettings', JSON.stringify(newSettings))
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
            this.sounds[name] = {
                buffer: await this.audioContext.decodeAudioData(arrayBuffer),
                name: name
            };
        } catch (error) {
            console.warn(`Failed to load sound ${name}:`, error);
        }
    }

    public playSound(soundName: string, volume = 1): void {
        const sound = this.sounds[soundName];
        if (!this.isInitialized || !sound) {
            console.warn(`Sound '${soundName}' not available or audio not initialized`);
            return;
        }

        try {
            const source = this.audioContext!.createBufferSource();
            source.buffer = sound.buffer;

            const gainNode = this.audioContext!.createGain();
            gainNode.gain.value = volume * (this.settings?.volume || 1);

            source.connect(gainNode);
            gainNode.connect(this.audioContext!.destination);
            source.start(0);
        } catch (error) {
            console.error('Error playing sound:', error);
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

    // Fixed audio context initialization
    private initAudioContext(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.isInitialized = true;
        } catch (error) {
            console.error('AudioContext initialization failed:', error);
            this.isInitialized = false;
        }
    }
}

// Export singleton instance
export const soundManager = new SoundManager() 