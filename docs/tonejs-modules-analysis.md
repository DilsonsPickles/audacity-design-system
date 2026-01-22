# Tone.js Modules Analysis for Audacity Design System

This document analyzes Tone.js modules and identifies which ones are useful for building an Audacity-like audio editor web application.

## Overview

Tone.js is a comprehensive Web Audio framework providing audio synthesis, effects, scheduling, and analysis capabilities. This analysis focuses on modules relevant to audio editing, recording, playback, and visualization.

---

## Currently Used Modules

### ✅ Tone.UserMedia
**Status:** Already implemented in [RecordingManager.ts](../apps/sandbox/src/utils/RecordingManager.ts)

**Purpose:** Access microphone input for recording

**Key Features:**
- Opens microphone stream using `getUserMedia()`
- Device enumeration and selection
- Works only on HTTPS connections
- State management (started/stopped)

**Current Usage:**
```typescript
this.userMedia = new Tone.UserMedia();
await this.userMedia.open();
```

**Recommendations:**
- ✅ Continue using for mic input
- Consider adding device selection UI using `enumerateDevices()`
- Implement error handling for permission denied scenarios

---

### ✅ Tone.Recorder
**Status:** Already implemented in [RecordingManager.ts](../apps/sandbox/src/utils/RecordingManager.ts)

**Purpose:** Record audio using MediaRecorder API

**Key Features:**
- Wrapper around native MediaRecorder API
- Returns audio as Blob (typically WebM format)
- Simple start/stop/pause interface
- **Limitation:** Not sample-accurate due to browser API constraints

**Current Usage:**
```typescript
this.recorder = new Tone.Recorder();
this.userMedia.connect(this.recorder);
this.recorder.start();
const recording = await this.recorder.stop();
```

**Recommendations:**
- ✅ Continue using for final accurate recording
- Keep using separate analyser for real-time waveform (necessary due to MediaRecorder limitations)
- Consider format conversion for broader compatibility

---

### ✅ Tone.Meter
**Status:** Already implemented in [RecordingManager.ts](../apps/sandbox/src/utils/RecordingManager.ts)

**Purpose:** Measure RMS levels for VU meters

**Key Features:**
- Real-time RMS (root mean square) level measurement
- Returns dB values or normalized 0-1 range
- Smoothing parameter for visual stability
- Multi-channel support

**Current Usage:**
```typescript
this.meter = new Tone.Meter({ normalRange: false, smoothing: 0.8 });
this.userMedia.connect(this.meter);
const dbLevel = this.meter.getValue() as number;
```

**Recommendations:**
- ✅ Continue using for mic monitoring and playback meters
- Current smoothing value (0.8) works well for visual meters
- Consider separate meters for recording vs playback

---

### ✅ Tone.Waveform
**Status:** Just implemented to replace AnalyserNode

**Purpose:** Capture time-domain waveform data for visualization

**Key Features:**
- Returns Float32Array of time-domain samples
- Configurable size (power of 2, 16-16384)
- Cleaner than native AnalyserNode for Tone.js integration
- Direct connection to any Tone.js audio source

**Current Usage:**
```typescript
this.waveform = new Tone.Waveform(2048);
this.userMedia.connect(this.waveform);
const dataArray = this.waveform.getValue();
```

**Recommendations:**
- ✅ Continue using for progressive waveform capture during recording
- Current size (2048) provides good balance of detail and performance
- Consider adjusting size based on zoom level (higher zoom = larger size)

---

## Highly Recommended Modules

### 🔥 Tone.Player
**Priority:** HIGH - Essential for clip playback

**Purpose:** Play audio buffers (clips) with precise control

**Key Features:**
- Load from URL, AudioBuffer, or ToneAudioBuffer
- Precise playback control (start, stop, seek)
- Playback rate control (speed/pitch)
- Loop functionality
- Reverse playback
- Fade in/out envelopes

**Potential Usage:**
```typescript
// Create player for each clip
const player = new Tone.Player(audioBuffer);
player.start(startTime, offset, duration);
player.stop(stopTime);
player.seek(position); // Jump to specific time in clip
```

**Recommendations:**
- **Replace custom AudioManager with Tone.Player instances** per clip
- Use for precise clip playback synchronization
- Leverage `playbackRate` for time-stretching effects
- Use `reverse` property for reverse playback feature
- Integrate with existing playback system in [App.tsx](../apps/sandbox/src/App.tsx)

**Implementation Plan:**
1. Create Player instance per clip in AudioManager
2. Use `seek()` for playhead scrubbing
3. Use `start(time, offset, duration)` for region playback
4. Handle loop regions with `loop` property

---

### 🔥 Tone.Channel
**Priority:** HIGH - Essential for mixing and routing

**Purpose:** Audio channel strip with volume, pan, mute, solo

**Key Features:**
- Volume control (dB)
- Pan control (-1 left to +1 right)
- Mute/solo functionality
- Send/receive between channels
- Perfect for track mixing

**Potential Usage:**
```typescript
// One Channel per track
const trackChannel = new Tone.Channel(-0.25, -12); // pan, volume
trackChannel.mute = true;
trackChannel.solo = true;

// Connect clips to track channel
player.connect(trackChannel);
trackChannel.toDestination();
```

**Recommendations:**
- **Implement one Channel instance per track** for mixing
- Use for track volume faders
- Implement pan controls per track
- Add mute/solo buttons to track headers
- Replace manual gain nodes with Channel

**Implementation Plan:**
1. Add `Tone.Channel` to each track in TracksContext
2. Update TrackControlPanel to control channel properties
3. Route all clip players through track channel
4. Implement solo/mute exclusive behavior across tracks

---

### 🔥 Tone.Volume
**Priority:** MEDIUM - Useful for clip volume automation

**Purpose:** Volume control node with mute functionality

**Key Features:**
- Volume in decibels
- Simple mute toggle
- Cleaner than raw Gain for volume control
- Part of Tone.js routing system

**Potential Usage:**
```typescript
// Per-clip volume control
const clipVolume = new Tone.Volume(-6);
player.connect(clipVolume).connect(trackChannel);

// Clip envelope automation
clipVolume.volume.value = clip.envelopePoints[i].value;
```

**Recommendations:**
- Use for **clip-level volume automation** (envelope points)
- Could replace manual dB-to-gain conversion
- Integrate with existing envelope system
- Consider for clip fade in/out

**Implementation Plan:**
1. Add Volume node per clip for envelope automation
2. Update envelope curve to modulate `volume.value`
3. Simplify dB conversion logic

---

### 🔥 Tone.Gain
**Priority:** HIGH - Essential for envelope automation

**Purpose:** Audio gain control with automation support

**Key Features:**
- Wrapper around native GainNode
- Supports multiple units (gain, dB, normalRange)
- **Automated level changes** with `rampTo()`
- Perfect for envelope curves

**Potential Usage:**
```typescript
// Clip envelope automation
const envelopeGain = new Tone.Gain(1);
player.connect(envelopeGain).connect(trackChannel);

// Smooth automation between envelope points
envelopeGain.gain.linearRampTo(nextPointValue, duration);
```

**Recommendations:**
- **Use for implementing envelope automation curves**
- Replace manual gain scheduling with Tone.Gain
- Use `linearRampTo()` or `exponentialRampTo()` for smooth curves
- Integrate with existing envelope point system in clips

**Implementation Plan:**
1. Add Gain node per clip for envelope
2. Schedule gain changes based on envelope points
3. Use ramp functions for smooth interpolation between points
4. Connect: Player → Gain (envelope) → Volume (clip) → Channel (track) → Destination

---

### 🔥 Tone.ToneAudioBuffer
**Priority:** MEDIUM - Better than raw AudioBuffer

**Purpose:** Enhanced AudioBuffer with manipulation methods

**Key Features:**
- Load audio from URL
- Reverse audio
- Slice segments
- Convert to mono
- Access raw PCM samples
- Get channel data
- Sample rate and duration info

**Potential Usage:**
```typescript
// Load audio file for clip
const buffer = await Tone.ToneAudioBuffer.fromUrl(url);

// Manipulate audio
buffer.reverse(); // Reverse playback
const slice = buffer.slice(0, 5); // Extract 5-second segment
const mono = buffer.toMono(); // Convert stereo to mono

// Access raw samples for waveform rendering
const samples = buffer.getChannelData(0);
```

**Recommendations:**
- **Replace AudioBuffer with ToneAudioBuffer** in clip data
- Use for audio file loading
- Leverage `slice()` for clip trimming operations
- Use `toMono()` for mono conversion
- Access `getChannelData()` for waveform rendering

**Implementation Plan:**
1. Update clip loading to use ToneAudioBuffer
2. Use built-in methods instead of manual buffer manipulation
3. Leverage for waveform data extraction

---

### 🔥 Tone.FFT
**Priority:** HIGH - Essential for spectrogram view

**Purpose:** Frequency analysis for spectrograms

**Key Features:**
- Fast Fourier Transform analysis
- Configurable size (power of 2, 16-16384)
- Returns frequency data as Float32Array (dB values)
- `getFrequencyOfIndex()` converts bin to Hz
- Smoothing and normalization options

**Potential Usage:**
```typescript
// Spectrogram rendering
const fft = new Tone.FFT(512);
player.connect(fft);

// Get frequency data for spectrogram
const frequencyData = fft.getValue(); // Float32Array of dB values
const freqHz = fft.getFrequencyOfIndex(binIndex);
```

**Recommendations:**
- **Implement for real-time spectrogram view mode**
- Use during recording for live spectrogram
- Use during playback for spectrogram overlay
- Replace any custom FFT implementation
- Size 512-2048 typically good for audio visualization

**Implementation Plan:**
1. Add FFT analyser to clips in spectrogram mode
2. Update ClipBody to render spectrogram from FFT data
3. Implement frequency ruler using `getFrequencyOfIndex()`
4. Add spectrogram color mapping (dB to color)

---

## Potentially Useful Modules

### ⚡ Tone.Compressor
**Priority:** LOW - Nice-to-have for mastering

**Purpose:** Dynamic range compression

**Key Features:**
- Threshold, ratio, attack, release, knee parameters
- Reduces loud sounds, amplifies quiet sounds
- Common in audio mastering

**Potential Usage:**
```typescript
// Master bus compression
const compressor = new Tone.Compressor(-30, 3);
masterChannel.connect(compressor).toDestination();
```

**Recommendations:**
- Add to **master output chain** for mastering
- Could be part of "Effects" menu
- Lower priority than core editing features
- Consider for future "Export with mastering" feature

---

### ⚡ Tone.Destination
**Priority:** MEDIUM - Already using implicitly

**Purpose:** Master output (speakers/headphones)

**Key Features:**
- Main audio output
- Volume control
- Mute functionality
- Accessed via `Tone.getDestination()`

**Current Usage:**
```typescript
// Implicit usage
player.toDestination();
```

**Recommendations:**
- ✅ Already using correctly
- Add master volume control via `Tone.getDestination().volume`
- Consider master mute button

---

### ⚡ Tone.Transport (deprecated - use getTransport)
**Priority:** LOW - Not ideal for audio editor

**Purpose:** Musical timing and scheduling

**Key Features:**
- BPM/tempo control
- Musical time signatures
- Event scheduling
- Loop regions

**Recommendations:**
- ❌ **Not recommended** for Audacity-style editor
- Transport is designed for musical sequencing (bars/beats)
- Audio editors use **time-based** scheduling (seconds), not musical time
- Current manual playhead system is more appropriate
- Consider only if adding MIDI/musical features

---

## Audio Effects (Low Priority)

These are interesting for future "Effects" menu but not core features:

### Effects Module Classes:
- **Reverb** - Add room ambience
- **Delay** - Echo effects
- **Distortion** - Overdrive/fuzz
- **Chorus** - Thickening effect
- **AutoFilter** - Sweeping filter
- **Tremolo** - Volume modulation
- **Phaser** - Phase shifting
- **PitchShift** - Change pitch without changing speed

**Recommendations:**
- ⏳ **Defer to Phase 2** (after core editing works)
- Would be part of "Effects" menu like Audacity
- Could offer real-time preview before applying
- Some effects (like Reverb) are CPU intensive

---

## Synthesis/Instrument Modules

**Priority:** VERY LOW - Not relevant for audio editor

These are for music synthesis and not applicable to a recording/editing application:
- Oscillators (AMOscillator, FMOscillator, Noise, Pulse)
- Synthesizers (AMSynth, FMSynth, MonoSynth, PolySynth)
- Instruments (MembraneSynth, MetalSynth, etc.)

**Recommendations:**
- ❌ Skip entirely unless adding tone generator feature
- Current `ToneGenerator.ts` uses direct Tone.Oscillator which is sufficient
- Not needed for audio editing workflow

---

## Recommended Module Integration Priority

### Phase 1 - Core Playback & Mixing (Immediate)
1. ✅ **Tone.Waveform** - Already migrated for recording waveform
2. 🔥 **Tone.Player** - Replace AudioManager for clip playback
3. 🔥 **Tone.Channel** - Add per-track mixing (volume, pan, mute, solo)
4. 🔥 **Tone.Gain** - Implement envelope automation
5. 🔥 **Tone.ToneAudioBuffer** - Replace raw AudioBuffer

### Phase 2 - Visualization (Next)
6. 🔥 **Tone.FFT** - Add spectrogram view mode
7. ⚡ **Tone.Destination** - Master volume control

### Phase 3 - Advanced Features (Future)
8. ⚡ **Tone.Volume** - Clip-level volume automation
9. ⚡ **Tone.Compressor** - Master bus compression
10. ⚡ Audio effects (Reverb, Delay, etc.) - Effects menu

---

## Architecture Recommendations

### Current Audio Signal Flow
```
Microphone → UserMedia → [Meter, Waveform, Recorder]
                                                ↓
                                          AudioBuffer (stored in clip)
                                                ↓
                                      Custom AudioManager playback
                                                ↓
                                        Web Audio Destination
```

### Recommended Future Architecture
```
Recording Path:
Microphone → UserMedia → [Meter, Waveform, Recorder, FFT (spectrogram)]
                                                      ↓
                                            ToneAudioBuffer (clip)

Playback Path (per clip):
ToneAudioBuffer → Player → Gain (envelope) → Volume (clip) → Channel (track) → Destination
                                                                                      ↑
                                                                        [Compressor, Effects] (master)

Monitoring:
Each node can connect to → [Meter, Waveform, FFT] for visualization
```

### Implementation Steps

1. **Replace AudioManager with Tone.Player**
   - Create Player instance per clip
   - Handle start/stop with timeline sync
   - Implement seek for playhead scrubbing

2. **Add Track Channels**
   - One Channel per track
   - Connect all clip players to track channel
   - Add UI controls for volume, pan, mute, solo

3. **Implement Envelope Automation**
   - Add Gain node per clip
   - Schedule gain changes based on envelope points
   - Use linearRampTo() for smooth curves

4. **Add Spectrogram Support**
   - Create FFT analyser per clip (optional, on-demand)
   - Render frequency data in ClipBody
   - Add frequency ruler component

5. **Master Output**
   - Access Tone.getDestination() for master volume
   - Optional: Add master compressor
   - Optional: Add master effects chain

---

## Key Takeaways

### ✅ Already Using Well
- Tone.UserMedia (mic input)
- Tone.Recorder (recording)
- Tone.Meter (VU meters)
- Tone.Waveform (just migrated)

### 🔥 Should Implement Soon
- **Tone.Player** - Better playback control
- **Tone.Channel** - Professional mixing capabilities
- **Tone.Gain** - Envelope automation
- **Tone.FFT** - Spectrogram view
- **Tone.ToneAudioBuffer** - Better audio handling

### ⏳ Nice-to-Have Later
- Tone.Volume (clip automation)
- Tone.Compressor (mastering)
- Audio effects (Effects menu)

### ❌ Not Needed
- Tone.Transport (musical timing - not for audio editor)
- Synthesis/Instrument modules (not for editing)
- Event/Sequencing modules (not for timeline editing)

---

## Conclusion

Tone.js provides excellent building blocks for an audio editor. The core modules (Player, Channel, Gain, FFT, ToneAudioBuffer) will significantly improve your app's capabilities and reduce custom Web Audio API code. Focus on implementing playback and mixing features first, then add advanced visualization (spectrogram) and effects later.

The migration from raw Web Audio API to Tone.js abstractions will make the codebase more maintainable and leverage battle-tested audio components.
