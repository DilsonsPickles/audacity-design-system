import React from 'react';
import '../assets/fonts/musescore-icon.css';
import './Icon.css';

export type IconName =
  | 'mixer'
  | 'menu'
  | 'undo'
  | 'redo'
  | 'play'
  | 'pause'
  | 'stop'
  | 'record'
  | 'rewind'
  | 'forward'
  | 'skip-back'
  | 'skip-forward'
  | 'plus'
  | 'automation'
  | 'cloud'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'spectrogram'
  | 'cog'
  | 'trash'
  | 'silence'
  | 'trim'
  | 'waveform'
  | 'playhead';

// Unicode mappings for MusescoreIcon font
const ICON_MAP: Record<IconName, string> = {
  mixer: '\uF41B',
  menu: '\uEF13',
  undo: '\uE001',
  redo: '\uE002',
  play: '\uF446',
  pause: '\uF44B',
  stop: '\uF447',
  record: '\uF44A',
  rewind: '\uE007',
  forward: '\uE008',
  'skip-back': '\uF448',
  'skip-forward': '\uF449',
  plus: '\uEF2A',
  automation: '\uF45C',
  cloud: '\uF435',
  copy: '\uF398',
  paste: '\uF399',
  cut: '\uF39A',
  spectrogram: '\uF442',
  cog: '\uEF55',
  trash: '\uEF2C',
  silence: '\uF43A',
  trim: '\uF43B',
  waveform: '\uF43C',
  playhead: '\uF478',
};

export interface IconProps {
  /**
   * Icon name from MusescoreIcon font
   */
  name: IconName;
  /**
   * Icon size in pixels
   */
  size?: number;
  /**
   * Icon color
   */
  color?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color = '#14151a',
  className = '',
}) => {
  const iconChar = ICON_MAP[name] || '';

  return (
    <span
      className={`icon musescore-icon ${className}`}
      style={{
        fontSize: `${size}px`,
        color: color,
      }}
      aria-hidden="true"
    >
      {iconChar}
    </span>
  );
};

export default Icon;
