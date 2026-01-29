# Export Modal Accessibility

This document describes the keyboard navigation and accessibility features of the Export Modal dialog.

## Overview

The Export Modal implements proper keyboard tab order using tab groups following the same pattern as PreferencesModal. The modal is divided into 5 logical tab groups, allowing users to navigate efficiently using both Tab key and Arrow keys.

## Tab Group Structure

### Tab Group 1: Export Type
**Group ID:** `export-type`
**Total Items:** 1

1. **Export Type** (dropdown) - Select export mode (full project, selected audio, loop region, etc.)

**Navigation:**
- **Tab** - Enter the group (focuses dropdown)
- **Enter/Space** - Open dropdown
- **Arrow Up/Down** (when dropdown open) - Navigate options
- **Enter** - Select option and close dropdown

---

### Tab Group 2: File
**Group ID:** `file`
**Total Items:** 4

1. **File Name** (text input) - File name for export (editable for full-project, selected-audio, loop-region; read-only preview for multi-file exports)
2. **Folder** (text input) - Destination folder path
3. **Browse Button** - Opens folder browser dialog
4. **Format** (dropdown) - Select audio format (WAV, MP3, FLAC, etc.)

**Navigation:**
- **Tab** - Enter the group (focuses first item)
- **Arrow Up/Down** - Navigate between fields within the group (wraps from last to first)
- **Enter/Space** - Activate focused control (open dropdown, click button)

---

### Tab Group 3: Audio Options
**Group ID:** `audio-options`
**Total Items:** 6 (varies based on format selection)

1. **Mono** (radio button) - Select mono channel configuration
2. **Stereo** (radio button) - Select stereo channel configuration
3. **Custom mapping** (radio button) - Select custom channel mapping
4. **Edit mapping** (button) - Opens channel mapping dialog (only visible when Custom mapping selected)
5. **Sample rate** (dropdown) - Select sample rate (hidden for Custom FFmpeg and External formats)
6. **Encoding** (dropdown) - Select encoding type (shown for WAV, AIFF, and Other uncompressed formats)

**Note:** Additional format-specific options (Bit rate, Quality, etc.) are not currently wrapped in tab groups due to conditional rendering complexity. These can be accessed via standard Tab navigation if needed.

**Navigation:**
- **Tab** - Enter the group (focuses first radio button)
- **Arrow Up/Down** - Navigate between all items in the group (wraps from last to first)
- **Space** - Select radio button or activate button/dropdown
- **Enter** - Activate button or open dropdown

---

### Tab Group 4: Rendering
**Group ID:** `rendering`
**Total Items:** 1

1. **Trim blank space checkbox** - Enable/disable trimming blank space before first clip

**Navigation:**
- **Tab** - Focus the checkbox
- **Space** - Toggle checkbox state

---

### Tab Group 5: Footer
**Group ID:** `footer`
**Total Items:** 3

1. **Edit metadata** (button) - Opens metadata editor dialog
2. **Cancel** (button) - Closes modal without exporting
3. **Export** (button) - Confirms and executes export

**Navigation:**
- **Tab** - Enter the group (focuses first button)
- **Arrow Up/Down** - Navigate between buttons (wraps from last to first)
- **Enter/Space** - Activate focused button
- **Escape** - Cancel and close modal (same as Cancel button)

---

## Keyboard Shortcuts

### Global Modal Controls
- **Tab** - Move forward through tab groups and focusable elements
- **Shift+Tab** - Move backward through tab groups and focusable elements
- **Escape** - Close modal (same as Cancel button)

### Within Tab Groups
- **Arrow Up** - Move to previous item in current tab group
- **Arrow Down** - Move to next item in current tab group
- **Arrow Left** - Move to previous item (horizontal groups like footer buttons)
- **Arrow Right** - Move to next item (horizontal groups like footer buttons)
- **Home** - Move to first item in current tab group
- **End** - Move to last item in current tab group
- **Enter** - Activate focused control (click button, open dropdown, submit form)
- **Space** - Toggle checkbox/radio, or activate button

### Dropdown-Specific
- **Arrow Up/Down** (when dropdown open) - Navigate dropdown options
- **Enter** - Select highlighted option and close dropdown
- **Escape** - Close dropdown without changing selection

### Text Input-Specific
- **Arrow Left/Right** - Move cursor within text (does not navigate tab group)
- **Home/End** - Move to start/end of text (does not navigate tab group)
- **Cmd+A / Ctrl+A** - Select all text

---

## Tab Group Behavior

### Roving TabIndex Pattern
The Export Modal uses a "roving tabindex" pattern for tab groups:

- Only one item per group has `tabindex="0"` (the active item)
- All other items in the group have `tabindex="-1"`
- Arrow keys move focus and update the active item
- Tab key moves focus between groups (not within groups)

### Reset Behavior
- When the modal opens, all tab groups reset to index 0 (first item)
- The `resetKey="export-modal"` ensures consistent behavior on open
- When focus enters a group from outside, it focuses the active item

### Focus Management
- When a dropdown closes, focus returns to the dropdown trigger
- When Channel Mapping Dialog closes, focus returns to "Edit mapping" button
- Focus outline remains visible even when elements are partially offscreen

---

## Screen Reader Support

### ARIA Labels
- **Export Type dropdown:** "Type" (label)
- **File Name input:** "File name" or "File name preview" (label changes based on export type)
- **Folder input:** "Folder" (label)
- **Format dropdown:** "Format" (label)
- **Channel radios:** "Channels" (group label), "Mono", "Stereo", "Custom mapping" (individual labels)
- **Trim checkbox:** "Trim blank space before first clip" (label)
- **Buttons:** "Browse...", "Edit mapping", "Edit metadata", "Cancel", "Export" (button text)

### Announcements
- When export type changes, file name field label updates from "File name" to "File name preview" for multi-file exports
- When "Custom mapping" radio is selected, "Edit mapping" button appears and is announced
- Form validation errors are announced when Export Type changes (e.g., selecting "loop region" without active loop)

---

## Channel Mapping Dialog

When "Edit mapping" button is activated, the Channel Mapping Dialog opens as a nested modal.

**Channel Mapping Dialog Accessibility:**
- Modal overlay with `z-index: 2000` (higher than Export Modal's `z-index`)
- Focus trapped within dialog
- Scrollable content with custom scrollbar
- **Escape** key closes dialog and returns focus to "Edit mapping" button

**See also:** Channel Mapping Dialog component documentation for detailed accessibility features.

---

## Implementation Details

### Tab Group Configuration
Tab groups are configured in the accessibility profile system:

```typescript
{
  "export-settings": {
    tabindex: "roving",
    arrows: true,
    wrap: false
  },
  "format-options": {
    tabindex: "roving",
    arrows: true,
    wrap: false
  },
  "additional-options": {
    tabindex: "roving",
    arrows: true,
    wrap: false
  },
  "footer": {
    tabindex: "roving",
    arrows: true,
    wrap: false
  }
}
```

### TabGroupField Wrapper Component
Each focusable element is wrapped in a `TabGroupField` component that:
- Applies `tabIndex` prop to child components (Dropdown, TextInput, Button, LabeledRadio, LabeledCheckbox)
- Attaches keyboard event listeners for arrow key navigation
- Manages focus state and active index
- Coordinates with `useTabGroup` hook for shared state

### State Management
Each tab group maintains:
- `itemRefs` - Array of refs to focusable elements
- `activeIndexRef` - Ref to current active index (for immediate access)
- `activeIndex` - State for active index (for re-rendering)
- `setActiveIndex` - Callback to update active index

---

## Testing Checklist

- [ ] Tab key navigates through all 4 tab groups in order
- [ ] Shift+Tab navigates backward through tab groups
- [ ] Arrow keys navigate within each tab group without jumping between groups
- [ ] Enter/Space activates buttons and toggles checkboxes/radios
- [ ] Escape closes modal from any focused element
- [ ] Screen reader announces labels and state changes
- [ ] Focus outline visible on all interactive elements
- [ ] Dropdown menu closes and returns focus to trigger on Escape
- [ ] Channel Mapping Dialog opens when "Edit mapping" button activated
- [ ] Focus returns to "Edit mapping" button when Channel Mapping Dialog closes
- [ ] All form fields accessible via keyboard only (no mouse required)

---

## Related Documentation

- [keyboard-handlers-map.md](./keyboard-handlers-map.md) - Clip and label keyboard shortcuts
- [design-system-architecture.md](./design-system-architecture.md) - Overall design system architecture
- PreferencesModal component - Reference implementation of tab groups
- useTabGroup hook - Tab group keyboard navigation implementation
