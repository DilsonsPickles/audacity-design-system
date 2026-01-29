# Channel Mapping Implementation

## Overview

The channel mapping dialog has been successfully integrated into the Export Modal. This allows users to create custom audio channel mappings when exporting.

## User Flow

1. User opens the **Export dialog** (File → Export)
2. In the **Audio options** section, user selects the **"Custom mapping"** radio button under "Channels"
3. An **"Edit mapping" button** appears below the channel options
4. User clicks **"Edit mapping"** to open the Channel Mapping Dialog
5. User configures channel mappings using the checkbox grid
6. User clicks **"Apply"** to save or **"Cancel"** to discard changes
7. Dialog closes and returns to Export Modal

## Component Structure

### ChannelMappingDialog
**Location:** `packages/components/src/ChannelMappingDialog/`

**Features:**
- Dialog header with title ("Edit mapping") and close button
- Channel count stepper (adjustable from 1-32 channels)
- Scrollable grid with:
  - Track labels column (Track 1, Track 2, etc.)
  - Channel number headers (1, 2, 3, etc.)
  - Checkbox matrix for mapping tracks to channels
- Cancel and Apply buttons

**Props:**
```tsx
interface ChannelMappingDialogProps {
  trackCount?: number;              // Number of tracks (default: 6)
  channelCount?: number;             // Number of output channels (default: 17)
  initialMapping?: boolean[][];      // Pre-populate mappings
  onApply?: (mapping: boolean[][]) => void;  // Callback with mapping data
  onCancel?: () => void;             // Callback when cancelled
  open?: boolean;                    // Dialog visibility
  className?: string;
}
```

**Data Structure:**
```tsx
// Mapping is a 2D boolean array: mapping[trackIndex][channelIndex]
// Example: mapping[0][5] = true means Track 1 is mapped to Channel 6
const mapping: boolean[][] = [
  [true, false, false, ...],  // Track 1 mappings
  [false, true, false, ...],  // Track 2 mappings
  // ...
];
```

### ExportModal Integration
**Location:** `packages/components/src/ExportModal/ExportModal.tsx`

**Changes:**
1. Added import for `ChannelMappingDialog`
2. Added state for dialog visibility and mapping data:
   ```tsx
   const [isChannelMappingOpen, setIsChannelMappingOpen] = useState(false);
   const [channelMapping, setChannelMapping] = useState<boolean[][] | undefined>(undefined);
   ```
3. Added "Edit mapping" button that appears when `channels === 'custom'`
4. Added ChannelMappingDialog with modal backdrop (z-index: 2000)

## Demo Pages

### Channel Mapping Demo
**URL:** `/channel-mapping-demo`
**File:** `apps/sandbox/src/pages/channel-mapping-demo.tsx`

Standalone demo of the ChannelMappingDialog component.

### Export Modal Demo
**URL:** `/export-modal-demo`
**File:** `apps/sandbox/src/pages/export-modal-demo.tsx`

Complete export workflow including channel mapping integration.

## Testing

To test the implementation:

1. Build the components package:
   ```bash
   pnpm --filter @audacity-ui/components build
   ```

2. Run the sandbox app:
   ```bash
   cd apps/sandbox
   pnpm dev
   ```

3. Navigate to `/export-modal-demo`

4. Test the flow:
   - Click "Open Export Dialog"
   - Scroll to "Audio options"
   - Select "Custom mapping" radio button
   - Click "Edit mapping" button
   - Adjust channel count with stepper
   - Toggle checkboxes to create mappings
   - Click "Apply" or "Cancel"

## Styling

The component follows the Audacity Design System:
- Uses theme tokens from `@audacity-ui/tokens`
- Matches Figma design specifications
- Responsive to theme changes (light/dark mode)
- Proper focus states and keyboard navigation

## Files Created/Modified

### Created:
- `packages/components/src/ChannelMappingDialog/ChannelMappingDialog.tsx`
- `packages/components/src/ChannelMappingDialog/ChannelMappingDialog.css`
- `packages/components/src/ChannelMappingDialog/index.ts`
- `apps/sandbox/src/pages/channel-mapping-demo.tsx`
- `apps/sandbox/src/pages/export-modal-demo.tsx`

### Modified:
- `packages/components/src/index.ts` - Added ChannelMappingDialog export
- `packages/components/src/ExportModal/ExportModal.tsx` - Integrated channel mapping dialog

## Next Steps

Future enhancements could include:
- Persist channel mappings to user preferences
- Add preset mapping configurations (common setups)
- Validate that at least one channel is mapped per track
- Add tooltips explaining the mapping grid
- Support for track names instead of "Track 1", "Track 2", etc.
