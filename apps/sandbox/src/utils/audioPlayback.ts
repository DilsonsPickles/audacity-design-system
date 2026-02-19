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
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  // @ts-ignore - playbackPosition is used for tracking state
  private playbackPosition: number = 0;
  // Track position for reloading clips (kept for future use)
  // @ts-expect-error - Unused but kept for future implementation
  private lastLoadedPosition: number = -1;
  private animationFrameId: number | null = null;
  private onPositionUpdate?: (position: number) => void;

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

    // Generate waveform data for visualization - use full resolution
    // Pass all samples so ClipBody can do proper min/max sampling per pixel
    const channelData = buffer.getChannelData(0);
    const waveformData: number[] = Array.from(channelData);

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
            // Create a Tone.js buffer from the AudioBuffer
            const toneBuffer = Tone.ToneAudioBuffer.fromArray(buffer.getChannelData(0));

            // Create a player
            const player = new Tone.Player(toneBuffer).toDestination();

            // Calculate offset if playhead is in the middle of the clip
            const offsetIntoClip = Math.max(0, startTime - clip.start);

            // Sync player to transport and schedule it
            player.sync().start(clip.start, offsetIntoClip);

            this.players.set(String(clip.id), player);
          }
        }
      });
    });

    // Track the position we loaded clips for
    this.lastLoadedPosition = startTime;
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
   * Get all stored audio buffers (clip id -> AudioBuffer)
   */
  getAudioBuffers(): Map<string, AudioBuffer> {
    return this.audioBuffers;
  }

  /**
   * Mixdown all clips from the given tracks into a single stereo WAV blob.
   * Applies envelope automation (gain curve) per clip.
   * Returns a Blob (audio/wav) and the duration in seconds.
   */
  async mixdown(tracks: any[]): Promise<{ blob: Blob; duration: number; waveformData: number[] }> {
    await Tone.start();

    // Calculate total duration from all clips
    let totalDuration = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.start + clip.duration;
        if (clipEnd > totalDuration) totalDuration = clipEnd;
      }
    }

    if (totalDuration === 0) {
      throw new Error('No audio clips to mix down');
    }

    // Add a small tail
    totalDuration += 0.1;

    // Use native OfflineAudioContext for reliable mixdown
    const sampleRate = Tone.context.sampleRate;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    for (const track of tracks) {
      for (const clip of track.clips) {
        const audioBuffer = this.audioBuffers.get(String(clip.id));
        if (!audioBuffer) continue;

        // Re-create the buffer in the offline context's sample rate
        const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
        const offlineBuffer = offlineCtx.createBuffer(
          numChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        for (let ch = 0; ch < numChannels; ch++) {
          offlineBuffer.copyToChannel(audioBuffer.getChannelData(ch), ch);
        }

        const source = offlineCtx.createBufferSource();
        source.buffer = offlineBuffer;

        // Apply envelope automation via a gain node
        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(1, 0);

        if (clip.envelopePoints && clip.envelopePoints.length > 0) {
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

    // Encode to WAV
    const wavArrayBuffer = audioBufferToWav(rawBuffer);
    const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });

    // Generate waveform preview data (downsampled)
    const channelData = rawBuffer.getChannelData(0);
    const targetSamples = 500;
    const blockSize = Math.floor(channelData.length / targetSamples);
    const waveformData: number[] = [];
    for (let i = 0; i < targetSamples; i++) {
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const abs = Math.abs(channelData[i * blockSize + j] ?? 0);
        if (abs > max) max = abs;
      }
      waveformData.push(max);
    }

    return { blob, duration: totalDuration, waveformData };
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
