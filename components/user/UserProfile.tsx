"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/components/auth/AuthProvider"
import { db, storage, auth } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage"
import { updateProfile, type Auth } from "firebase/auth"
import { toast } from "sonner"
import { CirclePicker } from "react-color"
import { useRouter } from "next/navigation"

interface UserSettings {
    enterToSend: boolean
    showTypingIndicators: boolean
    showReadReceipts: boolean
    notificationsEnabled: boolean
}

interface UserProfileProps {
    redirectUrl?: string // URL to redirect to after closing
}

const DEFAULT_SETTINGS: UserSettings = {
    enterToSend: true,
    showTypingIndicators: true,
    showReadReceipts: true,
    notificationsEnabled: true,
}

const NEON_COLORS = [
    "#00f3ff", // neon blue
    "#39ff14", // neon green
    "#ff0099", // neon pink
    "#9400d3", // neon purple
    "#ffff00", // neon yellow
    "#ffa500", // neon orange
    "#ff0000", // neon red
    "#ffffff", // neon white
]

export function UserProfile({ redirectUrl = "/" }: UserProfileProps) {
    const { user } = useAuth()
    const router = useRouter()
    const [displayName, setDisplayName] = useState("")
    const [photoURL, setPhotoURL] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [chatColor, setChatColor] = useState("#00f3ff") // Default neon blue
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)

    // Check if Firebase is initialized
    const isFirebaseReady = typeof window !== 'undefined' && !!db && !!storage && !!auth;

    const handleClose = () => {
        router.push(redirectUrl);
    }

    useEffect(() => {
        if (!user || !isFirebaseReady || !db) return;

        // Make sure user is defined and photoURL is accessed safely
        if (user) {
            setDisplayName(user.displayName || "");
            setPhotoURL(user.photoURL || "");
        }

        // Use an IIFE to handle the async function
        (async () => {
            try {
                // Use type assertion to tell TypeScript that db is definitely a Firestore instance
                const firestore = db as Firestore;

                // Make sure user is defined before accessing uid
                if (!user || !user.uid) {
                    console.error("User or user.uid is undefined");
                    return;
                }

                const userRef = doc(firestore, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.chatColor) {
                        setChatColor(userData.chatColor);
                    }
                    if (userData.settings) {
                        setSettings((prev) => ({
                            ...prev,
                            ...userData.settings,
                        }));
                    }
                } else {
                    // Create user document if it doesn't exist
                    await setDoc(userRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || "",
                        photoURL: user.photoURL || "",
                        chatColor: "#00f3ff",
                        settings: DEFAULT_SETTINGS,
                        createdAt: new Date(),
                    });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                toast.error("Could not load user settings");
            }
        })().catch(error => {
            console.error("Error in fetchUserData:", error);
            toast.error("Failed to load user settings");
        });
    }, [user, isFirebaseReady, db]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user || !isFirebaseReady || !storage || !auth || !db) return

        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            toast.error("Photo must be less than 5MB")
            return
        }

        try {
            setIsUploading(true)
            toast.loading("Uploading photo...")

            // Use type assertions to tell TypeScript that these are definitely the correct instances
            const firebaseStorage = storage as FirebaseStorage;
            const firebaseAuth = auth as Auth;
            const firestore = db as Firestore;

            // Upload to Firebase Storage
            const storageRef = ref(firebaseStorage, `profile_photos/${user.uid}`)
            await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(storageRef)

            // Update user profile
            if (firebaseAuth.currentUser) {
                await updateProfile(firebaseAuth.currentUser, {
                    photoURL: downloadURL,
                })
            }

            // Update in Firestore
            const userRef = doc(firestore, "users", user.uid)
            await updateDoc(userRef, {
                photoURL: downloadURL,
            })

            setPhotoURL(downloadURL)
            toast.success("Photo updated successfully")
        } catch (error) {
            console.error("Error uploading photo:", error)
            toast.error("Could not upload photo")
        } finally {
            setIsUploading(false)
        }
    }

    const updateUserProfile = async () => {
        if (!user || !isFirebaseReady || !auth || !db) return

        if (!displayName.trim()) {
            toast.error("Display name cannot be empty")
            return
        }

        try {
            setIsSaving(true)
            toast.loading("Saving changes...")

            // Use type assertions to tell TypeScript that these are definitely the correct instances
            const firebaseAuth = auth as Auth;
            const firestore = db as Firestore;

            // Update display name in Firebase Auth
            if (displayName !== user.displayName && firebaseAuth.currentUser) {
                await updateProfile(firebaseAuth.currentUser, {
                    displayName: displayName.trim(),
                })
            }

            // Update in Firestore
            const userRef = doc(firestore, "users", user.uid)
            await updateDoc(userRef, {
                displayName: displayName.trim(),
                chatColor,
                settings,
                updatedAt: new Date(),
            })

            toast.success("Profile updated successfully")
            handleClose()
        } catch (error) {
            console.error("Error updating profile:", error)
            toast.error("Could not update profile")
        } finally {
            setIsSaving(false)
        }
    }

    const handleSettingChange = (setting: keyof UserSettings, value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            [setting]: value,
        }))
    }

    // Early return if not in browser or no user
    if (typeof window === 'undefined' || !user) {
        return null;
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-neon-blue glow-blue">User Profile</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
                <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24 border-2 border-neon-blue">
                        <AvatarImage
                            src={photoURL || `/api/avatar?name=${encodeURIComponent(displayName || "User")}`}
                            alt={displayName || "User avatar"}
                        />
                        <AvatarFallback>{displayName?.[0] || user.email?.[0] || "U"}</AvatarFallback>
                    </Avatar>

                    <div>
                        <Button
                            variant="outline"
                            className="border-neon-blue text-neon-blue hover:bg-neon-blue/20"
                            onClick={() => document.getElementById("photo-upload")?.click()}
                            disabled={isUploading || !isFirebaseReady}
                        >
                            {isUploading ? "Uploading..." : "Change Photo"}
                        </Button>
                        <input
                            id="photo-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            aria-label="Upload profile photo"
                            disabled={!isFirebaseReady}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="display-name" className="text-neon-white">
                        Display Name
                    </Label>
                    <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="bg-opacity-30 border-neon-blue text-neon-white"
                        maxLength={50}
                        required
                        disabled={!isFirebaseReady}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-neon-white">Chat Bubble Color</Label>
                    <div className="p-2 bg-gray-800 bg-opacity-50 rounded-md">
                        <CirclePicker
                            color={chatColor}
                            onChange={(color) => setChatColor(color.hex)}
                            colors={NEON_COLORS}
                            circleSize={28}
                            circleSpacing={14}
                        />
                    </div>
                    <div className="mt-2 p-3 rounded-lg transition-colors" style={{ backgroundColor: `${chatColor}40` }}>
                        <p className="text-neon-white">Preview of your chat bubble</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-neon-white">Chat Settings</Label>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="enter-to-send" className="text-neon-white cursor-pointer">
                                Press Enter to send message
                            </Label>
                            <Switch
                                id="enter-to-send"
                                checked={settings.enterToSend}
                                onCheckedChange={(value) => handleSettingChange("enterToSend", value)}
                                disabled={!isFirebaseReady}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="typing-indicators" className="text-neon-white cursor-pointer">
                                Show typing indicators
                            </Label>
                            <Switch
                                id="typing-indicators"
                                checked={settings.showTypingIndicators}
                                onCheckedChange={(value) => handleSettingChange("showTypingIndicators", value)}
                                disabled={!isFirebaseReady}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="read-receipts" className="text-neon-white cursor-pointer">
                                Show read receipts
                            </Label>
                            <Switch
                                id="read-receipts"
                                checked={settings.showReadReceipts}
                                onCheckedChange={(value) => handleSettingChange("showReadReceipts", value)}
                                disabled={!isFirebaseReady}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="notifications" className="text-neon-white cursor-pointer">
                                Enable notifications
                            </Label>
                            <Switch
                                id="notifications"
                                checked={settings.notificationsEnabled}
                                onCheckedChange={(value) => handleSettingChange("notificationsEnabled", value)}
                                disabled={!isFirebaseReady}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
                <Button
                    variant="outline"
                    onClick={handleClose}
                    className="border-neon-red text-neon-red hover:bg-neon-red/20"
                    disabled={isUploading || isSaving || !isFirebaseReady}
                >
                    Cancel
                </Button>
                <Button
                    onClick={updateUserProfile}
                    className="bg-neon-green text-black hover:bg-neon-green/80"
                    disabled={isUploading || isSaving || !isFirebaseReady}
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </>
    )
}