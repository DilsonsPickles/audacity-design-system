import React, { useRef, useEffect } from 'react';
import { Icon } from '../Icon';
import { generateSpeechWaveform } from '../utils/waveform';
import './AudioFileThumbnail.css';

export interface AudioFileThumbnailProps {
  /**
   * Audio file name
   */
  title?: string;
  /**
   * Date/timestamp text (e.g., "TODAY", "YESTERDAY")
   */
  dateText?: string;
  /**
   * Duration text (e.g., "3:45")
   */
  duration?: string;
  /**
   * Whether this is a cloud audio file (shows cloud icon badge)
   */
  isCloudFile?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Context menu button click handler
   */
  onContextMenu?: (e: React.MouseEvent) => void;
  /**
   * Optional className for custom styling
   */
  className?: string;
  /**
   * Seed for unique waveform generation (use title hash or unique ID)
   */
  waveformSeed?: number;
}

// Canvas-based waveform visualization matching project style
const WaveformVisual = ({ seed = 0 }: { seed?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = 280;
    const height = 170;
    canvas.width = width;
    canvas.height = height;

    // Generate realistic speech waveform data with seeded randomness
    // Create seeded random number generator
    let seedState = seed;
    const seededRandom = () => {
      seedState = (seedState * 9301 + 49297) % 233280;
      return seedState / 233280;
    };

    const duration = 3;
    const samplesPerSecond = 50000;
    const sampleCount = Math.floor(duration * samplesPerSecond);
    const waveformData: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount;

      // Speech envelope with seeded variation
      const speechEnvelope =
        Math.abs(Math.sin(t * Math.PI * 3 + seededRandom() * 0.5)) *
        (0.3 + Math.abs(Math.sin(t * Math.PI * 0.5)) * 0.7) *
        (0.5 + seededRandom() * 0.5);

      // High-frequency content with seed variation
      const voiceContent =
        Math.sin(t * Math.PI * 200 + seededRandom() * 2) * 0.4 +
        Math.sin(t * Math.PI * 500 + seededRandom() * 3) * 0.3 +
        Math.sin(t * Math.PI * 1200 + seededRandom() * 5) * 0.2 +
        (seededRandom() - 0.5) * 0.3;

      const value = voiceContent * speechEnvelope;
      waveformData.push(Math.max(-1, Math.min(1, value)));
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1;

    const centerY = height / 2;
    const samplesPerPixel = Math.floor(waveformData.length / width);

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    // Draw positive half
    for (let x = 0; x < width; x++) {
      const startIdx = x * samplesPerPixel;
      const endIdx = startIdx + samplesPerPixel;

      let max = 0;
      for (let i = startIdx; i < endIdx && i < waveformData.length; i++) {
        const value = Math.abs(waveformData[i]);
        if (value > max) max = value;
      }

      const y = centerY - (max * (height / 2) * 0.9);
      ctx.lineTo(x, y);
    }

    // Draw negative half
    for (let x = width - 1; x >= 0; x--) {
      const startIdx = x * samplesPerPixel;
      const endIdx = startIdx + samplesPerPixel;

      let max = 0;
      for (let i = startIdx; i < endIdx && i < waveformData.length; i++) {
        const value = Math.abs(waveformData[i]);
        if (value > max) max = value;
      }

      const y = centerY + (max * (height / 2) * 0.9);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
};

/**
 * AudioFileThumbnail component
 * - Shows audio file with waveform visualization
 * - Fixed dimensions: 280px × 170px
 */
export function AudioFileThumbnail({
  title = 'Audio File',
  dateText = 'TODAY',
  duration = '0:00',
  isCloudFile = false,
  onClick,
  onContextMenu,
  className = '',
  waveformSeed,
}: AudioFileThumbnailProps) {
  // Generate seed from title if not provided
  const seed = waveformSeed ?? title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return (
    <div className={`audio-file-thumbnail ${className}`}>
      <button
        className="audio-file-thumbnail__button"
        onClick={onClick}
        type="button"
      >
        <div className="audio-file-thumbnail__image">
          <WaveformVisual seed={seed} />
          {isCloudFile && (
            <div className="audio-file-thumbnail__cloud-badge">
              <Icon name="cloud-filled" size={16} />
            </div>
          )}
          {onContextMenu && (
            <button
              className="audio-file-thumbnail__context-btn"
              onClick={(e) => {
                e.stopPropagation();
                onContextMenu(e);
              }}
              type="button"
              aria-label="More options"
            >
              <Icon name="menu" size={16} />
            </button>
          )}
          <div className="audio-file-thumbnail__duration">
            {duration}
          </div>
        </div>
        <div className="audio-file-thumbnail__info">
          <div className="audio-file-thumbnail__title">{title}</div>
          <div className="audio-file-thumbnail__date">{dateText}</div>
        </div>
      </button>
    </div>
  );
}
