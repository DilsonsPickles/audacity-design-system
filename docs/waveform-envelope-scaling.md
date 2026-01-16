# Waveform Envelope Scaling

This document describes how the waveform visually reacts to envelope automation points.

## Overview

When envelope automation is enabled (`showEnvelope=true`) and envelope points exist, the waveform amplitude is visually scaled to show how the volume automation affects the audio. This provides immediate visual feedback of the envelope's effect.

## Implementation

### Gain Calculation Function

`getEnvelopeGainAtTime()` in `packages/components/src/utils/envelope.ts`:

```typescript
function getEnvelopeGainAtTime(
  time: number,
  points: EnvelopePointData[],
  duration: number
): number
```

**Algorithm:**
1. Find the two envelope points that bracket the requested time
2. Interpolate the dB value linearly between those points
3. Convert dB to linear gain multiplier using formula: `gain = 10^(dB/20)`
4. Return gain multiplier (0 = silence, 1 = unity gain, >1 = amplification)

**Edge Cases:**
- No points: Returns 1.0 (unity gain, 0dB)
- Before first point: Uses first point's dB value
- After last point: Uses last point's dB value
- Exactly on a point: Uses that point's dB value

**Example Conversions:**
- 0dB → gain = 1.0 (no change)
- -6dB → gain = 0.501 (half amplitude)
- -12dB → gain = 0.251 (quarter amplitude)
- -60dB → gain = 0.001 (near silence)
- +6dB → gain = 1.995 (double amplitude)
- +12dB → gain = 3.981 (4x amplitude)

### Waveform Rendering with Scaling

In `ClipBody.tsx`, all waveform rendering loops apply envelope gain:

```typescript
for (let px = 0; px < canvasWidth; px++) {
  // ... calculate min/max waveform samples for this pixel ...

  // Apply envelope gain to waveform amplitude
  const pixelTime = clipTrimStart + (px / pixelsPerSecond);
  const envelopeGain = showEnvelope && envelope
    ? getEnvelopeGainAtTime(pixelTime, envelope, clipDuration)
    : 1.0;
  min *= envelopeGain;
  max *= envelopeGain;

  // ... render scaled waveform ...
}
```

**Applied to:**
- ✅ Stereo L channel (split view and full view)
- ✅ Stereo R channel (split view and full view)
- ✅ Mono waveform (split view and full view)
- ✅ RMS overlay (mono full view)

### Visual Effect

**Below 0dB (attenuation):**
- Waveform amplitude decreases
- Visual "dip" or "thinning" of the waveform
- At -60dB, waveform is almost invisible (0.1% of original size)
- At -∞dB, waveform is completely silent (gain = 0)

**At 0dB (unity):**
- Waveform displays at original amplitude
- No visual change from unprocessed audio

**Above 0dB (amplification):**
- Waveform amplitude increases
- Visual "growth" or "thickening" of the waveform
- At +6dB, waveform is ~2x original size
- At +12dB, waveform is ~4x original size

## Performance Considerations

### Efficiency
- Gain calculation is O(n) where n = number of envelope points
- Performed once per pixel column during render
- Typically <10 points per clip, so very fast (~50-100ns per calculation)
- Total overhead: <5ms for 1000px wide clip at 60fps

### Optimization Opportunities (not currently implemented)
1. **Gain caching**: Pre-calculate gain curve at fixed intervals, interpolate between
2. **Dirty regions**: Only recalculate when envelope points change
3. **Web Worker**: Offload gain calculations to background thread
4. **SIMD**: Use WebAssembly SIMD for batch gain calculations

## Testing

**To verify envelope scaling works correctly:**
1. Create clip with waveform data
2. Add envelope point at time=0s with db=-60 (near silence)
3. Add envelope point at time=1s with db=+12 (4x amplification)
4. Observe waveform visually scales from tiny to large across the clip duration
5. Verify RMS overlay also scales proportionally

**Edge cases to test:**
- Clip with no envelope points (should show normal waveform)
- Envelope with single point (should use that dB for entire clip)
- Envelope with point at clip origin (time=0)
- Extreme dB values (-60dB, +12dB)
- Rapid dB changes (vertical segments)

## Related Documentation

- [Clip Envelopes](./clip-envelopes.md) - Complete envelope editing behavior
- [Automation Overlay States](./automation-overlay-states.md) - Visual overlay states
- [Clip Styling States](./clip-styling-states.md) - Clip visual state matrix
