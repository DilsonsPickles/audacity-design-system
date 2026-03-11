import React, { createContext, useContext } from 'react';
import { useContextMenuState, type UseContextMenuStateReturn } from '../hooks/useContextMenuState';

const ContextMenuCtx = createContext<UseContextMenuStateReturn | null>(null);

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const menus = useContextMenuState();
  return (
    <ContextMenuCtx.Provider value={menus}>
      {children}
    </ContextMenuCtx.Provider>
  );
}

export function useContextMenus(): UseContextMenuStateReturn {
  const ctx = useContext(ContextMenuCtx);
  if (!ctx) {
    throw new Error('useContextMenus must be used within a ContextMenuProvider');
  }
  return ctx;
}
