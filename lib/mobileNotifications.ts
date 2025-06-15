import { haptics } from './haptics'

export interface MobileNotificationOptions {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: any
    actions?: NotificationAction[]
    silent?: boolean
    vibrate?: number[]
    requireInteraction?: boolean
    persistent?: boolean
}

export interface NotificationAction {
    action: string
    title: string
    icon?: string
}

class MobileNotificationManager {
    private permission: NotificationPermission = 'default'
    private isSupported: boolean = false
    private isVisible: boolean = true
    private notificationQueue: MobileNotificationOptions[] = []
    private activeNotifications: Map<string, Notification> = new Map()

    constructor() {
        this.checkSupport()
        this.setupVisibilityHandling()
        this.setupPermissionHandling()
    }

    private checkSupport(): void {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator
    }

    private setupVisibilityHandling(): void {
        document.addEventListener('visibilitychange', () => {
            this.isVisible = !document.hidden

            // Process queued notifications when app becomes visible
            if (this.isVisible && this.notificationQueue.length > 0) {
                this.processNotificationQueue()
            }
        })

        // Handle app focus/blur
        window.addEventListener('focus', () => {
            this.isVisible = true
            this.clearAllNotifications()
        })

        window.addEventListener('blur', () => {
            this.isVisible = false
        })
    }

    private setupPermissionHandling(): void {
        if (this.isSupported) {
            this.permission = Notification.permission
        }
    }

    public async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported) {
            return 'denied'
        }

        if (this.permission === 'granted') {
            return 'granted'
        }

        try {
            this.permission = await Notification.requestPermission()
            return this.permission
        } catch (error) {
            console.warn('Failed to request notification permission:', error)
            return 'denied'
        }
    }

    public async show(options: MobileNotificationOptions): Promise<void> {
        // If app is visible and not persistent, show in-app notification instead
        if (this.isVisible && !options.persistent) {
            this.showInAppNotification(options)
            return
        }

        // If app is not visible or notification is persistent, show system notification
        if (this.permission !== 'granted') {
            // Queue notification for when permission is granted
            this.notificationQueue.push(options)
            return
        }

        try {
            await this.showSystemNotification(options)
        } catch (error) {
            console.warn('Failed to show system notification:', error)
            // Fallback to in-app notification
            this.showInAppNotification(options)
        }
    }

    private async showSystemNotification(options: MobileNotificationOptions): Promise<void> {
        const notificationOptions: any = {
            body: options.body,
            icon: options.icon || '/icons/icon-192x192.png',
            badge: options.badge || '/icons/badge-72x72.png',
            tag: options.tag || `notification-${Date.now()}`,
            data: options.data,
            silent: options.silent,
            requireInteraction: options.requireInteraction
        }

        // Add mobile-specific features if supported
        if (options.vibrate && 'vibrate' in navigator) {
            notificationOptions.vibrate = options.vibrate
        }

        if (options.actions && 'actions' in Notification.prototype) {
            notificationOptions.actions = options.actions
        }

        const notification = new Notification(options.title, notificationOptions)

        // Store notification for management
        if (options.tag) {
            this.activeNotifications.set(options.tag, notification)
        }

        // Handle notification click
        notification.onclick = (event) => {
            event.preventDefault()
            window.focus()

            // Handle custom data
            if (options.data?.url) {
                window.location.href = options.data.url
            }

            notification.close()
            haptics.tap()
        }

        // Auto-close after delay (mobile-friendly)
        if (!options.requireInteraction) {
            setTimeout(() => {
                notification.close()
            }, 5000)
        }

        // Trigger haptic feedback
        if (!options.silent) {
            haptics.tap()
        }
    }

    private showInAppNotification(options: MobileNotificationOptions): void {
        // Create in-app notification element
        const notification = document.createElement('div')
        notification.className = `
      fixed top-4 right-4 z-[9999] max-w-sm w-full
      bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg
      p-4 text-white shadow-2xl transform transition-all duration-300
      translate-x-full opacity-0
    `

        notification.innerHTML = `
      <div class="flex items-start gap-3">
        ${options.icon ? `<img src="${options.icon}" alt="" class="w-8 h-8 rounded-full flex-shrink-0">` : ''}
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-sm truncate">${options.title}</h4>
          <p class="text-xs text-gray-300 mt-1 line-clamp-2">${options.body}</p>
        </div>
        <button class="text-gray-400 hover:text-white ml-2 flex-shrink-0">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `

        document.body.appendChild(notification)

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full', 'opacity-0')
        })

        // Handle close button
        const closeBtn = notification.querySelector('button')
        closeBtn?.addEventListener('click', () => {
            this.closeInAppNotification(notification)
        })

        // Handle notification click
        notification.addEventListener('click', (e) => {
            if (e.target !== closeBtn) {
                if (options.data?.url) {
                    window.location.href = options.data.url
                }
                this.closeInAppNotification(notification)
                haptics.tap()
            }
        })

        // Auto-close
        setTimeout(() => {
            this.closeInAppNotification(notification)
        }, options.requireInteraction ? 10000 : 5000)

        // Trigger haptic feedback
        if (!options.silent) {
            haptics.tap()
        }
    }

    private closeInAppNotification(element: HTMLElement): void {
        element.classList.add('translate-x-full', 'opacity-0')
        setTimeout(() => {
            element.remove()
        }, 300)
    }

    private processNotificationQueue(): void {
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift()
            if (notification) {
                this.show(notification)
            }
        }
    }

    public clearAllNotifications(): void {
        // Clear system notifications
        this.activeNotifications.forEach(notification => {
            notification.close()
        })
        this.activeNotifications.clear()

        // Clear in-app notifications
        const inAppNotifications = document.querySelectorAll('[class*="fixed top-4 right-4"]')
        inAppNotifications.forEach(notification => {
            if (notification instanceof HTMLElement) {
                this.closeInAppNotification(notification)
            }
        })
    }

    public clearNotification(tag: string): void {
        const notification = this.activeNotifications.get(tag)
        if (notification) {
            notification.close()
            this.activeNotifications.delete(tag)
        }
    }

    // Convenience methods for common notification types
    public async showMessage(from: string, message: string, data?: any): Promise<void> {
        await this.show({
            title: from,
            body: message,
            icon: '/icons/notification-icon.png',
            tag: `message-${from}`,
            data,
            vibrate: [100, 50, 100]
        })
    }

    public async showCall(from: string, isVideo: boolean = false): Promise<void> {
        await this.show({
            title: `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
            body: `${from} is calling you`,
            icon: '/icons/call-icon.png',
            tag: `call-${from}`,
            requireInteraction: true,
            persistent: true,
            vibrate: [200, 100, 200, 100, 200],
            actions: [
                { action: 'answer', title: 'Answer', icon: '/icons/answer-icon.png' },
                { action: 'decline', title: 'Decline', icon: '/icons/decline-icon.png' }
            ]
        })
    }

    public async showError(title: string, message: string): Promise<void> {
        await this.show({
            title,
            body: message,
            icon: '/icons/error-icon.png',
            tag: 'error',
            vibrate: [300, 100, 300]
        })

        haptics.error()
    }

    public async showSuccess(title: string, message: string): Promise<void> {
        await this.show({
            title,
            body: message,
            icon: '/icons/success-icon.png',
            tag: 'success',
            vibrate: [100, 50, 100, 50, 100]
        })

        haptics.success()
    }

    public getPermission(): NotificationPermission {
        return this.permission
    }

    public isNotificationSupported(): boolean {
        return this.isSupported
    }
}

// Export singleton instance
export const mobileNotifications = new MobileNotificationManager()

// React hook for mobile notifications
export function useMobileNotifications() {
    return {
        show: mobileNotifications.show.bind(mobileNotifications),
        showMessage: mobileNotifications.showMessage.bind(mobileNotifications),
        showCall: mobileNotifications.showCall.bind(mobileNotifications),
        showError: mobileNotifications.showError.bind(mobileNotifications),
        showSuccess: mobileNotifications.showSuccess.bind(mobileNotifications),
        requestPermission: mobileNotifications.requestPermission.bind(mobileNotifications),
        clearAll: mobileNotifications.clearAllNotifications.bind(mobileNotifications),
        clear: mobileNotifications.clearNotification.bind(mobileNotifications),
        permission: mobileNotifications.getPermission(),
        isSupported: mobileNotifications.isNotificationSupported()
    }
} 