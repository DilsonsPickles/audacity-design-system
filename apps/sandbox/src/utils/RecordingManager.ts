import * as Tone from 'tone';
import { generateRmsWaveform } from './rmsWaveform';

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

      // Reset recorded samples
      this.recordedSamples = [];

      // Create recorder and connect to existing userMedia
      if (this.userMedia) {
        this.recorder = new (Tone as any).Recorder();
        this.userMedia.connect(this.recorder);

        // Start recording
        this.recorder.start();

        // Calculate expected duration during live recording
        if (this.waveform && this.callbacks.onRecordingWaveformUpdate) {
          this.waveformUpdateInterval = window.setInterval(() => {
            if (this.waveform) {
              const dataArray = this.waveform.getValue();

              // Append current snapshot (downsampled)
              const downsampledData: number[] = [];
              for (let i = 0; i < dataArray.length; i += 4) {
                downsampledData.push(dataArray[i]);
              }
              this.recordedSamples.push(...downsampledData);

              // Calculate expected duration based on elapsed time
              const elapsedSeconds = (Date.now() - this.recordingStartTime) / 1000;

              // Generate RMS waveform
              const waveformRms = generateRmsWaveform(this.recordedSamples);

              // Pass samples, RMS, and ELAPSED TIME as "fake sample rate"
              // Duration will be calculated as: samples.length / fakeRate = samples.length / (samples.length / elapsed) = elapsed
              const fakeSampleRate = this.recordedSamples.length / Math.max(0.001, elapsedSeconds);

              this.callbacks.onRecordingWaveformUpdate(
                [...this.recordedSamples],
                waveformRms,
                fakeSampleRate
              );
            }
          }, 1000 / 30); // 30 FPS for waveform updates
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

      // Clear recorded samples
      this.recordedSamples = [];

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
   * Generate RMS waveform from raw samples
   */
  private generateRmsWaveform(samples: number[]): number[] {
    const windowSize = 512; // Larger window for smoother waveform
    const rmsWaveform: number[] = [];

    for (let i = 0; i < samples.length; i += windowSize) {
      const window = samples.slice(i, i + windowSize);
      const rms = Math.sqrt(window.reduce((sum, val) => sum + val * val, 0) / window.length);
      rmsWaveform.push(rms);
    }

    return rmsWaveform;
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
