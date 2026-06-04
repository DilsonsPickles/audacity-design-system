import * as Tone from 'tone';

// Window size used for the *live* recording RMS preview. Much smaller than
// the offline 2048 window so we can recompute incrementally on each tick
// without burning the main thread. The final RMS (computed once in
// onRecordingComplete) still uses the full 2048 window so the saved clip
// matches the rest of the app's visual style.
const LIVE_RMS_WINDOW = 256;
const LIVE_RMS_HALF = LIVE_RMS_WINDOW >> 1;
// Throttle the React dispatch — 15Hz is still smooth visually but halves
// the reducer/reconciler work versus the 30Hz capture rate.
const LIVE_DISPATCH_HZ = 15;
const LIVE_DISPATCH_INTERVAL_MS = 1000 / LIVE_DISPATCH_HZ;

export interface RecordingManagerCallbacks {
  onMeterUpdate: (level: number, peak: number) => void;
  onRecordingComplete: (audioBuffer: AudioBuffer) => void;
  onPlayheadUpdate: (position: number) => void;
  onWaveformUpdate?: (waveformData: number[]) => void;
  onRecordingWaveformUpdate?: (waveformData: number[], waveformRms: number[], sampleRate: number) => void;
}

// Fixed sample rate for all recordings (typical browser default)
const SAMPLE_RATE = 44100;

export class RecordingManager {
  private recorder: any = null; // Tone.Recorder type issues with strict mode
  private meter: any = null; // Tone.Meter type issues with strict mode
  private userMedia: any = null; // Tone.UserMedia type issues with strict mode
  private waveform: any = null; // Tone.Waveform type issues with strict mode
  private meterUpdateInterval: number | null = null;
  private waveformUpdateInterval: number | null = null;
  private callbacks: RecordingManagerCallbacks;
  private peakLevel = 0;
  private recordingStartTime = 0;
  private recordingStartPosition = 0;
  private isMonitoring = false;
  private recordedSamples: number[] = [];
  // Running RMS, length matches recordedSamples 1:1. Maintained
  // incrementally by appendRecordedChunk so we never re-process the full
  // buffer during a long recording.
  private recordedRms: number[] = [];
  // Wall-clock of the last React dispatch — used to throttle visual
  // updates to LIVE_DISPATCH_HZ without dropping incoming audio samples.
  private lastDispatchAt = 0;
  private actualSampleRate = SAMPLE_RATE; // Track actual sample rate from AudioContext

  constructor(callbacks: RecordingManagerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Start monitoring microphone input (shows waveform but doesn't record)
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Request microphone access
      this.userMedia = new (Tone as any).UserMedia();
      await this.userMedia.open();

      // Get actual sample rate from AudioContext
      this.actualSampleRate = (Tone as any).context.sampleRate || SAMPLE_RATE;
      console.log(`Recording with sample rate: ${this.actualSampleRate} Hz`);

      // Wait for mic to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create meter for level monitoring
      this.meter = new (Tone as any).Meter({ normalRange: false, smoothing: 0.8 });
      this.userMedia.connect(this.meter);

      // Create Tone.Waveform for waveform data (2048 samples)
      this.waveform = new (Tone as any).Waveform(2048);
      this.userMedia.connect(this.waveform);

      this.isMonitoring = true;

      // Start meter updates
      this.meterUpdateInterval = window.setInterval(() => {
        if (this.meter) {
          const dbLevel = this.meter.getValue() as number;
          const normalized = Math.max(0, Math.min(100, ((dbLevel + 60) / 60) * 100));
          this.peakLevel = Math.max(this.peakLevel, normalized);
          this.callbacks.onMeterUpdate(normalized, this.peakLevel);
        }
      }, 1000 / 60);

      // Start waveform updates
      if (this.callbacks.onWaveformUpdate) {
        this.waveformUpdateInterval = window.setInterval(() => {
          if (this.waveform) {
            const dataArray = this.waveform.getValue();

            // Sample the data to get ~200 points for display
            const sampledData: number[] = [];
            const step = Math.floor(dataArray.length / 200);
            for (let i = 0; i < dataArray.length; i += step) {
              sampledData.push(dataArray[i]);
            }

            this.callbacks.onWaveformUpdate?.(sampledData);
          }
        }, 1000 / 30); // 30fps for waveform updates
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Append a fresh snapshot from the Tone.Waveform node to the running
   * buffers. Downsamples to keep the preview light, then extends the RMS
   * envelope only over the affected range — the previously-finalized RMS
   * values are not re-touched. Cost is O(chunk) per call rather than
   * O(total samples), which is what was killing recordings >30s.
   */
  private appendRecordedChunk(dataArray: Float32Array | number[]): void {
    const previousLength = this.recordedSamples.length;
    // Downsample by 4 (matches the pre-existing visual density).
    for (let i = 0; i < dataArray.length; i += 4) {
      this.recordedSamples.push(dataArray[i]);
    }
    const newLength = this.recordedSamples.length;
    if (newLength === previousLength) return;

    // The RMS window straddles each sample, so when we append new data
    // the last LIVE_RMS_HALF positions of the *previous* RMS need to be
    // re-computed too (their right halves now reach into the new audio).
    // Everything earlier than that is stable and doesn't change.
    const recomputeStart = Math.max(0, previousLength - LIVE_RMS_HALF);
    // Truncate the now-stale tail of recordedRms before re-extending.
    if (this.recordedRms.length > recomputeStart) {
      this.recordedRms.length = recomputeStart;
    }
    const samples = this.recordedSamples;
    for (let i = recomputeStart; i < newLength; i++) {
      const start = Math.max(0, i - LIVE_RMS_HALF);
      const end = Math.min(newLength, i + LIVE_RMS_HALF);
      let sumSquares = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        const s = samples[j];
        sumSquares += s * s;
        count++;
      }
      this.recordedRms.push(Math.sqrt(sumSquares / count));
    }
  }

  /**
   * Stop monitoring microphone input
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    if (this.meterUpdateInterval !== null) {
      clearInterval(this.meterUpdateInterval);
      this.meterUpdateInterval = null;
    }

    if (this.waveformUpdateInterval !== null) {
      clearInterval(this.waveformUpdateInterval);
      this.waveformUpdateInterval = null;
    }

    if (this.waveform) {
      this.waveform.dispose();
      this.waveform = null;
    }

    if (this.userMedia) {
      this.userMedia.close();
      this.userMedia.dispose();
      this.userMedia = null;
    }

    if (this.meter) {
      this.meter.dispose();
      this.meter = null;
    }

    this.isMonitoring = false;
    this.peakLevel = 0;
  }

  async startRecording(startPosition: number = 0): Promise<void> {
    try {
      // If not already monitoring, start the mic
      if (!this.isMonitoring) {
        await this.startMonitoring();
      }

      // Reset recorded samples + RMS + dispatch throttle.
      this.recordedSamples = [];
      this.recordedRms = [];
      this.lastDispatchAt = 0;

      // Create recorder and connect to existing userMedia
      if (this.userMedia) {
        this.recorder = new (Tone as any).Recorder();
        this.userMedia.connect(this.recorder);

        // Start recording
        this.recorder.start();

        // Live preview tick: pulls the latest Waveform-node snapshot,
        // appends it to the running buffer, and incrementally extends
        // the RMS envelope so visual updates stay O(chunk) instead of
        // O(total recording length).
        if (this.waveform && this.callbacks.onRecordingWaveformUpdate) {
          this.waveformUpdateInterval = window.setInterval(() => {
            if (!this.waveform) return;
            const dataArray = this.waveform.getValue();
            this.appendRecordedChunk(dataArray);

            // Throttle the actual React dispatch — capture continues at
            // 30Hz, but we only push fresh state to the renderer at
            // LIVE_DISPATCH_HZ. The clip's preview waveform doesn't need
            // more than ~15Hz to look continuous.
            const now = performance.now();
            if (now - this.lastDispatchAt < LIVE_DISPATCH_INTERVAL_MS) return;
            this.lastDispatchAt = now;

            const elapsedSeconds = (Date.now() - this.recordingStartTime) / 1000;
            // Duration is derived: samples.length / fakeRate = elapsed.
            const fakeSampleRate = this.recordedSamples.length / Math.max(0.001, elapsedSeconds);

            // slice() snapshots the references so React's reducer can
            // own its own copies (the recorder keeps mutating the
            // originals between dispatches).
            this.callbacks.onRecordingWaveformUpdate(
              this.recordedSamples.slice(),
              this.recordedRms.slice(),
              fakeSampleRate
            );
          }, 1000 / 30); // 30Hz capture; dispatch throttled above.
        }
      }

      // Reset peak level and recording start time
      this.peakLevel = 0;
      this.recordingStartTime = Date.now();
      this.recordingStartPosition = startPosition;

      // Update the meter interval to include playhead updates during recording
      if (this.meterUpdateInterval) {
        clearInterval(this.meterUpdateInterval);
      }

      this.meterUpdateInterval = window.setInterval(() => {
        if (this.meter) {
          // Get RMS level in dB
          const dbLevel = this.meter.getValue() as number;

          // Convert dB to 0-100 range
          const normalized = Math.max(0, Math.min(100, ((dbLevel + 60) / 60) * 100));

          // Update peak
          this.peakLevel = Math.max(this.peakLevel, normalized);

          // Calculate elapsed time and playhead position during recording
          const elapsedSeconds = (Date.now() - this.recordingStartTime) / 1000;
          const currentPosition = this.recordingStartPosition + elapsedSeconds;

          // Notify callbacks
          this.callbacks.onMeterUpdate(normalized, this.peakLevel);
          this.callbacks.onPlayheadUpdate(currentPosition);
        }
      }, 1000 / 60);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    try {
      // Stop the waveform update interval
      if (this.waveformUpdateInterval) {
        clearInterval(this.waveformUpdateInterval);
        this.waveformUpdateInterval = null;
      }

      // Stop recording and get audio blob
      if (this.recorder) {
        try {
          const recording = await this.recorder.stop();

          // Convert blob to AudioBuffer
          const arrayBuffer = await recording.arrayBuffer();
          const audioBuffer = await (Tone as any).context.rawContext.decodeAudioData(arrayBuffer);

          // Notify callback with audio buffer
          this.callbacks.onRecordingComplete(audioBuffer);
        } catch (recorderError) {
          // If recorder wasn't started, just skip the stop
          console.warn('Recorder stop failed (may not have been started):', recorderError);
        }

        this.recorder.dispose();
        this.recorder = null;
      }

      // Clear recorded buffers + dispatch throttle.
      this.recordedSamples = [];
      this.recordedRms = [];
      this.lastDispatchAt = 0;

      // Return to monitoring mode (keep mic active, just stop recording)
      // Restart the meter interval without playhead updates
      if (this.meterUpdateInterval) {
        clearInterval(this.meterUpdateInterval);
      }

      this.meterUpdateInterval = window.setInterval(() => {
        if (this.meter) {
          const dbLevel = this.meter.getValue() as number;
          const normalized = Math.max(0, Math.min(100, ((dbLevel + 60) / 60) * 100));
          this.peakLevel = Math.max(this.peakLevel, normalized);
          this.callbacks.onMeterUpdate(normalized, this.peakLevel);
        }
      }, 1000 / 60);

      this.peakLevel = 0;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  getIsMonitoring(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get list of available audio input devices
   */
  static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Request permission first by getting user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Now enumerate devices (will include labels after permission granted)
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());

      // Filter for audio input devices only
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      return [];
    }
  }

  /**
   * Get list of available audio output devices
   */
  static async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Request permission first by getting user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Now enumerate devices (will include labels after permission granted)
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());

      // Filter for audio output devices only
      return devices.filter(device => device.kind === 'audiooutput');
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      return [];
    }
  }

  dispose(): void {
    this.stopMonitoring();

    if (this.recorder) {
      this.recorder.dispose();
      this.recorder = null;
    }
  }
}
