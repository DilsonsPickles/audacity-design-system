import * as Tone from 'tone';
import type { Clip } from '@audacity-ui/core';

/**
 * Audio playback manager using Tone.js
 * Handles playback of audio clips with envelope automation
 */
export class AudioPlaybackManager {
  private players: Map<string, Tone.Player> = new Map();
  private volumes: Map<string, Tone.Volume> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isPlaying: boolean = false;
  private playbackPosition: number = 0;
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
  }

  /**
   * Start playback from specified position (or current position if not specified)
   */
  async play(startTime?: number): Promise<void> {
    if (this.isPlaying) return;

    await Tone.start(); // Ensure audio context is started
    this.isPlaying = true;

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

    this.isPlaying = false;
    Tone.getTransport().pause();
    this.stopPositionTracking();
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    this.pause();
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
