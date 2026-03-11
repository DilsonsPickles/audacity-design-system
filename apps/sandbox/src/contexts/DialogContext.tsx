import React, { createContext, useContext } from 'react';
import { useDialogState, type UseDialogStateReturn } from '../hooks/useDialogState';

const DialogContext = createContext<UseDialogStateReturn | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const dialogs = useDialogState();
  return (
    <DialogContext.Provider value={dialogs}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialogs(): UseDialogStateReturn {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialogs must be used within a DialogProvider');
  }
  return ctx;
}
