/**
 * ThemeProvider - Provides theme tokens to all components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { ThemeTokens, lightTheme } from '@audacity-ui/tokens';

interface ThemeContextValue {
  theme: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  /** Theme tokens to use */
  theme?: ThemeTokens;
  /** Children components */
  children: ReactNode;
}

/**
 * ThemeProvider component
 *
 * Provides theme tokens to all child components via React Context AND CSS custom properties
 *
 * @example
 * ```tsx
 * import { ThemeProvider, lightTheme, darkTheme } from '@audacity-ui/components';
 *
 * function App() {
 *   const [isDark, setIsDark] = useState(false);
 *
 *   return (
 *     <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({ theme = lightTheme, children }: ThemeProviderProps) {
  // Generate CSS custom properties from theme
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {};

    // Clip colors - inject all clip color states as CSS variables
    Object.entries(theme.audio.clip).forEach(([colorName, colorStates]) => {
      if (colorName === 'border') {
        // Handle border separately
        const borderStates = colorStates as { normal: string; envelope: string; selected: string };
        vars['--clip-border-normal'] = borderStates.normal;
        vars['--clip-border-envelope'] = borderStates.envelope;
        vars['--clip-border-selected'] = borderStates.selected;
      } else if (typeof colorStates === 'object' && 'header' in colorStates) {
        // Regular clip colors (cyan, blue, violet, etc.)
        vars[`--clip-${colorName}-header`] = colorStates.header;
        vars[`--clip-${colorName}-header-hover`] = colorStates.headerHover;
        vars[`--clip-${colorName}-header-selected`] = colorStates.headerSelected;
        vars[`--clip-${colorName}-header-selected-hover`] = colorStates.headerSelectedHover;
        vars[`--clip-${colorName}-body`] = colorStates.body;
        vars[`--clip-${colorName}-body-selected`] = colorStates.bodySelected;
        vars[`--clip-${colorName}-waveform`] = colorStates.waveform;
        vars[`--clip-${colorName}-waveform-selected`] = colorStates.waveformSelected;
        vars[`--clip-${colorName}-waveform-rms`] = colorStates.waveformRms;
        vars[`--clip-${colorName}-waveform-rms-selected`] = colorStates.waveformRmsSelected;
        vars[`--clip-${colorName}-time-selection-body`] = colorStates.timeSelectionBody;
        vars[`--clip-${colorName}-time-selection-header`] = colorStates.timeSelectionHeader;
        vars[`--clip-${colorName}-time-selection-waveform`] = colorStates.timeSelectionWaveform;
        vars[`--clip-${colorName}-time-selection-waveform-rms`] = colorStates.timeSelectionWaveformRms;
      }
    });

    return vars;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      <div style={cssVars as React.CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme tokens
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme } = useTheme();
 *
 *   return (
 *     <div style={{
 *       backgroundColor: theme.background.surface.default,
 *       color: theme.foreground.text.primary
 *     }}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
