import { UserStatus } from '@/types/user';
import { StatusIndicator } from '@/components/user/StatusIndicator';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';

type StatusSelectorProps = {
    currentStatus: UserStatus;
    onStatusChange: (status: UserStatus) => void;
};

export function StatusSelector({ currentStatus, onStatusChange }: StatusSelectorProps) {
    const statusOptions: { value: UserStatus; label: string }[] = [
        { value: 'online', label: 'Online' },
        { value: 'idle', label: 'Idle' },
        { value: 'do-not-disturb', label: 'Do Not Disturb' },
        { value: 'offline', label: 'Offline' },
    ];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="gap-2">
                    <StatusIndicator status={currentStatus} />
                    <span className="capitalize">{currentStatus.replace('-', ' ')}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1">
                <div className="space-y-1">
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            className={cn(
                                'w-full flex items-center gap-2 p-2 rounded-md text-sm',
                                'hover:bg-muted/50 transition-colors',
                                currentStatus === option.value && 'bg-muted/30'
                            )}
                            onClick={() => onStatusChange(option.value)}
                        >
                            <StatusIndicator status={option.value} />
                            {option.label}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
} 