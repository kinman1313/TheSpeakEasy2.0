// components/chat/OptimizedMessage.tsx - High-performance message component
import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  MoreVertical, 
  Reply, 
  Edit, 
  Trash, 
  Copy, 
  Flag,
  Download,
  Play,
  Pause,
  ExternalLink,
  Clock,
  MessageSquare
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileIcon } from '@/lib/storage';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { MessageStatus as MessageStatusComponent } from '@/components/chat/MessageStatus';
import Image from 'next/image';

interface Attachment {
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  name: string;
  size: number;
  duration?: number;
  thumbnail?: string;
}

interface MessageProps {
  id: string;
  text: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  uid: string;
  currentUserId: string;
  reactions?: Record<string, { count: number; users: string[] }>;
  attachments?: Attachment[];
  replyTo?: {
    id: string;
    text: string;
    displayName: string;
  };
  isOwn: boolean;
  isConsecutive?: boolean;
  showAvatar?: boolean;
  isHighlighted?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  imageUrl?: string;
  gifUrl?: string;
  audioUrl?: string;
  voiceMessageUrl?: string;
  mp3Url?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy?: string[];
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onCopy?: (text: string) => void;
  onFlag?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onExpire?: (messageId: string, duration: number) => void;
  onThreadClick?: (messageId: string) => void;
  threadCount?: number;
  isThreadView?: boolean;
  className?: string;
  chatColor?: string;
}

// Memoized time formatting component
const MessageTime = memo(({ createdAt, editedAt }: { 
  createdAt: Timestamp; 
  editedAt?: Timestamp; 
}) => {
  const timeDisplay = useMemo(() => {
    const date = createdAt.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  }, [createdAt]);

  return (
    <span className="text-xs opacity-70 flex items-center">
      {timeDisplay}
      {editedAt && (
        <span className="ml-1 italic opacity-60">(edited)</span>
      )}
    </span>
  );
});
MessageTime.displayName = 'MessageTime';

// Memoized attachment component
const MessageAttachment = memo(({ attachment }: { attachment: Attachment }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = useCallback(async () => {
    if (attachment.type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error('Audio play error:', error);
        }
      }
    }
  }, [attachment.type, isPlaying]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.target = '_blank';
    link.click();
  }, [attachment.url, attachment.name]);

  switch (attachment.type) {
    case 'image':
      return (
        <div className="mt-2 max-w-sm">
          <Image
            src={attachment.url}
            alt={attachment.name}
            width={300}
            height={200}
            className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
            onClick={() => window.open(attachment.url, '_blank')}
            loading="lazy"
          />
        </div>
      );

    case 'audio':
      return (
        <div className="mt-2 p-3 bg-gray-100 rounded-lg max-w-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              className="flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <audio
            ref={audioRef}
            src={attachment.url}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      );

    case 'video':
      return (
        <div className="mt-2 max-w-md">
          <video
            ref={videoRef}
            src={attachment.url}
            poster={attachment.thumbnail}
            controls
            className="w-full rounded-lg"
          />
        </div>
      );

    default:
      return (
        <div className="mt-2 p-3 bg-gray-100 rounded-lg max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">
                {attachment.name.split('.').pop()?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
  }
});
MessageAttachment.displayName = 'MessageAttachment';

// Legacy file attachment component
const LegacyFileAttachment = memo(({ 
  fileUrl, 
  fileName, 
  fileType, 
  fileSize,
  imageUrl,
  gifUrl,
  audioUrl,
  voiceMessageUrl,
  mp3Url 
}: {
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  imageUrl?: string;
  gifUrl?: string;
  audioUrl?: string;
  voiceMessageUrl?: string;
  mp3Url?: string;
}) => {
  const handleFileDownload = useCallback((url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    link.click();
  }, []);

  if (fileUrl) {
    const isImage = fileType?.startsWith('image/');
    const isVideo = fileType?.startsWith('video/');
    const isAudio = fileType?.startsWith('audio/');

    if (isImage) {
      return (
        <div className="mt-2 max-w-sm">
          <Image
            src={fileUrl}
            alt={fileName || 'Shared image'}
            width={300}
            height={200}
            className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(fileUrl, '_blank')}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="mt-2 max-w-sm">
          <video controls className="rounded-lg max-w-full" preload="metadata">
            <source src={fileUrl} type={fileType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="mt-2">
          <AudioPlayer src={fileUrl} mp3Url={mp3Url} />
        </div>
      );
    }

    return (
      <div className="mt-2 p-3 bg-muted rounded-lg border max-w-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getFileIcon(fileType || '')}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{fileName || 'Unknown file'}</p>
            {fileSize && (
              <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFileDownload(fileUrl, fileName || 'file')}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {imageUrl && (
        <div className="mt-2">
          <Image
            src={imageUrl}
            alt="Shared content"
            width={300}
            height={200}
            className="rounded-lg object-cover max-w-sm h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(imageUrl, '_blank')}
          />
        </div>
      )}

      {gifUrl && (
        <div className="mt-2">
          <Image
            src={gifUrl}
            alt="GIF"
            width={300}
            height={200}
            className="rounded-lg max-w-sm h-auto"
            unoptimized
          />
        </div>
      )}

      {audioUrl && (
        <div className="mt-2">
          <AudioPlayer src={audioUrl} mp3Url={mp3Url} />
        </div>
      )}

      {voiceMessageUrl && (
        <div className="mt-2">
          <AudioPlayer src={voiceMessageUrl} mp3Url={mp3Url} />
        </div>
      )}
    </>
  );
});
LegacyFileAttachment.displayName = 'LegacyFileAttachment';

// Reply preview component
const ReplyPreview = memo(({ 
  replyTo, 
  onJumpToMessage 
}: { 
  replyTo: { id: string; text: string; displayName: string };
  onJumpToMessage?: (messageId: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onJumpToMessage?.(replyTo.id);
  }, [replyTo.id, onJumpToMessage]);

  return (
    <div 
      className="mb-2 p-2 bg-gray-50 border-l-2 border-gray-300 rounded cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <Reply className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-gray-600">{replyTo.displayName}</span>
      </div>
      <p className="text-sm text-gray-800 line-clamp-2">{replyTo.text || '📎 Attachment'}</p>
    </div>
  );
});
ReplyPreview.displayName = 'ReplyPreview';

// Main optimized message component
export const OptimizedMessage = memo<MessageProps>(({
  id,
  text,
  displayName,
  photoURL,
  createdAt,
  editedAt,
  uid,
  currentUserId,
  reactions,
  attachments,
  replyTo,
  isOwn,
  isConsecutive = false,
  showAvatar = true,
  isHighlighted = false,
  fileUrl,
  fileName,
  fileType,
  fileSize,
  imageUrl,
  gifUrl,
  audioUrl,
  voiceMessageUrl,
  mp3Url,
  status = 'sent',
  readBy = [],
  onReply,
  onEdit,
  onDelete,
  onReact,
  onCopy,
  onFlag,
  onJumpToMessage,
  onExpire,
  onThreadClick,
  threadCount,
  isThreadView = false,
  className,
  chatColor
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const processedReactions = useMemo(() => {
    if (!reactions) return {};
    return reactions;
  }, [reactions]);

  const hasReactions = useMemo(() => {
    return Object.keys(processedReactions).length > 0;
  }, [processedReactions]);

  const hasAttachments = useMemo(() => {
    return (attachments && attachments.length > 0) || 
           fileUrl || imageUrl || gifUrl || audioUrl || voiceMessageUrl;
  }, [attachments, fileUrl, imageUrl, gifUrl, audioUrl, voiceMessageUrl]);

  const handleReply = useCallback(() => {
    onReply?.(id);
    setShowMenu(false);
  }, [id, onReply]);

  const handleEdit = useCallback(() => {
    if (isEditing && editText !== text) {
      onEdit?.(id, editText);
    }
    setIsEditing(!isEditing);
    setShowMenu(false);
  }, [id, onEdit, isEditing, editText, text]);

  const handleDelete = useCallback(() => {
    onDelete?.(id);
    setShowMenu(false);
  }, [id, onDelete]);

  const handleCopy = useCallback(() => {
    onCopy?.(text);
    setShowMenu(false);
  }, [text, onCopy]);

  const handleFlag = useCallback(() => {
    onFlag?.(id);
    setShowMenu(false);
  }, [id, onFlag]);

  const handleThreadClick = useCallback(() => {
    onThreadClick?.(id);
  }, [id, onThreadClick]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEdit();
    } else if (e.key === 'Escape') {
      setEditText(text);
      setIsEditing(false);
    }
  }, [handleEdit, text]);

  const quickReactions = useMemo(() => ['👍', '❤️', '😊', '😂'], []);

  const handleQuickReact = useCallback((emoji: string) => {
    onReact?.(id, emoji);
  }, [id, onReact]);

  const messageContent = useMemo(() => {
    if (!text) return { __html: '' };
    
    let processedText = text;
    
    // URL detection and linkification
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processedText = processedText.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`;
    });
    
    // Mention detection
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    processedText = processedText.replace(mentionRegex, (match, username) => {
      return `<span class="text-blue-500 font-medium">${match}</span>`;
    });

    return { __html: processedText };
  }, [text]);

  const avatarContent = useMemo(() => {
    if (!showAvatar || isConsecutive) return null;
    
    return (
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={photoURL} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }, [showAvatar, isConsecutive, photoURL, displayName]);

  return (
    <div 
      id={`message-${id}`}
      data-message-id={id}
      className={cn(
        "group flex gap-3 py-2 px-3 hover:bg-gray-50 transition-colors rounded-lg",
        isHighlighted && "bg-yellow-50 border-l-2 border-yellow-400",
        isConsecutive && "pt-1",
        isOwn 
          ? 'bg-blue-100 dark:bg-blue-900 ml-auto bg-opacity-70 dark:bg-opacity-60'
          : 'bg-gray-100 dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-60',
        'mb-4',
        className
      )}
      style={{
        maxWidth: '60%',
        minWidth: 'fit-content',
        width: text && text.length < 30 ? 'fit-content' : undefined,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar column */}
      <div className="w-8 flex justify-center">
        {avatarContent}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Header with name and timestamp */}
        {!isConsecutive && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-gray-900">{displayName}</span>
              <MessageTime createdAt={createdAt} editedAt={editedAt} />
            </div>
            <MessageStatusComponent status={status} />
          </div>
        )}

        {/* Reply preview */}
        {replyTo && (
          <ReplyPreview replyTo={replyTo} onJumpToMessage={onJumpToMessage} />
        )}

        {/* Message text */}
        <div className={cn("flex-1 min-w-0", isOwn && "text-right")}>
          {isEditing ? (
            <input
              ref={editInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleEdit}
              className="w-full px-2 py-1 text-sm bg-background border rounded"
              placeholder="Edit message..."
            />
          ) : (
            text && (
              <div 
                className={cn(
                  "text-sm text-gray-800 leading-relaxed break-words",
                  isOwn && "text-right"
                )}
                style={{ color: chatColor || undefined }}
                dangerouslySetInnerHTML={messageContent}
              />
            )
          )}
        </div>

        {/* Attachments */}
        {hasAttachments && (
          <div className="space-y-2">
            {attachments && attachments.map((attachment, index) => (
              <MessageAttachment key={index} attachment={attachment} />
            ))}
            
            <LegacyFileAttachment 
              fileUrl={fileUrl}
              fileName={fileName}
              fileType={fileType}
              fileSize={fileSize}
              imageUrl={imageUrl}
              gifUrl={gifUrl}
              audioUrl={audioUrl}
              voiceMessageUrl={voiceMessageUrl}
              mp3Url={mp3Url}
            />
          </div>
        )}

        {/* Message status for current user */}
        {isOwn && (
          <div className="flex items-center gap-1 mt-1">
            <MessageStatusComponent status={status} />
            {readBy.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Read by {readBy.length}
              </span>
            )}
          </div>
        )}

        {/* Quick reactions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
          {quickReactions.map(emoji => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200"
              onClick={() => handleQuickReact(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>

        {/* Thread info */}
        {threadCount && threadCount > 0 && !isThreadView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThreadClick}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            {threadCount} {threadCount === 1 ? 'reply' : 'replies'}
          </Button>
        )}
      </div>

      {/* Action menu */}
      <div className={cn(
        "transition-opacity",
        showActions ? "opacity-100" : "opacity-0 md:opacity-0 group-hover:opacity-100"
      )}>
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={handleReply}>
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </DropdownMenuItem>
            {isOwn && (
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </DropdownMenuItem>
            {onThreadClick && (
              <DropdownMenuItem onClick={handleThreadClick}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Thread
              </DropdownMenuItem>
            )}
            {onExpire && (
              <DropdownMenuItem onClick={() => onExpire(id, 60)}>
                <Clock className="w-4 h-4 mr-2" />
                Set Timer
              </DropdownMenuItem>
            )}
            {!isOwn && (
              <DropdownMenuItem onClick={handleFlag}>
                <Flag className="w-4 h-4 mr-2" />
                Report
              </DropdownMenuItem>
            )}
            {isOwn && (
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

OptimizedMessage.displayName = 'OptimizedMessage';

export default OptimizedMessage;