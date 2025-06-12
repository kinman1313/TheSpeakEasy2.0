import { UserStatus } from '@/types/user';
import { cn } from '@/lib/utils';

type StatusIndicatorProps = {
    status: UserStatus;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

export const StatusIndicator = ({ status, size = 'md', className }: StatusIndicatorProps) => {
    const sizeClasses = {
        sm: 'h-2 w-2',
        md: 'h-3 w-3',
        lg: 'h-4 w-4',
    };

    const statusClasses = {
        online: 'bg-green-500',
        idle: 'bg-yellow-500',
        offline: 'bg-gray-500',
        'do-not-disturb': 'bg-red-500',
    };

    return (
        <span
            className={cn(
                'inline-block rounded-full border-2 border-background',
                sizeClasses[size],
                statusClasses[status],
                className
            )}
        />
    );
};

export default StatusIndicator; 