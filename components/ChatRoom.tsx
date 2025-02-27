"use client"

// Render the chat room UI
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Phone, PhoneOff, Send, Smile, Video, VideoOff, ImageIcon, Info } from "lucide-react"
import { useState } from "react"
import { RoomSettings } from "./RoomSettings"
import { toast } from "sonner"
import { CallControls } from "./CallControls"
import { MessageReactions } from "./MessageReactions"
import { EmojiPicker } from "./EmojiPicker"
import { VoiceMessage } from "./VoiceMessage"

interface ChatRoomProps {
    room: {
        id: string
        name: string
        isPrivate: boolean
    }
    user: {
        uid: string
        displayName: string
        photoURL: string
    } | null
    groupedMessages: any[]
    isLoading: boolean
    sendMessage: (e: any) => void
    formValue: string
    setFormValue: (value: string) => void
    messagesEndRef: any
    typingUsers: any
    updateTypingIndicator: () => void
    userSettings: any
    showEmojiPicker: boolean
    setShowEmojiPicker: (value: boolean) => void
    showGiphyPicker: boolean
    setShowGiphyPicker: (value: boolean) => void
    giphySearch: string
    setGiphySearch: (value: string) => void
    giphyResults: any[]
    searchGiphy: (value: string) => void
    insertGif: (gif: any) => void
    fileInputRef: any
    handleImageUpload: (e: any) => void
    handleVoiceMessage: (audioURL: string) => void
    isInCall: boolean
    isVideoCall: boolean
    onCallStart: (roomDetails: any) => void
    onCallEnd: () => void
}

const ChatRoom = ({
    room,
    user,
    groupedMessages,
    isLoading,
    sendMessage,
    formValue,
    setFormValue,
    messagesEndRef,
    typingUsers,
    updateTypingIndicator,
    userSettings,
    showEmojiPicker,
    setShowEmojiPicker,
    showGiphyPicker,
    setShowGiphyPicker,
    giphySearch,
    setGiphySearch,
    giphyResults,
    searchGiphy,
    insertGif,
    fileInputRef,
    handleImageUpload,
    handleVoiceMessage,
    isInCall,
    isVideoCall,
    onCallStart,
    onCallEnd,
}: ChatRoomProps) => {
    const [showRoomInfo, setShowRoomInfo] = useState(false)
    // Render the chat room UI
    return (
        <Card className="flex-grow bg-opacity-20 backdrop-filter backdrop-blur-lg border-none shadow-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                    <CardTitle className="text-2xl font-bold text-neon-green glow-green">
                        {room.isPrivate ? "🔒 " : "# "}
                        {room.name}
                    </CardTitle>
                    <Dialog open={showRoomInfo} onOpenChange={setShowRoomInfo}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-2 text-neon-blue"
                            onClick={() => setShowRoomInfo(true)}
                            aria-label="Room settings"
                        >
                            <Info className="h-5 w-5" />
                        </Button>
                        <DialogContent className="bg-opacity-90 backdrop-filter backdrop-blur-lg border-neon-blue">
                            <RoomSettings roomId={room.id} onClose={() => setShowRoomInfo(false)} />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center space-x-2">
                    {!isInCall ? (
                        <>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onCallStart({ roomId: room.id, roomName: room.name, isVideo: false })}
                                className="text-neon-yellow hover:text-neon-yellow hover:bg-opacity-20"
                                aria-label="Start voice call"
                            >
                                <Phone className="h-5 w-5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onCallStart({ roomId: room.id, roomName: room.name, isVideo: true })}
                                className="text-neon-orange hover:text-neon-orange hover:bg-opacity-20"
                                aria-label="Start video call"
                            >
                                <Video className="h-5 w-5" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={onCallEnd}
                                className="text-neon-red hover:text-neon-red hover:bg-opacity-20"
                                aria-label="End call"
                            >
                                {isVideoCall ? <VideoOff className="h-5 w-5" /> : <PhoneOff className="h-5 w-5" />}
                            </Button>
                            <span className="text-neon-green glow-green text-sm">In Call</span>
                        </>
                    )}
                </div>
            </CardHeader>

            {isInCall && <CallControls isVideo={isVideoCall} roomId={room.id} />}

            <CardContent className="overflow-y-auto h-[calc(100vh-240px)] px-4 md:px-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedMessages.map((group, groupIndex) => (
                            <div key={groupIndex} className="space-y-2">
                                {group.map((msg, msgIndex) => (
                                    <div key={msg.id} className={`flex ${msg.uid === user?.uid ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`flex ${msg.uid === user?.uid ? "flex-row-reverse" : "flex-row"} items-end space-x-2`}
                                        >
                                            {msgIndex === 0 && (
                                                <Avatar className="h-8 w-8 mx-2">
                                                    <AvatarImage
                                                        src={msg.photoURL || `/api/avatar?name=${encodeURIComponent(msg.displayName)}`}
                                                        alt={msg.displayName}
                                                    />
                                                    <AvatarFallback>{msg.displayName[0]}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div
                                                className={`max-w-xs ${msg.uid === user?.uid ? "bg-neon-blue" : "bg-neon-green"
                                                    } bg-opacity-30 p-3 rounded-lg`}
                                            >
                                                {msgIndex === 0 && (
                                                    <div className="text-xs text-neon-white opacity-70 mb-1">{msg.displayName}</div>
                                                )}

                                                {msg.text && <p className="text-neon-white glow-white break-words">{msg.text}</p>}

                                                {msg.audioUrl && (
                                                    <audio
                                                        controls
                                                        src={msg.audioUrl}
                                                        className="w-full"
                                                        onError={() => toast.error("Could not load audio")}
                                                    />
                                                )}

                                                {msg.imageUrl && (
                                                    <img
                                                        src={msg.imageUrl || "/placeholder.svg"}
                                                        alt="Shared image"
                                                        className="max-w-full rounded-md"
                                                        onError={(e) => {
                                                            e.currentTarget.src = "/placeholder.svg"
                                                            toast.error("Could not load image")
                                                        }}
                                                    />
                                                )}

                                                {msg.gifUrl && (
                                                    <img
                                                        src={msg.gifUrl || "/placeholder.svg"}
                                                        alt="GIF"
                                                        className="max-w-full rounded-md"
                                                        onError={(e) => {
                                                            e.currentTarget.src = "/placeholder.svg"
                                                            toast.error("Could not load GIF")
                                                        }}
                                                    />
                                                )}

                                                <MessageReactions message={msg} />

                                                {userSettings.showReadReceipts &&
                                                    msg.uid === user?.uid &&
                                                    msg.readBy &&
                                                    msg.readBy.length > 1 && (
                                                        <div className="text-xs text-neon-white opacity-50 mt-1 text-right">
                                                            Read by {msg.readBy.length - 1}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {userSettings.showTypingIndicators && Object.values(typingUsers).filter((u) => u.isTyping).length > 0 && (
                            <div className="flex items-center space-x-2">
                                {Object.values(typingUsers)
                                    .filter((u) => u.isTyping)
                                    .map((typingUser, index) => (
                                        <div key={index} className="flex items-center">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage
                                                    src={typingUser.photoURL || `/api/avatar?name=${encodeURIComponent(typingUser.displayName)}`}
                                                />
                                                <AvatarFallback>{typingUser.displayName[0]}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    ))}
                                <div className="text-sm text-neon-white">
                                    {Object.values(typingUsers).filter((u) => u.isTyping).length === 1
                                        ? `${Object.values(typingUsers).find((u) => u.isTyping)?.displayName} is typing...`
                                        : "Several people are typing..."}
                                    <span className="inline-block animate-pulse">...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </CardContent>

            <CardFooter>
                <form onSubmit={sendMessage} className="flex w-full space-x-2">
                    <div className="flex space-x-2">
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="text-neon-yellow" aria-label="Add emoji">
                                    <Smile className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-opacity-90 backdrop-filter backdrop-blur-lg border-neon-yellow">
                                <EmojiPicker
                                    onEmojiClick={(emojiObject) => {
                                        setFormValue((prev) => prev + emojiObject.emoji)
                                        setShowEmojiPicker(false)
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        <Popover open={showGiphyPicker} onOpenChange={setShowGiphyPicker}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="text-neon-pink" aria-label="Add GIF">
                                    GIF
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 bg-opacity-90 backdrop-filter backdrop-blur-lg border-neon-pink">
                                <Input
                                    placeholder="Search GIFs"
                                    value={giphySearch}
                                    onChange={(e) => {
                                        setGiphySearch(e.target.value)
                                        searchGiphy(e.target.value)
                                    }}
                                    className="mb-2 bg-opacity-30 border-neon-pink text-neon-white"
                                />
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                    {giphyResults.map((gif) => (
                                        <img
                                            key={gif.id}
                                            src={gif.images.fixed_height_small.url || "/placeholder.svg"}
                                            alt="GIF"
                                            onClick={() => insertGif(gif)}
                                            className="cursor-pointer rounded-md hover:ring-2 hover:ring-neon-pink"
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            type="button"
                            variant="outline"
                            className="text-neon-blue"
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Upload image"
                        >
                            <ImageIcon className="h-5 w-5" />
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                                aria-label="Image upload"
                            />
                        </Button>

                        <VoiceMessage onSend={handleVoiceMessage} />
                    </div>

                    <Input
                        value={formValue}
                        onChange={(e) => {
                            setFormValue(e.target.value)
                            updateTypingIndicator()
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && userSettings.enterToSend) {
                                e.preventDefault()
                                sendMessage()
                            }
                        }}
                        placeholder="Type your message..."
                        className="flex-grow bg-opacity-30 border-neon-white text-neon-white"
                        aria-label="Message input"
                    />

                    <Button type="submit" className="bg-neon-purple glow-purple" aria-label="Send message">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    )
}

