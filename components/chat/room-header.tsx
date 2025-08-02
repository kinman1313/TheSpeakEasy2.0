// components/chat/room-header.tsx
"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Menu, Hash, Users, MessageCircle, Phone, Video, Settings,
  RefreshCw, Wifi, WifiOff, PhoneCall, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWebRTC } from '@/components/providers/WebRTCProvider'

interface RoomHeaderProps {
  roomName: string
  roomType: 'lobby' | 'room' | 'dm'
  isConnected: boolean
  isLoading: boolean
  onMenuToggle?: () => void
  onRetryConnection?: () => void
  user?: {
    displayName?: string
    email?: string
  }
  onlineUsers: Array<{
    uid: string
    userName?: string
    photoURL?: string
  }>
  onLogout?: () => void
  showUserList: boolean
  onToggleUserList: (show: boolean) => void
  showMobileCallPicker: boolean
  onToggleMobileCallPicker: (show: boolean) => void
  webRTCCallStatus?: string // optional if you want to keep it
  otherUserId?: string        // <-- add this line back
  otherUser?: {
    displayName: string
    photoURL?: string
    isOnline?: boolean
  }
  memberCount?: number
  className?: string
}

export function RoomHeader({
  roomName,
  roomType,
  isConnected,
  isLoading,
  onMenuToggle,
  onRetryConnection,
  user,
  onlineUsers,
  onLogout,
  showUserList,
  onToggleUserList,
  showMobileCallPicker,
  onToggleMobileCallPicker,
  otherUserId,
  otherUser,
  memberCount,
  className,
}: RoomHeaderProps) {
  const webRTCContext = useWebRTC()

  const handleVoiceCall = () => {
    if (otherUserId && webRTCContext) {
      webRTCContext.initiateCall(otherUserId, 'audio')
    }
  }
  const handleVideoCall = () => {
    if (otherUserId && webRTCContext) {
      webRTCContext.initiateCall(otherUserId, 'video')
    }
  }

  const getRoomIcon = () => {
    switch (roomType) {
      case 'lobby': return <Hash className="h-5 w-5" />
      case 'room': return <Users className="h-5 w-5" />
      case 'dm':   return <MessageCircle className="h-5 w-5" />
      default:     return <Hash className="h-5 w-5" />
    }
  }

  const getConnectionStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-yellow-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-xs hidden sm:inline">Connecting...</span>
        </div>
      )
    }
    if (isConnected) {
      return (
        <div className="flex items-center gap-2 text-green-400">
          <Wifi className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Connected</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 text-red-400">
        <WifiOff className="h-4 w-4" />
        <span className="text-xs hidden sm:inline">Disconnected</span>
        {onRetryConnection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetryConnection}
            className="text-red-400 hover:text-red-300 hover:bg-red-600/20 text-xs h-6 px-2"
          >
            Retry
          </Button>
        )}
      </div>
    )
  }

  const getRoomInfo = () => {
    if (roomType === 'dm' && otherUser) {
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={otherUser.photoURL} alt={otherUser.displayName} />
            <AvatarFallback className="text-xs">
              {otherUser.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {otherUser.displayName}
            </h1>
            {otherUser.isOnline && (
              <span className="text-xs text-green-400">Online</span>
            )}
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-3">
        {getRoomIcon()}
        <div className="flex flex-col min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">{roomName}</h1>
          {memberCount && (
            <span className="text-xs text-slate-300">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "h-14 md:h-16 glass-card rounded-none md:rounded-xl flex items-center justify-between px-3 md:px-6 neon-glow",
      className
    )}>
      {/* Left section */}
      <div className="flex items-center space-x-default min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-300 hover:text-green-400 hover:bg-green-500/20 shrink-0"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {getRoomInfo()}
        <div className="hidden sm:flex items-center space-x-default ml-auto">
          {getConnectionStatus()}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-default shrink-0">
        {onlineUsers.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-green-400 hover:text-green-300 hover:bg-green-500/20"
            onClick={() => onToggleMobileCallPicker(!showMobileCallPicker)}
            title="Make Call"
          >
            <Phone className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-slate-300 hover:text-green-400 hover:bg-green-500/20"
          onClick={() => onToggleUserList(!showUserList)}
          title="Toggle User List"
        >
          <Users className="h-4 w-4" />
        </Button>
       {roomType === 'dm' && otherUserId && webRTCContext && (
  <div className="hidden md:flex items-center space-x-default">
    <Button
      variant="ghost"
      size="sm"
      onClick={handleVoiceCall}
      className="text-slate-300 hover:text-green-400 hover:bg-green-500/20 touch-manipulation"
      title="Voice call"
      disabled={!otherUser?.isOnline || webRTCContext.callStatus !== 'idle'}
    >
      <Phone className="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="sm"
      onClick={handleVideoCall}
      className="text-slate-300 hover:text-blue-400 hover:bg-blue-500/20 touch-manipulation"
      title="Video call"
      disabled={!otherUser?.isOnline || webRTCContext.callStatus !== 'idle'}
    >
      <Video className="h-4 w-4" />
    </Button>
  </div>
)}

        <span className="hidden sm:block text-sm text-slate-300 mr-2 truncate max-w-32">
          {user?.displayName || user?.email || "User"}
        </span>
        {webRTCContext?.isInCall && (
          <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 rounded-full mr-2">
            <PhoneCall className="h-3 w-3 text-red-400" />
            <span className="text-xs text-red-400 hidden sm:inline">In Call</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="tap-feedback text-slate-300 hover:text-green-400 hover:bg-green-500/20"
          title="User Profile"
        >
          <Settings className="h-4 md:h-5 w-4 md:w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          className="text-slate-300 hover:text-red-400 hover:bg-red-600/20"
          title="Sign Out"
        >
          <LogOut className="h-4 md:h-5 w-4 md:w-5" />
        </Button>
      </div>
    </div>
  )
}

export default RoomHeader