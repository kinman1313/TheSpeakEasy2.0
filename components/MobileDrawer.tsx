import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50"
          >
            <div className="h-full glass-panel rounded-r-3xl">
              {/* Drawer Handle */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-white/20 rounded-l-full" />
              
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}