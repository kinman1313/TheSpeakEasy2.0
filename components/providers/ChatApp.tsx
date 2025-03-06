"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
// Update the import path to point to the correct location
import { Sidebar } from "@/components/Sidebar"
import { useAuth } from "@/components/auth/AuthProvider"
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore"
import { getFirestore } from "firebase/firestore"
import { app } from "@/lib/firebase"

const db = getFirestore(app)

interface Message {
  id: string
  text: string
  createdAt: any
  uid: string
  displayName: string
  photoURL: string
}

const ChatApp = () => {
  const { user } = useAuth()
  const [newMessage, setNewMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Add state for sidebar
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>("general")

  // Mock rooms data for the sidebar
  const rooms = [
    { id: "general", name: "General", lastMessage: "Welcome to the chat!" },
    { id: "random", name: "Random", lastMessage: "What's up?" },
  ]

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages: Message[] = []
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          text: doc.data().text,
          createdAt: doc.data().createdAt,
          uid: doc.data().uid,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL,
        })
      })
      setMessages(messages)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert("You must be logged in to send a message.")
      return
    }

    if (newMessage.trim() !== "") {
      await addDoc(collection(db, "messages"), {
        text: newMessage,
        createdAt: serverTimestamp(),
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      })
      setNewMessage("")
      scrollToBottom()
    }
  }

  // Sidebar handlers
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId)
    // You might want to load messages for the selected room here
  }

  const handleProfileClick = () => {
    // Handle profile click
    console.log("Profile clicked")
  }

  const handleRoomSettingsClick = () => {
    // Handle room settings click
    console.log("Room settings clicked")
  }

  return (
    <div className="flex h-screen">
      {/* Add the Sidebar component */}
      <Sidebar
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onRoomSelect={handleRoomSelect}
        onProfileClick={handleProfileClick}
        onRoomSettingsClick={handleRoomSettingsClick}
      />

      <div className="flex flex-col flex-1">
        <div className="bg-gray-200 p-4">{user ? <p>Logged in as {user.displayName}</p> : <p>Not logged in</p>}</div>

        <div className="flex-1 overflow-y-scroll p-4">
          {messages.map((message) => (
            <div key={message.id} className={`mb-2 ${message.uid === user?.uid ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block p-2 rounded-lg ${message.uid === user?.uid ? "bg-blue-500 text-white" : "bg-gray-300"}`}
              >
                <div className="text-sm">{message.displayName}</div>
                <div>{message.text}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 bg-gray-100">
          <div className="flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded mr-2"
            />
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatApp

