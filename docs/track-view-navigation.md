# Track View Navigation
#Audacity

## Overview
Allows User to access all clip-based functions using their keyboard only.

## Main tab flow

### Project toolbar
- Group 1
  - Home
  - Project
  - Export
- Group 2
  - Audio setup
  - Share audio
  - Get effects
- Group 3
  - Workspace dropdown
  - Undo Redo

### Tools toolbar
- Group 1
  - Play
  - Stop
  - Record
  - Step backwards
  - Step forwards
  - Loop
  - Automation
  - Zoom in
  - Zoom out
  - Fit zoom to selection
  - Fit project
  - Zoom toggle
  - Cut
  - Copy
  - Paste
  - Trim
  - Silence
  - Timecode

### Add new track
- Group 1
  - Add new track

### Canvas area
- Group 1
  - Track 1 header
    - Icon
    - Track name
    - Context menu
    - Pan knob
    - Slider
    - Mute
    - Solo
    - Effects button
  - Track 1 Clip 1
  - Track 1 Clip 2
  - Track 1 Clip 3
- Group 2
  - Track 2 header
    - Etc
  - Track 2 Clip 1
  - Etc
- Etc

## Track area interactions

### Global shortcuts
These shortcuts work even when we're not using accessibility tabbing:
- Press **arrow up/down** to move track focus outline up/down to the next track
- Press **shift + arrow up/down** to extend/reduce multi-track selection up/down
- Press **left/right arrow** scroll viewport left/right

### Track panel header in focus
With tab focus on *entire* track header the User can:
- Press **enter** to toggle track selection
- Press **down arrow** to move focus down to next track header (if available)
- Press **right arrow** to move tab focus to first child item of track header
- Press **left arrow** to move tab focus back to last child item of track header
- Press **shift + f10** to open track header context menu and move tab focus to first item in context menu list
- User can use **shift + up/down arrows** to expand and contract their track selection up and down the track list (works both with and without tab focus on track header)

### Clip
With tab focus on clip the User can:
- Press **shift + tab** to return tab focus back to parent track header
- Press **tab** to progress tab focus on to next track header (if available) or, down to bottom bar selection timecode
- Press **enter** to toggle clip selection
- Press **left/right arrow** to cycle tab focus through available clips
- Press **shift + f10** to open clip context menu and move tab focus to first item in context menu list
- Press **Cmd + left arrow** to move clip back by one increment
- Press **Cmd + right arrow** to move clip forward by one increment
- Press **Cmd + shift + left arrow** to trim right side of clip over to the left (reduce)
- Press **Cmd + shift + right arrow** to trim left side of clip over to the right (reduce)
- Press **Shift + left arrow** to trim left side of clip to the left (expand)
- Press **Shift + right arrow** to trim right side of clip to the right (expand)
- Press **Delete** to delete the clip (and any other selected clips)
- Press **F2** to rename clip

### Label
With tab focus on label the User can:
- Press **shift + tab** to return tab focus back to parent track header
- Press **tab** to progress tab focus on to next track header (if available) or, down to bottom bar selection timecode
- Press **enter** to toggle label selection
- Press **left/right arrow** to cycle tab focus through available labels
- Press **shift + f10** to open label right click menu and move tab focus to first item in right click menu list
- Press **Cmd + left arrow** to move clip back by one increment
- Press **Cmd + right arrow** to move clip forward by one increment
- Press **Cmd + shift + left arrow** to trim right side of label over to the left (reduce)
- Press **Cmd + shift + right arrow** to trim left side of label over to the right (reduce)
- Press **Shift + left arrow** to trim left side of label to the left (expand)
- Press **Shift + right arrow** to trim right side of label to the right (expand)
- Press **Delete** to delete the label (and any other selected clips)
- Press **F2** to rename label

### Playhead cursor
At any time the User can:
- Press **,** to move playhead cursor right one increment
- Press **.** to move playhead cursor left one increment
- Press **shift + ,** to move playhead right one increment *and* expand selection
- Press **shift + .** to move playhead left one increment *and* expand selection
- Press **Cmd + shift + .** to move left selection bound right to reduce selection
- Press **Cmd + shift + ,** to move right selection bound left to reduce selection

If the User has an active time selection they can:
- Using tab focus they can tab to any track header and press enter to expand the time selection to that track (non-linear is possible)
- Without tab focus they can move the track focus up and down and press enter to expand the time selection to that track
