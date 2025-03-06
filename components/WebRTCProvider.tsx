"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type WebRTCContextType = {
  isWebRTCSupported: boolean
}

const WebRTCContext = createContext<WebRTCContextType>({
  isWebRTCSupported: false,
})

export function WebRTCProvider({ children }: { children: React.ReactNode }) {
  const [isWebRTCSupported, setIsWebRTCSupported] = useState(false)

  useEffect(() => {
    setIsWebRTCSupported(typeof RTCPeerConnection !== "undefined")
  }, [])

  return <WebRTCContext.Provider value={{ isWebRTCSupported }}>{children}</WebRTCContext.Provider>
}

export const useWebRTC = () => useContext(WebRTCContext)

