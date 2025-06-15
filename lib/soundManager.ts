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
            // Create audio context only when needed and after user interaction
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            // Resume audio context if suspended (required by browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Load all sounds
            await Promise.all([
                this.loadSound('message', '/sounds/message1.mp3'),
                this.loadSound('dm', '/sounds/dm1.mp3'),
                this.loadSound('call', '/sounds/call1.mp3')
            ]);

            this.isInitialized = true;
            console.log('Sound manager initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize audio context:', error);
            // Fallback to HTML5 audio
            this.initializeFallbackAudio();
        }
    }

    private initializeFallbackAudio() {
        try {
            // Create HTML5 audio elements as fallback
            const messageAudio = new Audio('/sounds/message1.mp3');
            const dmAudio = new Audio('/sounds/dm1.mp3');
            const callAudio = new Audio('/sounds/call1.mp3');

            this.audioCache.set('message', messageAudio);
            this.audioCache.set('dm', dmAudio);
            this.audioCache.set('call', callAudio);

            this.isInitialized = true;
            console.log('Fallback audio initialized');
        } catch (error) {
            console.warn('Failed to initialize fallback audio:', error);
        }
    }

    // Initialize on first user interaction
    public initializeOnUserInteraction() {
        if (this.isInitialized) return;

        const initOnInteraction = () => {
            this.initialize();
            // Remove listeners after first interaction
            document.removeEventListener('click', initOnInteraction);
            document.removeEventListener('keydown', initOnInteraction);
            document.removeEventListener('touchstart', initOnInteraction);
        };

        document.addEventListener('click', initOnInteraction);
        document.addEventListener('keydown', initOnInteraction);
        document.addEventListener('touchstart', initOnInteraction);
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
        if (!this.isInitialized) {
            console.warn(`Sound '${soundName}' not available or audio not initialized`);
            return;
        }

        // Check if settings allow sound
        if (!this.settings?.enabled) {
            return;
        }

        // Try Web Audio API first
        const sound = this.sounds[soundName];
        if (sound && this.audioContext) {
            try {
                const source = this.audioContext.createBufferSource();
                source.buffer = sound.buffer;

                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = volume * (this.settings?.volume || 1);

                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                source.start(0);
                return;
            } catch (error) {
                console.warn('Error playing sound with Web Audio API:', error);
            }
        }

        // Fallback to HTML5 audio
        const audioElement = this.audioCache.get(soundName);
        if (audioElement) {
            try {
                audioElement.volume = volume * (this.settings?.volume || 1);
                audioElement.currentTime = 0; // Reset to beginning
                audioElement.play().catch(error => {
                    console.warn(`Error playing fallback audio for ${soundName}:`, error);
                });
            } catch (error) {
                console.warn(`Error with fallback audio for ${soundName}:`, error);
            }
        } else {
            console.warn(`Sound '${soundName}' not available or audio not initialized`);
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

    public isReady(): boolean {
        return this.isInitialized;
    }

    public getStatus(): string {
        if (!this.isInitialized) return 'not initialized';
        if (this.audioContext?.state === 'suspended') return 'suspended';
        if (this.audioContext?.state === 'running') return 'running';
        return 'fallback mode';
    }

    stopAll() {
        this.audioCache.forEach(audio => {
            audio.pause()
            audio.currentTime = 0
        })
    }

    // Removed unused initAudioContext method
}

// Export singleton instance
export const soundManager = new SoundManager() 