import React, { useState, useMemo } from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { PIANO_KEY_WIDTH, TOTAL_PITCHES, NOTE_HEIGHT, RULER_HEIGHT, CLIP_STRIP_HEIGHT } from './constants';
import type { PianoKeyboardProps } from './types';

/**
 * White key layout within one octave (top = highest pitch, bottom = lowest).
 * Each entry describes a white key container with its height and which edges
 * have black key overlays.
 *
 * Heights per octave: B(24) + A(32) + G(32) + F(24) + E(24) + D(32) + C(24) = 192px = 12×16
 */
const WHITE_KEY_LAYOUT = [
  { pitchClass: 11, offset: 0,   height: 24, blackAbove: false, blackBelow: true,  name: 'B' },
  { pitchClass: 9,  offset: 24,  height: 32, blackAbove: true,  blackBelow: true,  name: 'A' },
  { pitchClass: 7,  offset: 56,  height: 32, blackAbove: true,  blackBelow: true,  name: 'G' },
  { pitchClass: 5,  offset: 88,  height: 24, blackAbove: true,  blackBelow: false, name: 'F' },
  { pitchClass: 4,  offset: 112, height: 24, blackAbove: false, blackBelow: true,  name: 'E' },
  { pitchClass: 2,  offset: 136, height: 32, blackAbove: true,  blackBelow: true,  name: 'D' },
  { pitchClass: 0,  offset: 168, height: 24, blackAbove: true,  blackBelow: false, name: 'C' },
];

const OCTAVE_HEIGHT = 12 * NOTE_HEIGHT; // 192px

// Colors extracted from Figma
const KEY_BG = '#212433';
const KEY_BORDER = '#14151a';
const WHITE_KEY_FACE = '#f8f8f9';
const BLACK_KEY_GRADIENT_LIGHT = '#50525a';
const BLACK_KEY_EDGE_LIGHT = '#494b54';
const LABEL_COLOR = 'rgba(20,21,26,0.5)';

/** Renders a single black key overlay (the 8px bar at top or bottom of a white key container) */
const BlackKeyOverlay: React.FC<{ position: 'top' | 'bottom' }> = ({ position }) => {
  const isTop = position === 'top';
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        [isTop ? 'top' : 'bottom']: -0.5,
        width: 54,
        height: 8,
        background: KEY_BG,
        overflow: 'hidden',
        borderRadius: isTop ? '0 0 2px 0' : '0 2px 0 0',
      }}
    >
      {/* White key edge visible behind black key */}
      <div
        style={{
          position: 'absolute',
          left: 3,
          top: isTop ? 0 : 2,
          width: 40,
          height: 6,
          background: `linear-gradient(to left, ${BLACK_KEY_GRADIENT_LIGHT}, ${KEY_BG})`,
          borderRadius: isTop ? '0 0 1px 0' : '0 1px 0 0',
        }}
      />
      {/* Black key face edge highlight */}
      <div
        style={{
          position: 'absolute',
          left: 45,
          top: isTop ? 0 : 2,
          width: 7,
          height: 6,
          background: `linear-gradient(to left, ${KEY_BG}, ${BLACK_KEY_EDGE_LIGHT})`,
          borderRadius: isTop ? '0 0 1px 1px' : '1px 1px 0 0',
        }}
      />
    </div>
  );
};

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  scrollY,
  noteHeight,
  height,
  highlightedPitch,
  onKeyClick,
}) => {
  const { theme } = useTheme();
  const [hoveredPitch, setHoveredPitch] = useState<number | null>(null);

  const gridHeight = height - RULER_HEIGHT - CLIP_STRIP_HEIGHT;

  const keyElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    // Iterate through all octaves (0-10) and render white key containers
    for (let octave = 10; octave >= 0; octave--) {
      const octaveBasePitch = octave * 12;
      // Y of the highest note (B) in this octave
      const octaveTopY = (TOTAL_PITCHES - 1 - (octaveBasePitch + 11)) * noteHeight - scrollY;

      // Skip entire octave if not visible
      if (octaveTopY + OCTAVE_HEIGHT < 0 || octaveTopY > gridHeight) continue;

      for (const key of WHITE_KEY_LAYOUT) {
        const pitch = octaveBasePitch + key.pitchClass;
        if (pitch > 127 || pitch < 0) continue;

        const y = octaveTopY + key.offset;
        // Skip if not visible
        if (y + key.height < -8 || y > gridHeight + 8) continue;

        const isHovered = hoveredPitch === pitch;
        const isActive = highlightedPitch === pitch;
        const isC = key.pitchClass === 0;
        const displayOctave = octave - 1;

        const whiteKeyColor = isActive
          ? 'rgba(66,161,161,0.25)'
          : isHovered
            ? '#ebebf0'
            : WHITE_KEY_FACE;

        elements.push(
          <div
            key={pitch}
            style={{
              position: 'absolute',
              left: 0,
              top: y,
              width: PIANO_KEY_WIDTH,
              height: key.height,
              background: KEY_BG,
              borderBottom: `0.5px solid ${KEY_BORDER}`,
              borderTop: `0.5px solid ${KEY_BORDER}`,
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHoveredPitch(pitch)}
            onMouseLeave={() => setHoveredPitch(null)}
            onClick={() => onKeyClick?.(pitch)}
          >
            {/* White key face */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: PIANO_KEY_WIDTH - 1,
                background: whiteKeyColor,
                borderRadius: '0 2px 2px 0',
              }}
            />

            {/* Black key overlay at top */}
            {key.blackAbove && <BlackKeyOverlay position="top" />}

            {/* Black key overlay at bottom */}
            {key.blackBelow && <BlackKeyOverlay position="bottom" />}

            {/* C label */}
            {isC && (
              <span
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  color: LABEL_COLOR,
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}
              >
                C{displayOctave}
              </span>
            )}
          </div>
        );
      }
    }

    return elements;
  }, [scrollY, noteHeight, gridHeight, hoveredPitch, highlightedPitch, onKeyClick]);

  return (
    <div
      style={{
        width: PIANO_KEY_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: KEY_BG,
        borderRight: `1px solid ${KEY_BORDER}`,
      }}
    >
      {/* Empty top area aligned with ruler + clip strip */}
      <div
        style={{
          height: RULER_HEIGHT + CLIP_STRIP_HEIGHT,
          flexShrink: 0,
          background: theme.background.surface.elevated,
          borderBottom: `1px solid ${theme.border.onElevated}`,
        }}
      />

      {/* Piano keys */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {keyElements}
      </div>
    </div>
  );
};
