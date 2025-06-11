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

    useEffect(() => {
        if (!isLoading) {
            const root = document.documentElement;
            Object.entries(currentTheme.colors).forEach(([key, value]) => {
                root.style.setProperty(key, String(value));
            });
            // Apply pattern class to body
            document.body.classList.remove(...PATTERNS.map(p => p.className).filter(Boolean));
            if (currentPattern.className) {
                document.body.classList.add(currentPattern.className);
            }
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