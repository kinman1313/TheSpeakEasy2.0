"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream: MediaStream;
  className?: string;
}

export function AudioVisualizer({ stream, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

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

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = WIDTH / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * HEIGHT;

        const gradient = ctx.createLinearGradient(0, HEIGHT - barHeight, 0, HEIGHT);
        gradient.addColorStop(0, "#22c55e"); // Bright green
        gradient.addColorStop(1, "rgba(34,197,94,0.3)");

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#22c55e";
        ctx.fillRect(x, HEIGHT - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current!);
      source.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} className={className} width={300} height={50} />;
}
