"use client"

import React, { useState, useEffect, useRef } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, AlertTriangle, Bell, BellOff } from 'lucide-react'; // Added Bell, BellOff
import { useToast } from "@/components/ui/toast"
import { auth, db, messaging } from '@/lib/firebase'; // Import messaging
import { uploadAvatar } from '@/lib/storage';
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Label } from '@/components/ui/label'; // Import Label
import { useNotifications } from '@/lib/hooks/useNotifications';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Notification states
  const [notificationsEnabledUI, setNotificationsEnabledUI] = useState<boolean>(false);
  const [isNotificationProcessing, setIsNotificationProcessing] = useState<boolean>(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null); // Store current FCM token for disabling

  const {
    permission,
    token: notificationToken,
    error: notificationError,
    isSupported: notificationsSupported,
    enableNotifications,
    disableNotifications,
  } = useNotifications();

  useEffect(() => {
    // Reset state when modal opens/closes or user changes
    setSelectedFile(null);
    setPreviewUrl(user?.photoURL || null);
    setIsUploading(false);
    setError(null);

    // Fetch and set notification preferences when modal opens with a user
    if (isOpen && user) {
      setNotificationsEnabledUI(notificationsSupported);
      setCurrentToken(notificationToken);
    }
  }, [isOpen, user, notificationsSupported, notificationToken]);

  const handleNotificationToggle = async (checked: boolean) => {
    setError(null);
    setIsNotificationProcessing(true);
    try {
      if (checked) {
        const token = await enableNotifications();
        if (token) {
          setNotificationsEnabledUI(true);
          setCurrentToken(token);
          toast({ title: 'Notifications Enabled', description: 'You will now receive push notifications on this device.' });
        } else {
          setNotificationsEnabledUI(false);
          setError('Could not enable notifications. Please try again.');
          toast({ title: 'Error Enabling Notifications', description: 'Failed to get notification token.', variant: 'destructive' });
        }
      } else {
        await disableNotifications();
        setNotificationsEnabledUI(false);
        setCurrentToken(null);
        toast({ title: 'Notifications Disabled', description: 'You will no longer receive push notifications on this device.' });
      }
    } catch (err: any) {
      console.error('Error toggling notifications:', err);
      const errorMessage = err.message || 'Failed to update notification settings.';
      setError(errorMessage);
      toast({ title: 'Update Failed', description: errorMessage, variant: 'destructive' });
      setNotificationsEnabledUI(!checked);
    } finally {
      setIsNotificationProcessing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic client-side validation (example: size and type)
      if (file.size > 2 * 1024 * 1024) { // Max 2MB
        setError("File is too large. Max 2MB allowed.");
        setSelectedFile(null);
        setPreviewUrl(user?.photoURL || null); // Revert to original avatar
        return;
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only JPG, PNG, GIF, WEBP allowed.");
        setSelectedFile(null);
        setPreviewUrl(user?.photoURL || null);
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null); // Clear previous errors
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile || !user || !auth.currentUser) {
      setError("No file selected or user not available.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // This will be replaced by the actual import from lib/storage.ts
      const newAvatarUrl = await uploadAvatar(user.uid, selectedFile);

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { photoURL: newAvatarUrl });

      // Update Firestore user document (optional, based on your data model)
      if (db) {
        await setDoc(doc(db, "users", user.uid), { photoURL: newAvatarUrl }, { merge: true });
      }

      toast({ title: "Avatar Updated!", description: "Your new avatar has been saved." });
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error("Error updating avatar:", err);
      const errorMessage = err.message || "Failed to update avatar. Please try again.";
      setError(errorMessage);
      toast({ title: "Upload Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger hidden file input click
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar className="w-32 h-32 text-xl">
                <AvatarImage src={previewUrl || user?.photoURL || undefined} alt={user?.displayName || user?.email || "User"} />
                <AvatarFallback className="text-4xl">
                  {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <Input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="outline" onClick={handleAvatarClick} className="text-sm">
              Change Avatar
            </Button>
          </div>

          {user && (
            <div className="text-center">
              <p className="text-xl font-semibold">{user.displayName || "No Name"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          )}

          {/* Push Notifications Section */}
          <div className="pt-4 border-t">
            <h4 className="text-md font-semibold mb-3">Notifications</h4>
            {notificationError && (
              <p className="text-sm text-destructive/80 mb-2 flex items-center">
                <AlertTriangle size={16} className="mr-2 shrink-0" />
                {notificationError}
              </p>
            )}
            {!messaging && (
              <p className="text-sm text-muted-foreground mb-2 flex items-center">
                <AlertTriangle size={16} className="mr-2 shrink-0" />
                Push notification service is not available or configured.
              </p>
            )}
            {messaging && notificationsSupported && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications-toggle"
                  checked={notificationsEnabledUI}
                  onCheckedChange={handleNotificationToggle}
                  disabled={isNotificationProcessing || notificationError}
                />
                <Label htmlFor="notifications-toggle" className="cursor-pointer">
                  Enable Push Notifications
                </Label>
                {isNotificationProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Toggle to {notificationsEnabledUI ? 'disable' : 'enable'} push notifications on this device.
            </p>
            {!process.env.NEXT_PUBLIC_FCM_VAPID_KEY && messaging && (
              <p className="text-xs text-destructive/80 mt-1">
                Warning: VAPID key for notifications is not configured.
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center text-red-500 text-xs p-2 rounded-md bg-destructive/10 border border-destructive/30">
              <AlertTriangle size={16} className="mr-1.5 shrink-0" />
              <span className="grow">{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSaveAvatar} disabled={!selectedFile || isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
