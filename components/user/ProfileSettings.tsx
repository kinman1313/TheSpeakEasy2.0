"use client"

import React, { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, AlertTriangle, Save } from 'lucide-react';
import { useToast } from "@/components/ui/toast"
import { auth, db } from '@/lib/firebase';
import { uploadAvatar } from '@/lib/storage';
import { useAuth } from '@/components/auth/AuthProvider';

export function ProfileSettings() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Form states
    const [displayName, setDisplayName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // UI states
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize form data
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
            setPreviewUrl(user.photoURL);
            setSelectedFile(null);
            setError(null);
            setHasChanges(false);
        }
    }, [user]);

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
            setSelectedFile(null);
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

    if (!user) {
        return (
            <div className="text-center text-slate-400 py-8">
                <p>Please log in to view profile settings.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-white">
            <h3 className="text-lg font-semibold">Profile Settings</h3>

            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <Avatar className="w-20 h-20">
                        <AvatarImage
                            src={previewUrl || user.photoURL || undefined}
                            alt={displayName || user.email || "User"}
                        />
                        <AvatarFallback className="text-xl">
                            {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
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
                    className="text-white border-slate-600 hover:bg-slate-700"
                >
                    Change Avatar
                </Button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* Display Name */}
                <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-white">Display Name</Label>
                    <Input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        disabled={isSaving}
                        maxLength={50}
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                    />
                    <p className="text-xs text-slate-400">
                        This is how other users will see your name in chat.
                    </p>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="bg-slate-700/50 border-slate-600 text-slate-300"
                    />
                    <p className="text-xs text-slate-400">
                        Email cannot be changed from this app.
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-600/30 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Save Button */}
            {hasChanges && (
                <div className="flex justify-end pt-4 border-t border-slate-600">
                    <Button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Save Changes'}
                    </Button>
                </div>
            )}
        </div>
    );
} 