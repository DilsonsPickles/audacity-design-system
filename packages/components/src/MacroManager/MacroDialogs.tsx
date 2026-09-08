/**
 * NewMacroDialog / RenameMacroDialog — small name-entry dialogs shared by
 * the legacy MacroManager modal and the dockable MacrosPanel. Moved
 * verbatim out of MacroManager.tsx.
 */

import React from 'react';
import { Dialog } from '../Dialog';
import { Footer } from '../Footer/Footer';

export interface NewMacroDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  os?: 'macos' | 'windows';
}

export interface RenameMacroDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
  os?: 'macos' | 'windows';
}

export function NewMacroDialog({ isOpen, onClose, onCreate, os = 'macos' }: NewMacroDialogProps) {
  const [macroName, setMacroName] = React.useState('');

  const handleCreate = () => {
    if (macroName.trim()) {
      onCreate(macroName.trim());
      setMacroName('');
      onClose();
    }
  };

  const handleCancel = () => {
    setMacroName('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="New macro"
      onClose={handleCancel}
      os={os}
      width={400}
      minHeight={0}
      footer={
        <Footer
          primaryText="Create"
          secondaryText="Cancel"
          primaryDisabled={!macroName.trim()}
          onPrimaryClick={handleCreate}
          onSecondaryClick={handleCancel}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="macro-name-input" style={{ fontSize: '12px', fontWeight: 400 }}>
          Macro name
        </label>
        <input
          id="macro-name-input"
          type="text"
          value={macroName}
          onChange={(e) => setMacroName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && macroName.trim()) {
              handleCreate();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          autoFocus
          style={{
            padding: '7px 8px',
            fontSize: '12px',
            border: '1px solid #D2D6DD',
            borderRadius: '3px',
            outline: 'none',
          }}
        />
      </div>
    </Dialog>
  );
}

export function RenameMacroDialog({ isOpen, onClose, onRename, currentName, os = 'macos' }: RenameMacroDialogProps) {
  const [macroName, setMacroName] = React.useState(currentName);

  // Update local state when currentName changes
  React.useEffect(() => {
    if (isOpen) {
      setMacroName(currentName);
    }
  }, [isOpen, currentName]);

  const handleRename = () => {
    if (macroName.trim() && macroName.trim() !== currentName) {
      onRename(macroName.trim());
      onClose();
    }
  };

  const handleCancel = () => {
    setMacroName(currentName);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Rename macro"
      onClose={handleCancel}
      os={os}
      width={400}
      minHeight={0}
      footer={
        <Footer
          primaryText="Rename"
          secondaryText="Cancel"
          primaryDisabled={!macroName.trim() || macroName.trim() === currentName}
          onPrimaryClick={handleRename}
          onSecondaryClick={handleCancel}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="rename-macro-input" style={{ fontSize: '12px', fontWeight: 400 }}>
          Macro name
        </label>
        <input
          id="rename-macro-input"
          type="text"
          value={macroName}
          onChange={(e) => setMacroName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && macroName.trim() && macroName.trim() !== currentName) {
              handleRename();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          autoFocus
          style={{
            padding: '7px 8px',
            fontSize: '12px',
            border: '1px solid #D2D6DD',
            borderRadius: '3px',
            outline: 'none',
          }}
        />
      </div>
    </Dialog>
  );
}
