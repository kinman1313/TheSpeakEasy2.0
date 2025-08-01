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
    timeout?: number
}

export interface NotificationAction {
    action: string
    title: string
    icon?: string
}

export interface IMobileNotificationManager {
    show(options: MobileNotificationOptions): Promise<void>
    showMessage(from: string, message: string, data?: any): Promise<void>
    showCall(from: string, isVideo?: boolean): Promise<void>
    showError(title: string, message: string): Promise<void>
    showSuccess(title: string, message: string): Promise<void>
    requestPermission(): Promise<NotificationPermission>
    clearAllNotifications(): void
    clearNotification(tag: string): void
    getPermission(): NotificationPermission
    isNotificationSupported(): boolean
}

class MobileNotificationManager implements IMobileNotificationManager {
    private permission: NotificationPermission = 'default'
    private isSupported: boolean = false
    private isVisible: boolean = true
    private notificationQueue: MobileNotificationOptions[] = []
    private activeNotifications: Map<string, Notification> = new Map()

    constructor() {
        // Only initialize if we're in the browser
        if (typeof window !== 'undefined') {
            this.checkSupport()
            this.setupVisibilityHandling()
            this.setupPermissionHandling()
        }
    }

    private checkSupport(): void {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            this.isSupported = false
            return
        }

        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator
    }

    private setupVisibilityHandling(): void {
        if (typeof document === 'undefined' || typeof window === 'undefined') {
            return
        }

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
        if (this.isSupported && typeof window !== 'undefined' && 'Notification' in window) {
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
        // Ensure we're on the client side before creating notifications
        if (typeof window === 'undefined' || !this.isSupported) {
            return
        }

        const notificationOptions: NotificationOptions = {
            body: options.body,
            icon: options.icon || '/icons/icon-192x192.png',
            badge: options.badge || '/icons/badge-72x72.png',
            tag: options.tag || `notification-${Date.now()}`,
            data: options.data,
            silent: options.silent,
            requireInteraction: options.requireInteraction
        }

        // Add mobile-specific features if supported
        if (options.vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(options.vibrate)
        }

        if (options.actions) {
            (notificationOptions as any).actions = options.actions
        }

        const notification = new Notification(options.title, notificationOptions)

        // Store notification for management
        if (options.tag) {
            this.activeNotifications.set(options.tag, notification)
        }

        // Handle notification click
        notification.onclick = (event) => {
            event.preventDefault()
            if (typeof window !== 'undefined') {
                window.focus()

                // Handle custom data
                if (options.data?.url) {
                    window.location.href = options.data.url
                }
            }

            notification.close()
            haptics.tap()
        }

        // Auto-close after delay (mobile-friendly)
        const timeout = options.timeout || (options.requireInteraction ? 30000 : 5000)
        setTimeout(() => {
            notification.close()
        }, timeout)

        // Trigger haptic feedback
        if (!options.silent) {
            haptics.tap()
        }
    }

    private showInAppNotification(options: MobileNotificationOptions): void {
        if (typeof document === 'undefined') return

        // Create notification element
        const notification = document.createElement('div')
        
        // Improved className with better organization
        notification.className = [
            // Position and layout
            'fixed top-4 right-4 z-[9999]',
            'max-w-sm w-full',
            
            // Visual styling
            'bg-black/90 backdrop-blur-lg',
            'border border-white/20 rounded-lg',
            'p-4 text-white shadow-2xl',
            
            // Animation and transitions
            'transform transition-all duration-300',
            'translate-x-full opacity-0',
            
            // Mobile optimizations
            'touch-manipulation select-none'
        ].join(' ')

        // Improved innerHTML with better structure and accessibility
        notification.innerHTML = `
            <div class="flex items-start gap-3" role="alert" aria-live="polite">
                ${options.icon ? `
                    <div class="flex-shrink-0">
                        <img 
                            src="${options.icon}" 
                            alt="Notification icon" 
                            class="w-8 h-8 rounded-full object-cover"
                            loading="lazy"
                            onerror="this.style.display='none'"
                        >
                    </div>
                ` : ''}
                
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-sm truncate text-white" id="notification-title">
                        ${this.escapeHtml(options.title)}
                    </h4>
                    <p class="text-xs text-gray-300 mt-1 line-clamp-2" id="notification-body">
                        ${this.escapeHtml(options.body)}
                    </p>
                    
                    ${options.actions ? this.renderInAppActions(options.actions) : ''}
                </div>
                
                <button 
                    class="text-gray-400 hover:text-white ml-2 flex-shrink-0 transition-colors duration-200 p-1 rounded hover:bg-white/10"
                    aria-label="Close notification"
                    type="button"
                >
                    <svg 
                        class="w-4 h-4" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                    >
                        <path 
                            fill-rule="evenodd" 
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            </div>
        `

        // Add data attributes for easier management
        if (options.tag) {
            notification.setAttribute('data-tag', options.tag)
        }
        notification.setAttribute('data-notification', 'true')

        // Add to DOM
        document.body.appendChild(notification)

        // Animate in (using RAF for better performance)
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full', 'opacity-0')
            notification.classList.add('translate-x-0', 'opacity-100')
        })

        // Enhanced event handling
        this.setupNotificationEvents(notification, options)
    }

    private renderInAppActions(actions: NotificationAction[]): string {
        return `
            <div class="flex gap-2 mt-3 flex-wrap">
                ${actions.map(action => `
                    <button 
                        data-action="${action.action}"
                        class="px-3 py-1.5 text-xs font-medium 
                               text-blue-400 hover:text-blue-300
                               border border-blue-500/30 hover:border-blue-400/50
                               rounded-md transition-all duration-200 
                               hover:bg-blue-500/10 active:bg-blue-500/20
                               touch-manipulation"
                        type="button"
                        aria-label="${this.escapeHtml(action.title)}"
                    >
                        ${action.icon ? `<img src="${action.icon}" alt="" class="w-3 h-3 inline mr-1">` : ''}
                        ${this.escapeHtml(action.title)}
                    </button>
                `).join('')}
            </div>
        `
    }

    private setupNotificationEvents(notification: HTMLElement, options: MobileNotificationOptions): void {
        // Close button handler
        const closeBtn = notification.querySelector('button[aria-label="Close notification"]')
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation()
            this.closeInAppNotification(notification)
        })

        // Action button handlers
        options.actions?.forEach((action) => {
            const button = notification.querySelector(`[data-action="${action.action}"]`)
            button?.addEventListener('click', (e) => {
                e.stopPropagation()
                this.handleNotificationAction(options.data, action.action)
                this.closeInAppNotification(notification)
            })
        })

        // Notification click handler (excluding buttons)
        notification.addEventListener('click', (e) => {
            const target = e.target as Element
            if (!target.closest('button')) {
                this.handleNotificationClick(options.data)
                
                if (options.data?.url && typeof window !== 'undefined') {
                    window.location.href = options.data.url
                }
                
                this.closeInAppNotification(notification)
                haptics.tap()
            }
        })

        // Auto-close with progress indicator (optional enhancement)
        const timeout = options.timeout || (options.requireInteraction ? 10000 : 5000)
        
        // Add progress bar if desired
        if (!options.requireInteraction) {
            this.addProgressBar(notification, timeout)
        }
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                this.closeInAppNotification(notification)
            }
        }, timeout)

        // Haptic feedback
        if (!options.silent) {
            haptics.tap()
        }
    }

    private addProgressBar(notification: HTMLElement, duration: number): void {
        const progressBar = document.createElement('div')
        progressBar.className = 'absolute bottom-0 left-0 h-0.5 bg-blue-400 transition-all ease-linear'
        progressBar.style.width = '100%'
        progressBar.style.transitionDuration = `${duration}ms`
        
        notification.appendChild(progressBar)
        notification.style.position = 'relative'
        
        // Start animation
        requestAnimationFrame(() => {
            progressBar.style.width = '0%'
        })
    }

    private handleNotificationAction(data: any, action: string): void {
        // Emit custom event for the app to handle
        window.dispatchEvent(new CustomEvent('notification-action', {
            detail: { type: action, data }
        }))
    }

    private handleNotificationClick(data: any): void {
        // Bring app to foreground
        if (window.focus) {
            window.focus()
        }

        // Emit custom event
        window.dispatchEvent(new CustomEvent('notification-click', {
            detail: { data }
        }))
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    private closeInAppNotification(element: HTMLElement): void {
        // Enhanced close animation
        element.classList.add('translate-x-full', 'opacity-0', 'scale-95')
        element.classList.remove('translate-x-0', 'opacity-100')
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element)
            }
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

        // Clear in-app notifications - only in browser environment
        if (typeof document !== 'undefined') {
            const inAppNotifications = document.querySelectorAll('[class*="fixed top-4 right-4"]')
            inAppNotifications.forEach(notification => {
                if (notification instanceof HTMLElement) {
                    this.closeInAppNotification(notification)
                }
            })
        }
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

// Export singleton instance with lazy loading
let _mobileNotifications: MobileNotificationManager | null = null

// SSR-safe mock implementation
class MockMobileNotificationManager implements IMobileNotificationManager {
    async show(): Promise<void> { }
    async showMessage(): Promise<void> { }
    async showCall(): Promise<void> { }
    async showError(): Promise<void> { }
    async showSuccess(): Promise<void> { }
    async requestPermission(): Promise<NotificationPermission> { return 'denied' }
    clearAllNotifications(): void { }
    clearNotification(): void { }
    getPermission(): NotificationPermission { return 'default' }
    isNotificationSupported(): boolean { return false }
}

export const mobileNotifications = {
    get instance(): IMobileNotificationManager {
        if (typeof window === 'undefined') {
            // Return a mock object for SSR
            return new MockMobileNotificationManager()
        }

        if (!_mobileNotifications) {
            _mobileNotifications = new MobileNotificationManager()
        }
        return _mobileNotifications
    },

    // Convenience methods that delegate to the instance
    show: (options: MobileNotificationOptions) => mobileNotifications.instance.show(options),
    showMessage: (from: string, message: string, data?: any) => mobileNotifications.instance.showMessage(from, message, data),
    showCall: (from: string, isVideo?: boolean) => mobileNotifications.instance.showCall(from, isVideo),
    showError: (title: string, message: string) => mobileNotifications.instance.showError(title, message),
    showSuccess: (title: string, message: string) => mobileNotifications.instance.showSuccess(title, message),
    requestPermission: () => mobileNotifications.instance.requestPermission(),
    clearAllNotifications: () => mobileNotifications.instance.clearAllNotifications(),
    clearNotification: (tag: string) => mobileNotifications.instance.clearNotification(tag),
    getPermission: () => mobileNotifications.instance.getPermission(),
    isNotificationSupported: () => mobileNotifications.instance.isNotificationSupported()
}

// React hook for mobile notifications
export function useMobileNotifications() {
    return {
        show: mobileNotifications.show,
        showMessage: mobileNotifications.showMessage,
        showCall: mobileNotifications.showCall,
        showError: mobileNotifications.showError,
        showSuccess: mobileNotifications.showSuccess,
        requestPermission: mobileNotifications.requestPermission,
        clearAll: mobileNotifications.clearAllNotifications,
        clear: mobileNotifications.clearNotification,
        permission: mobileNotifications.getPermission(),
        isSupported: mobileNotifications.isNotificationSupported()
    }
}