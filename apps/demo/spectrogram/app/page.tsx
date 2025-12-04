"use client";

import {
  Toolbar,
  GhostButton,
  ToggleButton,
  Icon,
  TrackControlSidePanel,
  TrackControlPanel,
} from "@audacity-ui/components";
import { useState } from "react";

// Sample track data
const sampleTracks = [
  { id: 1, name: "Track 1", height: 114 },
  { id: 2, name: "Track 2", height: 114 },
  { id: 3, name: "Track 3", height: 114 },
];

export default function SpectrogramDemo() {
  const [spectrogramMode, setSpectrogramMode] = useState(false);
  const [selectedTrackIndices, setSelectedTrackIndices] = useState<number[]>([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw" }}>
      <Toolbar>
        <GhostButton>
          <Icon name="fa-bars" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-folder-open" size={16} />
        </GhostButton>

        <div style={{ width: "1px", height: "24px", backgroundColor: "#d4d5d9", margin: "0 8px" }} />

        <GhostButton>
          <Icon name="fa-backward-step" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-play" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-forward-step" size={16} />
        </GhostButton>

        <div style={{ width: "1px", height: "24px", backgroundColor: "#d4d5d9", margin: "0 8px" }} />

        <ToggleButton isActive={spectrogramMode} onClick={() => setSpectrogramMode(!spectrogramMode)}>
          <Icon name="fa-chart-simple" size={16} />
        </ToggleButton>
      </Toolbar>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <TrackControlSidePanel trackHeights={sampleTracks.map((t) => t.height)}>
          {sampleTracks.map((track, index) => (
            <TrackControlPanel
              key={track.id}
              trackName={track.name}
              trackType="mono"
              volume={75}
              pan={0}
              isMuted={false}
              isSolo={false}
              onMuteToggle={() => {}}
              onSoloToggle={() => {}}
              state={selectedTrackIndices.includes(index) ? "active" : "idle"}
              height="default"
              onClick={() => setSelectedTrackIndices([index])}
            />
          ))}
        </TrackControlSidePanel>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            backgroundColor: "#212433",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
          }}
        >
          <p>Spectrogram canvas will go here</p>
        </div>
      </div>
    </div>
  );
}
