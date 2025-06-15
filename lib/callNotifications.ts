import { mobileNotifications } from './mobileNotifications'
import { haptics } from './haptics'

export interface CallNotificationOptions {
  callerName: string
  callerPhotoURL?: string
  isVideo?: boolean
  duration?: number
  onAnswer?: () => void
  onDecline?: () => void
}

class CallNotificationManager {
  private ringtone: HTMLAudioElement | null = null
  private isRinging = false
  private vibrationInterval: number | null = null
  private soundInterval: number | null = null
  private currentNotificationId: string | null = null

  constructor() {
    this.setupAudioElements()
  }

  private setupAudioElements(): void {
    if (typeof window === 'undefined') return

    // Create ringtone audio element
    this.ringtone = new Audio('/sounds/call1.mp3')
    this.ringtone.loop = true
    this.ringtone.volume = 0.8
    
    // Preload audio
    this.ringtone.load()
  }

  public async startIncomingCall(options: CallNotificationOptions): Promise<string> {
    console.log('Starting incoming call notification for:', options.callerName)
    
    const notificationId = `call-${Date.now()}`
    this.currentNotificationId = notificationId
    this.isRinging = true

    // Start ringtone
    await this.startRingtone()

    // Start vibration pattern
    this.startVibration()

    // Show system notification
    await this.showSystemNotification(options)

    // Show mobile notification with actions
    await mobileNotifications.showCall(options.callerName, options.isVideo)

    return notificationId
  }

  private async startRingtone(): Promise<void> {
    if (!this.ringtone || this.isRinging === false) return

    try {
      // Try to play the ringtone
      await this.ringtone.play()
      console.log('Ringtone started')
    } catch (error) {
      console.warn('Could not play ringtone:', error)
      // Fallback to system beep if available
      this.fallbackSound()
    }
  }

  private startVibration(): void {
    if (!navigator.vibrate) return

    // Create a repeating vibration pattern
    const vibratePattern = [300, 200, 300, 200, 300, 500] // Strong vibration pattern
    
    const vibrate = () => {
      if (this.isRinging && navigator.vibrate) {
        navigator.vibrate(vibratePattern)
      }
    }

    vibrate() // Start immediately
    this.vibrationInterval = window.setInterval(vibrate, 2000) // Repeat every 2 seconds
  }

  private fallbackSound(): void {
    // Create fallback beep using Web Audio API
    if (typeof window === 'undefined') return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      const beep = () => {
        if (!this.isRinging) return

        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800 // 800Hz tone
        gainNode.gain.value = 0.3
        
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2) // 200ms beep
      }

      beep() // Initial beep
      this.soundInterval = window.setInterval(beep, 1000) // Beep every second
    } catch (error) {
      console.warn('Could not create fallback sound:', error)
    }
  }

  private async showSystemNotification(options: CallNotificationOptions): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    // Request permission if needed
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    if (Notification.permission === 'granted') {
      const notificationOptions: NotificationOptions = {
        body: `${options.callerName} is calling you`,
        icon: options.callerPhotoURL || '/icons/call-icon.png',
        tag: 'incoming-call',
        requireInteraction: true
      }

      // Add actions if supported
      if ('actions' in Notification.prototype) {
        (notificationOptions as any).actions = [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' }
        ]
      }

      const notification = new Notification(
        `Incoming ${options.isVideo ? 'Video' : 'Voice'} Call`,
        notificationOptions
      )

      notification.onclick = () => {
        window.focus()
        if (options.onAnswer) options.onAnswer()
        notification.close()
      }
    }
  }

  public stopIncomingCall(notificationId?: string): void {
    if (notificationId && notificationId !== this.currentNotificationId) {
      return // Different notification, ignore
    }

    console.log('Stopping incoming call notification')
    this.isRinging = false
    this.currentNotificationId = null

    // Stop ringtone
    if (this.ringtone) {
      this.ringtone.pause()
      this.ringtone.currentTime = 0
    }

    // Stop vibration
    if (this.vibrationInterval) {
      window.clearInterval(this.vibrationInterval)
      this.vibrationInterval = null
    }

    // Stop fallback sound
    if (this.soundInterval) {
      window.clearInterval(this.soundInterval)
      this.soundInterval = null
    }

    // Stop system vibration
    if (navigator.vibrate) {
      navigator.vibrate(0)
    }

    // Clear mobile notification
    mobileNotifications.clearNotification('call')
  }

  public playCallConnectedSound(): void {
    this.playSound('/sounds/dm1.mp3', 0.5)
  }

  public playCallEndedSound(): void {
    this.playSound('/sounds/dm2.mp3', 0.5)
  }

  public playDialingSound(): void {
    // Play a short beep to indicate call is being placed
    this.playSound('/sounds/call2.mp3', 0.3, false)
  }

  private playSound(src: string, volume: number = 0.5, loop: boolean = false): void {
    if (typeof window === 'undefined') return

    try {
      const audio = new Audio(src)
      audio.volume = volume
      audio.loop = loop
      audio.play().catch(error => {
        console.warn(`Could not play sound ${src}:`, error)
      })
    } catch (error) {
      console.warn(`Error creating audio for ${src}:`, error)
    }
  }

  public isCurrentlyRinging(): boolean {
    return this.isRinging
  }

  public getCurrentNotificationId(): string | null {
    return this.currentNotificationId
  }
}

// Export singleton instance
export const callNotifications = new CallNotificationManager()

// React hook for call notifications
export function useCallNotifications() {
  return {
    startIncomingCall: callNotifications.startIncomingCall.bind(callNotifications),
    stopIncomingCall: callNotifications.stopIncomingCall.bind(callNotifications),
    playCallConnectedSound: callNotifications.playCallConnectedSound.bind(callNotifications),
    playCallEndedSound: callNotifications.playCallEndedSound.bind(callNotifications),
    playDialingSound: callNotifications.playDialingSound.bind(callNotifications),
    isRinging: () => callNotifications.isCurrentlyRinging(),
    getCurrentNotificationId: () => callNotifications.getCurrentNotificationId()
  }
}