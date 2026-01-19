import * as Tone from 'tone';

/**
 * Audio playback manager using Tone.js
 * Handles playback of audio clips with envelope automation
 */
export class AudioPlaybackManager {
  private players: Map<string, Tone.Player> = new Map();
  private volumes: Map<string, Tone.Volume> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  // @ts-ignore - playbackPosition is used for tracking state
  private playbackPosition: number = 0;
  private lastLoadedPosition: number = -1;
  private animationFrameId: number | null = null;
  private onPositionUpdate?: (position: number) => void;
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
   * Generate a tone and return the audio buffer and waveform data
   */
  async generateTone(
    duration: number,
    frequency: number = 440,
    waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine'
  ): Promise<{ buffer: AudioBuffer; waveformData: number[] }> {
    await Tone.start();

    // Create an offline context to render the tone
    const sampleRate = Tone.context.sampleRate;
    const offlineContext = new OfflineAudioContext(1, duration * sampleRate, sampleRate);

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
    const channelData = buffer.getChannelData(0);
    const waveformData: number[] = [];
    const samplesPerPixel = Math.floor(channelData.length / (duration * 100)); // ~100 samples per second

    for (let i = 0; i < channelData.length; i += samplesPerPixel) {
      waveformData.push(channelData[i]);
    }

    return { buffer, waveformData };
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

    // Create players for all clips that have audio buffers
    tracks.forEach(track => {
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
              const player = new Tone.Player(toneBuffer).toDestination();

              // Calculate offset if playhead is in the middle of the clip
              const offsetIntoClip = Math.max(0, startTime - clip.start);

              // Sync player to transport and schedule it
              // Start at clip.start in timeline, offset by trimStart + offsetIntoClip in the buffer
              player.sync().start(clip.start, trimStart + offsetIntoClip);

              this.players.set(String(clip.id), player);
            } else {
              // Clip has deleted regions - create multiple players for each segment
              const segments = this.calculateSegments(clip.duration, deletedRegions);

              segments.forEach((segment, segmentIndex) => {
                // Create a Tone.js buffer from the AudioBuffer
                const toneBuffer = Tone.ToneAudioBuffer.fromArray(buffer.getChannelData(0));
                const player = new Tone.Player(toneBuffer).toDestination();

                // Calculate timeline position for this segment
                const timelineStart = clip.start + segment.timelineOffset;

                // Calculate buffer offset (accounting for trimStart)
                const bufferOffset = trimStart + segment.sourceOffset;

                // Only schedule if segment should play from current start time
                if (timelineStart + segment.duration > startTime) {
                  const offsetIntoSegment = Math.max(0, startTime - timelineStart);

                  // Sync player to transport
                  player.sync().start(timelineStart, bufferOffset + offsetIntoSegment, segment.duration - offsetIntoSegment);

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

    // Check if we're resuming from pause
    if (this.isPaused) {
      // Resume from paused state
      this.isPaused = false;

      // If a new start time is provided and it's different from current Transport position,
      // update the Transport position before starting
      if (startTime !== undefined) {
        const currentPos = Tone.getTransport().seconds;
        if (Math.abs(currentPos - startTime) > 0.01) {
          Tone.getTransport().seconds = startTime;
          this.playbackPosition = startTime;
        }
      }

      Tone.getTransport().start();
    } else {
      // If start time is provided, seek to that position first
      if (startTime !== undefined) {
        Tone.getTransport().seconds = startTime;
        this.playbackPosition = startTime;
      }

      // Start Tone.js transport from the current position
      // Using start('+0', startTime) tells Transport to start immediately at the specified time
      Tone.getTransport().start('+0', startTime);
    }

    // Start animation loop for position updates
    this.startPositionTracking();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.isPaused = true;
    Tone.getTransport().pause();
    this.stopPositionTracking();
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    this.pause();
    this.isPaused = false;
    this.playbackPosition = 0;
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;

    if (this.onPositionUpdate) {
      this.onPositionUpdate(0);
    }
  }

  /**
   * Seek to a specific time position
   */
  seek(timeInSeconds: number): void {
    this.playbackPosition = timeInSeconds;
    Tone.getTransport().seconds = timeInSeconds;

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

    this.players.clear();
    this.volumes.clear();
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
