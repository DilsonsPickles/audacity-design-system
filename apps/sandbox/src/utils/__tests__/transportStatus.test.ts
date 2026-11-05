import { describe, it, expect } from 'vitest';
import { speedInfoText, transportStatusText } from '../transportStatus';

describe('transportStatusText — the status bar follows the transport (2026-11-05)', () => {
  it('reads Stopped, Playing or Recording, and Recording wins over playback', () => {
    expect(transportStatusText({ isRecording: false, isPlaying: false })).toBe('Stopped');
    expect(transportStatusText({ isRecording: false, isPlaying: true })).toBe('Playing');
    expect(transportStatusText({ isRecording: true, isPlaying: false })).toBe('Recording');
    expect(transportStatusText({ isRecording: true, isPlaying: true })).toBe('Recording');
  });

  it('a speed that is on joins the cue; 100% is off; a recording stays bare', () => {
    expect(transportStatusText({ isRecording: false, isPlaying: true, speed: 1.1 })).toBe('Playing at 110%');
    expect(transportStatusText({ isRecording: false, isPlaying: false, speed: 0.5 })).toBe('Stopped · 50%');
    expect(transportStatusText({ isRecording: false, isPlaying: true, speed: 1 })).toBe('Playing');
    expect(transportStatusText({ isRecording: false, isPlaying: false, speed: 1 })).toBe('Stopped');
    expect(transportStatusText({ isRecording: true, isPlaying: true, speed: 2 })).toBe('Recording');
  });

  it('Seeking shows while a seek key is held during playback, under Recording and never while stopped', () => {
    expect(transportStatusText({ isRecording: false, isPlaying: true, isSeeking: true, speed: 1.1 })).toBe('Seeking');
    expect(transportStatusText({ isRecording: false, isPlaying: false, isSeeking: true })).toBe('Stopped');
    expect(transportStatusText({ isRecording: true, isPlaying: true, isSeeking: true })).toBe('Recording');
  });

  it('slot two names the speed as the spec names a slider\'s value', () => {
    expect(speedInfoText(1.1)).toBe('Playback speed: 110%');
    expect(speedInfoText(0.01)).toBe('Playback speed: 1%');
  });
});
