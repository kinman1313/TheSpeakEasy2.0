import '../styles/globals.css';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ThemeProvider } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProps } from 'next/app';

// Fancy page transitions
const variants = {
  hidden: { opacity: 0, x: -10, y: 0 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: 10, y: 0 },
};

// Extended AppProps with our custom props
interface CustomAppProps extends AppProps {
  pageProps: any;
}

function SpeakEasyApp({ Component, pageProps }: CustomAppProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Page load animation
  useEffect(() => {
    const handleStart = (): void => {
      setLoading(true);
    };

    const handleComplete = (): void => {
      setLoading(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AnimatePresence mode="wait">
        <motion.div
          key={router.route}
          initial="hidden"
          animate="enter"
          exit="exit"
          variants={variants}
          transition={{ type: 'linear', duration: 0.3 }}
          className="min-h-screen"
        >
          <Component {...pageProps} user={user} loading={loading} />
        </motion.div>
      </AnimatePresence>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            icon: '🎉',
            style: {
              background: 'rgba(34, 197, 94, 0.9)',
            },
          },
          error: {
            icon: '❌',
            style: {
              background: 'rgba(239, 68, 68, 0.9)',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}

export default SpeakEasyApp;