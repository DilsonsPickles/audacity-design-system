# Clip envelope

## Feature description

The Clip Envelope is an overlay that allows the User to manipulate a clip's gain over time.

### Overlay

- A dark overlay over the top of the clip body that appears when the mode is enabled
- It is limited to the clip's body only, it does not overlay the clip's header
- Non-linear scale from +12 dB to -60dB with the last pixel being -inf dB

### Control toggle

- It's the "on-switch" for the mode that lives in the toolbar
- It lives in its own group in the toolbar alongside spectrogram toggle and cut tool
- When active, clip envelopes are overlayed on all clips in project

### Envelope

- The envelope starts as a line without points, positioned at the 0.0 dB position
- Clicking the line adds a point, click a point to remove it
- Values range from +12dB to -inf dB (The last step before -inf being -60dB)

#### Line segments

- The entire line can be dragged up and down, even when no points exist
- The line segments have a hit area of 8px either side
- On drag, a tooltip shows the dB value of the line (+12 dB -> -inf dB)
- The waveform (and RMS, if shown) will always reflect the resulting gain
- A line with a single envelope point on it behaves the same as a line with no points

#### Envelope points

- Envelope points are created by clicking a line segment
- Clicking an envelope point will remove the point
- Removing the last point resets the line to its default value (-0 dB)
- Dragging a point past other points will clear the overlapped points
- While dragging, the points can be recalled by moving the cursor back again; they're only deleted permanently on releasing the mouse button
- To avoid volatility, there should be some resistance to dragging a point past another

### Known feature interactions

#### Vertical ruler (UX concerns)

- Cursor position is designed to be shown in vertical ruler (as we do in timeline ruler)

#### Time/audio data selection

- The user can still create a time selection by dragging far enough away from the line segments or envelope points (so larger than 8px)

#### Clipboard actions

- Envelope points will be copied with clips

### Styling

- Overlay
- Line
  - Idle
  - Hover
- Envelope point
  - Idle
  - Hover
  - Pressed
- Cursor
  - Crosshair cursor
  - Hit areas
- Tooltip
  - Can overlap other UI elements (Clip header, timeline ruler, track header side panel)
  - Position of tooltip

#### TBD

- Envelope vertical scale is decoupled from track ruler scale, which could lead to conflicting information in the tooltip

- How does the Tab to envelope points?
  - When mode active, points could be included in tab heirarchy
  - Shortcut to jump focus from clip to envelope points

- What workspaces does it belong to?

- If the User is zoomed in and creates a cluster of points, how will that be rendered when they zoom back out again?

- Do automation points persist when a clip is trimmed?
  - Think about this carefully as it could make working with an envelope really tricky - just imagine the User forgets that the clip is trimmed - they'll think that the curve is broken as it'll be drawing to a point that is hidden.
  - Think about time stretching too

- Is there a minimum size the clip needs to be for the User to add an evelope point?

- Should envelope point placed at start/end of clip be clipped by clip boundary?
