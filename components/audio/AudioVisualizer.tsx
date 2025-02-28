"use client"

import { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  stream: MediaStream
  className?: string
}

export function AudioVisualizer({ stream, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!canvasRef.current) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)

    source.connect(analyser)
    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!

    const draw = () => {
      const WIDTH = canvas.width
      const HEIGHT = canvas.height

      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = "rgb(0, 0, 0)"
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      const barWidth = (WIDTH / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2

        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
        gradient.addColorStop(0, "#00f3ff") // neon blue
        gradient.addColorStop(1, "#0099ff")

        ctx.fillStyle = gradient
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      source.disconnect()
      audioContext.close()
    }
  }, [stream])

  return <canvas ref={canvasRef} className={className} width={300} height={50} />
}

