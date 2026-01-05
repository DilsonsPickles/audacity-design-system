/**
 * AccessibilityProfileContext
 *
 * Provides accessibility profile configuration throughout the application
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AccessibilityProfile, ACCESSIBILITY_PROFILES, getProfileById } from '@audacity-ui/core';

interface AccessibilityProfileContextValue {
  /**
   * Currently active profile
   */
  activeProfile: AccessibilityProfile;

  /**
   * All available profiles
   */
  profiles: AccessibilityProfile[];

  /**
   * Change the active profile
   */
  setProfile: (profileId: string) => void;
}

const AccessibilityProfileContext = createContext<AccessibilityProfileContextValue | undefined>(
  undefined
);

interface AccessibilityProfileProviderProps {
  /**
   * Initial profile ID (defaults to 'au4')
   */
  initialProfileId?: string;

  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Provider for accessibility profile configuration
 */
export function AccessibilityProfileProvider({
  initialProfileId = 'au4',
  children,
}: AccessibilityProfileProviderProps) {
  const [activeProfileId, setActiveProfileId] = useState(() => {
    // Try to read from localStorage first
    try {
      const stored = localStorage.getItem('audacity-accessibility-profile');
      if (stored) {
        return stored;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return initialProfileId;
  });

  const activeProfile = getProfileById(activeProfileId);

  const setProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId);

    // Optionally persist to localStorage
    try {
      localStorage.setItem('audacity-accessibility-profile', profileId);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  return (
    <AccessibilityProfileContext.Provider
      value={{
        activeProfile,
        profiles: ACCESSIBILITY_PROFILES,
        setProfile,
      }}
    >
      {children}
    </AccessibilityProfileContext.Provider>
  );
}

/**
 * Hook to access accessibility profile context
 */
export function useAccessibilityProfile(): AccessibilityProfileContextValue {
  const context = useContext(AccessibilityProfileContext);

  if (!context) {
    throw new Error(
      'useAccessibilityProfile must be used within AccessibilityProfileProvider'
    );
  }

  return context;
}
