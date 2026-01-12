/**
 * Audacity Design System - Light Theme
 *
 * Default theme for Audacity 4
 * All colors are pre-computed solid values for performance
 */

import { ThemeTokens } from '../tokens.v2';

export const lightTheme: ThemeTokens = {
  background: {
    surface: {
      default: '#F8F8F9',        // Main toolbar/panel background (track panel active)
      elevated: '#E3E3E8',       // Dialogs, menus, dropdowns, ruler, side panel
      subtle: '#EEEEF1',         // Track headers, subtle containers (track panel idle)
      inset: '#EBEDF0',          // Recessed content areas (project grids, list containers)
      hover: '#F2F2F7',          // Interactive surface hover (track panel hover)
    },

    dialog: {
      header: '#F8F8F9',         // Dialog header background
      body: '#F8F8F9',           // Dialog body/content background
      footer: '#F8F8F9',         // Dialog footer background
    },

    canvas: {
      default: '#252837',        // Main audio canvas (dark even in light theme)
      track: {
        idle: '#292d40',         // Track idle (computed: #252837 + 5% white)
        selected: '#2f3346',     // Track selected (computed: #252837 + 10% white)
        hover: '#2b2f43',        // Track hover (computed: #252837 + 7.5% white)
      },
      grid: {
        major: '#31354a',        // Major grid lines
        minor: '#292c40',        // Minor grid lines
      },
    },

    control: {
      button: {
        primary: {
          idle: '#84B5FF',       // Primary button (blue)
          hover: '#66A3FF',      // Darker on hover (depressed)
          active: '#5A91E6',     // Even darker when pressed
          disabled: '#C0C5CE',   // Desaturated gray
        },
        secondary: {
          idle: '#D3D4DC',       // Secondary button (subtle gray)
          hover: '#C8CAD3',      // Darker on hover (depressed)
          active: '#BDC1CC',     // Even darker when pressed
          disabled: '#F2F3F5',   // Very light gray
        },
        ghost: {
          idle: 'transparent',   // No background
          hover: '#E3E3E8',      // More prominent gray on hover
          active: '#D3D4DC',     // Darker when pressed
          disabled: 'transparent', // No background when disabled
        },
      },

      input: {
        idle: '#FFFFFF',         // White input background
        hover: '#F9F9FA',        // Slight tint on hover
        focus: '#FFFFFF',        // White when focused
        disabled: '#F2F3F5',     // Light gray when disabled
        error: '#FEF2F2',        // Light red tint for errors
      },

      checkbox: {
        idle: '#D2D4DC',         // Light gray background
        hover: '#C8CAD3',        // Darker gray on hover
        pressed: '#BEC1CC',      // Even darker when pressed
        checked: '#84B5FF',      // Blue when checked
        checkedHover: '#A2C7FF', // Lighter blue on hover
        disabled: '#F2F3F5',     // Very light gray when disabled
      },

      radio: {
        idle: '#FFFFFF',         // White background
        hover: '#F9F9FA',        // Slight gray on hover
        pressed: '#EBEDF0',      // Darker when pressed
        selected: '#84B5FF',     // Blue when selected
        selectedHover: '#A2C7FF', // Lighter blue on hover
        disabled: '#F2F3F5',     // Light gray when disabled
      },

      toggle: {
        off: {
          idle: '#C0C5CE',       // Gray when off
          hover: '#A9B0BD',      // Darker on hover
          disabled: '#E0E0E5',   // Very light gray
        },
        on: {
          idle: '#84B5FF',       // Blue when on
          hover: '#A2C7FF',      // Lighter blue on hover
          disabled: '#C0D9FF',   // Desaturated blue
        },
      },

      slider: {
        track: '#CFCFD9',        // Light gray track
        thumb: {
          idle: '#84B5FF',       // Blue thumb
          hover: '#A2C7FF',      // Lighter on hover
          drag: '#66A3FF',       // Darker when dragging
          disabled: '#C0C5CE',   // Gray when disabled
        },
        handle: {
          background: '#F8F8F9', // Default surface color
          border: '#5B5B5F',     // Handle stroke
        },
      },

      fader: {
        track: '#CFCFD9',        // Light gray track
        thumb: {
          idle: '#84B5FF',       // Blue thumb
          hover: '#A2C7FF',      // Lighter on hover
          drag: '#66A3FF',       // Darker when dragging
          disabled: '#C0C5CE',   // Gray when disabled
        },
      },

      panKnob: {
        face: '#F8F8F9',         // Default surface color (chrome UI)
        border: '#818185',       // 2px border stroke
        gauge: '#CFCFD9',        // Background gauge track
      },

      scrollbar: {
        track: '#F2F3F5',        // Very light gray track
        thumb: {
          idle: '#C0C5CE',       // Medium gray thumb
          hover: '#A9B0BD',      // Darker on hover
          pressed: '#949CAC',    // Even darker when pressed
        },
      },

      timecode: {
        idle: '#FFFFFF',         // White background
        hover: '#F9F9FA',        // Slight gray on hover
        active: '#84B5FF',       // Blue when active/editing
      },

      meter: {
        background: '#EBEDF0',   // Light gray background
        fill: '#74BE59',         // Green fill
        peak: '#F08080',         // Red peak indicator
      },
    },

    menu: {
      background: '#FFFFFF',     // White menu background
      item: {
        idle: 'transparent',     // No background for items
        hover: '#F2F3F5',        // Light gray on hover
        pressed: '#EBEDF0',      // Darker when pressed
        active: '#DEEBFF',       // Blue tint for active item
      },
      separator: '#EBEDF0',      // Light gray separator
    },

    table: {
      background: '#FFFFFF',     // White table background
      header: '#F9F9FA',         // Light gray header
      row: {
        idle: 'transparent',     // No background for rows
        hover: '#F9F9FA',        // Light gray on hover
        selected: '#DEEBFF',     // Blue tint when selected
      },
    },

    tab: {
      idle: '#F8F8F9',           // Default surface color
      hover: '#EEEEF1',          // Subtle hover
      selected: '#EBF0FA',       // More visible blue tint
      selectedBorder: '#677CE4', // Accent blue
    },

    trackHeader: {
      idle: '#E3E3E8',           // Light gray idle state
      hover: '#D9D9DE',          // Slightly darker on hover
      selected: '#D0D0D5',       // Even darker when selected
    },

    toast: '#14151A',            // Dark background for toast notifications
  },

  foreground: {
    text: {
      primary: '#14151A',        // Dark text for body content
      secondary: '#6F788F',      // Muted gray for labels
      tertiary: '#949CAC',       // Light gray for hints
      disabled: '#C0C5CE',       // Very light gray for disabled
      inverse: '#FFFFFF',        // White text (for dark canvas)
      error: '#D63636',          // Red for errors
      success: '#40821C',        // Green for success
      warning: '#CC5619',        // Orange for warnings
      info: '#305BCC',           // Blue for info
      link: '#305BCC',           // Blue for links
      linkHover: '#1A3FB3',      // Darker blue on hover
    },

    icon: {
      primary: '#14151A',        // Dark icons
      secondary: '#6F788F',      // Muted gray icons
      disabled: '#C0C5CE',       // Light gray for disabled
      inverse: '#FFFFFF',        // White icons (for dark canvas)
      success: '#40821C',        // Green icons
      warning: '#CC5619',        // Orange icons
      error: '#D63636',          // Red icons
      info: '#305BCC',           // Blue icons
    },
  },

  border: {
    default: '#DFE2E7',          // Standard border color
    subtle: '#EBEDF0',           // Subtle border
    emphasis: '#C0C5CE',         // Emphasized border
    focus: '#84B5FF',            // Blue focus ring
    error: '#F08080',            // Red error border
    success: '#74BE59',          // Green success border
    warning: '#FF9E65',          // Orange warning border
    divider: '#D4D5D9',          // Divider/separator color - matches main border
    onElevated: '#D4D5D9',       // Border on elevated surfaces (ruler, dialogs) - matches Figma
    onSurface: '#E9E9E9',        // Border on default surfaces (toolbars, panels) - same contrast as onElevated
    input: {
      idle: '#D2D6DD',           // Input border default
      hover: '#C0C5CE',          // Darker on hover
      focus: '#84B5FF',          // Blue when focused
      error: '#F08080',          // Red for errors
      disabled: '#EBEDF0',       // Light gray when disabled
    },
    control: {
      radio: '#5B5B5F',          // Radio button border
      checkbox: '#5B5B5F',       // Checkbox border
    },
  },

  semantic: {
    success: {
      background: '#74BE59',     // Green background
      backgroundSubtle: '#E0F2DD', // Light green tint
      border: '#5AA038',         // Darker green border
      text: '#40821C',           // Dark green text
      icon: '#40821C',           // Dark green icon
    },
    warning: {
      background: '#FF9E65',     // Orange background
      backgroundSubtle: '#FFEADD', // Light orange tint
      border: '#E67A3D',         // Darker orange border
      text: '#CC5619',           // Dark orange text
      icon: '#CC5619',           // Dark orange icon
    },
    error: {
      background: '#F08080',     // Red background
      backgroundSubtle: '#FCE4E4', // Light red tint
      border: '#E85B5B',         // Darker red border
      text: '#D63636',           // Dark red text
      icon: '#D63636',           // Dark red icon
    },
    info: {
      background: '#84B5FF',     // Blue background
      backgroundSubtle: '#DEEBFF', // Light blue tint
      border: '#4A7FE6',         // Darker blue border
      text: '#305BCC',           // Dark blue text
      icon: '#305BCC',           // Dark blue icon
    },
  },

  audio: {
    waveform: {
      default: 'rgba(0, 0, 0, 0.7)', // Dark waveform (70% opacity rendered)
      muted: 'rgba(0, 0, 0, 0.4)',   // Muted waveform (40% opacity rendered)
      rms: 'rgba(0, 0, 0, 0.5)',     // RMS waveform (50% opacity rendered)
      centerLine: '#4a4a4a',         // Medium gray center line
    },

    envelope: {
      line: '#ff6600',           // Orange envelope line
      lineHover: '#ffaa00',      // Yellow-orange on hover
      point: '#ff6600',          // Orange control point
      pointCenter: '#fff',       // White center dot
      fill: '#ffffff80',         // White fill 50% (pre-computed from rgba)
      fillIdle: '#ffffff99',     // White fill 60% when idle (pre-computed from rgba)
      hitZone: '#ff660026',      // Orange hit zone 15% (pre-computed from rgba)
    },

    clip: {
      // Cyan clip colors
      cyan: {
        header: '#6CCBD8',
        headerHover: '#48BECF',
        body: '#90D8E1',
        headerSelected: '#D8F2F3',
        headerSelectedHover: '#ECF9FA',
        bodySelected: '#B4E5EA',
      },
      // Blue clip colors
      blue: {
        header: '#84B5FF',
        headerHover: '#66A3FF',
        body: '#A2C7FF',
        headerSelected: '#DEEBFF',
        headerSelectedHover: '#F2F7FF',
        bodySelected: '#C0D9FF',
      },
      // Violet clip colors
      violet: {
        header: '#ADABFC',
        headerHover: '#9996FC',
        body: '#C1BFFE',
        headerSelected: '#E9E8FF',
        headerSelectedHover: '#F7F6FF',
        bodySelected: '#D5D3FE',
      },
      // Magenta clip colors
      magenta: {
        header: '#E1A3D6',
        headerHover: '#DA8CCC',
        body: '#E8BAE0',
        headerSelected: '#F6E8F4',
        headerSelectedHover: '#FBF4FC',
        bodySelected: '#EFD1EA',
      },
      // Red clip colors
      red: {
        header: '#F39999',
        headerHover: '#F08080',
        body: '#F6B2B2',
        headerSelected: '#FCE4E4',
        headerSelectedHover: '#FEF2F2',
        bodySelected: '#F9CBCB',
      },
      // Orange clip colors
      orange: {
        header: '#FFB183',
        headerHover: '#FF9E65',
        body: '#FFC4A1',
        headerSelected: '#FFEADD',
        headerSelectedHover: '#FFF5EE',
        bodySelected: '#FFD7BF',
      },
      // Yellow clip colors
      yellow: {
        header: '#ECCC73',
        headerHover: '#E8C050',
        body: '#F0D896',
        headerSelected: '#F8F0DC',
        headerSelectedHover: '#FCF8EE',
        bodySelected: '#F4E4B9',
      },
      // Green clip colors
      green: {
        header: '#8FCB7A',
        headerHover: '#74BE59',
        body: '#AAD89B',
        headerSelected: '#E0F2DD',
        headerSelectedHover: '#F0F9EE',
        bodySelected: '#C5E5BC',
      },
      // Teal clip colors
      teal: {
        header: '#5CC3A9',
        headerHover: '#34B494',
        body: '#84D2BE',
        headerSelected: '#D4F0E8',
        headerSelectedHover: '#EAF8F4',
        bodySelected: '#ACE1D3',
      },
      border: {
        normal: '#000000',       // Black border (normal mode)
        envelope: '#000000',     // Black border (envelope mode)
        selected: '#ffffff',     // White border when selected
      },
    },

    timeline: {
      background: '#262932',     // Dark ruler background
      text: '#949CAC',           // Medium gray text
      tickMajor: '#828387',      // Medium gray major ticks
      tickMinor: '#828387',      // Medium gray minor ticks (same as major for now)
      playhead: '#ef4444',       // Red playhead cursor
      playheadShadow: '#dc2626', // Darker red shadow
    },

    selection: {
      time: '#ffffff33',         // White 20% time selection (pre-computed from rgba)
      timeBorder: '#ffffff',     // White border
      spectral: '#84B5FF40',     // Blue 25% spectral selection (pre-computed from rgba)
      spectralBorder: '#84B5FF', // Blue border
    },

    spectrogram: {
      low: '#1e3a8a',            // Dark blue for low frequencies
      mid: '#22c55e',            // Green for mid frequencies
      high: '#eab308',           // Yellow for high frequencies
      peak: '#ef4444',           // Red for peaks
    },

    transport: {
      play: '#74BE59',           // Green play button
      record: '#F08080',         // Red record button
      stop: '#949CAC',           // Gray stop button
    },
  },

  overlay: {
    modal: '#000000cc',          // Black 80% modal backdrop (pre-computed from rgba)
    light: '#00000066',          // Black 40% light overlay (pre-computed from rgba)
    tooltip: '#18181b',          // Near-black tooltip background
    tooltipText: '#fafafa',      // Off-white tooltip text
  },

  utility: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
};
