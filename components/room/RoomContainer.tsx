"use client"

import React from 'react'

interface RoomContainerProps {
    roomId: string
    children: React.ReactNode
}

export function RoomContainer({ roomId, children }: RoomContainerProps) {
    const roomColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500']
    const colorIndex = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % roomColors.length
    const roomColor = roomColors[colorIndex]

    return (
        <div className={`room-container ${roomColor} p-4 rounded-lg`}>
            {children}
        </div>
    )
}

export default RoomContainer; 