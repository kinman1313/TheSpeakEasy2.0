import React, { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { updateUserStatus } from '@/lib/firebase/firestore'
import { Label } from '@/components/ui/label'
import { UserStatus } from '@/types/user'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UserSettingsProps {
    onClose: () => void
}

export default function UserSettings({ onClose }: UserSettingsProps) {
    const { user } = useAuth()
    const [selectedStatus, setSelectedStatus] = useState<UserStatus>('online')

    const handleStatusChange = async (newStatus: UserStatus) => {
        if (!user) return

        try {
            await updateUserStatus(user.uid, newStatus)
            setSelectedStatus(newStatus)
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="status-select">Status</Label>
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                    <SelectTrigger id="status-select">
                        <SelectValue placeholder="Select your status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="online">🟢 Online</SelectItem>
                        <SelectItem value="idle">🟡 Idle</SelectItem>
                        <SelectItem value="do-not-disturb">🔴 Do Not Disturb</SelectItem>
                        <SelectItem value="offline">⚫ Offline</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                    Close
                </Button>
            </div>
        </div>
    )
} 