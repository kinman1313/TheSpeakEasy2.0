import { StatusSelector } from './StatusSelector';
import { useAuth } from '../../../context/AuthContext';
import { updateUserStatus } from '../../../lib/firebase/firestore';
import { Label } from '../../ui/label';
import { UserStatus } from '../../../types/user';

export function UserSettings() {
    const { user } = useAuth();

    const handleStatusChange = async (newStatus: UserStatus) => {
        try {
            await updateUserStatus(user.uid, newStatus);
            // Status will be updated in real-time via the presence system
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-4">
                    <StatusSelector
                        currentStatus={user.status}
                        onStatusChange={handleStatusChange}
                    />
                    <p className="text-sm text-muted-foreground">
                        Controls how others see your availability
                    </p>
                </div>
            </div>
        </div>
    );
} 