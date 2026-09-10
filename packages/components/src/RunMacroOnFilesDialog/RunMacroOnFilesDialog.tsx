import React from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { ProgressBar } from '../ProgressBar';
import { useTheme } from '../ThemeProvider';
import './RunMacroOnFilesDialog.css';

export interface MacroTargetFile {
  id: string;
  /** Full path where available (Electron), file name otherwise (web) */
  path: string;
}

export interface RunMacroOnFilesDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  /** Name of the macro being applied */
  macroName: string;
  /** Files chosen in the OS file browser — selection happens THERE, not
   *  in this window; this is purely a progress monitor (AU3 model). */
  files: MacroTargetFile[];
  /** The macro's step names, cycled per file in the nested step window */
  stepNames: string[];
  /** Called once when every file has been processed. The caller owns the
   *  single batch-level completion toast — never one toast per file. */
  onRunComplete?: (fileIds: string[]) => void;
  os?: 'macos' | 'windows';
  /** Simulated per-step time (ms) — exposed for tests */
  perStepMs?: number;
}

type Phase = 'running' | 'done';

/**
 * RunMacroOnFilesDialog — AU3-style batch progress window. The OS file
 * browser owns selection; this window shows "Applying…" over a plain
 * file list with an arrow marking the current file, while a nested
 * step mini-window pops over it cycling the macro's steps for each
 * file (a macro is steps × files, and the layered windows say so).
 * Processing is a prototype simulation.
 */
export function RunMacroOnFilesDialog({
  isOpen,
  onClose,
  macroName,
  files,
  stepNames,
  onRunComplete,
  os = 'macos',
  perStepMs = 250,
}: RunMacroOnFilesDialogProps) {
  const { theme } = useTheme();
  const [phase, setPhase] = React.useState<Phase>('running');
  const [fileIndex, setFileIndex] = React.useState(0);
  const [stepIndex, setStepIndex] = React.useState(0);
  const timerRef = React.useRef<number | null>(null);

  const steps = stepNames.length > 0 ? stepNames : ['Applying'];

  // Drive the simulation: steps cycle within each file, files advance
  // down the list, done when the last file's last step finishes.
  React.useEffect(() => {
    if (!isOpen) return undefined;
    setPhase('running');
    setFileIndex(0);
    setStepIndex(0);

    let file = 0;
    let step = 0;
    const tick = () => {
      timerRef.current = window.setTimeout(() => {
        step += 1;
        if (step >= steps.length) {
          step = 0;
          file += 1;
          if (file >= files.length) {
            setPhase('done');
            onRunComplete?.(files.map((f) => f.id));
            return;
          }
          setFileIndex(file);
        }
        setStepIndex(step);
        tick();
      }, perStepMs);
    };
    if (files.length > 0) tick();
    else setPhase('done');

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const cancelRun = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    onClose?.();
  };

  const style = {
    '--rmf-text': theme.foreground.text.primary,
    '--rmf-muted': theme.foreground.text.secondary,
    '--rmf-border': theme.border.default,
    '--rmf-list-bg': theme.background.surface.default,
    '--rmf-step-bg': theme.background.surface.elevated,
  } as React.CSSProperties;

  const stepProgress = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <Dialog
      isOpen={isOpen}
      title="Manage Macros"
      onClose={phase === 'done' ? onClose : undefined}
      closeOnClickOutside={false}
      closeOnEscape={phase === 'done'}
      os={os}
      width={560}
      minHeight={380}
      customLayout
      className="run-macro-files"
    >
      <div className="run-macro-files__body" style={style}>
        <p className="run-macro-files__label">
          {phase === 'done'
            ? `"${macroName}" was applied to ${files.length} file${files.length === 1 ? '' : 's'}.`
            : 'Applying…'}
        </p>

        <div className="run-macro-files__list" role="list" aria-label="Files">
          <div className="run-macro-files__list-header">File</div>
          {files.map((f, i) => (
            <div
              key={f.id}
              role="listitem"
              className={`run-macro-files__row${phase === 'running' && i === fileIndex ? ' run-macro-files__row--current' : ''}`}
            >
              <span className="run-macro-files__arrow" aria-hidden="true">
                {phase === 'running' && i === fileIndex ? '➔' : ''}
              </span>
              <span className="run-macro-files__path">{f.path}</span>
            </div>
          ))}
        </div>

        {/* Nested step progress — the AU3 "additional windows that pop
            up": each step gets its own little progress window over the
            file list while its file is processing. */}
        {phase === 'running' && files.length > 0 && (
          <div className="run-macro-files__step-window" role="status">
            <div className="run-macro-files__step-title">{steps[stepIndex]}</div>
            <div className="run-macro-files__step-body">
              <ProgressBar value={stepProgress} width="100%" />
              <span className="run-macro-files__step-meta">
                {`Step ${stepIndex + 1} of ${steps.length} · file ${fileIndex + 1} of ${files.length}`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="run-macro-files__footer">
        {phase === 'running' ? (
          <Button variant="secondary" size="default" onClick={cancelRun}>
            Cancel
          </Button>
        ) : (
          <Button variant="primary" size="default" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </Dialog>
  );
}

export default RunMacroOnFilesDialog;
