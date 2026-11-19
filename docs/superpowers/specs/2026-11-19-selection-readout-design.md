# Selection readout in the ruler, and Set selection…

2026-11-19 · short design (a small change)

## Intent

Drop the status bar's Selection start / end and Duration timecodes from the
default layout and show the selection's numbers where the eye already is: on
the timeline ruler, over the selection, live while it is drawn and for as long
as it exists. Precise entry moves to a dialog.

## Decided (by the user)

- **Where:** a label in the TIMELINE RULER over the selection (approach A).
- **The timecodes stay available, off by default:** `selection-timecodes` and
  `selection-duration` remain tools (tool bank, Edit toolbars…, Add tool) but
  are not in the default layout.
- **Set selection…** is a menu action, listed in the command palette.

## Approaches considered

- **A. Ruler label over the selection** — picked. Follows the selection, live
  during a drag, stays after release, never covers audio; the ruler already
  draws the selection.
- B. A tag at the pointer while dragging — gone on release, so nothing to read
  afterwards once the timecodes are off.
- C. A label inside the selection on the canvas — covers clips and needs a
  rule for which track it sits on.

## The readout (my calls, to check)

- **Content:** the duration first, then the range, e.g. `1.250 s · 0:01.300 –
  0:02.550`; in the ruler's beats-and-bars mode, bars and beats instead.
- **Placement:** centred over the selection in the ruler, kept inside the
  visible ruler (it slides to stay readable when the selection runs off an
  edge; hidden when the selection is wholly off screen).
- **Narrow selections:** when the full label is wider than the selection it
  shows the duration alone; it may overhang the selection's edges.
- **When:** whenever there is a time selection (and for a spectral
  selection's time range), updating live during a drag or a keyboard
  extend. No selection, no label.
- **Look:** a small pill in the ruler's own text style, readable in both
  themes; it takes no pointer events, so ruler clicks and drags are
  unaffected.

## Set selection… (my calls, to check)

- **Menu:** Edit, directly below Go to… (there is no Select menu in the app;
  Go to… is its neighbour). No chord, like Go to….
- **Fields:** Start, End and Length, each the alt-variant timecode Go to… uses,
  prefilled from the current selection (or the playhead, with a zero length).
  Editing Start or Length moves End; editing End changes Length.
- **Applies** on Set / Enter (a time selection is not on the undo chain, so
  it is not an undo step — as a drag is not), parking the playhead at the
  start as a finished drag does; Escape cancels. The selection's
  tracks: the current selection's, else the track you are on, else every
  track — the keyboard range rule.

## Defaults and existing layouts (my calls, to check)

- The two timecode tools leave the default status bar seed (it keeps the
  playback cue and the info line).
- The six workspaces made in this session (Studio, Podcasting, Music
  production, Analysis, Modern minimal, Classic (Audacity 3)) lose them too,
  their saved states updated to match. **Alex is left alone** — the user's
  own; the tools can be removed there by hand.
- F6's section walk skips the Selection stop when the timecodes are not on a
  toolbar.

## Non-goals

- No pointer tag during a drag (approach B) for now.
- No change to how a selection is made or its edges dragged.

## Revision — D2, a dimension line under the selection (2026-11-19, later)

The user did not like the label in the ruler ("It shouldn't be in the ruler.
More like underneath the selection or inset inside"), saw two rounds of
mockups (inset top / inset bottom / underneath / split; then stacked, flag,
plain text, one line, dimension line, edge in hand) and picked **D2**:

- **Where:** on the CANVAS, just under the bottom edge of the selection's
  lowest track (the selection's scope, else every track), in content
  coordinates like the snap guideline. Nothing in the ruler any more.
- **What:** a measuring bracket — a 1px horizontal line the selection's width
  with a short tick at each end — the LENGTH in a small pill centred on the
  line, and each edge's TIME in plain text under its tick.
- **Fitting:** the pill stays over the visible part of the selection (the
  view's horizontal scroll passed in); an edge whose tick is off screen shows
  no time; when the selection is too narrow for the pill and both times, the
  times go and the pill stays; no length, no bracket.
- **Look:** the line, ticks and times in the secondary text colour; the pill
  as before; no pointer events.
- The ruler readout (`SelectionReadout`) is removed; `formatSelectionReadout`
  gives way to the three parts (length, start, end) the bracket needs.
- Left as is: it does not flip inside when the lowest track's bottom is below
  the view (the canvas's scroll buffer leaves room under the last track).
