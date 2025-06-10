// Audio testing and debugging utilities

export class AudioTestUtils {
    static async testAudioPlayback(src: string): Promise<boolean> {
        return new Promise((resolve) => {
            const audio = new Audio(src);

            const cleanup = () => {
                audio.removeEventListener('canplay', onCanPlay);
                audio.removeEventListener('error', onError);
                audio.removeEventListener('loadstart', onLoadStart);
            };

            const onCanPlay = () => {
                console.log('Audio can play:', src);
                cleanup();
                resolve(true);
            };

            const onError = (e: Event) => {
                console.error('Audio test failed:', e);
                cleanup();
                resolve(false);
            };

            const onLoadStart = () => {
                console.log('Audio loading started:', src);
            };

            audio.addEventListener('canplay', onCanPlay);
            audio.addEventListener('error', onError);
            audio.addEventListener('loadstart', onLoadStart);

            // Set loading timeout
            setTimeout(() => {
                console.warn('Audio test timeout for:', src);
                cleanup();
                resolve(false);
            }, 10000);

            audio.load();
        });
    }

    static async testMediaDevices(): Promise<{
        hasAudio: boolean;
        hasVideo: boolean;
        devices: MediaDeviceInfo[];
        permissions: {
            microphone: PermissionState;
            camera: PermissionState;
        };
    }> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(d => d.kind === 'audioinput');
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        let micPermission: PermissionState = 'prompt';
        let cameraPermission: PermissionState = 'prompt';

        try {
            const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            micPermission = micResult.state;
        } catch (e) {
            console.warn('Could not query microphone permission:', e);
        }

        try {
            const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
            cameraPermission = cameraResult.state;
        } catch (e) {
            console.warn('Could not query camera permission:', e);
        }

        return {
            hasAudio: audioDevices.length > 0,
            hasVideo: videoDevices.length > 0,
            devices,
            permissions: {
                microphone: micPermission,
                camera: cameraPermission
            }
        };
    }

    static async testAudioContext(): Promise<{
        supported: boolean;
        state: AudioContextState | null;
        sampleRate: number | null;
    }> {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            return {
                supported: true,
                state: audioContext.state,
                sampleRate: audioContext.sampleRate
            };
        } catch (e) {
            console.error('AudioContext not supported:', e);
            return {
                supported: false,
                state: null,
                sampleRate: null
            };
        }
    }

    static logStreamInfo(stream: MediaStream, name: string) {
        console.log(`Stream info for ${name}:`, {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().map(track => ({
                kind: track.kind,
                id: track.id,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                settings: track.getSettings(),
                constraints: track.getConstraints()
            }))
        });
    }

    static async runFullAudioDiagnostic(): Promise<void> {
        console.log('🔊 Running full audio diagnostic...');

        // Test media devices
        const deviceInfo = await this.testMediaDevices();
        console.log('📱 Media devices:', deviceInfo);

        // Test audio context
        const audioContextInfo = await this.testAudioContext();
        console.log('🎵 Audio context:', audioContextInfo);

        // Test browser audio support
        const audio = document.createElement('audio');
        console.log('🎼 Browser audio support:', {
            canPlayWebM: audio.canPlayType('audio/webm'),
            canPlayOgg: audio.canPlayType('audio/ogg'),
            canPlayMP3: audio.canPlayType('audio/mpeg'),
            canPlayWAV: audio.canPlayType('audio/wav'),
            canPlayAAC: audio.canPlayType('audio/aac')
        });

        // Test user media
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('🎤 User media test passed');
            this.logStreamInfo(stream, 'Test stream');
            stream.getTracks().forEach(track => track.stop());
        } catch (e) {
            console.error('🎤 User media test failed:', e);
        }

        console.log('✅ Audio diagnostic complete');
    }
}

// Global audio test function for debugging
if (typeof window !== 'undefined') {
    (window as any).runAudioDiagnostic = () => AudioTestUtils.runFullAudioDiagnostic();
    (window as any).testAudio = (src: string) => AudioTestUtils.testAudioPlayback(src);
} 