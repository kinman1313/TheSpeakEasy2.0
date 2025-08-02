// components/audio/AudioVisualizer.tsx
"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  stream: MediaStream;
  /** Optional classes for the outer container */
  className?: string;
}

export function AudioVisualizer({ stream, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Set up the Web Audio API
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      analyser.getByteFrequencyData(dataArray);

      // Clear the canvas so the visualizer sits on your glass panel
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = WIDTH / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * HEIGHT;

        // Use brand colours for the gradient
        const gradient = ctx.createLinearGradient(0, HEIGHT - barHeight, 0, HEIGHT);
        gradient.addColorStop(0, "rgba(34,197,94,0.9)"); // bright green
        gradient.addColorStop(1, "rgba(34,197,94,0.3)"); // faded green

        ctx.fillStyle = gradient;
        // Subtle glow effect around each bar
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(34,197,94,0.6)";

        ctx.fillRect(x, HEIGHT - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return (
    <div className={cn("glass-card p-2 rounded-lg", className)}>
      {/* The canvas sits inside a frosted panel with rounded corners */}
      <canvas ref={canvasRef} width={300} height={50} />
    </div>
  );
}
