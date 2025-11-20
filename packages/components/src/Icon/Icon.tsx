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
  | 'forward';

// Unicode mappings for MusescoreIcon font
const ICON_MAP: Record<IconName, string> = {
  mixer: '\uF41B',
  menu: '\uEF13',
  undo: '\uE001',
  redo: '\uE002',
  play: '\uE003',
  pause: '\uE004',
  stop: '\uE005',
  record: '\uE006',
  rewind: '\uE007',
  forward: '\uE008',
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
