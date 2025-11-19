# Clip Styling States

This document describes the visual styling states for clips in the clip envelope editor.

## Clip Structure

A clip consists of two main visual components:

### 1. Clip Header
- **Purpose**: Provides visual identification and interaction area for the clip
- **Height**: Fixed height defined by `CLIP_HEADER_HEIGHT`
- **Styling**: Track-specific colors with rounded top corners

### 2. Clip Body
- **Purpose**: Contains the audio waveform and automation curve
- **Height**: Variable based on track height minus header height
- **Content**: Waveform visualization and envelope automation overlay

## Selection States

### Base States (No Time Selection)

Clips can be in one of two selection states:

#### Unselected Clip
- **Clip Header**:
  - Idle: `theme.clipHeader.trackN`
    - Track 1 (Blue): `#3FA8FF`
    - Track 2 (Violet): `#ADABFC`
    - Track 3 (Magenta): `#E787D0`
  - Hover: `theme.clipHeaderHover.trackN`
    - Track 1 (Blue): `#66A3FF`
    - Track 2 (Violet): `#9996FC`
    - Track 3 (Magenta): `#DA8CCC`

- **Clip Body**: `theme.clipBackground.trackN`
  - Track 1 (Blue): `#6DB9FF`
  - Track 2 (Violet): `#C1BFFE`
  - Track 3 (Magenta): `#ECA0D9`

#### Selected Clip
- **Clip Header**:
  - Idle: `theme.clipHeaderSelected.trackN`
    - Track 1 (Blue): `#DEEBFF`
    - Track 2 (Violet): `#E9E8FF`
    - Track 3 (Magenta): `#F6E8F4`
  - Hover: `theme.clipHeaderSelectedHover.trackN`
    - Track 1 (Blue): `#F2F7FF`
    - Track 2 (Violet): `#F7F6FF`
    - Track 3 (Magenta): `#FBF4FC`

- **Clip Body**: `theme.clipBackgroundSelected.trackN`
  - Track 1 (Blue): `#C0D9FF`
  - Track 2 (Violet): `#D5D3FE`
  - Track 3 (Magenta): `#EFD1EA`

## Time Selection Overlay States

When a time selection exists and overlaps with a clip, an additional overlay is drawn on top of the base clip styling.

### Time Selection - Clip Header Overlay

Applied to the clip header within the time selection region:

- **Track 1 (Blue)**: `#78ECFF`
- **Track 2 (Violet)**: `#C6DDFF` (same for selected and unselected)
- **Track 3 (Magenta)**: `#FFCFFF`

These colors are applied regardless of clip selection state.

### Time Selection - Clip Body Overlay

The clip body overlay varies based on envelope mode and clip selection state:

#### Envelope Mode OFF (Normal Mode)

**Unselected Clips:**
- Track 1 (Blue): `#70D4FF`
- Track 2 (Violet): `#DBF1FF`
- Track 3 (Magenta): `#FFE7FF`

**Selected Clips:**
- Track 1 (Blue): `#70D4FF`
- Track 2 (Violet): `#B8D4FF`
- Track 3 (Magenta): `#FFE7FF`

#### Envelope Mode ON

**All Clips (Selected and Unselected):**
- Track 1 (Blue): `#50B4E6` (darker for contrast with white automation overlay)
- Track 2 (Violet): `#7888D6` (darker for contrast with white automation overlay)
- Track 3 (Magenta): `#B888D6` (darker for contrast with white automation overlay)

## Complete State Matrix

Each clip can be in one of the following combined states:

1. **Unselected, No Time Selection, Header Idle**
2. **Unselected, No Time Selection, Header Hover**
3. **Selected, No Time Selection, Header Idle**
4. **Selected, No Time Selection, Header Hover**
5. **Unselected, Time Selection Overlap, Header Idle**
6. **Unselected, Time Selection Overlap, Header Hover**
7. **Selected, Time Selection Overlap, Header Idle** (Normal Mode)
8. **Selected, Time Selection Overlap, Header Hover** (Normal Mode)
9. **Selected, Time Selection Overlap, Header Idle** (Envelope Mode)
10. **Selected, Time Selection Overlap, Header Hover** (Envelope Mode)

## Implementation Notes

### Drawing Order
The rendering order is critical for proper layering:

1. Clip background (body)
2. Clip header
3. Envelope fill (if envelope mode or points exist)
4. Time selection overlay (header and body)
5. Automation overlay within time selection (if applicable)
6. Waveform
7. Envelope line and points
8. Clip borders

### Color Contrast Considerations

- **Selected clips**: Use lighter colors to indicate selection state
- **Time selection in envelope mode**: Uses darker colors (`#50B4E6`, `#7888D6`, `#B888D6`) to provide contrast for the white automation overlay
- **Hover states**: Slightly lighter than idle states for subtle feedback
- **Track-specific colors**: Each track has a distinct color family (blue, violet, magenta) to help differentiate tracks visually

### Border Styling

- **Normal clips**: `theme.clipBorder.normal` (`#000000`)
- **Envelope mode clips**: `theme.clipBorder.envelope` (`#000000`)
- **Selected clips**: `theme.clipBorderSelected` (`#ffffff`)

### Corner Rounding

- Clip headers have rounded top corners (radius defined in code)
- Time selection overlays match the clip header rounding when they align with clip edges
- Bottom corners remain square as they connect to the waveform area
