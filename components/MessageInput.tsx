"use client"

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/textarea";
import ChatEmojiPicker from '@/components/chat/EmojiPicker';
import { GiftIcon, SmileIcon, Mic, MicOff, Send, X } from 'lucide-react';
import { cn } from "@/lib/utils";

type MessageInputProps = {
  onSend: (message: string) => void;
  onVoiceRecording?: (audio: Blob) => void;
  onGifSelect?: () => void;
  replyToMessage?: { userName: string; text: string };
  onCancelReply?: () => void;
  currentUserId?: string; // kept for future use
  roomId?: string;
  disabled?: boolean;
  enhanced?: boolean;
};

export default function MessageInput({
  onSend,
  onVoiceRecording,
  onGifSelect,
  replyToMessage,
  onCancelReply,
  disabled = false,
  enhanced = false
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Append selected emoji to current message
  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        onVoiceRecording?.(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div
      className={cn(
        enhanced ? "glass-panel rounded-2xl p-4 space-y-default" : "space-y-default"
      )}
    >
      {replyToMessage && (
        <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
          <div className="flex-1">
            <p className="text-xs text-slate-400">
              Replying to {replyToMessage.userName}
            </p>
            <p className="text-sm text-slate-300 truncate">{replyToMessage.text}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end space-x-default">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className={cn(
              "resize-none min-h-[40px] max-h-32",
              enhanced && "input-glass text-white placeholder:text-white/60"
            )}
            rows={1}
          />
        </div>

        <div className="flex items-center space-x-default">
          {/* Emoji button */}
          <button
            type="button"
            className={cn(
              "icon-btn",
              enhanced && "text-white/60 hover:text-white hover:bg-white/10"
            )}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={disabled}
            title="Insert emoji"
          >
            <SmileIcon className="h-4 w-4" />
          </button>

          {/* Giphy button */}
          {onGifSelect && (
            <button
              type="button"
              className={cn(
                "icon-btn",
                enhanced && "text-white/60 hover:text-white hover:bg-white/10"
              )}
              onClick={onGifSelect}
              disabled={disabled}
              title="Send a GIF"
            >
              <GiftIcon className="h-4 w-4" />
            </button>
          )}

          {/* Voice recording button with touch support */}
          {onVoiceRecording && (
            <button
              type="button"
              className={cn(
                "icon-btn",
                isRecording && "text-red-400",
                enhanced && "text-white/60 hover:text-white hover:bg-white/10"
              )}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              onTouchCancel={stopRecording}
              disabled={disabled}
              title="Record voice message"
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={cn(
              "btn-glass bg-green-600 hover:bg-green-500 text-white",
              enhanced && "bg-green-500/80 hover:bg-green-500"
            )}
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Emoji picker overlay */}
    {showEmojiPicker && (
  <ChatEmojiPicker
    onSelectEmoji={handleEmojiSelect}
    onClose={() => setShowEmojiPicker(false)}
  />
)}
    </div>
  );
}