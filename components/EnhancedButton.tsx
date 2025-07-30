import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  glass?: boolean
  glow?: boolean
  children: React.ReactNode
}

export const EnhancedButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', glass = true, glow = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "relative inline-flex items-center justify-center font-medium transition-all duration-200",
          "tap-target focus-ring",
          
          // Glass effect
          glass && "btn-glass",
          
          // Glow effect
          glow && "shadow-[0_0_20px_rgba(34,197,94,0.5)]",
          
          // Size variants
          {
            'px-3 py-1.5 text-sm gap-1.5': size === 'sm',
            'px-4 py-2 text-base gap-2': size === 'md',
            'px-6 py-3 text-lg gap-2.5': size === 'lg',
          },
          
          // Variant styles
          {
            'btn-primary': variant === 'primary',
            'bg-white/10 hover:bg-white/20': variant === 'secondary',
            'bg-transparent hover:bg-white/10': variant === 'ghost',
            'bg-red-500/20 hover:bg-red-500/30 border-red-500/50': variant === 'danger',
          },
          
          className
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        
        {/* Mobile tap feedback */}
        <span className="absolute inset-0 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <span className="absolute inset-0 rounded-[inherit] bg-white/10" />
        </span>
      </button>
    )
  }
)