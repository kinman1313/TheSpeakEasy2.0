"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Settings, Volume2, User, Bell, Palette } from 'lucide-react'
import { SoundSettings } from './SoundSettings'
import { ProfileSettings } from './ProfileSettings'
import { NotificationSettings } from './NotificationSettings'
import { AppearanceSettings } from './AppearanceSettings'

interface UserSettingsDialogProps {
    trigger?: React.ReactNode
}

export function UserSettingsDialog({ trigger }: UserSettingsDialogProps) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl text-white">User Settings</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="sounds" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 glass">
                        <TabsTrigger value="sounds" className="data-[state=active]:bg-indigo-600">
                            <Volume2 className="h-4 w-4 mr-2" />
                            Sounds
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="data-[state=active]:bg-indigo-600">
                            <User className="h-4 w-4 mr-2" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="data-[state=active]:bg-indigo-600">
                            <Bell className="h-4 w-4 mr-2" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="data-[state=active]:bg-indigo-600">
                            <Palette className="h-4 w-4 mr-2" />
                            Appearance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="sounds" className="mt-6">
                        <SoundSettings />
                    </TabsContent>

                    <TabsContent value="profile" className="mt-6">
                        <ProfileSettings />
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-6">
                        <NotificationSettings />
                    </TabsContent>

                    <TabsContent value="appearance" className="mt-6">
                        <AppearanceSettings />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
} 