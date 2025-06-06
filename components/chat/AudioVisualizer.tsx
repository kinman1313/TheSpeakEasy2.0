"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AudioVisualizerProps {
    stream: MediaStream
    className?: string
}

export function AudioVisualizer({ stream, className }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationFrameRef = useRef<number>()

    useEffect(() => {
        if (!stream || !canvasRef.current) return

        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        analyser.fftSize = 256
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        const canvas = canvasRef.current
        const canvasCtx = canvas.getContext("2d")

        if (!canvasCtx) return

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw)
            analyser.getByteFrequencyData(dataArray)

            canvasCtx.fillStyle = "rgb(0, 0, 0, 0.2)"
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height)

            const barWidth = (canvas.width / bufferLength) * 2.5
            let barHeight
            let x = 0

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2

                canvasCtx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

                x += barWidth + 1
            }
        }

        draw()

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            audioContext.close()
        }
    }, [stream])

    return (
        <canvas
            ref={canvasRef}
            className={cn("w-full h-full", className)}
            width={300}
            height={50}
        />
    )
} 