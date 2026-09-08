/**
 * Parameter schemas for macro-step commands, consumed by the
 * CommandParametersDialog opened from the macro editor's pencil action.
 *
 * Well-known commands get hand-authored, Audacity-flavored schemas.
 * Everything else gets a deterministic mock schema generated from a pool of
 * plausible parameters — seeded by the command name, so a given command
 * always shows the same window. This is prototype data: the point is that
 * every command opens a sensible-looking, tweakable window, not that the
 * parameters match real Audacity 1:1.
 */

import { serializeMacroParameters, type CommandParameter } from '@audacity-ui/components';

const num = (key: string, label: string, defaultValue: string): CommandParameter =>
  ({ key, label, type: 'number', defaultValue });

const text = (key: string, label: string, defaultValue: string): CommandParameter =>
  ({ key, label, type: 'text', defaultValue });

const yesNo = (key: string, label: string, defaultValue: 'Yes' | 'No'): CommandParameter => ({
  key, label, type: 'enum', defaultValue,
  options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }],
});

const choice = (
  key: string, label: string, values: string[], defaultValue = values[0], optional?: boolean,
): CommandParameter => {
  // Serialized enum values are the display labels with spaces stripped —
  // the default must go through the same mapping or it matches no option.
  const toValue = (v: string) => v.replace(/\s+/g, '');
  return {
    key, label, type: 'enum', defaultValue: toValue(defaultValue), optional,
    options: values.map((v) => ({ value: toValue(v), label: v })),
  };
};

const SELECT_SCHEMA: CommandParameter[] = [
  num('Start', 'Start time', '0'),
  num('End', 'End time', '0'),
  choice('RelativeTo', 'Relative to', ['Project start', 'Project end', 'Selection start', 'Selection end', 'Cursor']),
  num('High', 'High', '0'),
  num('Low', 'Low', '0'),
  num('FirstTrack', 'First track', '0'),
  num('NumTracks', 'Track count', '1'),
  choice('Mode', 'Mode', ['Set', 'Add', 'Remove'], 'Set', false),
];

/** Hand-authored schemas, keyed by command name as it appears in macro steps. */
const HAND_SCHEMAS: Record<string, CommandParameter[]> = {
  'Select': SELECT_SCHEMA,
  'Select Time': [
    num('Start', 'Start time', '0'),
    num('End', 'End time', '0'),
    choice('RelativeTo', 'Relative to', ['Project start', 'Project end', 'Selection start', 'Selection end', 'Cursor']),
  ],
  'Select Tracks': [
    num('Track', 'First track', '0'),
    num('TrackCount', 'Track count', '1'),
    choice('Mode', 'Mode', ['Set', 'Add', 'Remove'], 'Set', false),
  ],
  'Select Frequencies': [
    num('High', 'High frequency (Hz)', '0'),
    num('Low', 'Low frequency (Hz)', '0'),
  ],
  'Amplify': [
    num('Ratio', 'Amplification (dB)', '0'),
    yesNo('AllowClipping', 'Allow clipping', 'No'),
  ],
  'Adjustable Fade': [
    choice('type', 'Fade type', ['Fade up', 'Fade down', 'S-curve up', 'S-curve down']),
    num('curve', 'Mid-fade adjust (%)', '0'),
    num('gain0', 'Start gain (%)', '0'),
    num('gain1', 'End gain (%)', '100'),
    choice('preset', 'Handy presets', ['None', 'Linear in', 'Linear out', 'Exponential in', 'Exponential out'], 'None', false),
  ],
  'Fade In': [],
  'Fade Out': [],
  'Invert': [],
  'Reverse': [],
  'Repair': [],
  'Normalize': [
    num('PeakLevel', 'Peak level (dB)', '-1'),
    yesNo('RemoveDcOffset', 'Remove DC offset', 'Yes'),
    yesNo('StereoIndependent', 'Normalize channels independently', 'No'),
  ],
  'Loudness Normalization': [
    choice('NormalizeTo', 'Normalize to', ['Perceived loudness', 'RMS']),
    num('LUFSLevel', 'Target level (LUFS)', '-23'),
    yesNo('StereoIndependent', 'Normalize channels independently', 'No'),
    yesNo('DualMono', 'Treat mono as dual-mono', 'Yes'),
  ],
  'Echo': [
    num('Delay', 'Delay time (s)', '1'),
    num('Decay', 'Decay factor', '0.5'),
  ],
  'Delay': [
    choice('delay-type', 'Delay type', ['Regular', 'Bouncing ball', 'Reverse bouncing ball']),
    num('dgain', 'Level per echo (dB)', '-6'),
    num('delay', 'Delay time (s)', '0.3'),
    num('echoes', 'Number of echoes', '5'),
    choice('pitch-type', 'Pitch change effect', ['Pitch/tempo', 'Low-quality pitch shift'], 'Pitch/tempo', false),
  ],
  'Reverb': [
    num('RoomSize', 'Room size (%)', '75'),
    num('Delay', 'Pre-delay (ms)', '10'),
    num('Reverberance', 'Reverberance (%)', '50'),
    num('HfDamping', 'Damping (%)', '50'),
    num('WetGain', 'Wet gain (dB)', '-1'),
    num('DryGain', 'Dry gain (dB)', '-1'),
    yesNo('WetOnly', 'Wet only', 'No'),
  ],
  'Change Pitch': [
    num('Percentage', 'Percent change', '0'),
    yesNo('SBSMS', 'Use high-quality stretching', 'No'),
  ],
  'Change Tempo': [
    num('Percentage', 'Percent change', '0'),
    yesNo('SBSMS', 'Use high-quality stretching', 'No'),
  ],
  'Change Speed and Pitch': [
    num('Percentage', 'Percent change', '0'),
  ],
  'Bass and Treble': [
    num('Bass', 'Bass (dB)', '0'),
    num('Treble', 'Treble (dB)', '0'),
    num('Gain', 'Volume (dB)', '0'),
    yesNo('Link Sliders', 'Link volume to tone controls', 'No'),
  ],
  'Compressor': [
    num('Threshold', 'Threshold (dB)', '-12'),
    num('NoiseFloor', 'Noise floor (dB)', '-40'),
    num('Ratio', 'Ratio', '2'),
    num('AttackTime', 'Attack time (s)', '0.2'),
    num('ReleaseTime', 'Release time (s)', '1'),
    yesNo('Normalize', 'Make-up gain for 0 dB', 'Yes'),
  ],
  'Noise Reduction': [
    num('NoiseReduction', 'Noise reduction (dB)', '12'),
    num('Sensitivity', 'Sensitivity', '6'),
    num('FreqSmoothing', 'Frequency smoothing (bands)', '3'),
  ],
  'Truncate Silence': [
    num('Threshold', 'Threshold (dB)', '-20'),
    num('Minimum', 'Minimum duration (s)', '0.5'),
    num('Truncate', 'Truncate to (s)', '0.5'),
    choice('Action', 'Action', ['Truncate detected silence', 'Compress excess silence'], 'Truncate detected silence', false),
  ],
  'Silence': [
    num('Duration', 'Duration (s)', '30'),
  ],
  'Tone': [
    choice('Waveform', 'Waveform', ['Sine', 'Square', 'Sawtooth', 'Square (no alias)']),
    num('Frequency', 'Frequency (Hz)', '440'),
    num('Amplitude', 'Amplitude (0-1)', '0.8'),
    num('Duration', 'Duration (s)', '30'),
  ],
  'Chirp': [
    num('StartFreq', 'Start frequency (Hz)', '440'),
    num('EndFreq', 'End frequency (Hz)', '1320'),
    num('StartAmp', 'Start amplitude (0-1)', '0.8'),
    num('EndAmp', 'End amplitude (0-1)', '0.1'),
    choice('Waveform', 'Waveform', ['Sine', 'Square', 'Sawtooth']),
    choice('Interpolation', 'Interpolation', ['Linear', 'Logarithmic'], 'Linear', false),
  ],
  'Noise': [
    choice('Type', 'Noise type', ['White', 'Pink', 'Brownian']),
    num('Amplitude', 'Amplitude (0-1)', '0.8'),
    num('Duration', 'Duration (s)', '30'),
  ],
  'Click Removal': [
    num('Threshold', 'Threshold', '200'),
    num('Width', 'Max spike width', '20'),
  ],
  'High-Pass Filter': [
    num('frequency', 'Frequency (Hz)', '1000'),
    choice('rolloff', 'Roll-off (dB per octave)', ['6 dB', '12 dB', '24 dB', '36 dB', '48 dB'], '6 dB', false),
  ],
  'Low-Pass Filter': [
    num('frequency', 'Frequency (Hz)', '1000'),
    choice('rolloff', 'Roll-off (dB per octave)', ['6 dB', '12 dB', '24 dB', '36 dB', '48 dB'], '6 dB', false),
  ],
  'Auto Duck': [
    num('DuckAmountDb', 'Duck amount (dB)', '-12'),
    num('InnerFadeDownLen', 'Inner fade down (s)', '0'),
    num('InnerFadeUpLen', 'Inner fade up (s)', '0'),
    num('OuterFadeDownLen', 'Outer fade down (s)', '0.5'),
    num('OuterFadeUpLen', 'Outer fade up (s)', '0.5'),
    num('ThresholdDb', 'Threshold (dB)', '-30'),
  ],
  'Distortion': [
    choice('Type', 'Distortion type', ['Hard clipping', 'Soft clipping', 'Soft overdrive', 'Medium overdrive', 'Hard overdrive']),
    num('Threshold dB', 'Clipping threshold (dB)', '-6'),
    num('Noise Floor', 'Noise floor (dB)', '-70'),
    num('Parameter 1', 'Drive (%)', '50'),
    num('Parameter 2', 'Make-up gain (%)', '50'),
  ],
  'Phaser': [
    num('Stages', 'Stages', '2'),
    num('DryWet', 'Dry/wet', '128'),
    num('Freq', 'LFO frequency (Hz)', '0.4'),
    num('Depth', 'Depth', '100'),
    num('Feedback', 'Feedback (%)', '0'),
    num('Gain', 'Output gain (dB)', '-6'),
  ],
  'Wahwah': [
    num('Freq', 'LFO frequency (Hz)', '1.5'),
    num('Depth', 'Depth (%)', '70'),
    num('Resonance', 'Resonance', '2.5'),
    num('Offset', 'Wah frequency offset (%)', '30'),
    num('Gain', 'Output gain (dB)', '-6'),
  ],
  'Repeat': [
    num('Count', 'Number of repeats', '1'),
  ],
  'Paulstretch': [
    num('Stretch Factor', 'Stretch factor', '10'),
    num('Time Resolution', 'Time resolution (s)', '0.25'),
  ],
  'Sliding Stretch': [
    num('RatePercentChangeStart', 'Initial tempo change (%)', '0'),
    num('RatePercentChangeEnd', 'Final tempo change (%)', '0'),
    num('PitchPercentChangeStart', 'Initial pitch shift (%)', '0'),
    num('PitchPercentChangeEnd', 'Final pitch shift (%)', '0'),
  ],
  'END': [],
};

// ---------------------------------------------------------------------------
// Deterministic mock generation for everything else

/** Small stable hash (FNV-1a) so a command always generates the same window. */
function hashName(name: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const GENERIC_POOL: CommandParameter[] = [
  num('Gain', 'Gain (dB)', '0'),
  num('Mix', 'Mix (%)', '100'),
  num('Threshold', 'Threshold (dB)', '-20'),
  num('Duration', 'Duration (s)', '1'),
  num('Strength', 'Strength (%)', '50'),
  num('Smoothing', 'Smoothing', '3'),
  yesNo('PreserveTiming', 'Preserve timing', 'Yes'),
  yesNo('ApplyToSelection', 'Apply to selection only', 'Yes'),
  choice('Quality', 'Quality', ['Low', 'Medium', 'High', 'Best'], 'Medium'),
  choice('Channel', 'Channel', ['Both', 'Left', 'Right'], 'Both'),
];

/** Name-keyed parameter groups that make generated windows feel apt. */
const THEMED_PARAMS: Array<{ pattern: RegExp; params: CommandParameter[] }> = [
  { pattern: /filter|pass|eq\b|shelf/i, params: [num('Frequency', 'Frequency (Hz)', '1000'), num('Q', 'Q (bandwidth)', '0.7')] },
  { pattern: /delay|echo/i, params: [num('Delay', 'Delay time (s)', '0.3'), num('Feedback', 'Feedback (%)', '30')] },
  { pattern: /reverb/i, params: [num('RoomSize', 'Room size (%)', '75'), num('WetGain', 'Wet gain (dB)', '-1')] },
  { pattern: /pitch/i, params: [num('Semitones', 'Pitch shift (semitones)', '0')] },
  { pattern: /compress|limit|dynamic/i, params: [num('Threshold', 'Threshold (dB)', '-12'), num('Ratio', 'Ratio', '2'), num('Attack', 'Attack (ms)', '20'), num('Release', 'Release (ms)', '200')] },
  { pattern: /pan/i, params: [num('Azimuth', 'Azimuth (°)', '0'), num('Elevation', 'Elevation (°)', '0')] },
  { pattern: /export|import|save|open/i, params: [text('Filename', 'File name', 'untitled'), choice('Format', 'Format', ['WAV', 'MP3', 'FLAC', 'OGG'], 'WAV')] },
  { pattern: /label/i, params: [text('Text', 'Label text', 'Label'), num('Start', 'Start time (s)', '0')] },
  { pattern: /zoom/i, params: [num('Level', 'Zoom level (%)', '100')] },
];

function generateParameters(commandName: string): CommandParameter[] {
  const themed = THEMED_PARAMS.find((t) => t.pattern.test(commandName))?.params ?? [];
  const hash = hashName(commandName);

  // Toolbar/menu-style commands take no parameters — approximate that for
  // a slice of the unthemed catalog so not every window is a form.
  if (themed.length === 0 && hash % 5 === 0) return [];

  // 2–4 generic parameters on top of any themed ones, picked stably
  const generics: CommandParameter[] = [];
  const count = 2 + (hash % 3);
  for (let i = 0; i < count; i++) {
    // >>> keeps the shifted hash unsigned — a signed >> would go negative
    // for hashes with the top bit set, making the modulo negative and the
    // pool lookup undefined.
    const pick = GENERIC_POOL[(hash >>> (i * 3)) % GENERIC_POOL.length];
    if (!generics.some((g) => g.key === pick.key) && !themed.some((t) => t.key === pick.key)) {
      generics.push(pick);
    }
  }

  // AU plugins get a preset selector, like a real plugin shell would
  const preset = /^AU/.test(commandName)
    ? [choice('Preset', 'Preset', ['Factory default', 'Custom'], 'Factory default', false)]
    : [];

  return [...themed, ...generics, ...preset];
}

/**
 * The parameter schema for a command: hand-authored when we have one,
 * otherwise a stable generated mock. Never returns null — every command
 * gets a window (possibly the "no adjustable parameters" one).
 */
export function getCommandParameters(commandName: string): CommandParameter[] {
  return HAND_SCHEMAS[commandName] ?? generateParameters(commandName);
}

/**
 * The serialized parameters string a freshly-added step starts with: every
 * parameter at its default (matching what the parameters window shows for a
 * step with no parameters yet).
 */
export function getDefaultParameters(commandName: string): string {
  return serializeMacroParameters(
    getCommandParameters(commandName).map((p) => [p.key, p.defaultValue]),
  );
}
