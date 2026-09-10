import type { Command } from '@audacity-ui/components';

/**
 * Command palette for macro steps — rebuilt 2026-09-10 from the REAL
 * Audacity 4 action inventory (audacity/audacity @ 84bdae867: every
 * UiAction registered in src/<module>/internal/*uiactions.cpp), because
 * AU3's scripting command layer (the old AU3-derived list here) was
 * never ported — AU3 macros cannot be ported over.
 *
 * id = the muse-framework action code dispatched in the real build.
 * category = a USER-FACING grouping (curated 2026-09-10 for the
 * category-driven picker); the AU4 module that registers each action is
 * noted in the section comments as provenance. The picker's category
 * rail follows the order categories first appear in this array, so the
 * sections below are in rail order.
 *
 * Where AU4 registers the same label twice (Copy / Duplicate / Delete /
 * Open …) the names are disambiguated here so the picker never shows two
 * identical rows.
 *
 * Built-in effects are AU4's dynamic effect registry, invoked as
 * action://effects/apply?effectId=X rather than as named commands. The
 * three Selection (prototype) entries are sandbox extensions with no AU4
 * equivalent; they drive the sandbox macro engine (macros/macroActions.ts).
 */
export const availableCommands: Command[] = [

  // ── Selection ───────────────────────────────────────────────────────
  // prototype-only (kept deliberately — the sandbox engine runs these)
  { id: 'proto-select', name: 'Select', category: 'Selection' },
  { id: 'proto-select-time', name: 'Select Time', category: 'Selection' },
  { id: 'proto-select-tracks', name: 'Select Tracks', category: 'Selection' },
  // AU4 project module
  { id: 'select-all', name: 'Select all', category: 'Selection' },
  { id: 'select-all-tracks', name: 'Select all tracks', category: 'Selection' },
  { id: 'select-left-of-playback-position', name: 'Left of playback position', category: 'Selection' },
  { id: 'select-right-of-playback-position', name: 'Right of playback position', category: 'Selection' },
  { id: 'select-track-start-to-cursor', name: 'Track start to cursor', category: 'Selection' },
  { id: 'select-cursor-to-track-end', name: 'Cursor to track end', category: 'Selection' },
  { id: 'select-track-start-to-end', name: 'Track start to end', category: 'Selection' },
  { id: 'select-previous-clip-boundary-to-cursor', name: 'Previous clip boundary to cursor', category: 'Selection' },
  { id: 'select-cursor-to-next-clip-boundary', name: 'Cursor to next clip boundary', category: 'Selection' },
  { id: 'select-previous-clip', name: 'Previous clip', category: 'Selection' },
  { id: 'select-next-clip', name: 'Next clip', category: 'Selection' },
  { id: 'toggle-spectral-selection', name: 'Toggle spectral selection', category: 'Selection' },
  { id: 'zero-cross', name: 'Move cursor to closest zero crossing', category: 'Selection' },
  // AU4 project scene module
  { id: 'sel-ext-left', name: 'Extend selection left', category: 'Selection' },
  { id: 'sel-ext-right', name: 'Extend selection right', category: 'Selection' },
  { id: 'sel-cntr-left', name: 'Contract selection from left', category: 'Selection' },
  { id: 'sel-cntr-right', name: 'Contract selection from right', category: 'Selection' },
  { id: 'spectral-box-select', name: 'Spectral box select', category: 'Selection' },
  { id: 'spectral-brush', name: 'Spectral brush', category: 'Selection' },
  // AU4 track edit module
  { id: 'clear-selection', name: 'Clear selection', category: 'Selection' },
  { id: 'track-view-replace-selection', name: 'Select track/track item', category: 'Selection' },
  { id: 'track-view-toggle-selection', name: 'Add track or track item to selection', category: 'Selection' },
  { id: 'track-view-range-selection', name: 'Track range selection', category: 'Selection' },
  { id: 'track-view-extend-track-selection-prev', name: 'Multi track selection previous', category: 'Selection' },
  { id: 'track-view-extend-track-selection-next', name: 'Multi track selection next', category: 'Selection' },

  // ── Edit ────────────────────────────────────────────────────────────
  // AU4 track edit module
  { id: 'action://trackedit/copy', name: 'Copy', category: 'Edit' },
  { id: 'action://trackedit/cut', name: 'Cut', category: 'Edit' },
  { id: 'action://trackedit/paste-default', name: 'Paste', category: 'Edit' },
  { id: 'action://trackedit/paste-insert', name: 'Paste (pushes clips on selected track)', category: 'Edit' },
  { id: 'action://trackedit/paste-overlap', name: 'Paste (overlaps other clips)', category: 'Edit' },
  { id: 'action://trackedit/paste-insert-all-tracks-ripple', name: 'Paste (preserves synchronization on all tracks)', category: 'Edit' },
  { id: 'action://trackedit/delete', name: 'Delete', category: 'Edit' },
  { id: 'action://trackedit/undo', name: 'Undo', category: 'Edit' },
  { id: 'action://trackedit/redo', name: 'Redo', category: 'Edit' },
  { id: 'cut-leave-gap', name: 'Cut and leave gap', category: 'Edit' },
  { id: 'cut-per-clip-ripple', name: 'Cut and close gap (per clip)', category: 'Edit' },
  { id: 'cut-per-track-ripple', name: 'Cut and close gap (per track)', category: 'Edit' },
  { id: 'cut-all-tracks-ripple', name: 'Cut and close gap (all tracks)', category: 'Edit' },
  { id: 'delete-leave-gap', name: 'Delete and leave gap', category: 'Edit' },
  { id: 'delete-per-clip-ripple', name: 'Delete and close gap (per clip)', category: 'Edit' },
  { id: 'delete-per-track-ripple', name: 'Delete and close gap (per track)', category: 'Edit' },
  { id: 'delete-all-tracks-ripple', name: 'Delete and close gap (all tracks)', category: 'Edit' },
  { id: 'trim-audio-outside-selection', name: 'Trim', category: 'Edit' },
  { id: 'silence-audio-selection', name: 'Silence', category: 'Edit' },
  { id: 'duplicate-selected', name: 'Duplicate selected', category: 'Edit' },
  // AU4 project module
  { id: 'duplicate', name: 'Duplicate', category: 'Edit' },
  { id: 'insert', name: 'Insert', category: 'Edit' },

  // ── Clips ───────────────────────────────────────────────────────────
  // AU4 track edit module
  { id: 'split', name: 'Split', category: 'Clips' },
  { id: 'join', name: 'Join selected clips', category: 'Clips' },
  { id: 'disjoin', name: 'Split clips at silences', category: 'Clips' },
  { id: 'merge-selected-on-tracks', name: 'Merge selected clips', category: 'Clips' },
  { id: 'duplicate-clip', name: 'Duplicate clip', category: 'Clips' },
  { id: 'clip-export', name: 'Export clip', category: 'Clips' },
  { id: 'rename-item', name: 'Rename item (clip/label)', category: 'Clips' },
  { id: 'group-clips', name: 'Group clips', category: 'Clips' },
  { id: 'ungroup-clips', name: 'Ungroup clips', category: 'Clips' },
  { id: 'stretch-clip-to-match-tempo', name: 'Stretch with tempo changes', category: 'Clips' },
  { id: 'clip-pitch-speed-open', name: 'Open pitch and speed dialog', category: 'Clips' },
  { id: 'clip-render-pitch-speed', name: 'Render pitch and speed', category: 'Clips' },
  { id: 'clip-reset-pitch-speed', name: 'Reset pitch and speed', category: 'Clips' },
  // AU4 project module
  { id: 'trim-clip', name: 'Trim clip', category: 'Clips' },
  { id: 'split-into-new-track', name: 'Split into new track', category: 'Clips' },
  // AU4 project scene module
  { id: 'clip-gain', name: 'Clip gain', category: 'Clips' },
  { id: 'clip-pitch-speed', name: 'Pitch and speed', category: 'Clips' },
  { id: 'clip-properties', name: 'Clip properties', category: 'Clips' },
  { id: 'action://trackedit/clip/change-color-auto', name: 'Follow track color', category: 'Clips' },
  { id: 'split-tool', name: 'Split tool', category: 'Clips' },

  // ── Tracks ──────────────────────────────────────────────────────────
  // AU4 track edit module
  { id: 'new-mono-track', name: 'New mono track', category: 'Tracks' },
  { id: 'new-stereo-track', name: 'New stereo track', category: 'Tracks' },
  { id: 'track-rename', name: 'Rename track', category: 'Tracks' },
  { id: 'track-duplicate', name: 'Duplicate track', category: 'Tracks' },
  { id: 'track-delete', name: 'Delete track', category: 'Tracks' },
  { id: 'track-move-up', name: 'Move track up', category: 'Tracks' },
  { id: 'track-move-down', name: 'Move track down', category: 'Tracks' },
  { id: 'track-move-top', name: 'Move track to top', category: 'Tracks' },
  { id: 'track-move-bottom', name: 'Move track to bottom', category: 'Tracks' },
  { id: 'track-make-stereo', name: 'Make stereo track', category: 'Tracks' },
  { id: 'track-swap-channels', name: 'Swap stereo channels', category: 'Tracks' },
  { id: 'track-split-stereo-to-lr', name: 'Split stereo to L/R mono', category: 'Tracks' },
  { id: 'track-split-stereo-to-center', name: 'Split stereo to center mono', category: 'Tracks' },
  { id: 'track-resample', name: 'Resample track', category: 'Tracks' },
  { id: 'track-change-rate-custom', name: 'Custom sample rate', category: 'Tracks' },
  { id: 'action://trackedit/track-view-waveform', name: 'Waveform view', category: 'Tracks' },
  { id: 'action://trackedit/track-view-spectrogram', name: 'Spectrogram view', category: 'Tracks' },
  { id: 'action://trackedit/track-view-multi', name: 'Multi-view', category: 'Tracks' },
  // AU4 project module
  { id: 'duplicate-track', name: 'Duplicate selected tracks', category: 'Tracks' },
  { id: 'remove-tracks', name: 'Remove tracks', category: 'Tracks' },
  { id: 'mixdown-to', name: 'Mix-down to', category: 'Tracks' },
  { id: 'collapse-all-tracks', name: 'Collapse all tracks', category: 'Tracks' },
  { id: 'expand-all-tracks', name: 'Expand all tracks', category: 'Tracks' },
  { id: 'align-end-to-end', name: 'Align end to end', category: 'Tracks' },
  { id: 'align-together', name: 'Align together', category: 'Tracks' },
  { id: 'align-start-to-zero', name: 'Align start to zero', category: 'Tracks' },
  { id: 'align-start-to-playhead', name: 'Align start to playhead', category: 'Tracks' },
  { id: 'align-start-to-selection-end', name: 'Align start to selection end', category: 'Tracks' },
  { id: 'align-end-to-playhead', name: 'Align end to playhead', category: 'Tracks' },
  { id: 'align-end-to-selection-end', name: 'Align end to selection end', category: 'Tracks' },
  { id: 'sort-by-time', name: 'Sort by time', category: 'Tracks' },
  { id: 'sort-by-name', name: 'Sort by name', category: 'Tracks' },
  { id: 'keep-tracks-synchronised', name: 'Keep tracks synchronized', category: 'Tracks' },
  // AU4 project scene module
  { id: 'show-master-track', name: 'Show master track', category: 'Tracks' },
  { id: 'action://projectscene/track-view-half-wave', name: 'Half-wave', category: 'Tracks' },

  // ── Labels ──────────────────────────────────────────────────────────
  // AU4 track edit module
  { id: 'new-label-track', name: 'New label track', category: 'Labels' },
  { id: 'label-add', name: 'Add label', category: 'Labels' },
  // AU4 project module
  { id: 'paste-new-label', name: 'Paste new label', category: 'Labels' },
  { id: 'regular-interval-labels', name: 'Regular interval labels', category: 'Labels' },
  { id: 'export-labels', name: 'Export labels', category: 'Labels' },
  // AU4 project scene module
  { id: 'open-label-editor', name: 'Show label editor', category: 'Labels' },

  // ── Playback ────────────────────────────────────────────────────────
  // AU4 playback module
  { id: 'toggle-loop-region', name: 'Loop playback', category: 'Playback' },
  { id: 'clear-loop-region', name: 'Clear loop region', category: 'Playback' },
  { id: 'set-loop-region-to-selection', name: 'Set loop region to selection', category: 'Playback' },
  { id: 'set-selection-to-loop', name: 'Set selection to loop', category: 'Playback' },
  { id: 'set-loop-region-in-out', name: 'Set loop region in out', category: 'Playback' },
  { id: 'toggle-selection-follows-loop-region', name: 'Creating a loop also selects audio', category: 'Playback' },
  { id: 'repeat', name: 'Play repeats', category: 'Playback' },
  { id: 'pan', name: 'Pan automatically', category: 'Playback' },
  { id: 'metronome', name: 'Metronome', category: 'Playback' },
  { id: 'playback-time', name: 'Timecode', category: 'Playback' },
  { id: 'playback-bpm', name: 'Tempo', category: 'Playback' },
  { id: 'playback-time-signature', name: 'Time signature', category: 'Playback' },
  // AU4 project module
  { id: 'skip-to-selection-start', name: 'Skip to selection start', category: 'Playback' },
  { id: 'skip-to-selection-end', name: 'Skip to selection end', category: 'Playback' },
  // AU4 project scene module
  { id: 'play-position-decrease', name: 'Move playhead left', category: 'Playback' },
  { id: 'play-position-increase', name: 'Move playhead right', category: 'Playback' },
  { id: 'curs-sel-start', name: 'Move playhead to selection start', category: 'Playback' },
  { id: 'curs-sel-end', name: 'Move playhead to selection end', category: 'Playback' },
  { id: 'toggle-pinned-play-head', name: 'Pinned playhead', category: 'Playback' },
  { id: 'toggle-update-display-while-playing', name: 'Update display while playing', category: 'Playback' },
  { id: 'toggle-playback-on-ruler-click-enabled', name: 'Click ruler to start playback', category: 'Playback' },

  // ── Record ──────────────────────────────────────────────────────────
  // AU4 record module
  { id: 'record-on-current-track', name: 'Record on current track', category: 'Record' },
  { id: 'record-on-new-track', name: 'Record on new track', category: 'Record' },
  // AU4 project module
  { id: 'set-up-timed-recording', name: 'Set up timed recording', category: 'Record' },
  { id: 'toggle-sound-activated-recording', name: 'Enable sound activating recording', category: 'Record' },
  { id: 'set-sound-activation-level', name: 'Set sound activation level', category: 'Record' },

  // ── Effects ─────────────────────────────────────────────────────────
  // AU4 effects module
  { id: 'repeat-last-effect', name: 'Repeat last effect', category: 'Effects' },
  // AU4 built-in effect registry (src/effects/builtin_collection)
  { id: 'effect:amplify', name: 'Amplify', category: 'Effects' },
  { id: 'effect:bass-and-treble', name: 'Bass and treble', category: 'Effects' },
  { id: 'effect:change-pitch', name: 'Change pitch', category: 'Effects' },
  { id: 'effect:chirp', name: 'Chirp', category: 'Effects' },
  { id: 'effect:click-removal', name: 'Click removal', category: 'Effects' },
  { id: 'effect:compressor', name: 'Compressor', category: 'Effects' },
  { id: 'effect:dtmf-tones', name: 'DTMF Tones', category: 'Effects' },
  { id: 'effect:fade-in', name: 'Fade In', category: 'Effects' },
  { id: 'effect:fade-out', name: 'Fade Out', category: 'Effects' },
  { id: 'effect:filter-curve-eq', name: 'Filter Curve EQ', category: 'Effects' },
  { id: 'effect:graphic-eq', name: 'Graphic EQ', category: 'Effects' },
  { id: 'effect:invert', name: 'Invert', category: 'Effects' },
  { id: 'effect:limiter', name: 'Limiter', category: 'Effects' },
  { id: 'effect:loudness-normalization', name: 'Loudness Normalization', category: 'Effects' },
  { id: 'effect:noise', name: 'Noise', category: 'Effects' },
  { id: 'effect:noise-reduction', name: 'Noise reduction', category: 'Effects' },
  { id: 'effect:normalize', name: 'Normalize', category: 'Effects' },
  { id: 'effect:paulstretch', name: 'Paulstretch', category: 'Effects' },
  { id: 'effect:remove-dc-offset', name: 'Remove DC offset', category: 'Effects' },
  { id: 'effect:repair', name: 'Repair', category: 'Effects' },
  { id: 'effect:reverb', name: 'Reverb', category: 'Effects' },
  { id: 'effect:reverse', name: 'Reverse', category: 'Effects' },
  { id: 'effect:silence', name: 'Silence', category: 'Effects' },
  { id: 'effect:sliding-stretch', name: 'Sliding stretch', category: 'Effects' },
  { id: 'effect:tone', name: 'Tone', category: 'Effects' },
  { id: 'effect:truncate-silence', name: 'Truncate silence', category: 'Effects' },

  // ── Effect presets & plugins ────────────────────────────────────────
  // AU4 effects module
  { id: 'action://effects/presets/apply', name: 'Apply preset', category: 'Effect presets & plugins' },
  { id: 'action://effects/presets/save', name: 'Save preset', category: 'Effect presets & plugins' },
  { id: 'action://effects/presets/save_as', name: 'Save preset as', category: 'Effect presets & plugins' },
  { id: 'action://effects/presets/delete', name: 'Delete preset', category: 'Effect presets & plugins' },
  { id: 'action://effects/presets/import', name: 'Import preset', category: 'Effect presets & plugins' },
  { id: 'action://effects/presets/export', name: 'Export preset', category: 'Effect presets & plugins' },
  { id: 'action://effects/toggle_vendor_ui', name: 'Use vendor UI', category: 'Effect presets & plugins' },
  { id: 'realtimeeffect-remove', name: 'Remove realtime effect', category: 'Effect presets & plugins' },
  // AU4 project scene module
  { id: 'realtime-effect-move-up', name: 'Move realtime effect up', category: 'Effect presets & plugins' },
  { id: 'realtime-effect-move-down', name: 'Move realtime effect down', category: 'Effect presets & plugins' },
  // AU4 project module
  { id: 'add-realtime-effects', name: 'Add track effects', category: 'Effect presets & plugins' },
  { id: 'favourite-effect-1', name: 'Fav effect #1', category: 'Effect presets & plugins' },
  { id: 'favourite-effect-2', name: 'Fav effect #2', category: 'Effect presets & plugins' },
  { id: 'favourite-effect-3', name: 'Fav effect #3', category: 'Effect presets & plugins' },
  { id: 'plugin-manager', name: 'Plugin manager', category: 'Effect presets & plugins' },
  { id: 'nyquist-plugin-installer', name: 'Nyquist plugin installer', category: 'Effect presets & plugins' },
  { id: 'nyquist-prompt', name: 'Nyquist prompt', category: 'Effect presets & plugins' },
  // AU4 playback module
  { id: 'get-effects', name: 'Get effects', category: 'Effect presets & plugins' },

  // ── Analyze ─────────────────────────────────────────────────────────
  // AU4 project module
  { id: 'contrast-analyzer', name: 'Contrast analyzer', category: 'Analyze' },
  { id: 'plot-spectrum', name: 'Plot spectrum', category: 'Analyze' },
  { id: 'sample-data-export', name: 'Sample data export', category: 'Analyze' },

  // ── View ────────────────────────────────────────────────────────────
  // AU4 project scene module
  { id: 'zoom-in', name: 'Zoom in', category: 'View' },
  { id: 'zoom-out', name: 'Zoom out', category: 'View' },
  { id: 'zoom-default', name: 'Zoom default', category: 'View' },
  { id: 'zoom-to-selection', name: 'Zoom to selection', category: 'View' },
  { id: 'zoom-to-fit-project', name: 'Zoom to fit project', category: 'View' },
  { id: 'zoom-toggle', name: 'Zoom toggle', category: 'View' },
  { id: 'center-view-on-playhead', name: 'Center view on playhead', category: 'View' },
  { id: 'action://trackedit/global-view-spectrogram', name: 'Toggle spectral view', category: 'View' },
  { id: 'snap', name: 'Snapping', category: 'View' },
  { id: 'minutes-seconds-ruler', name: 'Minutes & seconds', category: 'View' },
  { id: 'beats-measures-ruler', name: 'Beats & measures', category: 'View' },
  { id: 'toggle-vertical-rulers', name: 'Show vertical rulers', category: 'View' },
  { id: 'toggle-rms-in-waveform', name: 'Show RMS in waveform', category: 'View' },
  { id: 'toggle-clipping-in-waveform', name: 'Show clipping in waveform', category: 'View' },
  // AU4 project module
  { id: 'toggle-effects', name: 'Show effects panel', category: 'View' },
  { id: 'toggle-history', name: 'Show history', category: 'View' },
  // AU4 application module
  { id: 'toggle-transport', name: 'Show playback controls', category: 'View' },
  { id: 'toggle-tracks', name: 'Show tracks', category: 'View' },
  { id: 'toggle-statusbar', name: 'Show status bar', category: 'View' },
  { id: 'dock-restore-default-layout', name: 'Restore the default layout', category: 'View' },

  // ── Navigation ──────────────────────────────────────────────────────
  // AU4 track edit module (keyboard focus / item nudges)
  { id: 'track-view-item-move-left', name: 'Move item left', category: 'Navigation' },
  { id: 'track-view-item-move-right', name: 'Move item right', category: 'Navigation' },
  { id: 'track-view-item-extend-left', name: 'Extend item left', category: 'Navigation' },
  { id: 'track-view-item-extend-right', name: 'Extend item right', category: 'Navigation' },
  { id: 'track-view-item-reduce-left', name: 'Reduce item left', category: 'Navigation' },
  { id: 'track-view-item-reduce-right', name: 'Reduce item right', category: 'Navigation' },
  { id: 'track-view-item-move-up', name: 'Move item up', category: 'Navigation' },
  { id: 'track-view-item-move-down', name: 'Move item down', category: 'Navigation' },
  { id: 'track-view-next-panel', name: 'Next panel', category: 'Navigation' },
  { id: 'track-view-prev-panel', name: 'Previous panel', category: 'Navigation' },
  { id: 'track-view-above-item', name: 'Above item', category: 'Navigation' },
  { id: 'track-view-below-item', name: 'Below item', category: 'Navigation' },
  { id: 'track-view-first-track', name: 'First track', category: 'Navigation' },
  { id: 'track-view-last-track', name: 'Last track', category: 'Navigation' },
  { id: 'track-view-item-context-menu', name: 'Open item’s context menu', category: 'Navigation' },
  // AU4 project module
  { id: 'prev-window', name: 'Previous window', category: 'Navigation' },
  { id: 'next-window', name: 'Next window', category: 'Navigation' },

  // ── Project & files ─────────────────────────────────────────────────
  // AU4 project module
  { id: 'file-new', name: 'New', category: 'Project & files' },
  { id: 'file-open', name: 'Open', category: 'Project & files' },
  { id: 'file-open-recent', name: 'Open recent', category: 'Project & files' },
  { id: 'cloud-file-open', name: 'Open cloud project', category: 'Project & files' },
  { id: 'audacity://cloud/open-audio-file', name: 'Open cloud audio file', category: 'Project & files' },
  { id: 'clear-recent', name: 'Clear recent files', category: 'Project & files' },
  { id: 'project-import', name: 'Import', category: 'Project & files' },
  { id: 'raw-data-import', name: 'Raw data import', category: 'Project & files' },
  { id: 'sample-data-import', name: 'Sample data import', category: 'Project & files' },
  { id: 'file-save', name: 'Save', category: 'Project & files' },
  { id: 'file-save-as', name: 'Save as', category: 'Project & files' },
  { id: 'file-save-to-cloud', name: 'Save to cloud', category: 'Project & files' },
  { id: 'file-share-audio', name: 'Share audio', category: 'Project & files' },
  { id: 'export-audio', name: 'Export audio', category: 'Project & files' },
  { id: 'export-midi', name: 'Export MIDI', category: 'Project & files' },
  { id: 'file-close', name: 'Close project', category: 'Project & files' },
  { id: 'project-show-in-folder', name: 'Show in Finder', category: 'Project & files' },
  { id: 'project-properties', name: 'Project properties', category: 'Project & files' },
  { id: 'open-metadata-editor', name: 'Show metadata editor', category: 'Project & files' },
  { id: 'link-account', name: 'Link account', category: 'Project & files' },
  // AU4 cloud module
  { id: 'audacity://cloud/open-project-page', name: 'View project on audio.com', category: 'Project & files' },
  { id: 'audacity://cloud/open-audio-page', name: 'View on audio.com', category: 'Project & files' },

  // ── Macros ──────────────────────────────────────────────────────────
  // AU4 project module
  { id: 'manage-macros', name: 'Manage macros', category: 'Macros' },
  { id: 'apply-macros-palette', name: 'Apply macros palette', category: 'Macros' },
  { id: 'macro-fade-ends', name: 'Macro fade ends', category: 'Macros' },
  { id: 'macro-mp3-conversion', name: 'Macro MP3 conversion', category: 'Macros' },

  // ── Application ─────────────────────────────────────────────────────
  // AU4 application module
  { id: 'preference-dialog', name: 'Preferences', category: 'Application' },
  { id: 'online-handbook', name: 'Online handbook', category: 'Application' },
  { id: 'ask-help', name: 'Ask for help', category: 'Application' },
  { id: 'about-audacity', name: 'About Audacity', category: 'Application' },
  { id: 'about-qt', name: 'About Qt', category: 'Application' },
  { id: 'revert-factory', name: 'Revert to factory settings', category: 'Application' },
  { id: 'restart', name: 'Restart', category: 'Application' },
  { id: 'quit', name: 'Exit', category: 'Application' },
  { id: 'action://copy', name: 'Copy (global)', category: 'Application' },
  { id: 'action://cut', name: 'Cut (global)', category: 'Application' },
  { id: 'action://paste', name: 'Paste (global)', category: 'Application' },
  { id: 'action://undo', name: 'Undo (global)', category: 'Application' },
  { id: 'action://redo', name: 'Redo (global)', category: 'Application' },
  { id: 'action://delete', name: 'Delete (global)', category: 'Application' },
  { id: 'action://cancel', name: 'Cancel', category: 'Application' },
  { id: 'action://trigger', name: 'Trigger', category: 'Application' },
  { id: 'action://enter', name: 'Enter', category: 'Application' },
  // AU4 playback module (device setup)
  { id: 'audio-setup', name: 'Audio setup', category: 'Application' },
  { id: 'audio-settings', name: 'Audio settings', category: 'Application' },
  { id: 'rescan-devices', name: 'Rescan audio devices', category: 'Application' },
  // AU4 project module (diagnostics)
  { id: 'tutorials', name: 'Tutorials', category: 'Application' },
  { id: 'reset-configuration', name: 'Reset configuration', category: 'Application' },
  { id: 'device-info', name: 'Device info', category: 'Application' },
  { id: 'midi-device-info', name: 'MIDI device info', category: 'Application' },
  { id: 'log', name: 'Log', category: 'Application' },
  { id: 'benchmark', name: 'Benchmark', category: 'Application' },
  { id: 'crash-report', name: 'Crash report', category: 'Application' },
  { id: 'raise-segfault', name: 'Raise segfault', category: 'Application' },
  { id: 'throw-exception', name: 'Throw exception', category: 'Application' },
  { id: 'violate-assertion', name: 'Violate assertion', category: 'Application' },
  { id: 'menu-tree', name: 'Menu tree', category: 'Application' },
  { id: 'frame-statistics', name: 'Frame statistics', category: 'Application' },
];
