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
 * Provides theme tokens to all child components via React Context
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
  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
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
