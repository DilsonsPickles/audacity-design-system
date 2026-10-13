/**
 * THE SHORTCUTS, one list (2026-10-13): the Preferences › Shortcuts page's
 * rows AND the keyboard map overlay (KeyboardMap, ⌘/) read this, so the
 * two can never disagree. A shortcut is written in the Mac glyphs the
 * page shows (⌘ ⌥ ⇧ ⌃), pairs with " / ", alternatives with " · ",
 * ranges as "1–5"; an empty shortcut is an unbound command. Add a row
 * here when a chord lands — the map is built from it.
 */
/** WHERE a chord works — the keyboard map's context filter (2026-10-13,
 *  "in games they have controls filtered by context": a clip in focus,
 *  a time selection, a handle in hand). A row with no contexts works
 *  everywhere; a row may belong to several. FOCUS AND SELECTION ARE TWO
 *  CONTEXTS (the same day, "focused vs selected clip, are they different
 *  contexts?" — yes): 'clip' is the ONE clip with DOM focus, where the
 *  handle keys, Enter, ⌥F and ⌥[ ] start; 'clip-selected' is the SET
 *  with the selected flag, what Copy, Cut and Duplicate take; Delete
 *  takes both, and the selected range. */
export type ShortcutContext = 'global' | 'clip' | 'clip-selected' | 'time' | 'fade-handle' | 'edge-handle';

export const SHORTCUT_CONTEXTS: ReadonlyArray<{ id: ShortcutContext; label: string }> = [
  { id: 'global', label: 'Everywhere' },
  { id: 'clip', label: 'Clip focused' },
  { id: 'clip-selected', label: 'Clips selected' },
  { id: 'time', label: 'Time selected' },
  { id: 'fade-handle', label: 'Fade handle' },
  { id: 'edge-handle', label: 'Trim / stretch handle' },
];

export interface ShortcutRow {
  id: string;
  action: string;
  shortcut: string;
  /** Unset = everywhere */
  contexts?: ReadonlyArray<ShortcutContext>;
}

export const SHORTCUT_ROWS: ReadonlyArray<ShortcutRow> = [
    { id: '1', action: 'About Audacity', shortcut: '' },
    { id: '2', action: 'About MuseScore...', shortcut: '' },
    { id: '3', action: 'About MuseXML...', shortcut: '' },
    { id: '4', action: 'About Qt...', shortcut: '' },
    { id: '5', action: 'Add label', shortcut: '⌘B' },
    { id: '6', action: 'Add realtime effects', shortcut: 'E' },
    { id: '7', action: 'Align end to end', shortcut: '' },
    { id: '8', action: 'Align end to playhead', shortcut: '' },
    { id: '9', action: 'Align end to selection end', shortcut: '' },
    { id: '10', action: 'Align start to playhead', shortcut: '' },
    { id: '11', action: 'Align start to selection end', shortcut: '' },
    { id: '12', action: 'Align start to zero', shortcut: '' },
    { id: '13', action: 'Apply effect to selection', shortcut: '⌘E', contexts: ['time'] },
    { id: '14', action: 'Auto duck', shortcut: '' },
    { id: '15', action: 'Bass and treble', shortcut: '' },
    { id: '16', action: 'Change pitch', shortcut: '' },
    { id: '17', action: 'Change speed', shortcut: '' },
    { id: '18', action: 'Change tempo', shortcut: '' },
    { id: '19', action: 'Click removal', shortcut: '' },
    { id: '19a', action: 'Clip properties', shortcut: '⌥⌘I', contexts: ['global', 'clip'] },
    { id: '20', action: 'Close project', shortcut: '⌘W' },
    { id: '21', action: 'Compressor', shortcut: '' },
    { id: '22', action: 'Copy', shortcut: '⌘C', contexts: ['clip-selected', 'time'] },
    { id: '23', action: 'Cut', shortcut: '⌘X', contexts: ['clip-selected', 'time'] },
    { id: '23a', action: 'Split tool (cut) on / off', shortcut: 'C' },
    { id: '24', action: 'Delete', shortcut: '⌫', contexts: ['clip', 'clip-selected', 'time'] },
    { id: '25', action: 'Distortion', shortcut: '' },
    { id: '26', action: 'Duplicate', shortcut: '⌘D', contexts: ['clip-selected', 'time'] },
    { id: '27', action: 'Echo', shortcut: '' },
    { id: '28', action: 'Edit labels', shortcut: '' },
    { id: '29', action: 'Effect last used', shortcut: '⌘R' },
    { id: '30', action: 'Equalization', shortcut: '' },
    { id: '31', action: 'Export audio', shortcut: '⌘⇧E' },
    { id: '32', action: 'Export multiple', shortcut: '' },
    { id: '33', action: 'Export selection', shortcut: '' },
    { id: '34', action: 'Fade in', shortcut: '' },
    { id: '35', action: 'Fade out', shortcut: '' },
    { id: '35z', action: 'Clip: select; on a selected clip, playhead to its start', shortcut: 'Enter', contexts: ['clip'] },
    { id: '35a', action: 'Fade handles (focus; F again: fade-out, then back)', shortcut: 'F · ⇧F', contexts: ['clip'] },
    { id: '35e', action: 'Trim handles (focus left; ⇧T right; T again: next, then back)', shortcut: 'T · ⇧T', contexts: ['clip'] },
    { id: '35f', action: 'Stretch handles (focus left; S again: right, then back)', shortcut: 'S', contexts: ['clip'] },
    { id: '35g', action: 'Trim / stretch handle: move edge (Shift 1 s) / switch kind / fades / menu / back', shortcut: '← → / T S / F / ⇧F10 / Esc', contexts: ['edge-handle'] },
    { id: '35b', action: 'Fade handle: length / curve', shortcut: '← → / ↑ ↓', contexts: ['fade-handle'] },
    { id: '35c', action: 'Fade handle: shape preset / reset', shortcut: '1–5 / 0', contexts: ['fade-handle'] },
    { id: '35d', action: 'Fade handle: remove / menu / back to the clip', shortcut: '⌫ / ⇧F10 / Esc', contexts: ['fade-handle'] },
    { id: '35h', action: 'Fade to the playhead (focused clip: the fade-in in its first half, the fade-out in its second; a focused fade handle: that fade)', shortcut: '⌥F', contexts: ['clip', 'fade-handle'] },
    { id: '35j', action: 'Fade to the playhead on the track you are on, with no clip focused: the clip under the playhead (the fade-in in its first half, the fade-out in its second)', shortcut: '⌥F' },
    { id: '35k', action: 'Trim to the playhead: the focused clip\'s nearer edge (its start in its first half, its end in its second); a focused handle: that edge', shortcut: '⌥T', contexts: ['clip', 'fade-handle', 'edge-handle'] },
    { id: '35l', action: 'Stretch to the playhead: the focused clip\'s nearer edge; a focused handle: that edge', shortcut: '⌥S', contexts: ['clip', 'fade-handle', 'edge-handle'] },
    { id: '35m', action: 'Trim / stretch to the playhead on the track you are on, with no clip focused: the clip under the playhead, its nearer edge', shortcut: '⌥T / ⌥S' },
    { id: '35n', action: 'Select the clip under the playhead on the track you are on, and focus it', shortcut: '⌥Enter' },
    { id: '35i', action: 'Fades dialog (fade-in and fade-out length and shape) for the focused clip', shortcut: '⌥⇧F', contexts: ['clip', 'fade-handle'] },
    { id: '36', action: 'Find clipping', shortcut: '' },
    { id: '36a', action: 'Context menu (focused clip, track or handle)', shortcut: '⇧F10 · Menu key', contexts: ['clip', 'fade-handle', 'edge-handle'] },
    { id: '36b', action: 'Next section (menu, Home, transport, tracks, selection bar)', shortcut: 'F6' },
    { id: '36c', action: 'Previous section', shortcut: '⇧F6' },
    { id: '37', action: 'Fit project', shortcut: '⌘F' },
    { id: '37a', action: 'Zoom in', shortcut: '⌘=' },
    { id: '37b', action: 'Zoom out', shortcut: '⌘−' },
    { id: '38', action: 'Fit all tracks to height', shortcut: '⌥⌘⇧F · ⌘⇧F' },
    { id: '38i', action: 'Fit track to height', shortcut: '⌥⌘F' },
    { id: '38a', action: 'Track taller', shortcut: '⌥⌘↓' },
    { id: '38b', action: 'Track shorter', shortcut: '⌥⌘↑' },
    { id: '38c', action: 'All tracks taller', shortcut: '⌥⌘⇧↓' },
    { id: '38d', action: 'All tracks shorter', shortcut: '⌥⌘⇧↑' },
    { id: '38e', action: 'Collapse selected tracks', shortcut: '⌥⌘C' },
    { id: '38f', action: 'Expand selected tracks', shortcut: '⌥⌘X' },
    { id: '38g', action: 'Collapse all tracks', shortcut: '⌥⌘⇧C · ⌘⇧C' },
    { id: '38h', action: 'Expand all tracks', shortcut: '⌥⌘⇧X · ⌘⇧X' },
    { id: '39', action: 'Fit to width', shortcut: '' },
    { id: '40', action: 'Generate', shortcut: '' },
    { id: '41', action: 'Generate silence', shortcut: '⌘L', contexts: ['time'] },
    { id: '42', action: 'Generate tone', shortcut: '' },
    { id: '43', action: 'Import audio', shortcut: '⌘⇧I' },
    { id: '44', action: 'Invert', shortcut: '' },
    { id: '45', action: 'Join', shortcut: '⌘J' },
    { id: '44a', action: 'Playhead to the previous / next clip edge on the focused track', shortcut: '[ / ]' },
    { id: '44b', action: 'Select to the previous / next clip edge (grows edge by edge)', shortcut: '⇧[ / ⇧]' },
    { id: '44c', action: 'Shrink the selection from its start / end to the next clip edge inside it', shortcut: '⌘⇧[ / ⌘⇧]', contexts: ['time'] },
    { id: '45a', action: 'Trim clip start / end to playhead (focused clip)', shortcut: '⌥[ / ⌥]', contexts: ['clip'] },
    { id: '46', action: 'Labels to selections', shortcut: '' },
    { id: '47', action: 'Leveller', shortcut: '' },
    { id: '48', action: 'Limiter', shortcut: '' },
    { id: '49', action: 'Low pass filter', shortcut: '' },
    { id: '50', action: 'Macro manager', shortcut: '' },
    { id: '51', action: 'Mute all tracks', shortcut: '⌘U' },
    { id: '52', action: 'New project', shortcut: '⌘N' },
    { id: '53', action: 'Noise reduction', shortcut: '' },
    { id: '54', action: 'Normalize', shortcut: '' },
    { id: '55', action: 'Notch filter', shortcut: '' },
    { id: '56', action: 'Open project', shortcut: '⌘O' },
    { id: '57', action: 'Paste', shortcut: '⌘V' },
    { id: '58', action: 'Pause', shortcut: 'P' },
    { id: '59', action: 'Phaser', shortcut: '' },
    { id: '60', action: 'Play', shortcut: 'Space' },
    { id: '61', action: 'Play/Stop', shortcut: 'Space' },
    { id: '61a', action: 'Go to… (move the playhead to a typed position; Edit menu or the command palette)', shortcut: '' },
    { id: '61b', action: 'Command palette (every command by name, with its shortcut)', shortcut: '⌘P' },
  { id: '61c', action: 'Keyboard map (every shortcut on a keyboard, as an overlay; View menu or the command palette)', shortcut: '' },
    { id: '62', action: 'Preferences', shortcut: '⌘,' },
];
