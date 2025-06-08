"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoomList } from "./room-list"
import EnhancedUserList from "../chat/enhanced-user-list"
import { Home, Users, Settings, LogOut } from "lucide-react"

interface RoomDashboardProps {
  selectedRoomId?: string
}

export function RoomDashboard({ selectedRoomId }: RoomDashboardProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("rooms")

  const handleRoomSelect = (roomId: string) => {
    router.push(`/room/${roomId}`)
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const navigateToMainChat = () => {
    router.push("/")
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access rooms.</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">The SpeakEasy</h1>
            <span className="text-sm text-muted-foreground">Rooms</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToMainChat}
            >
              <Home className="h-4 w-4 mr-2" />
              Main Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 border-r bg-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b px-4 py-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rooms" className="text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  Rooms
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  Users
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="rooms" className="mt-0 h-full">
              <RoomList 
                selectedRoomId={selectedRoomId}
                onRoomSelect={handleRoomSelect}
              />
            </TabsContent>
            
            <TabsContent value="users" className="mt-0 h-full">
              <EnhancedUserList 
                showDMButton={true}
                showInviteButton={false}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center bg-muted/10">
          {selectedRoomId ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Room Selected</h2>
              <p className="text-muted-foreground">
                You are viewing room: {selectedRoomId}
              </p>
              <Button onClick={() => router.push(`/room/${selectedRoomId}`)}>
                Enter Room
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-md">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <h2 className="text-2xl font-semibold">Welcome to Rooms</h2>
              <p className="text-muted-foreground">
                Select a room from the sidebar to start chatting, or create a new room to get started.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Create private rooms for team discussions
                </p>
                <p className="text-sm text-muted-foreground">
                  • Start direct messages with other users
                </p>
                <p className="text-sm text-muted-foreground">
                  • Invite members to join your conversations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}