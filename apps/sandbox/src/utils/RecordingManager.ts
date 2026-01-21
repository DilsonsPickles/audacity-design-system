import * as Tone from 'tone';

export interface RecordingManagerCallbacks {
  onMeterUpdate: (level: number, peak: number) => void;
  onRecordingComplete: (audioBuffer: AudioBuffer) => void;
  onPlayheadUpdate: (position: number) => void;
}

export class RecordingManager {
  private recorder: Tone.Recorder | null = null;
  private meter: Tone.Meter | null = null;
  private userMedia: Tone.UserMedia | null = null;
  private meterUpdateInterval: number | null = null;
  private callbacks: RecordingManagerCallbacks;
  private peakLevel = 0;
  private recordingStartTime = 0;
  private recordingStartPosition = 0;

  constructor(callbacks: RecordingManagerCallbacks) {
    this.callbacks = callbacks;
  }

  async startRecording(startPosition: number = 0): Promise<void> {
    try {
      // Request microphone access
      this.userMedia = new Tone.UserMedia();
      await this.userMedia.open();

      // Create meter for real-time level monitoring
      this.meter = new Tone.Meter({ normalRange: false, smoothing: 0.8 });
      this.userMedia.connect(this.meter);

      // Create recorder
      this.recorder = new Tone.Recorder();
      this.userMedia.connect(this.recorder);

      // Start recording
      this.recorder.start();

      // Reset peak level and recording start time
      this.peakLevel = 0;
      this.recordingStartTime = Date.now();
      this.recordingStartPosition = startPosition;

      // Start meter and playhead updates (60fps)
      this.meterUpdateInterval = window.setInterval(() => {
        if (this.meter) {
          // Get RMS level in dB
          const dbLevel = this.meter.getValue() as number;

          // Convert dB to 0-100 range
          // Range: -60dB (silent) to 0dB (full scale)
          const normalized = Math.max(0, Math.min(100, ((dbLevel + 60) / 60) * 100));

          // Update peak
          this.peakLevel = Math.max(this.peakLevel, normalized);

          // Calculate elapsed time and playhead position
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
      // Stop meter updates
      if (this.meterUpdateInterval !== null) {
        clearInterval(this.meterUpdateInterval);
        this.meterUpdateInterval = null;
      }

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
      }

      // Clean up
      if (this.userMedia) {
        this.userMedia.close();
        this.userMedia.dispose();
        this.userMedia = null;
      }

      if (this.meter) {
        this.meter.dispose();
        this.meter = null;
      }

      if (this.recorder) {
        this.recorder.dispose();
        this.recorder = null;
      }

      this.peakLevel = 0;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  dispose(): void {
    if (this.meterUpdateInterval !== null) {
      clearInterval(this.meterUpdateInterval);
    }

    this.userMedia?.close();
    this.userMedia?.dispose();
    this.meter?.dispose();
    this.recorder?.dispose();
  }
}
