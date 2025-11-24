'use client';

import { useState } from 'react';
import { theme } from '../theme';

interface TrackHeaderProps {
  trackName: string;
  isSelected?: boolean;
  isFocused?: boolean;
  onSelect?: () => void;
  height?: number; // Custom height for track (optional, defaults to 114px)
}

export default function TrackHeader({ trackName, isSelected = false, isFocused = false, onSelect, height = 114 }: TrackHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getBackgroundColor = () => {
    if (isSelected) return '#F8F8F9';
    if (isHovered) return '#F2F2F7';
    return '#EEEEF1';
  };

  // Progressive layout based on height
  // < 44px: Minimum collapsed view (single row)
  // 44-80px: No effects button, compact view
  // 80+px: Full view with effects button
  const isCollapsed = height <= 44;
  const showEffectsButton = height >= 80;

  return (
    <div className="relative">
      {/* Focus border in the gap - now positioned outside the component */}
      {isFocused && (
        <>
          <div className="absolute -top-[2px] left-0 right-0 h-[2px] bg-[#84B5FF]" />
          <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-[#84B5FF]" />
          <div className="absolute top-0 -left-0 bottom-0 w-[2px] bg-[#84B5FF]" />
        </>
      )}

      <div
        className="flex transition-colors cursor-pointer relative"
        style={{
          backgroundColor: getBackgroundColor(),
          height: `${height}px`,
          flexDirection: isCollapsed ? 'row' : 'column',
          alignItems: isCollapsed ? 'center' : 'stretch',
          padding: '12px',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onSelect}
      >
      {isCollapsed ? (
        // Collapsed view: single row with track name, mute, solo, and context menu
        <>
          {/* Track name */}
          <h3 className="text-sm font-medium flex-1" style={{ color: theme.text }}>
            {trackName}
          </h3>

          {/* Mute button */}
          <button
            className="w-5 h-5 flex items-center justify-center text-xs rounded border mr-1"
            style={{
              backgroundColor: '#CDCED7',
              borderColor: theme.trackHeaderBorder,
              color: theme.text,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            M
          </button>

          {/* Solo button */}
          <button
            className="w-5 h-5 flex items-center justify-center text-xs rounded border mr-1"
            style={{
              backgroundColor: '#CDCED7',
              borderColor: theme.trackHeaderBorder,
              color: theme.text,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            S
          </button>

          {/* Context menu button */}
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
            style={{ color: theme.text, fontSize: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            ⋯
          </button>
        </>
      ) : (
        <>
          {/* Row 1: Icon, Track name, Ellipsis button - 20px height */}
          <div className="flex items-center gap-2 h-5 mb-2">
        <div
          className="w-5 h-5 flex items-center justify-center text-sm"
          style={{ color: theme.text }}
        >
          🎵
        </div>
        <h3 className="text-sm font-medium flex-1" style={{ color: theme.text }}>
          {trackName}
        </h3>
        <button
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
          style={{ color: theme.text, fontSize: '16px' }}
          onClick={(e) => e.stopPropagation()}
        >
          ⋯
        </button>
      </div>

      {/* Row 2: Pan knob, Volume slider, Mute/Solo buttons - 32px height */}
      <div className="flex items-center h-8 mb-2">
        {/* Pan knob placeholder */}
        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs" style={{ borderColor: theme.trackHeaderBorder }}>
          ⟳
        </div>

        {/* 8px gap */}
        <div className="w-2" />

        {/* Volume slider placeholder */}
        <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: theme.trackHeaderBorder }}>
          <div className="w-3/4 h-full rounded-full" style={{ backgroundColor: '#CDCED7' }}></div>
        </div>

        {/* 8px gap */}
        <div className="w-2" />

        {/* Mute button */}
        <button
          className="w-5 h-5 flex items-center justify-center text-xs rounded border"
          style={{
            backgroundColor: '#CDCED7',
            borderColor: theme.trackHeaderBorder,
            color: theme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          M
        </button>

        {/* 4px gap */}
        <div className="w-1" />

        {/* Solo button */}
        <button
          className="w-5 h-5 flex items-center justify-center text-xs rounded border"
          style={{
            backgroundColor: '#CDCED7',
            borderColor: theme.trackHeaderBorder,
            color: theme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          S
        </button>
      </div>

      <div className="flex-1" />

          {/* Effects button - only show when height >= 80px */}
          {showEffectsButton && (
            <button
              className="w-full h-6 px-3 text-sm rounded border flex items-center justify-center"
              style={{
                backgroundColor: '#CDCED7',
                borderColor: theme.trackHeaderBorder,
                color: theme.text,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              Effects
            </button>
          )}
        </>
      )}
      </div>
    </div>
  );
}
