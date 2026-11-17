import React from 'react';
import { Dialog, DialogFooter, TextInput, useTheme } from '@audacity-ui/components';

/**
 * NAMING A WORKSPACE (2026-11-17, "allow me to create new workspaces"): the
 * one small dialog for New workspace… and Rename workspace… — a name field,
 * its text selected; Enter or the primary button commits, Escape or Cancel
 * leaves. A blank name, or one another workspace already has, cannot be
 * committed, and the reason shows under the field.
 */
export interface WorkspaceNameDialogProps {
  isOpen: boolean;
  mode: 'new' | 'rename';
  /** The name the field opens with */
  initialName: string;
  /** Names already taken (lowercased comparison), the one being renamed left out */
  takenNames: ReadonlyArray<string>;
  /** The workspace a new one copies, for the line under the field */
  basedOn?: string;
  os?: 'macos' | 'windows';
  onCommit: (name: string) => void;
  onClose: () => void;
}

export function WorkspaceNameDialog({ isOpen, mode, initialName, takenNames, basedOn, os, onCommit, onClose }: WorkspaceNameDialogProps) {
  const { theme } = useTheme();
  const [draft, setDraft] = React.useState(initialName);
  const fieldRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setDraft(initialName);
    // The TextInput takes neither a ref nor an aria-label
    const t = window.setTimeout(() => {
      const input = fieldRef.current?.querySelector('input');
      if (!input) return;
      input.setAttribute('aria-label', 'Workspace name');
      input.focus();
      input.select();
    }, 60);
    return () => window.clearTimeout(t);
  }, [isOpen, initialName]);

  const name = draft.trim();
  const taken = takenNames.some((n) => n.toLowerCase() === name.toLowerCase());
  const problem = name === '' ? null : taken ? 'Another workspace has this name' : null;
  const canCommit = name !== '' && !taken;
  const commit = () => { if (canCommit) onCommit(name); };

  return (
    <Dialog
      isOpen={isOpen}
      title={mode === 'new' ? 'New workspace' : 'Rename workspace'}
      onClose={onClose}
      closeOnClickOutside={false}
      os={os}
      width={360}
      minHeight={0}
      footer={(
        <DialogFooter
          primaryText={mode === 'new' ? 'Create' : 'Rename'}
          secondaryText="Cancel"
          primaryDisabled={!canCommit}
          onPrimaryClick={commit}
          onSecondaryClick={onClose}
        />
      )}
    >
      <div
        ref={fieldRef}
        data-workspace-name
        style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
        }}
      >
        <TextInput value={draft} onChange={setDraft} width="100%" error={problem !== null} />
        {problem
          ? <span data-workspace-name-problem style={{ color: theme.semantic.error.text }}>{problem}</span>
          : mode === 'new' && basedOn && <span style={{ color: theme.foreground.text.secondary }}>Starts as a copy of {basedOn}</span>}
      </div>
    </Dialog>
  );
}
