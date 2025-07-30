import { RefObject, useEffect } from 'react'

export function useOptimizedScroll(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Enable momentum scrolling on iOS
    ;(element.style as any).webkitOverflowScrolling = 'touch'
    
    // Passive event listeners for better performance
    const options = { passive: true }
    
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Handle scroll logic
          ticking = false
        })
        ticking = true
      }
    }
    
    element.addEventListener('scroll', handleScroll, options)
    return () => element.removeEventListener('scroll', handleScroll)
  }, [ref])
}