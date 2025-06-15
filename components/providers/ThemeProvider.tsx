"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { THEMES, ThemeService, Theme, PATTERNS, Pattern } from '@/lib/themes';

interface CustomThemeContextType {
    theme: Theme;
    setTheme: (themeId: string) => void;
    themes: Theme[];
    pattern: Pattern;
    setPattern: (patternId: string) => void;
    patterns: Pattern[];
}

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export function CustomThemeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
    const [currentPattern, setCurrentPattern] = useState<Pattern>(PATTERNS[0]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            ThemeService.getUserTheme(user.uid).then(themeId => {
                const selectedTheme = THEMES.find(t => t.id === themeId) || THEMES[0];
                setCurrentTheme(selectedTheme);
                setIsLoading(false);
            });
            // Load pattern from user settings or localStorage
            const patternId = localStorage.getItem('patternId') || PATTERNS[0].id;
            const selectedPattern = PATTERNS.find(p => p.id === patternId) || PATTERNS[0];
            setCurrentPattern(selectedPattern);
        } else {
            setCurrentTheme(THEMES[0]);
            setCurrentPattern(PATTERNS[0]);
            setIsLoading(false);
        }
    }, [user]);

    // One-time cleanup on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Clean up any existing problematic pattern classes immediately
            const problematicClasses = [
                'bg-[length:20px_20px]',
                'bg-center',
                'bg-repeat',
                'bg-[length:40px_40px]',
                'bg-[length:30px_30px]',
                'bg-[length:50px_50px]',
                'bg-[length:200px_200px]',
                'bg-[length:100px_100px]',
                'opacity-30'
            ];

            problematicClasses.forEach(className => {
                try {
                    document.body.classList.remove(className);
                } catch (_error) {
                    // Silently ignore errors for classes that don't exist
                }
            });

            console.log('Initial cleanup of problematic CSS classes completed');
        }
    }, []); // Empty dependency array - runs only once on mount

    useEffect(() => {
        if (!isLoading && typeof window !== 'undefined') {
            const root = document.documentElement;
            Object.entries(currentTheme.colors).forEach(([key, value]) => {
                root.style.setProperty(key, String(value));
            });

            // Clean up any existing problematic pattern classes
            try {
                const problematicClasses = [
                    'bg-[length:20px_20px]',
                    'bg-center',
                    'bg-repeat',
                    'bg-[length:40px_40px]',
                    'bg-[length:30px_30px]',
                    'bg-[length:50px_50px]',
                    'bg-[length:200px_200px]',
                    'bg-[length:100px_100px]',
                    'opacity-30'
                ];

                problematicClasses.forEach(className => {
                    if (document.body.classList.contains(className)) {
                        console.log('Removing problematic class:', className);
                        document.body.classList.remove(className);
                    }
                });
            } catch (error) {
                console.warn('Error cleaning up CSS classes:', error);
            }

            // Pattern application completely disabled to prevent CSS class errors
            console.log('Pattern application disabled to prevent CSS class errors');
        }
    }, [currentTheme, currentPattern, isLoading]);

    const handleSetTheme = (themeId: string) => {
        if (user) {
            const newTheme = THEMES.find(t => t.id === themeId);
            if (newTheme) {
                setCurrentTheme(newTheme);
                ThemeService.setUserTheme(user.uid, themeId);
            }
        }
    };

    const handleSetPattern = (patternId: string) => {
        const newPattern = PATTERNS.find(p => p.id === patternId);
        if (newPattern) {
            setCurrentPattern(newPattern);
            localStorage.setItem('patternId', patternId);
        }
    };

    const value = {
        theme: currentTheme,
        setTheme: handleSetTheme,
        themes: THEMES,
        pattern: currentPattern,
        setPattern: handleSetPattern,
        patterns: PATTERNS,
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <CustomThemeContext.Provider value={value}>
            {children}
        </CustomThemeContext.Provider>
    );
}

export function useCustomTheme() {
    const context = useContext(CustomThemeContext);
    if (context === undefined) {
        throw new Error('useCustomTheme must be used within a CustomThemeProvider');
    }
    return context;
} 