/**
 * ChannelMappingDialog - Audio channel mapping interface
 * Based on Figma design: node-id=1758-38137
 *
 * Allows users to map audio tracks to output channels using a grid of checkboxes.
 * Used in the export dialog when "custom mapping" is selected.
 */

import React, { useState, useRef } from 'react';
import { useTheme } from '../ThemeProvider';
import { Checkbox } from '../Checkbox';
import { Button } from '../Button';
import { NumberStepper } from '../NumberStepper';
import { CustomScrollbar } from '../CustomScrollbar';
import './ChannelMappingDialog.css';

export interface ChannelMappingDialogProps {
  /**
   * Number of tracks
   */
  trackCount?: number;
  /**
   * Number of output channels
   */
  channelCount?: number;
  /**
   * Initial channel mapping (track index -> array of channel indices)
   */
  initialMapping?: boolean[][];
  /**
   * Callback when mapping is applied
   */
  onApply?: (mapping: boolean[][]) => void;
  /**
   * Callback when dialog is cancelled
   */
  onCancel?: () => void;
  /**
   * Whether the dialog is open
   */
  open?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ChannelMappingDialog - Maps audio tracks to output channels
 */
export function ChannelMappingDialog({
  trackCount = 6,
  channelCount: initialChannelCount = 17,
  initialMapping,
  onApply,
  onCancel,
  open = true,
  className = '',
}: ChannelMappingDialogProps) {
  const { theme } = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [channelCount, setChannelCount] = useState(initialChannelCount);

  // Initialize mapping grid: [trackIndex][channelIndex] = boolean
  const [mapping, setMapping] = useState<boolean[][]>(() => {
    if (initialMapping) return initialMapping;

    // Create empty mapping grid
    return Array(trackCount).fill(null).map(() =>
      Array(channelCount).fill(false)
    );
  });

  const handleChannelCountChange = (value: string) => {
    const newCount = parseInt(value) || 1;
    const count = Math.max(1, Math.min(32, newCount)); // Clamp to 1-32
    setChannelCount(count);

    // Adjust mapping grid to match new channel count
    setMapping(prev => prev.map(trackMapping => {
      if (trackMapping.length === count) return trackMapping;

      // Extend or truncate
      if (trackMapping.length < count) {
        return [...trackMapping, ...Array(count - trackMapping.length).fill(false)];
      } else {
        return trackMapping.slice(0, count);
      }
    }));
  };

  const handleCheckboxChange = (trackIndex: number, channelIndex: number, checked: boolean) => {
    setMapping(prev => {
      const newMapping = prev.map(row => [...row]);
      newMapping[trackIndex][channelIndex] = checked;
      return newMapping;
    });
  };

  const handleApply = () => {
    onApply?.(mapping);
  };

  const handleCancel = () => {
    onCancel?.();
  };

  if (!open) return null;

  const style = {
    '--dialog-bg': theme.background.dialog.body,
    '--dialog-header-bg': theme.background.dialog.header,
    '--dialog-border': theme.border.default,
    '--table-header-bg': theme.background.table.header.background,
    '--table-item-bg': theme.background.table.row.idle,
    '--table-border': theme.border.default,
    '--table-row-border': theme.background.table.row.border,
    '--input-bg': theme.background.control.input.idle,
    '--input-border': theme.border.input.idle,
    '--text-color': theme.foreground.text.primary,
    '--scrollbar-bg': 'rgba(20, 21, 26, 0.3)',
  } as React.CSSProperties;

  return (
    <div className={`channel-mapping-dialog ${className}`} style={style}>
      {/* Dialog Header */}
      <div className="channel-mapping-dialog__header">
        <div className="channel-mapping-dialog__title">Edit mapping</div>
        <button
          className="channel-mapping-dialog__close"
          onClick={handleCancel}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>

      {/* Dialog Body */}
      <div className="channel-mapping-dialog__body">
        {/* Channel Count Stepper */}
        <div className="channel-mapping-dialog__stepper">
          <label className="channel-mapping-dialog__stepper-label">
            Channel count
          </label>
          <NumberStepper
            value={channelCount.toString()}
            onChange={handleChannelCountChange}
            min={1}
            max={32}
            step={1}
            width={113}
          />
        </div>

        {/* Channel Mapping Grid */}
        <div className="channel-mapping-dialog__grid-container">
          {/* Track Labels Column */}
          <div className="channel-mapping-dialog__track-column">
            <div className="channel-mapping-dialog__track-header" />
            {Array.from({ length: trackCount }, (_, i) => (
              <div key={i} className="channel-mapping-dialog__track-label">
                Track {i + 1}
              </div>
            ))}
            <div className="channel-mapping-dialog__track-footer" />
          </div>

          {/* Scrollable Channel Grid Wrapper */}
          <div className="channel-mapping-dialog__scroll-wrapper">
            {/* Scrollable container */}
            <div
              ref={scrollContainerRef}
              className="channel-mapping-dialog__scroll-container"
            >
              <div className="channel-mapping-dialog__grid">
                {/* Channel Number Headers */}
                <div className="channel-mapping-dialog__channel-headers">
                  {Array.from({ length: channelCount }, (_, i) => (
                    <div key={i} className="channel-mapping-dialog__channel-header">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Checkbox Grid Rows */}
                {Array.from({ length: trackCount }, (_, trackIndex) => (
                  <div key={trackIndex} className="channel-mapping-dialog__grid-row">
                    {Array.from({ length: channelCount }, (_, channelIndex) => (
                      <div key={channelIndex} className="channel-mapping-dialog__grid-cell">
                        <Checkbox
                          checked={mapping[trackIndex][channelIndex]}
                          onChange={(checked) => handleCheckboxChange(trackIndex, channelIndex, checked)}
                          aria-label={`Map Track ${trackIndex + 1} to Channel ${channelIndex + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {/* Custom scrollbar as sibling to scroll container */}
            <CustomScrollbar
              contentRef={scrollContainerRef}
              orientation="horizontal"
              height={16}
              backgroundColor={theme.background.table.header.background}
              borderColor={theme.border.default}
              fullSize={true}
              thumbThickness={6}
              paddingX={10}
              className="channel-mapping-scrollbar"
            />
          </div>
        </div>
      </div>

      {/* Dialog Footer */}
      <div className="channel-mapping-dialog__footer">
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export default ChannelMappingDialog;
