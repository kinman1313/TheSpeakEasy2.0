import { User } from '../../types/user';
import { StatusIndicator } from './StatusIndicator';

type UserAvatarProps = {
    user: User;
    size?: 'sm' | 'md' | 'lg';
    showStatus?: boolean;
    className?: string;
};

export function UserAvatar({ user, size = 'md', showStatus = false, className }: UserAvatarProps) {
    const avatarSizes = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
    };

    return (
        <div className={`relative ${className}`}>
            <img
                src={user.avatar || '/default-avatar.png'}
                alt={user.name}
                className={`rounded-full object-cover ${avatarSizes[size]}`}
            />
            {showStatus && (
                <div className="absolute bottom-0 right-0">
                    <StatusIndicator status={user.status} size={size} />
                </div>
            )}
        </div>
    );
} 