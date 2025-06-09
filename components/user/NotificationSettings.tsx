"use client"

import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { useToast } from "@/components/ui/toast"

export function NotificationSettings() {
    const { toast } = useToast();

    // Notification states
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [notificationsSupported, setNotificationsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    // Check notification support and current permission
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                if ('Notification' in window) {
                    setNotificationsSupported(true);
                    setPermission(Notification.permission);
                    setBrowserNotificationsEnabled(Notification.permission === 'granted');
                }

                // Check sound preference from localStorage
                const soundPref = localStorage.getItem('soundNotifications');
                setSoundEnabled(soundPref !== 'false');
            } catch (err) {
                console.log('Notifications not supported:', err);
                setNotificationsSupported(false);
            }
        }
    }, []);

    const handleBrowserNotificationToggle = async (checked: boolean) => {
        if (!notificationsSupported) return;

        try {
            if (checked) {
                const permission = await Notification.requestPermission();
                setPermission(permission);
                setBrowserNotificationsEnabled(permission === 'granted');

                if (permission === 'granted') {
                    toast({
                        title: 'Notifications Enabled',
                        description: 'You will now receive browser notifications for new messages.'
                    });

                    // Test notification
                    setTimeout(() => {
                        new Notification('Notifications Enabled', {
                            body: 'You will now receive notifications like this one.',
                            icon: '/icons/chat-icon.png'
                        });
                    }, 1000);
                } else {
                    toast({
                        title: 'Permission Denied',
                        description: 'Please enable notifications in your browser settings to receive alerts.',
                        variant: 'destructive'
                    });
                }
            } else {
                setBrowserNotificationsEnabled(false);
                toast({
                    title: 'Notifications Disabled',
                    description: 'You will no longer receive browser notifications.'
                });
            }
        } catch (err) {
            console.error('Error toggling notifications:', err);
            toast({
                title: 'Error',
                description: 'Failed to update notification settings.',
                variant: 'destructive'
            });
        }
    };

    const handleSoundToggle = (checked: boolean) => {
        setSoundEnabled(checked);
        localStorage.setItem('soundNotifications', checked.toString());

        toast({
            title: checked ? 'Sound Enabled' : 'Sound Disabled',
            description: `Notification sounds have been ${checked ? 'enabled' : 'disabled'}.`
        });
    };

    const testNotification = () => {
        if (browserNotificationsEnabled && notificationsSupported) {
            new Notification('Test Notification', {
                body: 'This is a test notification from The SpeakEasy!',
                icon: '/icons/chat-icon.png'
            });
        } else {
            toast({
                title: 'Cannot Test',
                description: 'Please enable browser notifications first.',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6 text-white">
            <h3 className="text-lg font-semibold">Notification Settings</h3>

            <div className="space-y-6">
                {/* Browser Notifications */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                {browserNotificationsEnabled ? (
                                    <Bell className="h-4 w-4 text-green-500" />
                                ) : (
                                    <BellOff className="h-4 w-4 text-slate-400" />
                                )}
                                Browser Notifications
                            </Label>
                            <p className="text-xs text-slate-400">
                                Get desktop notifications when you receive new messages
                            </p>
                        </div>
                        <Switch
                            checked={browserNotificationsEnabled}
                            onCheckedChange={handleBrowserNotificationToggle}
                            disabled={!notificationsSupported}
                        />
                    </div>

                    {!notificationsSupported && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-md">
                            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-yellow-400">
                                <p className="font-medium">Notifications not supported</p>
                                <p>Your browser doesn't support desktop notifications.</p>
                            </div>
                        </div>
                    )}

                    {permission === 'denied' && notificationsSupported && (
                        <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-600/30 rounded-md">
                            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-red-400">
                                <p className="font-medium">Notifications blocked</p>
                                <p>Please enable notifications in your browser settings and refresh the page.</p>
                            </div>
                        </div>
                    )}

                    {browserNotificationsEnabled && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={testNotification}
                            className="text-white border-slate-600 hover:bg-slate-700"
                        >
                            Test Notification
                        </Button>
                    )}
                </div>

                {/* Sound Notifications */}
                <div className="space-y-4 pt-4 border-t border-slate-600">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                {soundEnabled ? (
                                    <Volume2 className="h-4 w-4 text-blue-500" />
                                ) : (
                                    <VolumeX className="h-4 w-4 text-slate-400" />
                                )}
                                Sound Notifications
                            </Label>
                            <p className="text-xs text-slate-400">
                                Play sound when you receive new messages
                            </p>
                        </div>
                        <Switch
                            checked={soundEnabled}
                            onCheckedChange={handleSoundToggle}
                        />
                    </div>
                </div>

                {/* Additional Settings Info */}
                <div className="pt-4 border-t border-slate-600">
                    <h4 className="text-sm font-medium mb-2">About Notifications</h4>
                    <div className="text-xs text-slate-400 space-y-1">
                        <p>• Browser notifications appear even when the app is not active</p>
                        <p>• Sound notifications only work when the app is open</p>
                        <p>• You can change these settings at any time</p>
                        <p>• Notifications respect your browser's Do Not Disturb settings</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 