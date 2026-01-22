import * as Tone from 'tone';

export interface RecordingManagerCallbacks {
  onMeterUpdate: (level: number, peak: number) => void;
  onRecordingComplete: (audioBuffer: AudioBuffer) => void;
  onPlayheadUpdate: (position: number) => void;
  onWaveformUpdate?: (waveformData: number[]) => void;
}

export class RecordingManager {
  private recorder: Tone.Recorder | null = null;
  private meter: Tone.Meter | null = null;
  private userMedia: Tone.UserMedia | null = null;
  private analyser: AnalyserNode | null = null;
  private meterUpdateInterval: number | null = null;
  private waveformUpdateInterval: number | null = null;
  private callbacks: RecordingManagerCallbacks;
  private peakLevel = 0;
  private recordingStartTime = 0;
  private recordingStartPosition = 0;
  private isMonitoring = false;

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
      this.userMedia = new Tone.UserMedia();
      await this.userMedia.open();

      // Wait for mic to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create meter for level monitoring
      this.meter = new Tone.Meter({ normalRange: false, smoothing: 0.8 });
      this.userMedia.connect(this.meter);

      // Create analyser for waveform data
      const audioContext = Tone.getContext().rawContext;
      this.analyser = audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0;

      // Connect userMedia to analyser
      this.userMedia.connect(this.analyser as any);

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
          if (this.analyser) {
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            this.analyser.getFloatTimeDomainData(dataArray);

            // Sample the data to get ~200 points for display
            const sampledData: number[] = [];
            const step = Math.floor(bufferLength / 200);
            for (let i = 0; i < bufferLength; i += step) {
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

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
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

      // Create recorder and connect to existing userMedia
      if (this.userMedia) {
        this.recorder = new Tone.Recorder();
        this.userMedia.connect(this.recorder);

        // Start recording
        this.recorder.start();
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
      // Stop recording and get audio blob
      if (this.recorder) {
        try {
          const recording = await this.recorder.stop();

          // Convert blob to AudioBuffer
          const arrayBuffer = await recording.arrayBuffer();
          const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);

          // Notify callback with audio buffer
          this.callbacks.onRecordingComplete(audioBuffer);
        } catch (recorderError) {
          // If recorder wasn't started, just skip the stop
          console.warn('Recorder stop failed (may not have been started):', recorderError);
        }

        this.recorder.dispose();
        this.recorder = null;
      }

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

  dispose(): void {
    this.stopMonitoring();

    if (this.recorder) {
      this.recorder.dispose();
      this.recorder = null;
    }
  }
}
