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
            toast.success("Profile photo updated")
        } catch (error) {
            console.error("Error uploading photo:", error)
            toast.error("Failed to upload photo")
        } finally {
            setIsUploading(false)
        }
    }

    const updateUserProfile = async () => {
        if (!user || !isFirebaseReady || !auth || !db) return

        try {
            setIsSaving(true)
            toast.loading("Saving changes...")

            // Use type assertions to tell TypeScript that these are definitely the correct instances
            const firebaseAuth = auth as Auth;
            const firestore = db as Firestore;

            // Update user profile
            if (firebaseAuth.currentUser) {
                await updateProfile(firebaseAuth.currentUser, {
                    displayName: displayName,
                })
            }

            // Update in Firestore
            const userRef = doc(firestore, "users", user.uid)
            await updateDoc(userRef, {
                displayName: displayName,
                chatColor: chatColor,
                settings: settings,
            })

            toast.success("Profile updated")
            handleClose()
        } catch (error) {
            console.error("Error updating profile:", error)
            toast.error("Failed to update profile")
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

    return (
        <div className="flex flex-col gap-6 p-6">
            <DialogHeader>
                <DialogTitle>Profile Settings</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={photoURL} alt={displayName} />
                        <AvatarFallback>{displayName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <label
                        htmlFor="photo-upload"
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90"
                    >
                        <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={isUploading}
                            aria-label="Upload profile photo"
                        />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </label>
                </div>

                <div className="w-full space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Chat Color</Label>
                        <CirclePicker
                            colors={NEON_COLORS}
                            color={chatColor}
                            onChange={(color) => setChatColor(color.hex)}
                            width="100%"
                        />
                    </div>

                    <div className="space-y-4">
                        <Label>Settings</Label>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="enterToSend" className="cursor-pointer">
                                    Enter to Send
                                </Label>
                                <Switch
                                    id="enterToSend"
                                    checked={settings.enterToSend}
                                    onCheckedChange={(checked) =>
                                        handleSettingChange("enterToSend", checked)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="showTypingIndicators" className="cursor-pointer">
                                    Show Typing Indicators
                                </Label>
                                <Switch
                                    id="showTypingIndicators"
                                    checked={settings.showTypingIndicators}
                                    onCheckedChange={(checked) =>
                                        handleSettingChange("showTypingIndicators", checked)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="showReadReceipts" className="cursor-pointer">
                                    Show Read Receipts
                                </Label>
                                <Switch
                                    id="showReadReceipts"
                                    checked={settings.showReadReceipts}
                                    onCheckedChange={(checked) =>
                                        handleSettingChange("showReadReceipts", checked)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="notificationsEnabled" className="cursor-pointer">
                                    Enable Notifications
                                </Label>
                                <Switch
                                    id="notificationsEnabled"
                                    checked={settings.notificationsEnabled}
                                    onCheckedChange={(checked) =>
                                        handleSettingChange("notificationsEnabled", checked)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                    Cancel
                </Button>
                <Button onClick={updateUserProfile} disabled={isSaving || isUploading}>
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    )
}