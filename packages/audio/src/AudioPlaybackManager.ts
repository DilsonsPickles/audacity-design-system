import * as Tone from 'tone';
import audioBufferToWav from 'audiobuffer-to-wav';

/**
 * Audio playback manager using Tone.js
 * Handles playback of audio clips with envelope automation
 */
export class AudioPlaybackManager {
  private players: Map<string, Tone.Player> = new Map();
  private volumes: Map<string, Tone.Volume> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private meters: Map<number, Tone.Meter> = new Map(); // Track index -> Meter
  private trackGains: Map<number, Tone.Gain> = new Map(); // Track index -> Gain node
  private frozenMeterLevels: Map<number, number> = new Map(); // Frozen levels for pause
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  // @ts-ignore - playbackPosition is used for tracking state
  private playbackPosition: number = 0;
  private pausedPosition: number | null = null; // Position where we paused
  private lastLoadedPosition: number = -1;
  private animationFrameId: number | null = null;
  private onPositionUpdate?: (position: number) => void;
  private onMeterUpdate?: (trackIndex: number, level: number) => void;
  private loopEnabled: boolean = false;
  private loopStart: number | null = null;
  private loopEnd: number | null = null;

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    await Tone.start();
    console.log('Tone.js initialized');
  }

  /**
   * Set the audio output device
   * @param deviceId - The device ID to route audio to, or null for default
   */
  async setAudioOutputDevice(deviceId: string | null): Promise<void> {
    try {
      const context = Tone.getContext().rawContext as any;

      // Check if setSinkId is supported (Chrome/Edge)
      if (typeof context.setSinkId === 'function') {
        await context.setSinkId(deviceId || '');
        console.log('Audio output device set to:', deviceId || 'default');
      } else {
        console.warn('setSinkId is not supported in this browser');
        throw new Error('Audio output device selection is not supported in this browser');
      }
    } catch (error) {
      console.error('Failed to set audio output device:', error);
      throw error;
    }
  }

  /**
   * Generate a tone and return the audio buffer and waveform data
   */
  async generateTone(
    duration: number,
    frequency: number = 440,
    waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine',
    stereo: boolean = false
  ): Promise<{ buffer: AudioBuffer; waveformData: number[] | { left: number[]; right: number[] } }> {
    await Tone.start();

    // Create an offline context to render the tone
    const sampleRate = Tone.context.sampleRate;
    const numChannels = stereo ? 2 : 1;
    const offlineContext = new OfflineAudioContext(numChannels, duration * sampleRate, sampleRate);

    // Create oscillator
    const oscillator = offlineContext.createOscillator();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;

    // Create gain node for fade in/out
    const gainNode = offlineContext.createGain();
    gainNode.gain.setValueAtTime(0, 0);
    gainNode.gain.linearRampToValueAtTime(0.3, 0.01); // Fade in
    gainNode.gain.setValueAtTime(0.3, duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, duration); // Fade out

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(offlineContext.destination);

    // Start and stop
    oscillator.start(0);
    oscillator.stop(duration);

    // Render
    const buffer = await offlineContext.startRendering();

    // Generate waveform data for visualization
    if (stereo) {
      const leftChannelData = buffer.getChannelData(0);
      const rightChannelData = buffer.getChannelData(1);
      const samplesPerPixel = Math.floor(leftChannelData.length / (duration * 100)); // ~100 samples per second

      const waveformLeft: number[] = [];
      const waveformRight: number[] = [];

      for (let i = 0; i < leftChannelData.length; i += samplesPerPixel) {
        waveformLeft.push(leftChannelData[i]);
        waveformRight.push(rightChannelData[i]);
      }

      return { buffer, waveformData: { left: waveformLeft, right: waveformRight } };
    } else {
      const channelData = buffer.getChannelData(0);
      const waveformData: number[] = [];
      const samplesPerPixel = Math.floor(channelData.length / (duration * 100)); // ~100 samples per second

      for (let i = 0; i < channelData.length; i += samplesPerPixel) {
        waveformData.push(channelData[i]);
      }

      return { buffer, waveformData };
    }
  }

  /**
   * Add a clip with an audio buffer for playback
   */
  addClipBuffer(clipId: string | number, buffer: AudioBuffer): void {
    this.audioBuffers.set(String(clipId), buffer);
  }

  /**
   * Load and schedule all clips for playback
   * Handles clips with deleted regions by creating multiple player instances per clip
   */
  loadClips(tracks: any[], startTime: number = 0): void {
    // Clear existing players
    this.players.forEach(player => {
      player.unsync();
      player.dispose();
    });
    this.players.clear();

    // Clear and recreate track gain nodes and meters
    this.trackGains.forEach(gain => gain.dispose());
    this.meters.forEach(meter => meter.dispose());
    this.trackGains.clear();
    this.meters.clear();

    // Create gain nodes and meters for each track
    tracks.forEach((track, trackIndex) => {
      if (track.type !== 'label') {
        const gain = new Tone.Gain(1).toDestination();
        const meter = new Tone.Meter();
        gain.connect(meter);
        this.trackGains.set(trackIndex, gain);
        this.meters.set(trackIndex, meter);
      }
    });

    // Create players for all clips that have audio buffers
    tracks.forEach((track, trackIndex) => {
      track.clips.forEach((clip: any) => {
        const buffer = this.audioBuffers.get(String(clip.id));
        if (buffer) {
          // Only create players for clips that should play from the current start time
          if (clip.start + clip.duration > startTime) {
            const trimStart = clip.trimStart || 0;
            const deletedRegions = clip.deletedRegions || [];

            if (deletedRegions.length === 0) {
              // No deleted regions - create a single player for the entire clip
              const toneBuffer = Tone.ToneAudioBuffer.fromArray(buffer.getChannelData(0));
              const trackGain = this.trackGains.get(trackIndex);
              const player = new Tone.Player(toneBuffer).connect(trackGain || Tone.getDestination());

              // Sync player to transport and schedule it
              // The .sync() mechanism automatically handles the Transport position offset
              // We only need to specify the timeline start position and buffer offset (trimStart)
              player.sync().start(clip.start, trimStart);

              this.players.set(String(clip.id), player);
            } else {
              // Clip has deleted regions - create multiple players for each segment
              const segments = this.calculateSegments(clip.duration, deletedRegions);

              segments.forEach((segment, segmentIndex) => {
                // Create a Tone.js buffer from the AudioBuffer
                const toneBuffer = Tone.ToneAudioBuffer.fromArray(buffer.getChannelData(0));
                const trackGain = this.trackGains.get(trackIndex);
                const player = new Tone.Player(toneBuffer).connect(trackGain || Tone.getDestination());

                // Calculate timeline position for this segment
                const timelineStart = clip.start + segment.timelineOffset;

                // Calculate buffer offset (accounting for trimStart)
                const bufferOffset = trimStart + segment.sourceOffset;

                // Only schedule if segment should play from current start time
                if (timelineStart + segment.duration > startTime) {
                  // Sync player to transport
                  // The .sync() mechanism automatically handles the Transport position offset
                  player.sync().start(timelineStart, bufferOffset, segment.duration);

                  this.players.set(`${clip.id}_segment_${segmentIndex}`, player);
                }
              });
            }
          }
        }
      });
    });

    // Track the position we loaded clips for
    this.lastLoadedPosition = startTime;
  }

  /**
   * Calculate playback segments for a clip with deleted regions
   * Returns segments with timeline offsets (where they appear in the clip)
   * and source offsets (where to read from in the original audio buffer)
   */
  private calculateSegments(
    clipDuration: number,
    deletedRegions: Array<{ startTime: number; duration: number }>
  ): Array<{ timelineOffset: number; sourceOffset: number; duration: number }> {
    const segments: Array<{ timelineOffset: number; sourceOffset: number; duration: number }> = [];

    let currentTimelinePos = 0; // Position in the visible timeline
    let currentSourcePos = 0;   // Position in the original audio source

    // Sort deleted regions by start time
    const sortedDeleted = [...deletedRegions].sort((a, b) => a.startTime - b.startTime);

    sortedDeleted.forEach(deleted => {
      // Add segment before this deletion (if any)
      const segmentDuration = deleted.startTime - currentSourcePos;
      if (segmentDuration > 0) {
        segments.push({
          timelineOffset: currentTimelinePos,
          sourceOffset: currentSourcePos,
          duration: segmentDuration
        });
        currentTimelinePos += segmentDuration;
      }

      // Skip over the deleted region in the source
      currentSourcePos = deleted.startTime + deleted.duration;
    });

    // Add final segment after last deletion (if any)
    // Calculate full source duration by adding back all deleted time
    const totalDeletedDuration = sortedDeleted.reduce((sum, d) => sum + d.duration, 0);
    const fullSourceDuration = clipDuration + totalDeletedDuration;
    const finalSegmentDuration = fullSourceDuration - currentSourcePos;

    if (finalSegmentDuration > 0) {
      segments.push({
        timelineOffset: currentTimelinePos,
        sourceOffset: currentSourcePos,
        duration: finalSegmentDuration
      });
    }

    return segments;
  }

  /**
   * Start playback from specified position (or current position if not specified)
   */
  async play(startTime?: number): Promise<void> {
    if (this.isPlaying) return;

    await Tone.start(); // Ensure audio context is started
    this.isPlaying = true;
    this.isPaused = false;
    this.pausedPosition = null; // Clear paused position
    this.frozenMeterLevels.clear(); // Clear frozen levels when playing

    // If start time is provided, seek to that position first
    if (startTime !== undefined) {
      Tone.getTransport().seconds = startTime;
      this.playbackPosition = startTime;
    }

    // Start Tone.js transport from the current position
    // Using start('+0', startTime) tells Transport to start immediately at the specified time
    Tone.getTransport().start('+0', startTime);

    // Start animation loop for position updates
    this.startPositionTracking();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) return;

    // Use the last tracked playback position instead of querying Transport
    // because Transport.seconds can be unreliable during state transitions
    const currentPosition = this.playbackPosition;

    // Stop position tracking
    this.stopPositionTracking();

    // Pause transport
    Tone.getTransport().pause();

    // Store the paused position
    this.pausedPosition = currentPosition;

    // Send final position update
    if (this.onPositionUpdate) {
      this.onPositionUpdate(currentPosition);
    }

    // Capture current meter levels before pausing
    this.frozenMeterLevels.clear();
    this.meters.forEach((meter, trackIndex) => {
      const dbValue = meter.getValue();
      const linearValue = typeof dbValue === 'number'
        ? Math.max(0, Math.min(100, ((dbValue + 60) / 60) * 100))
        : 0;
      this.frozenMeterLevels.set(trackIndex, linearValue);
    });

    // Send one final meter update with frozen values
    if (this.onMeterUpdate) {
      this.frozenMeterLevels.forEach((level, trackIndex) => {
        this.onMeterUpdate!(trackIndex, level);
      });
    }

    this.isPlaying = false;
    this.isPaused = true;
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    this.pause();
    this.isPaused = false;
    this.frozenMeterLevels.clear(); // Clear frozen levels on stop
    this.playbackPosition = 0;
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;

    if (this.onPositionUpdate) {
      this.onPositionUpdate(0);
    }

    // Reset meters to 0 on stop
    if (this.onMeterUpdate) {
      this.meters.forEach((_, trackIndex) => {
        this.onMeterUpdate!(trackIndex, 0);
      });
    }
  }

  /**
   * Seek to a specific time position
   */
  seek(timeInSeconds: number): void {
    this.playbackPosition = timeInSeconds;
    Tone.getTransport().seconds = timeInSeconds;

    // Update paused position if we're paused
    if (this.isPaused) {
      this.pausedPosition = timeInSeconds;
    }

    if (this.onPositionUpdate) {
      this.onPositionUpdate(timeInSeconds);
    }
  }

  /**
   * Set callback for playback position updates
   */
  setPositionUpdateCallback(callback: (position: number) => void): void {
    this.onPositionUpdate = callback;
  }

  /**
   * Set callback for meter level updates
   */
  setMeterUpdateCallback(callback: (trackIndex: number, level: number) => void): void {
    this.onMeterUpdate = callback;
  }

  /**
   * Get current playback position in seconds
   */
  getCurrentPosition(): number {
    return Tone.getTransport().seconds;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if currently paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get the position where playback was paused (or null if not paused)
   */
  getPausedPosition(): number | null {
    return this.pausedPosition;
  }

  /**
   * Start tracking playback position
   */
  private startPositionTracking(): void {
    const updatePosition = () => {
      if (!this.isPlaying) return;

      const currentTime = Tone.getTransport().seconds;
      this.playbackPosition = currentTime;

      if (this.onPositionUpdate) {
        this.onPositionUpdate(currentTime);
      }

      // Update meters for each track
      if (this.onMeterUpdate) {
        this.meters.forEach((meter, trackIndex) => {
          // Get dB value and convert to 0-100 scale
          // Tone.Meter returns values in dB (typically -Infinity to 0)
          const dbValue = meter.getValue();
          // Convert dB to linear scale (0-100)
          // -60dB or less = 0, 0dB = 100
          const linearValue = typeof dbValue === 'number'
            ? Math.max(0, Math.min(100, ((dbValue + 60) / 60) * 100))
            : 0;
          this.onMeterUpdate(trackIndex, linearValue);
        });
      }

      this.animationFrameId = requestAnimationFrame(updatePosition);
    };

    updatePosition();
  }

  /**
   * Stop tracking playback position
   */
  private stopPositionTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stop();

    // Dispose of all players and volumes
    this.players.forEach(player => player.dispose());
    this.volumes.forEach(volume => volume.dispose());
    this.trackGains.forEach(gain => gain.dispose());
    this.meters.forEach(meter => meter.dispose());

    this.players.clear();
    this.volumes.clear();
    this.trackGains.clear();
    this.meters.clear();
  }

  /**
   * Set loop region boundaries
   */
  setLoopRegion(start: number | null, end: number | null): void {
    this.loopStart = start;
    this.loopEnd = end;

    const transport = Tone.getTransport();

    if (start !== null && end !== null) {
      transport.loopStart = start;
      transport.loopEnd = end;
    }
  }

  /**
   * Enable or disable looping
   */
  /**
   * Mixdown all clips from the given tracks into a single stereo WAV blob.
   * Applies envelope automation per clip using native OfflineAudioContext.
   */
  async mixdown(tracks: any[]): Promise<{ blob: Blob; duration: number; waveformData: number[] }> {
    await Tone.start();

    let totalDuration = 0;
    for (const track of tracks) {
      for (const clip of track.clips ?? []) {
        const end = clip.start + clip.duration;
        if (end > totalDuration) totalDuration = end;
      }
    }

    if (totalDuration === 0) throw new Error('No audio clips to mix down');
    totalDuration += 0.1;

    const sampleRate = Tone.context.sampleRate;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    for (const track of tracks) {
      for (const clip of track.clips ?? []) {
        const audioBuffer = this.audioBuffers.get(String(clip.id));
        if (!audioBuffer) continue;

        const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
        const offlineBuffer = offlineCtx.createBuffer(numChannels, audioBuffer.length, audioBuffer.sampleRate);
        for (let ch = 0; ch < numChannels; ch++) {
          offlineBuffer.copyToChannel(audioBuffer.getChannelData(ch), ch);
        }

        const source = offlineCtx.createBufferSource();
        source.buffer = offlineBuffer;

        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(1, 0);

        if (clip.envelopePoints?.length > 0) {
          const points: { time: number; value: number }[] = clip.envelopePoints;
          gainNode.gain.setValueAtTime(points[0]?.value ?? 1, clip.start);
          for (const pt of points) {
            gainNode.gain.linearRampToValueAtTime(pt.value, clip.start + pt.time);
          }
        }

        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        source.start(clip.start, 0, clip.duration);
      }
    }

    const rawBuffer = await offlineCtx.startRendering();

    const wavArrayBuffer = audioBufferToWav(rawBuffer);
    const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });

    // Downsample to signed min/max pairs for WaveformPreview (interleaved: max, min, max, min...)
    // Use ~100 pixels per second so silence gaps are preserved at any duration
    const channelData = rawBuffer.getChannelData(0);
    const targetPixels = Math.max(500, Math.ceil(totalDuration * 100));
    const blockSize = Math.floor(channelData.length / targetPixels);
    const waveformData: number[] = [];
    for (let i = 0; i < targetPixels; i++) {
      let min = 0;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const s = channelData[i * blockSize + j] ?? 0;
        if (s > max) max = s;
        if (s < min) min = s;
      }
      // Push max then min so WaveformPreview gets signed values
      waveformData.push(max);
      waveformData.push(min);
    }

    return { blob, duration: totalDuration, waveformData };
  }

  setLoopEnabled(enabled: boolean): void {
    this.loopEnabled = enabled;
    const transport = Tone.getTransport();
    transport.loop = enabled;
  }

  /**
   * Get current loop state
   */
  getLoopState(): { enabled: boolean; start: number | null; end: number | null } {
    return {
      enabled: this.loopEnabled,
      start: this.loopStart,
      end: this.loopEnd,
    };
  }
}

// Singleton instance
let audioPlaybackManager: AudioPlaybackManager | null = null;

/**
 * Get or create the audio playback manager instance
 */
export function getAudioPlaybackManager(): AudioPlaybackManager {
  if (!audioPlaybackManager) {
    audioPlaybackManager = new AudioPlaybackManager();
  }
  return audioPlaybackManager;
}
