"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Log additional context for Firebase-related errors
        if (error.message.includes('firebase') || error.message.includes('Firestore')) {
            console.error('Firebase-related error detected:', {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            });
        }
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    private handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
                    <div className="text-center space-y-6 p-8 glass rounded-lg max-w-md">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-red-400">Something went wrong</h2>
                            <p className="text-gray-300">
                                An unexpected error occurred. This might be due to a connection issue.
                            </p>
                            {this.state.error && (
                                <details className="mt-4 text-left">
                                    <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                                        Error details
                                    </summary>
                                    <pre className="mt-2 text-xs text-red-300 overflow-auto max-h-32 bg-slate-800/50 p-2 rounded">
                                        {this.state.error.message}
                                    </pre>
                                </details>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={this.handleReset}
                                className="w-full glass hover:glass-darker neon-glow text-white"
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={this.handleReload}
                                variant="outline"
                                className="w-full glass hover:glass-darker text-white border-slate-600/50"
                            >
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
} 