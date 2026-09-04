# UI Assembly Guide

How to compose `@audacity-ui/components` into the Audacity 4 project window.

The package ships ~130 components, but the knowledge of how they fit together lives
in the sandbox app (`apps/sandbox/`). This guide extracts that composition knowledge
for consumers who want to build the project window — or any region of it — outside
the sandbox: which components make up each region, how they nest, which props are
load-bearing versus cosmetic, and the traps.

Every claim below is sourced from the code as of this writing; each section cites
the file it was read from. Where the sandbox does something app-specific (reducers,
context menus, focus routing), it is marked **sandbox-specific** — a static
composition does not need it.

Imports use the deep-subpath form throughout (`@audacity-ui/components/X`).
The package's `exports` map (`packages/components/package.json`) routes `./*` to
`dist/*.mjs`, one entry per component directory, so subpath imports tree-shake to
just the component and its CSS. The barrel
(`import { X } from '@audacity-ui/components'`) also works.

---

## 1. The window, layer by layer

The sandbox stacks the window in `apps/sandbox/src/App.tsx` (around lines 771–1041)
as a `flex-direction: column` filling the viewport, in this order:

```
ApplicationHeader        (web/demo builds only)
ProjectToolbar           (Home / Project / Export tabs + hotbar + workspace)
TransportToolbar         (when docked top — it can also float or dock bottom)
─ editor row ────────────────────────────────────────────────
│ TrackControlSidePanel │ TimelineRuler row │ (corner spacer) │
│  └ TrackControlPanel× │ Canvas + clips    │ VerticalRuler-  │
│                       │ + PlayheadCursor  │ Panel           │
─────────────────────────────────────────────────────────────
SelectionToolbar         (status bar)
```

The editor row itself is composed in
`apps/sandbox/src/components/EditorLayout.tsx` (lines 317–1038).

### 1.1 Application header

- **Component**: `ApplicationHeader` — `@audacity-ui/components/ApplicationHeader`
- **Source**: `packages/components/src/ApplicationHeader/ApplicationHeader.tsx`;
  used in `apps/sandbox/src/App.tsx:776–780` (skipped under Electron, where the
  OS titlebar takes over).
- **Minimum viable props**: none are required. `os` defaults to `'windows'`
  (menu bar with File/Edit/… items and window controls); `'macos'` renders
  traffic lights + centred title, no menu bar.
- `menuDefinitions` (`Record<string, MenuItem[]>`) turns the Windows menu items
  into working dropdowns; without it, clicks just fire `onMenuItemClick`.
  Building the menu tree is **sandbox-specific** (`useMenuDefinitions`).

```tsx
import { ApplicationHeader } from '@audacity-ui/components/ApplicationHeader';

<ApplicationHeader os="macos" />
```

### 1.2 Project toolbar row

- **Component**: `ProjectToolbar` — `@audacity-ui/components/ProjectToolbar`
- **Source**: `packages/components/src/ProjectToolbar/ProjectToolbar.tsx`; wired in
  `apps/sandbox/src/components/ProjectToolbarContainer.tsx`.
- **Minimum viable props**: none required; a bare `<ProjectToolbar />` renders the
  Home/Project/Export tabs. For the real AU4 look pass `activeItem`,
  `centerActions` (the hotbar) and `workspaceSelector` + `historyActions`.
- The centre and right slots are hidden whenever `activeItem === 'home'`
  (ProjectToolbar.tsx:367–377), and the sandbox additionally withholds them on
  the export tab (ProjectToolbarContainer.tsx:86–127).
- Height is 40px by default (`height` prop).

The sandbox's hotbar, verbatim (ProjectToolbarContainer.tsx:86–113):

```tsx
import { ProjectToolbar } from '@audacity-ui/components/ProjectToolbar';

<ProjectToolbar
  activeItem="project"
  onMenuItemClick={(item) => {/* route */}}
  centerActions={[
    { icon: 'mixer',   label: 'Mixer',       onClick: () => {} },
    { icon: 'cog',     label: 'Audio setup', onClick: () => {} },
    { icon: 'cloud',   label: 'Share audio', onClick: () => {} },
    { icon: 'plugins', label: 'Get effects', onClick: () => {} },
  ]}
  workspaceSelector={{
    value: 'modern',
    options: [
      { value: 'music', label: 'Music' },
      { value: 'classic', label: 'Classic' },
      { value: 'modern', label: 'Modern' },
      { value: 'spectral-editing', label: 'Spectral editing' },
    ],
    onChange: () => {},
  }}
  historyActions={{ onUndo: () => {}, onRedo: () => {} }}
/>
```

### 1.3 Transport toolbar

- **Component**: `TransportToolbar` — `@audacity-ui/components/TransportToolbar`
- **Source**: `packages/components/src/TransportToolbar/TransportToolbar.tsx`; wired
  in `apps/sandbox/src/components/TransportToolbarContainer.tsx`.
- This is the one component with a genuinely large **required** prop surface
  (TransportToolbar.tsx:33–116): `activeMenuItem`, `workspace`, `isPlaying`,
  `isRecording`, `onPlay`, `onStop`, `onRecord`, the six loop-region props
  (`loopRegionEnabled/Start/End` + their three setters), `timeSelection`, `bpm`,
  `beatsPerMeasure`, the mode toggles (`envelopeMode`, `spectrogramMode`,
  `onToggleEnvelope`, `onToggleSpectrogram`), the five zoom callbacks
  (`onZoomIn/Out/ToSelection/ToFitProject/Toggle`), the timecode quartet
  (`currentTime`, `timeCodeFormat`, `onTimeCodeChange`, `onTimeCodeFormatChange`)
  and the three export callbacks (`onShareClick`, `onExportAudioClick`,
  `onExportLoopRegionClick`). Everything else (snap, master meter, gripper,
  split record button) is optional.
- It **returns `null` when `activeMenuItem === 'home'`** (line 271), and renders a
  different, export-focused layout when `activeMenuItem === 'export'`.
- `workspace` (`'classic' | 'spectral-editing' | 'modern' | 'music'`) selects
  which tool groups render — the workspace variants are baked into this
  component, not assembled by the consumer.
- It sits on the generic `Toolbar` (default `minHeight` 48,
  `packages/components/src/Toolbar/Toolbar.tsx:66`), whose content area
  `flex-wrap`s onto extra rows when the window narrows (Toolbar.css:33–39).
- Master meter props are in **dB, −60 to 0** (`masterLevelLeft/Right`, defaults
  −60) with `masterVolume` **linear 0–1** — see §3.4.
- The floating/docked-top/docked-bottom positioning (`useDraggableToolbar`,
  App.tsx:795, 1025–1041) is **sandbox-specific**; a static composition just
  renders it once in the stack.

### 1.4 Track control side panel

- **Components**: `TrackControlSidePanel` containing `TrackControlPanel` children —
  `@audacity-ui/components/TrackControlSidePanel`,
  `@audacity-ui/components/TrackControlPanel`
- **Source**: `packages/components/src/TrackControlSidePanel/TrackControlSidePanel.tsx`,
  `packages/components/src/TrackControlPanel/TrackControlPanel.tsx`; composed in
  EditorLayout.tsx:338–510.
- The side panel is the container: header with the "Add new" button, a scrollable
  track list, per-track resize grips and the track context menu. It renders a
  fixed **280px** wide `SidePanel` (TrackControlSidePanel.tsx:281–283).
- **Nesting contract**: children must be `TrackControlPanel` elements, one per
  track, in track order. Pass `trackHeights` (one number per track, matching the
  canvas row heights) so the panel rows line up with the lanes, and
  `trackViewModes`/`trackColors` if you use the per-track menu.
- **TrackControlPanel minimum viable props**: `trackName` is the only required
  prop. Sensible defaults cover the rest: `trackType` `'mono'`
  (`'mono' | 'stereo' | 'label' | 'midi'`), `volume` 75 (0–100), `pan` 0
  (−100–100), `meterLevel`/`meterLevelLeft`/`meterLevelRight` 0 (0–100).
- **Height states**: the panel takes `height` as a named state plus the exact
  `trackHeight` in px. The sandbox derives the state from the pixel height
  (EditorLayout.tsx:421–429): ≤ 44px → `'collapsed'`, ≤ 82px → `'truncated'`,
  otherwise `'default'`.
- All the callbacks (`onMuteToggle`, `onSoloToggle`, `onVolumeChange`, reorder,
  focus routing, …) are optional; the sandbox's implementations
  (`useTrackPanelHandlers`) are **sandbox-specific**.

```tsx
import { TrackControlSidePanel } from '@audacity-ui/components/TrackControlSidePanel';
import { TrackControlPanel } from '@audacity-ui/components/TrackControlPanel';

<TrackControlSidePanel trackHeights={[114, 114]}>
  <TrackControlPanel trackName="Vocals" trackType="mono"
    volume={75} pan={0} meterLevel={0} height="default" trackHeight={114} />
  <TrackControlPanel trackName="Guitar" trackType="stereo"
    volume={60} pan={-20} meterLevelLeft={0} meterLevelRight={0}
    height="default" trackHeight={114} />
</TrackControlSidePanel>
```

### 1.5 Timeline ruler

- **Component**: `TimelineRuler` — `@audacity-ui/components/TimelineRuler`
- **Source**: `packages/components/src/TimelineRuler/TimelineRuler.tsx`; composed in
  EditorLayout.tsx:516–606.
- **Minimum viable props**: `pixelsPerSecond`, `totalDuration`, `width`.
  Default `height` is 40.
- **Prefer `viewportWidth` over a large `width`** — the props' own doc comments
  (TimelineRuler.tsx:20–44) mark project-sized `width` as legacy: the canvas
  backing store is capped at 32,000 device pixels (line 187), so on HiDPI
  displays any project wider than ~16,000 CSS px forces the DPR down and renders
  blurry. Pass the measured visible width as `viewportWidth` plus `scrollX`, and
  keep the ruler outside the horizontally-scrolling region. The sandbox measures
  it with a `ResizeObserver` hook (`useMeasuredWidth`, EditorLayout.tsx:215).
- The ruler draws ticks and labels onto a `<canvas>` in a `useEffect`
  (lines 171–200) — see §5.1.
- Loop-region display and drag live inside this component
  (`loopRegionEnabled/Start/End`, `onLoopRegionChange`, …); the stalks that
  extend the loop boundaries down over the ruler and canvas are a small
  sandbox component (`LoopRegionStalks`), **sandbox-specific**.
- The playhead's grab-handle icon in the ruler is *not* part of TimelineRuler —
  it is a second `PlayheadCursor` (§1.7).

```tsx
import { TimelineRuler } from '@audacity-ui/components/TimelineRuler';

<TimelineRuler pixelsPerSecond={100} scrollX={0} totalDuration={60}
  width={5000} viewportWidth={960} height={40}
  timeFormat="minutes-seconds" bpm={120} beatsPerMeasure={4} />
```

### 1.6 Clips canvas (tracks and clips)

The sandbox's `Canvas` component (`apps/sandbox/src/components/Canvas.tsx`) is
**not in the package** — it is the app-level interaction dispatcher (selection,
drag/trim/stretch, marquee, split tool, grid overlay). What the package provides,
and what Canvas ultimately renders per track
(via `apps/sandbox/src/components/canvas/CanvasTrackList.tsx`), is:

- **`TrackNew`** — barrel import only
  (`import { TrackNew } from '@audacity-ui/components'`;
  `src/index.ts:119`) — one horizontal lane: positions its clips on the
  timeline, renders selection/focus track background, and hosts the envelope
  overlay. Source: `packages/components/src/Track/TrackNew.tsx`. Beware: the
  `/Track` **subpath** exports the older `Track` component
  (`src/Track/index.ts`), not `TrackNew` — the sandbox uses `TrackNew`
  (CanvasTrackList.tsx:2).
- **`Clip`** — `@audacity-ui/components/Clip` — one clip: `ClipHeader`
  (name, menu button, drag surface) over `ClipBody` (canvas-drawn waveform /
  spectrogram). Source: `packages/components/src/Clip/Clip.tsx`.

**TrackNew minimum viable props** (TrackNew.tsx:18–107): `clips`, `trackIndex`,
`width`. Each clip in `clips` is a `TrackClip`:

```ts
interface TrackClip {
  id: string | number;
  name: string;
  start: number;      // seconds
  duration: number;   // seconds
  selected?: boolean;
  waveform?: number[];        // mono, normalised -1..1
  waveformRms?: number[];
  waveformLeft?: number[];    // stereo pair
  waveformRight?: number[];
  waveformLeftRms?: number[];
  waveformRightRms?: number[];
  envelopePoints?: Array<{ time: number; db: number }>;
  midiNotes?: MidiNote[];
}
```

Colour: by default the lane colour cycles from `trackIndex` (0 = blue,
1 = violet, 2 = magenta, …; TrackNew.tsx:47–52, 331). An explicit `color` prop
overrides the cycle (TrackNew.tsx:206–209) — the sandbox passes `track.color`.

Lanes stack vertically with a **2px gap** and sit on the theme's canvas
background. The gridlines (`GridOverlay`), snap guideline, marquee rectangle,
split preview and spectral-selection overlay are all sandbox components layered
into the same relatively-positioned container — **sandbox-specific**; a static
composition is `TrackNew` rows in a `position: relative` div plus a
`PlayheadCursor`.

Direct `Clip` use (outside a track lane) needs `name`, `width`, `height`,
`color` and waveform data; defaults are `width` 224, `height` 104,
`pixelsPerSecond` 100 (Clip.tsx:143–166).

### 1.7 Playhead

- **Component**: `PlayheadCursor` — `@audacity-ui/components/PlayheadCursor`
- **Source**: `packages/components/src/PlayheadCursor/PlayheadCursor.tsx`;
  composed twice in EditorLayout.tsx:579–604 and 828–833.
- **Minimum viable props**: `position` (seconds), `pixelsPerSecond`, `height` (px).
- The sandbox renders **two instances** so the icon stays fixed while the stalk
  scrolls: one in the ruler row with `height={0}`, `showTopIcon`,
  `iconTopOffset={24}` and `scrollX` (icon only, draggable when
  `onPositionChange` is wired), and one over the canvas with the full canvas
  height and `showTopIcon={false}` (stalk only).
- Horizontal position is `CLIP_CONTENT_OFFSET + position * pixelsPerSecond - scrollX`
  (PlayheadCursor.tsx:62) — the same 12px content offset the clips use, so the
  stalk lines up with clip starts.

### 1.8 Vertical (amplitude/frequency) rulers

- **Component**: `VerticalRulerPanel` — `@audacity-ui/components/VerticalRuler`
- **Source**: `packages/components/src/VerticalRuler/VerticalRulerPanel.tsx`;
  composed in EditorLayout.tsx:872–1004.
- **Minimum viable props**: `tracks` — an array of `TrackRulerConfig`
  (`{ id, height }` at minimum; `stereo`, `viewMode`, `trackType`,
  `waveformRulerFormat`, spectrogram fields are optional). Label and MIDI tracks
  get no ruler.
- The sandbox uses `width={64}` (default is 32) and `headerHeight={0}`, and fills
  the top-right corner where this column meets the timeline ruler with its own
  64×40 spacer div colour-matched to the timeline rail
  (EditorLayout.tsx:613–622) — the panel does not draw that corner itself.
- Pass `scrollY` to keep the rulers aligned with the scrolled lanes; the panel
  positions itself with a CSS transform, not native scrolling.
- The `RulerFlyout` (per-track scale/format switcher) is a separate component the
  sandbox opens from ruler right-click — optional.

### 1.9 Selection toolbar (status bar)

- **Component**: `SelectionToolbar` — `@audacity-ui/components/SelectionToolbar`
- **Source**: `packages/components/src/SelectionToolbar/SelectionToolbar.tsx`;
  used in App.tsx:986–1023 (hidden on the home tab).
- **Minimum viable props**: `selectionStart` and `selectionEnd` (seconds,
  `null` = no selection; nulls display as zeros).
- Left side shows `status` (default `'Stopped'`) and `instructionText`
  (default `'Click and drag to select audio'`); right side renders three
  `TimeCode`s (start, end, duration). Formats default to
  `'hh:mm:ss+milliseconds'`.

```tsx
import { SelectionToolbar } from '@audacity-ui/components/SelectionToolbar';

<SelectionToolbar selectionStart={2.5} selectionEnd={7.25} />
```

### 1.10 Scrollbars (optional)

`CustomScrollbar` (`@audacity-ui/components/CustomScrollbar`) renders overlay
scrollbars driven by a `contentRef` to the scrolling element — one horizontal
(`height={20}`) and one vertical (`width={20}`) instance in the sandbox
(EditorLayout.tsx:857–868). Only needed when you hide native scrollbars.

---

## 2. Layout constants that matter

All values read from the cited sources; treat them as the AU4 look's contract.

| Constant | Value | Source |
|---|---|---|
| ProjectToolbar height | 40px (default) | ProjectToolbar.tsx:45 |
| Toolbar (transport) min height | 48px, wraps taller | Toolbar.tsx:66, Toolbar.css:33–39 |
| TimelineRuler height | 40px | TimelineRuler.tsx:127; EditorLayout.tsx:540 |
| Track control side panel width | 280px fixed | TrackControlSidePanel.tsx:281–283 |
| Vertical ruler column width | 64px (component default 32) | EditorLayout.tsx:890, 614 |
| Corner spacer (ruler row ∩ ruler column) | 64 × 40px | EditorLayout.tsx:613–622 |
| Default track height | 114px | sandbox `constants/canvas.ts` (`DEFAULT_TRACK_HEIGHT`) |
| Track gap / top gap | 2px each | `constants/canvas.ts` (`TRACK_GAP`, `TOP_GAP`) |
| Clip header height | 20px | Clip.tsx:32; `constants/canvas.ts` |
| Clip content offset (left padding) | 12px — exported as `CLIP_CONTENT_OFFSET` | `packages/components/src/constants.ts:10` |
| Track height states | ≤ 44px collapsed, ≤ 82px truncated | EditorLayout.tsx:421–429 |
| Workspace dropdown width | 162px (Figma spec) | ProjectToolbar.tsx:22, 273 |
| Bottom drawer default height | 376px | EditorLayout.tsx:206 |

**Timeline sizing maths** (sandbox `hooks/useZoomControls.ts:6–75`):
`timelineDuration = max(10, projectLength × 1.5)` seconds;
`timelineWidth = clamp(ceil(timelineDuration × pixelsPerSecond) + 12, 5000, 32000)` px.
The 32,000 ceiling exists because it is the browser canvas size limit the
TimelineRuler also guards against.

**ProjectToolbar breakpoints** — `compactBelow` (default **1200**) collapses the
workspace dropdown to a `workspace` icon button + context menu; `labelsBelow`
(default **900**) drops the hotbar labels, leaving icon-only ghost buttons
(ProjectToolbar.tsx:75–80, 119–145). Two things to know:

1. The breakpoints measure **`window.innerWidth`, not the container**
   (ProjectToolbar.tsx:136–145, via a window `resize` listener). Embedding the
   toolbar in a narrow column of a wide page will *not* trigger the compact
   modes — the full-width layout will overflow the column instead. Override
   `compactBelow`/`labelsBelow` if your embedding context is narrower than the
   window.
2. Below ~1000px of window width you are between the two thresholds: workspace
   already compact (< 1200), labels still on until 900. The transport toolbar
   has no breakpoints at all — its flex content wraps onto additional rows,
   growing the toolbar taller (Toolbar.css:33–39). Plan vertical room for that
   in narrow embeds.

---

## 3. Data the components need

### 3.1 Waveforms

Waveform data is a plain `number[]` of samples **normalised to −1..1**
(Clip.tsx:53–64). Mono clips use `waveformData` (+ optional `waveformDataRms`);
stereo clips use `waveformLeft`/`waveformRight` (+ `waveformLeftRms`/
`waveformRightRms`) with `channelSplitRatio` (0–1, default 0.5) controlling the
channel split line. On `TrackClip` the mono fields are named `waveform`/
`waveformRms` (TrackNew.tsx:18–32). RMS arrays draw the darker inner band; omit
them to render peak-only.

Rendering is resolution-independent — consumers derive sample rate from array
length, so **~500–2000 samples per second of audio is plenty**; densities beyond
~10–20 samples per rendered pixel are visually identical and only cost redraw
time (`packages/components/src/utils/waveform.ts:1–29`, which warns in dev above
100,000 samples). For demo data the package exports generators from that module:
`generateSpeechWaveform(durationSeconds, samplesPerSecond = 1000, { seed })`,
`generateDecayingSineWave(duration, samplesPerSecond = 2000)` and
`generateSineWave(...)` — all deterministic when seeded.

### 3.2 Clip colour palette

`ClipColor` is a 10-value union — the 9-colour palette plus the legacy style:
`'cyan' | 'blue' | 'violet' | 'magenta' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'classic'`
(`packages/components/src/types/clip.ts`). Each colour carries 13 state values
(header, hover, selected, waveform, RMS, time-selection variants …) defined per
theme under `theme.audio.clip` (`packages/tokens/src/themes/light.v2.ts:324+`)
and injected as `--clip-<colour>-<state>` CSS variables by `ThemeProvider`
(ThemeProvider.tsx:43–76). The light-theme anchor values:

| Colour | header | body |
|---|---|---|
| cyan | `#00C1D2` | `#3FCEDA` |
| blue | `#50A5FF` | `#75B7FF` |
| violet | `#9A96FF` | `#ADABFF` |
| magenta | `#E787D0` | `#ECA0D9` |
| red | `#FF787C` | `#FF9496` |
| orange | `#FF9857` | `#FFAD7A` |
| yellow | `#F0BE31` | `#F2CB63` |
| green | `#58C049` | `#7CCD70` |
| teal | `#00B792` | `#17C6A8` |
| classic | `#CDD2F5` | `#E4E8FA` |

Do not hard-code these — pass the colour *name* and let the theme resolve it.

### 3.3 Time ↔ pixels

One conversion rules the whole window: `x = CLIP_CONTENT_OFFSET + seconds ×
pixelsPerSecond − scrollX` (PlayheadCursor.tsx:62; the ruler, clips and grid all
use the same offset). `pixelsPerSecond` is the zoom level, default 100. Every
horizontal component must receive the **same** `pixelsPerSecond` and `scrollX`
or the ruler, playhead and clips drift apart.

### 3.4 Meter ranges — two different scales

- **Track meters** (`TrackControlPanel`): `meterLevel`, `meterLevelLeft/Right`,
  peaks — all **0–100** (TrackControlPanel.tsx:80–92). `volume` is 0–100
  (default 75), `pan` −100–100.
- **Master meter** (`MasterMeter`, embedded in `TransportToolbar`; and
  `MasterMeterVertical` as a side column): `levelLeft`/`levelRight` are **dB,
  −60 to 0** (MasterMeter.tsx:7–10, `DB_MIN = -60`), and `volume` is **linear
  0–1** where 1 = 0dB (converted internally via `20·log10`,
  MasterMeter.tsx:63–69). Mixing up the two scales silently pins the meters.

### 3.5 TimeCode

`TimeCode` (`@audacity-ui/components/TimeCode`,
`packages/components/src/TimeCode/TimeCode.tsx:34–109`) takes `value` in
**seconds** plus `format` — one of twelve formats (`'hh:mm:ss'`,
`'hh:mm:ss+milliseconds'`, `'hh:mm:ss+samples'`, `'seconds'`, `'samples'`,
`'beats:bars'`, `'Hz'`, …) — and `sampleRate` (default 44100) / `frameRate`
(default 24) for the sample- and frame-based formats.

There is deliberately no "just render this string" prop: the component
decomposes `value` into digit segments (`formatTimeToSegments`) and renders
**each digit as its own focusable, editable element**, converting edits back to
seconds through `segmentsToSeconds` before calling `onChange`. That is why the
transport toolbar and selection toolbar wire four props (`currentTime`,
`timeCodeFormat`, `onTimeCodeChange`, `onTimeCodeFormatChange`) rather than one
formatted string — and why you must never wrap a TimeCode in your own button
(§5.2). Omit `onChange` for a read-only display; `showFormatSelector={false}`
hides the built-in format menu button.

---

## 4. Icon names

`IconName` values actually used per region, read from the sandbox and component
sources (not guessed — the full union lives in
`packages/components/src/Icon/Icon.tsx`):

- **Project toolbar hotbar** (ProjectToolbarContainer.tsx:86–113): `'mixer'`,
  `'cog'` (Audio setup), `'cloud'` (Share audio), `'plugins'` (Get effects).
  Rendered internally by ProjectToolbar itself: `'workspace'` (compact
  selector), `'undo'`, `'redo'`.
- **Transport toolbar** (TransportToolbar.tsx:271–670): `'play'`, `'pause'`,
  `'stop'`, `'record'`, `'caret-down'` (record options), `'skip-back'`,
  `'skip-forward'`, `'loop'`, `'automation'` (envelope toggle), `'split'`,
  `'spectrogram'`, `'waveform'`, `'zoom-in'`, `'zoom-out'`,
  `'zoom-to-selection'`, `'zoom-to-fit'`, `'zoom-toggle'`, `'cut'`, `'copy'`,
  `'paste'`, `'trim'`, `'silence'`, `'microphone'`, `'volume'`, `'cog'`.
  Which of these appear depends on the `workspace` variant.
- **Track control panel**: takes an optional `icon?: IconName` override; when
  omitted the icon derives from `trackType` (TrackControlPanel.tsx:47–53).

Icons render as glyphs from the bundled MusescoreIcon font — they depend on the
package stylesheet's `@font-face` (§5.3).

---

## 5. Traps

### 5.1 Canvas-drawn components need client-side JS

Three things paint into `<canvas>` elements inside `useEffect`, so they render
as empty boxes in server-rendered or static HTML until React hydrates in the
browser:

- **`TimelineRuler`** — all ticks and labels (TimelineRuler.tsx:171 onwards).
- **`ClipBody`** (inside `Clip`/`TrackNew`) — the waveform, RMS band and
  spectrogram (ClipBody.tsx:187 onwards). It also reads its colours from the
  CSS custom properties at draw time via `getComputedStyle`
  (ClipBody.tsx:212–320), so the theme variables and stylesheet must be in the
  DOM *before* the draw effect runs.
- **`PlayheadCursor`'s top icon** — the house-shaped grab handle
  (PlayheadCursor.tsx:67–112). The stalk itself is plain DOM.

In island/partial-hydration frameworks, these components must be inside a
client-hydrated island — a server-only render produces chrome with blank rulers
and blank clips.

### 5.2 Components that contain their own interactive elements

Never wrap these in a `<button>`, `<a>` or any element with a click-role — they
already contain focusable controls, and nesting produces invalid DOM and broken
keyboard navigation:

- `TrackControlPanel` — mute/solo/effects/menu buttons, a volume slider, a pan
  knob, inline rename.
- `TimeCode` — per-digit editable elements plus the format-selector button.
- `Clip` — header menu button, inline rename, trim and stretch handles.
- `TimelineRuler` — loop-region drag/resize surfaces.
- `PlayheadCursor` — the icon becomes a drag handle when `onPositionChange` is
  passed; omit the callback and it sets `pointerEvents: 'none'` itself
  (PlayheadCursor.tsx:185).
- `ProjectToolbar`, `TransportToolbar`, `SelectionToolbar`,
  `TrackControlSidePanel` — toolbars full of buttons, with their own roving
  tab-index groups.

For a non-interactive specimen, simply omit the callbacks — the components
render fine with handlers missing — rather than intercepting events above them.

### 5.3 ThemeProvider and the global stylesheet

- **Stylesheet**: import `@audacity-ui/components/style.css` once (maps to
  `dist/index.css`; package.json `exports` line 14). Each per-component `.mjs`
  also re-imports its own CSS sidecar (the tsup post-build step
  `attach-css-imports.mjs`), so bundlers that process CSS from `node_modules`
  pick styles up automatically with deep-subpath imports — but the aggregate
  import is the safe baseline. Without the CSS: no component chrome at all, and
  the MusescoreIcon `@font-face` is missing, so every icon renders as a blank
  square (see the comment in `apps/static-smoke/src/main.tsx`, whose whole
  purpose is to verify this standalone path).
- **`ThemeProvider`** (`@audacity-ui/components/ThemeProvider`; the
  `lightTheme`/`darkTheme` objects are re-exported from the barrel,
  `src/index.ts:11`): technically optional for most chrome — `useTheme`
  falls back to the baked-in light theme when no provider is present
  (ThemeProvider.tsx:106–115), and the standalone smoke app renders toolbars
  with **no providers at all**. But it is **effectively required for clips**:
  the `--clip-<colour>-*` CSS variables are only written to the DOM by
  ThemeProvider's wrapper div (ThemeProvider.tsx:43–76), and `ClipBody.css`
  consumes them with no fallback values — unwrapped clips render colourless and
  the canvas waveform draws with empty colour strings. Wrap the composition
  once: `<ThemeProvider theme={lightTheme}>…</ThemeProvider>`.
- `AccessibilityProfileProvider` is optional — `useAccessibilityProfile` falls
  back to the default `au4` profile with a no-op setter
  (AccessibilityProfileContext.tsx:100–112).

### 5.4 Viewport-measuring behaviour

- `ProjectToolbar` listens to `window` resize and reads `window.innerWidth` —
  breakpoints ignore the container (§2).
- `TimelineRuler` reads `window.devicePixelRatio` and sizes its backing store to
  `viewportWidth` (or the legacy `width`) — supply a *measured* viewport width
  (the sandbox uses a `ResizeObserver`) and re-render on resize, or the ruler
  stays at its first-measured sharpness.
- `TrackControlSidePanel` and the canvas are two separately-scrolling panes; the
  sandbox keeps them aligned by cross-wiring `scrollRef`/`onScroll`
  (**sandbox-specific**, `useCanvasScrollSync`). A static composition that
  doesn't scroll can ignore this entirely.

### 5.5 Bundler note for Vite-based consumers

React and every deep subpath you import must be pre-bundled in the same Vite
optimize pass (`optimizeDeps.include`). A subpath first discovered while the dev
server is already running is optimised in a second pass with its own React copy,
and the resulting "Invalid hook call"/null-hook crash takes down every island on
the page. List the subpaths up front and cold-start the dev server. (Observed in
a production Astro consumer; the fix is documented in that consumer's
`astro.config.mjs` `optimizeDeps` comment.)

---

## 6. Worked example: a minimal static project window

Package imports only; no sandbox code. Two tracks (one with a clip), all chrome
regions present, no interactivity wired. The `noop`s satisfy `TransportToolbar`'s
required callbacks.

```tsx
import { ThemeProvider } from '@audacity-ui/components/ThemeProvider';
import { lightTheme } from '@audacity-ui/components';  // theme objects live on the barrel
import { ApplicationHeader } from '@audacity-ui/components/ApplicationHeader';
import { ProjectToolbar } from '@audacity-ui/components/ProjectToolbar';
import { TransportToolbar } from '@audacity-ui/components/TransportToolbar';
import { TrackControlSidePanel } from '@audacity-ui/components/TrackControlSidePanel';
import { TrackControlPanel } from '@audacity-ui/components/TrackControlPanel';
import { TimelineRuler } from '@audacity-ui/components/TimelineRuler';
import { PlayheadCursor } from '@audacity-ui/components/PlayheadCursor';
import { SelectionToolbar } from '@audacity-ui/components/SelectionToolbar';
// TrackNew and the waveform generators have no subpath entry — barrel only
// (the /Track subpath is the older Track component, not TrackNew)
import { TrackNew, generateSpeechWaveform } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const noop = () => {};
const PPS = 100;                       // pixels per second, shared everywhere
const waveform = generateSpeechWaveform(4, 1000, { seed: 42 });

export function MiniProjectWindow() {
  return (
    <ThemeProvider theme={lightTheme}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 600 }}>
        <ApplicationHeader os="macos" />
        <ProjectToolbar
          activeItem="project"
          centerActions={[
            { icon: 'mixer', label: 'Mixer', onClick: noop },
            { icon: 'cog', label: 'Audio setup', onClick: noop },
            { icon: 'cloud', label: 'Share audio', onClick: noop },
            { icon: 'plugins', label: 'Get effects', onClick: noop },
          ]}
          workspaceSelector={{ value: 'modern',
            options: [{ value: 'modern', label: 'Modern' }], onChange: noop }}
          historyActions={{ onUndo: noop, onRedo: noop }}
        />
        <TransportToolbar
          activeMenuItem="project" workspace="modern"
          isPlaying={false} isRecording={false}
          onPlay={noop} onStop={noop} onRecord={noop}
          loopRegionEnabled={false} loopRegionStart={null} loopRegionEnd={null}
          setLoopRegionEnabled={noop} setLoopRegionStart={noop} setLoopRegionEnd={noop}
          timeSelection={null} bpm={120} beatsPerMeasure={4}
          envelopeMode={false} spectrogramMode={false}
          onToggleEnvelope={noop} onToggleSpectrogram={noop}
          onZoomIn={noop} onZoomOut={noop} onZoomToSelection={noop}
          onZoomToFitProject={noop} onZoomToggle={noop}
          currentTime={0} timeCodeFormat="hh:mm:ss+milliseconds"
          onTimeCodeChange={noop} onTimeCodeFormatChange={noop}
          onShareClick={noop} onExportAudioClick={noop} onExportLoopRegionClick={noop}
        />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <TrackControlSidePanel trackHeights={[114, 114]}>
            <TrackControlPanel trackName="Vocals" trackType="mono"
              volume={75} pan={0} height="default" trackHeight={114} />
            <TrackControlPanel trackName="Guitar" trackType="mono"
              volume={60} pan={-20} height="default" trackHeight={114} />
          </TrackControlSidePanel>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TimelineRuler pixelsPerSecond={PPS} scrollX={0} totalDuration={30}
              width={3000} viewportWidth={800} height={40} />
            <div style={{ position: 'relative', flex: 1,
              background: lightTheme.background.canvas.default, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                <TrackNew trackIndex={0} width={3000} height={114} clips={[{
                  id: 1, name: 'Take 1', start: 0.5, duration: 4, waveform,
                }]} />
                <TrackNew trackIndex={1} width={3000} height={114} clips={[]} />
              </div>
              <PlayheadCursor position={2} pixelsPerSecond={PPS} height={232} />
            </div>
          </div>
        </div>
        <SelectionToolbar selectionStart={null} selectionEnd={null} />
      </div>
    </ThemeProvider>
  );
}
```

Notes on the example: the ruler's playhead grab-icon instance and the vertical
ruler column are omitted for brevity — add them per §1.7/§1.8. Remember the
canvas-drawn parts (§5.1) need this to run client-side. Only component
directories get deep-subpath entries (each `src/<Dir>/index.ts` becomes a tsup
entry — `packages/components/tsup.config.ts`); shared modules like
`utils/waveform` are barrel-only.
