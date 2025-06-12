import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/user/UserAvatar';
import { cn } from '../../lib/utils';
import { Message } from '../../types/message';
import { User } from '../../types/user';

type MessageItemProps = {
    message: Message;
    sender: User;
};

export function MessageItem({ message, sender }: MessageItemProps) {
    const { user: currentUser } = useAuth();

    return (
        <div className={cn(
            'flex gap-3 p-3',
            currentUser?.id === sender.id ? 'justify-end' : 'justify-start'
        )}>
            {currentUser?.id !== sender.id && (
                <div className="flex-shrink-0">
                    <UserAvatar
                        user={sender}
                        size="sm"
                        showStatus={true}
                    />
                </div>
            )}

            <div className={cn(
                'max-w-[80%] space-y-1',
                currentUser?.id === sender.id ? 'items-end' : 'items-start'
            )}>
                {currentUser?.id !== sender.id && (
                    <p className="text-sm font-medium">{sender.name}</p>
                )}
                <div className={cn(
                    'px-4 py-2 rounded-lg',
                    currentUser?.id === sender.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                )}>
                    <p className="text-sm">{message.content}</p>
                </div>
            </div>
        </div>
    );
} 