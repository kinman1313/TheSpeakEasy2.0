export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

interface HapticPattern {
    vibrate?: number[]
    duration?: number
}

const HAPTIC_PATTERNS: Record<HapticType, HapticPattern> = {
    light: { vibrate: [10], duration: 10 },
    medium: { vibrate: [20], duration: 20 },
    heavy: { vibrate: [30], duration: 30 },
    success: { vibrate: [10, 50, 10], duration: 70 },
    warning: { vibrate: [20, 100, 20], duration: 140 },
    error: { vibrate: [50, 50, 50], duration: 150 },
    selection: { vibrate: [5], duration: 5 }
}

class HapticManager {
    private isSupported: boolean = false
    private isEnabled: boolean = true

    constructor() {
        this.checkSupport()
        this.loadSettings()
    }

    private checkSupport(): void {
        // Only check support in browser environment
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            this.isSupported = false
            return
        }

        // Check for various haptic APIs
        this.isSupported = !!(
            'vibrate' in navigator ||
            'hapticFeedback' in navigator ||
            // @ts-expect-error - iOS specific
            window.DeviceMotionEvent?.requestPermission ||
            // @ts-expect-error - Android specific
            navigator.vibrate
        )
    }

    private loadSettings(): void {
        // Only access localStorage in browser environment
        if (typeof window === 'undefined') {
            return
        }

        try {
            const stored = localStorage.getItem('hapticSettings')
            if (stored) {
                const settings = JSON.parse(stored)
                this.isEnabled = settings.enabled ?? true
            }
        } catch (error) {
            console.warn('Failed to load haptic settings:', error)
        }
    }

    public saveSettings(): void {
        // Only access localStorage in browser environment
        if (typeof window === 'undefined') {
            return
        }

        try {
            localStorage.setItem('hapticSettings', JSON.stringify({
                enabled: this.isEnabled
            }))
        } catch (error) {
            console.warn('Failed to save haptic settings:', error)
        }
    }

    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled
        this.saveSettings()
    }

    public getEnabled(): boolean {
        return this.isEnabled
    }

    public isHapticSupported(): boolean {
        return this.isSupported
    }

    public async trigger(type: HapticType): Promise<void> {
        if (!this.isSupported || !this.isEnabled || typeof navigator === 'undefined') return

        const pattern = HAPTIC_PATTERNS[type]

        try {
            // Try modern Haptic API first (iOS Safari 14.5+)
            // @ts-expect-error
            if (navigator.hapticFeedback) {
                // @ts-expect-error
                await navigator.hapticFeedback.vibrate(this.mapToHapticType(type))
                return
            }

            // Try Web Vibration API
            if ('vibrate' in navigator && pattern.vibrate) {
                navigator.vibrate(pattern.vibrate)
                return
            }

            // Fallback for older devices
            this.fallbackHaptic(type)
        } catch (error) {
            console.warn('Haptic feedback failed:', error)
        }
    }

    private mapToHapticType(type: HapticType): string {
        const mapping: Record<HapticType, string> = {
            light: 'light',
            medium: 'medium',
            heavy: 'heavy',
            success: 'light',
            warning: 'medium',
            error: 'heavy',
            selection: 'light'
        }
        return mapping[type] || 'light'
    }

    private fallbackHaptic(type: HapticType): void {
        // Only use audio feedback in browser environment
        if (typeof window === 'undefined') {
            return
        }

        try {
            // Audio feedback as haptic fallback
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            // Different frequencies for different haptic types
            const frequencies: Record<HapticType, number> = {
                light: 200,
                medium: 150,
                heavy: 100,
                success: 300,
                warning: 250,
                error: 80,
                selection: 400
            }

            oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime)
            gainNode.gain.setValueAtTime(0.01, audioContext.currentTime) // Very quiet

            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.05) // 50ms
        } catch (error) {
            console.warn('Audio fallback failed:', error)
        }
    }

    // Convenience methods for common interactions
    public tap(): Promise<void> {
        return this.trigger('light')
    }

    public buttonPress(): Promise<void> {
        return this.trigger('medium')
    }

    public success(): Promise<void> {
        return this.trigger('success')
    }

    public error(): Promise<void> {
        return this.trigger('error')
    }

    public warning(): Promise<void> {
        return this.trigger('warning')
    }

    public selection(): Promise<void> {
        return this.trigger('selection')
    }
}

// Export singleton instance
export const haptics = new HapticManager()

// React hook for haptic feedback
export function useHaptics() {
    return {
        trigger: haptics.trigger.bind(haptics),
        tap: haptics.tap.bind(haptics),
        buttonPress: haptics.buttonPress.bind(haptics),
        success: haptics.success.bind(haptics),
        error: haptics.error.bind(haptics),
        warning: haptics.warning.bind(haptics),
        selection: haptics.selection.bind(haptics),
        isSupported: haptics.isHapticSupported(),
        isEnabled: haptics.getEnabled(),
        setEnabled: haptics.setEnabled.bind(haptics)
    }
} 