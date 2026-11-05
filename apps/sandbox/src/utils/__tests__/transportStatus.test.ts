import { describe, it, expect } from 'vitest';
import { transportStatusText } from '../transportStatus';

describe('transportStatusText — the status bar follows the transport (2026-11-05)', () => {
  it('reads Stopped, Playing or Recording, and Recording wins over playback', () => {
    expect(transportStatusText({ isRecording: false, isPlaying: false })).toBe('Stopped');
    expect(transportStatusText({ isRecording: false, isPlaying: true })).toBe('Playing');
    expect(transportStatusText({ isRecording: true, isPlaying: false })).toBe('Recording');
    expect(transportStatusText({ isRecording: true, isPlaying: true })).toBe('Recording');
  });
});
