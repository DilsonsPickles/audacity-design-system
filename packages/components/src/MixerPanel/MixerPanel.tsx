import React from 'react';
import { useTheme } from '../ThemeProvider';
import { MixerChannel, type MixerChannelProps } from '../MixerChannel';
import { PanelHeader, type PanelHeaderTab } from '../PanelHeader';
import './MixerPanel.css';

export interface MixerPanelChannel {
  /** Unique identifier for the channel */
  id: string;
  /** Props passed through to MixerChannel */
  channelProps: Omit<MixerChannelProps, 'className'>;
}

export interface MixerPanelProps {
  /**
   * Tabs shown in the panel header.
   * Each tab needs an `id` and `label`.
   * @default [{ id: 'mixer', label: 'Mixer' }]
   */
  tabs?: PanelHeaderTab[];
  /**
   * ID of the currently active tab
   * @default 'mixer'
   */
  activeTabId?: string;
  /**
   * Called when a tab is clicked
   */
  onTabChange?: (tabId: string) => void;
  /**
   * Called when the panel menu (ellipsis) button is clicked
   */
  onMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Master channel props (always shown as the first channel)
   */
  masterChannel?: Omit<MixerChannelProps, 'className'>;
  /**
   * Track mixer channels to display
   */
  channels?: MixerPanelChannel[];
  /**
   * Additional CSS classes
   */
  className?: string;
}

/** Row labels that align with MixerChannel sections */
const ROW_LABELS = [
  { label: 'Audio FX', height: 36 },
  { label: 'Pan', height: 40 },
  { label: 'Volume', height: 36 },
] as const;

const BOTTOM_LABELS = [
  { label: 'Mute/Solo', height: 40 },
  { label: 'Track', height: 24 },
] as const;

/**
 * MixerPanel - The complete mixer panel with header tabs, row labels, and channel strips.
 *
 * Composes PanelHeader for tabs and MixerChannel components in a
 * horizontally scrollable area with right-aligned row labels on the left side.
 */
export const MixerPanel: React.FC<MixerPanelProps> = ({
  tabs = [{ id: 'mixer', label: 'Mixer' }],
  activeTabId = 'mixer',
  onTabChange,
  onMenuClick,
  masterChannel,
  channels = [],
  className = '',
}) => {
  const { theme } = useTheme();

  const style = {
    '--mp-text': theme.foreground.text.primary,
    '--mp-body-bg': theme.background.surface.default,
    '--mp-border': theme.border.default,
  } as React.CSSProperties;

  return (
    <div className={`mixer-panel ${className}`} style={style}>
      {/* Reuse existing PanelHeader component */}
      <PanelHeader
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        onMenuClick={onMenuClick}
      />

      {/* Panel body */}
      <div className="mixer-panel__body">
        {/* Row labels column */}
        <div className="mixer-panel__row-labels">
          <div className="mixer-panel__row-labels-top">
            {ROW_LABELS.map(({ label, height }) => (
              <div
                key={label}
                className="mixer-panel__row-label"
                style={{ height }}
              >
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="mixer-panel__row-labels-bottom">
            {BOTTOM_LABELS.map(({ label, height }) => (
              <div
                key={label}
                className="mixer-panel__row-label"
                style={{ height }}
              >
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable channel strip area */}
        <div className="mixer-panel__channels-scroll">
          <div className="mixer-panel__channels">
            <div className="mixer-panel__channel-divider" />
            {masterChannel && (
              <>
                <MixerChannel {...masterChannel} />
                <div className="mixer-panel__channel-divider" />
              </>
            )}
            {channels.map((ch, i) => (
              <React.Fragment key={ch.id}>
                {i > 0 && <div className="mixer-panel__channel-divider" />}
                <MixerChannel {...ch.channelProps} />
              </React.Fragment>
            ))}
            <div className="mixer-panel__channel-divider" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixerPanel;
