"use client"

import React, { useState, useEffect, useRef } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, AlertTriangle, User as UserIcon, Bell, BellOff } from 'lucide-react';
import { useToast } from "@/components/ui/toast"
import { auth, db } from '@/lib/firebase';
import { uploadAvatar } from '@/lib/storage';
import { Switch } from '@/components/ui/switch';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export default function UserSettingsModal({ isOpen, onClose, user }: UserSettingsModalProps) {
    // Form states
    const [displayName, setDisplayName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // UI states
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Notification states (safer implementation)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notificationsSupported, setNotificationsSupported] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Initialize form data and check notification support safely
    useEffect(() => {
        if (isOpen && user) {
            setDisplayName(user.displayName || '');
            setPreviewUrl(user.photoURL);
            setSelectedFile(null);
            setError(null);
            setHasChanges(false);

            // Safely check for notification support
            try {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    setNotificationsSupported(true);
                    setNotificationsEnabled(Notification.permission === 'granted');
                }
            } catch (err) {
                console.log('Notifications not supported:', err);
                setNotificationsSupported(false);
            }
        }
    }, [isOpen, user]);

    // Track changes
    useEffect(() => {
        if (user) {
            const nameChanged = displayName !== (user.displayName || '');
            const avatarChanged = selectedFile !== null;
            setHasChanges(nameChanged || avatarChanged);
        }
    }, [displayName, selectedFile, user]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file
            if (file.size > 5 * 1024 * 1024) { // Max 5MB
                setError("File is too large. Maximum 5MB allowed.");
                return;
            }

            const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if (!allowedTypes.includes(file.type)) {
                setError("Invalid file type. Only JPG, PNG, GIF, WEBP allowed.");
                return;
            }

            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleNotificationToggle = async (checked: boolean) => {
        if (!notificationsSupported) return;

        try {
            if (checked) {
                const permission = await Notification.requestPermission();
                setNotificationsEnabled(permission === 'granted');
                if (permission === 'granted') {
                    toast({
                        title: 'Notifications Enabled',
                        description: 'You will now receive browser notifications.'
                    });
                } else {
                    toast({
                        title: 'Permission Denied',
                        description: 'Please enable notifications in your browser settings.',
                        variant: 'destructive'
                    });
                }
            } else {
                setNotificationsEnabled(false);
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

    const handleSaveChanges = async () => {
        if (!user || !auth.currentUser) {
            setError("User not available.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            let photoURL = user.photoURL;

            // Upload new avatar if selected
            if (selectedFile) {
                setIsUploading(true);
                try {
                    photoURL = await uploadAvatar(user.uid, selectedFile);
                } catch (uploadErr: any) {
                    throw new Error(`Avatar upload failed: ${uploadErr.message}`);
                } finally {
                    setIsUploading(false);
                }
            }

            // Update Firebase Auth profile
            const updateData: { displayName?: string; photoURL?: string } = {};

            if (displayName.trim() !== (user.displayName || '')) {
                updateData.displayName = displayName.trim();
            }

            if (photoURL !== user.photoURL) {
                updateData.photoURL = photoURL || undefined;
            }

            if (Object.keys(updateData).length > 0) {
                await updateProfile(auth.currentUser, updateData);
            }

            // Update Firestore user document
            if (db) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocData: any = {
                    lastUpdated: new Date(),
                };

                if (updateData.displayName !== undefined) {
                    userDocData.displayName = updateData.displayName;
                    userDocData.userName = updateData.displayName; // For compatibility
                }

                if (updateData.photoURL !== undefined) {
                    userDocData.photoURL = updateData.photoURL;
                }

                await setDoc(userDocRef, userDocData, { merge: true });
            }

            toast({
                title: "Profile Updated!",
                description: "Your changes have been saved successfully."
            });

            setHasChanges(false);
            onClose();
        } catch (err: any) {
            console.error("Error updating profile:", err);
            const errorMessage = err.message || "Failed to update profile. Please try again.";
            setError(errorMessage);
            toast({
                title: "Update Failed",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleCancel = () => {
        if (hasChanges) {
            if (confirm("You have unsaved changes. Are you sure you want to cancel?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleCancel()}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5" />
                        Account Settings
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Profile Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Profile Information</h3>

                        {/* Avatar */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                <Avatar className="w-24 h-24">
                                    <AvatarImage
                                        src={previewUrl || user?.photoURL || undefined}
                                        alt={displayName || user?.email || "User"}
                                    />
                                    <AvatarFallback className="text-2xl">
                                        {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            <Input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAvatarClick}
                                disabled={isSaving}
                            >
                                Change Avatar
                            </Button>
                        </div>

                        {/* Display Name */}
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your display name"
                                disabled={isSaving}
                                maxLength={50}
                            />
                            <p className="text-xs text-muted-foreground">
                                This is how other users will see your name in chat.
                            </p>
                        </div>

                        {/* Email (read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                Email cannot be changed from this app.
                            </p>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    {notificationsSupported && (
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-medium">Notifications</h3>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium">Browser Notifications</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Get notified when you receive new messages
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {notificationsEnabled ? (
                                        <Bell className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <BellOff className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <Switch
                                        checked={notificationsEnabled}
                                        onCheckedChange={handleNotificationToggle}
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                    </DialogClose>

                    <Button
                        onClick={handleSaveChanges}
                        disabled={!hasChanges || isSaving}
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Uploading...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 