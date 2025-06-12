import { useEffect, useRef, useState, useCallback } from 'react'

interface PullToRefreshOptions {
    onRefresh: () => Promise<void>
    threshold?: number
    resistance?: number
    enabled?: boolean
}

export function usePullToRefresh({
    onRefresh,
    threshold = 80,
    resistance = 2.5,
    enabled = true
}: PullToRefreshOptions) {
    const [isPulling, setIsPulling] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const startY = useRef(0)
    const currentY = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30]
            }
            navigator.vibrate(patterns[type])
        }
    }, [])

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (!enabled || !containerRef.current) return

        const scrollTop = containerRef.current.scrollTop
        if (scrollTop > 0) return // Only allow pull-to-refresh at top

        startY.current = e.touches[0].clientY
        currentY.current = startY.current
    }, [enabled])

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!enabled || !containerRef.current || startY.current === 0) return

        currentY.current = e.touches[0].clientY
        const deltaY = currentY.current - startY.current

        if (deltaY > 0) {
            e.preventDefault() // Prevent default scroll behavior

            const distance = Math.min(deltaY / resistance, threshold * 1.5)
            setPullDistance(distance)

            if (!isPulling && distance > 10) {
                setIsPulling(true)
                triggerHaptic('light')
            }

            if (distance >= threshold && !isRefreshing) {
                triggerHaptic('medium')
            }
        }
    }, [enabled, threshold, resistance, isPulling, isRefreshing, triggerHaptic])

    const handleTouchEnd = useCallback(async () => {
        if (!enabled || !isPulling) return

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true)
            triggerHaptic('heavy')

            try {
                await onRefresh()
            } catch (error) {
                console.error('Refresh failed:', error)
            } finally {
                setIsRefreshing(false)
            }
        }

        setIsPulling(false)
        setPullDistance(0)
        startY.current = 0
        currentY.current = 0
    }, [enabled, isPulling, pullDistance, threshold, isRefreshing, onRefresh, triggerHaptic])

    useEffect(() => {
        const container = containerRef.current
        if (!container || !enabled) return

        container.addEventListener('touchstart', handleTouchStart, { passive: false })
        container.addEventListener('touchmove', handleTouchMove, { passive: false })
        container.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            container.removeEventListener('touchstart', handleTouchStart)
            container.removeEventListener('touchmove', handleTouchMove)
            container.removeEventListener('touchend', handleTouchEnd)
        }
    }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

    const refreshIndicatorStyle = {
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        opacity: Math.min(pullDistance / threshold, 1),
        transition: isPulling ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }

    return {
        containerRef,
        isPulling,
        isRefreshing,
        pullDistance,
        refreshIndicatorStyle,
        isThresholdReached: pullDistance >= threshold
    }
} 