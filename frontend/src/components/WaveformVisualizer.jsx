import React, { useEffect, useRef } from 'react';

export default function WaveformVisualizer({ isRecording, level = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.null || canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barCount = 32;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isRecording) {
          const noise = Math.sin(Date.now() / 150 + i * 0.4) * 0.5 + 0.5;
          barHeight = Math.max(4, (level / 100) * height * noise * 0.9);
        }

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, '#06b6d4');

        ctx.fillStyle = isRecording ? grad : '#1a2333';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isRecording, level]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      style={{ width: '100%', maxWidth: '360px', height: '48px', borderRadius: '12px' }}
    />
  );
}
