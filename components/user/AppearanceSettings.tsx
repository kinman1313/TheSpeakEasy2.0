"use client";

import React from 'react';
import { useCustomTheme } from '@/components/providers/ThemeProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
// Removed unused PATTERNS import

export function AppearanceSettings() {
    const { theme, setTheme, themes, pattern, setPattern, patterns } = useCustomTheme();

    return (
        <Card className="bg-transparent border-none shadow-none">
            <CardHeader>
                <CardTitle className="text-white">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-6">
                    <div className="text-sm font-semibold text-slate-300 mb-2">Color Scheme</div>
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
                </div>
                <div>
                    <div className="text-sm font-semibold text-slate-300 mb-2 mt-4">Background Pattern</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {patterns.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => setPattern(p.id)}
                                className={cn(
                                    "relative rounded-lg cursor-pointer transition-all duration-200 bg-slate-800/60",
                                    "h-16 w-full flex items-center justify-center border-2",
                                    p.id === pattern.id ? 'border-primary scale-105' : 'border-transparent hover:scale-105'
                                )}
                            >
                                {p.preview ? (
                                    <img src={p.preview} alt={p.name} className="h-10 w-10 object-contain rounded" />
                                ) : (
                                    <span className="text-xs text-slate-400">None</span>
                                )}
                                {p.id === pattern.id && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md">
                                        <CheckCircle className="h-6 w-6 text-primary" />
                                    </div>
                                )}
                                <div className="absolute bottom-1 left-1 text-xs font-semibold text-slate-200">
                                    {p.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 