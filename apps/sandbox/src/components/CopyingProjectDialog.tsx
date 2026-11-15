/**
 * CopyingProjectDialog — the BLOCK while "Save project as…" copies the
 * project (2026-11-16, "a blocking dialog to add into the prototype to
 * simulate slow media when 'Saving as'", with Audacity 3's "Copying
 * Project" window): a modal with no buttons, no × and no Escape — the copy
 * cannot be abandoned half-way — reading "This may take several seconds",
 * an INDETERMINATE bar (the length of a copy to slow media is unknown) and
 * the ELAPSED TIME, h:mm:ss as Audacity 3 writes it. It closes itself when
 * the copy is done.
 */
import { Dialog, ProgressBar, useTheme } from '@audacity-ui/components';

export interface CopyingProjectDialogProps {
  isOpen: boolean;
  /** When the copy began (epoch ms) */
  startedAt: number;
  /** The clock, ticking from the host */
  now: number;
  os?: 'macos' | 'windows';
}

/** Elapsed time as Audacity 3 shows it: 0:00:22 */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CopyingProjectDialog({ isOpen, startedAt, now, os = 'macos' }: CopyingProjectDialogProps) {
  const { theme } = useTheme();
  return (
    <Dialog
      isOpen={isOpen}
      title="Copying project"
      closeOnEscape={false}
      closeOnClickOutside={false}
      hideCloseButton
      os={os}
      className="copying-project-dialog"
      width={400}
      minHeight={0}
    >
      <div
        data-copying-project
        role="status"
        aria-live="polite"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0 12px', fontSize: '12px', color: theme.foreground.text.primary }}
      >
        <span>This may take several seconds</span>
        <ProgressBar indeterminate width="100%" ariaLabel="Copying project" />
        <span data-copying-project-elapsed style={{ alignSelf: 'center', fontVariantNumeric: 'tabular-nums', color: theme.foreground.text.secondary }}>
          Elapsed time: <span style={{ color: theme.foreground.text.primary }}>{formatElapsed(now - startedAt)}</span>
        </span>
      </div>
    </Dialog>
  );
}
