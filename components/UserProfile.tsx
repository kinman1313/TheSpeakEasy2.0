"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera } from "lucide-react"
import { toast } from "sonner"

export function UserProfile() {
  const { user, updateProfile } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    try {
      setIsUpdating(true)

      // Create a reference to the storage location
      const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`)

      // Upload the file
      await uploadBytes(storageRef, file)

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      // Update the user's profile
      await updateProfile({
        photoURL: downloadURL,
      })

      toast.success("Profile photo updated successfully")
    } catch (error) {
      console.error("Error updating profile photo:", error)
      toast.error("Failed to update profile photo")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDisplayNameUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    const formData = new FormData(event.currentTarget)
    const displayName = formData.get("displayName") as string

    if (!displayName.trim()) {
      toast.error("Display name cannot be empty")
      return
    }

    try {
      setIsUpdating(true)
      await updateProfile({
        displayName,
      })
      toast.success("Display name updated successfully")
    } catch (error) {
      console.error("Error updating display name:", error)
      toast.error("Failed to update display name")
    } finally {
      setIsUpdating(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.photoURL || `/placeholder.svg?height=96&width=96`} />
            <AvatarFallback>{user.displayName?.[0] || user.email?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <Button
            size="icon"
            variant="outline"
            className="absolute bottom-0 right-0 rounded-full"
            onClick={handleAvatarClick}
            disabled={isUpdating}
          >
            <Camera className="h-4 w-4" />
            <span className="sr-only">Change profile photo</span>
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUpdating}
          />
        </div>
        <form onSubmit={handleDisplayNameUpdate} className="flex w-full max-w-xs flex-col gap-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={user.displayName || ""}
            placeholder="Enter your display name"
            disabled={isUpdating}
          />
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Profile"}
          </Button>
        </form>
      </div>
    </div>
  )
}

