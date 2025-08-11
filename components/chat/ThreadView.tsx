"use client";

import { ThreadNotificationService } from "@/lib/threadNotifications";
import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { ChevronLeft, MessageSquare, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/chat/Message";
import { MessageInput } from "@/components/MessageInput";
import { type Message as MessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

// Type for an optional unsubscribe function
type UnsubscribeFn = (threadId: string, userId: string) => Promise<void> | void;

// Narrowed shape of the service where unsubscribe may exist
interface ThreadNotificationServiceWithOptionalUnsub {
  subscribeToThread(threadId: string, userId: string): Promise<void> | void;
  unsubscribeFromThread?: UnsubscribeFn;
}

// Type-safe helper to access optional unsubscribe
const getUnsubscribeFn = (svc: unknown): UnsubscribeFn | undefined => {
  const candidate = svc as Partial<ThreadNotificationServiceWithOptionalUnsub>;
  return typeof candidate?.unsubscribeFromThread === "function"
    ? candidate.unsubscribeFromThread
    : undefined;
};

// Options passed when sending a message within a thread.
interface SendMessageOptions {
  replyToId?: string;
  parentMessageId?: string;
  metadata?: Record<string, unknown>;
  attachments?: unknown[];
  // Allow forward compatibility with additional option keys without using 'any'
  [key: string]: unknown;
}

interface ThreadViewProps {
  threadId: string;
  parentMessage: MessageType;
  messages: MessageType[];
  currentUser: {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
  };
  onClose: () => void;
  onSendMessage: (text: string, options?: SendMessageOptions) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReply?: (message: MessageType) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onExpire: (messageId: string, duration: number) => void;
  onThreadClick: (message: MessageType) => void;
  className?: string;
}

export function ThreadView({
  threadId,
  parentMessage,
  messages,
  currentUser,
  onClose,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReply,
  onReaction,
  onExpire,
  onThreadClick,
  className,
}: ThreadViewProps) {
  // get the current logged-in user
  const { user } = useAuth();

  // track whether the current user is subscribed to this thread
  const [isSubscribed, setIsSubscribed] = useState(false);

  // subscribe to thread notifications on mount and clean up on unmount
  useEffect(() => {
    if (!user || !threadId) return;

    let cancelled = false;

    (async () => {
      try {
        await ThreadNotificationService.subscribeToThread(threadId, user.uid);
        if (!cancelled) {
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("Failed to subscribe to thread:", err);
      }
    })();

    return () => {
      cancelled = true;
      // Try optional unsubscribe API if available
      const maybeUnsub = getUnsubscribeFn(ThreadNotificationService);
      if (maybeUnsub) {
        try {
          maybeUnsub(threadId, user.uid);
        } catch (e) {
          console.error("Failed to unsubscribe from thread:", e);
        }
      }
    };
  }, [threadId, user]);

  // toggle subscription status on click (replaces missing toggleSubscription API)
  const toggleSubscription = async () => {
    if (!user) return;
    try {
      if (isSubscribed) {
        const maybeUnsub = getUnsubscribeFn(ThreadNotificationService);
        if (maybeUnsub) {
          await maybeUnsub(threadId, user.uid);
        } else {
          console.warn("unsubscribeFromThread not available on ThreadNotificationService");
        }
        setIsSubscribed(false);
      } else {
        await ThreadNotificationService.subscribeToThread(threadId, user.uid);
        setIsSubscribed(true);
      }
    } catch (e) {
      console.error("Failed to toggle thread subscription:", e);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 tap-feedback"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Thread</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSubscription}
          className="h-8 w-8 tap-feedback"
        >
          {isSubscribed ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Parent message (the one being threaded) */}
      <div className="p-4 border-b bg-muted/50">
        <Message
          message={parentMessage}
          isCurrentUser={parentMessage.uid === currentUser.uid}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onExpire={onExpire}
          onThreadClick={onThreadClick}
          onReply={onReply}
          onReaction={onReaction}
          className="!p-0"
        />
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isCurrentUser={message.uid === currentUser.uid}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onReply={onReply}
            onReaction={onReaction}
            onExpire={onExpire}
            onThreadClick={onThreadClick}
          />
        ))}
      </div>

      {/* Input for replying within the thread */}
      <div className="p-4 border-t">
        <MessageInput
          onSend={onSendMessage}
          currentUserId={currentUser.uid}
          currentUserName={currentUser.displayName || ""}
          roomId={threadId}
          replyToMessage={parentMessage}
          onCancelReply={onClose}
        />
      </div>
    </div>
  );
}
