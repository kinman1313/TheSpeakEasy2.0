"use client";

import React from 'react';
import { useCustomTheme } from '@/components/providers/ThemeProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppearanceSettings() {
    const { theme, setTheme, themes } = useCustomTheme();

    return (
        <Card className="bg-transparent border-none shadow-none">
            <CardHeader>
                <CardTitle className="text-white">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {themes.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                                "relative rounded-lg cursor-pointer transition-all duration-200",
                                "h-24 w-full",
                                "border-2",
                                t.id === theme.id ? 'border-primary scale-105' : 'border-transparent hover:scale-105'
                            )}
                        >
                            <div
                                className="absolute inset-0 rounded-md"
                                style={{
                                    background: `linear-gradient(to bottom right, rgb(${t.colors['--background-start-rgb']}), rgb(${t.colors['--background-end-rgb']}))`
                                }}
                            />
                            {t.id === theme.id && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                                    <CheckCircle className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 text-xs font-semibold" style={{ color: `rgb(${t.colors['--foreground-rgb']})` }}>
                                {t.name}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 