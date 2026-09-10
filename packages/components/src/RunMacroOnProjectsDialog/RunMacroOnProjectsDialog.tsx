import React from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { ProgressBar } from '../ProgressBar';
import { Spinner } from '../Spinner';
import { Icon } from '../Icon';
import { useTheme } from '../ThemeProvider';
import './RunMacroOnProjectsDialog.css';

export interface MacroTargetProject {
  id: string;
  title: string;
  /** Epoch ms of last modification, shown as context under the title */
  dateModified: number;
}

export interface RunMacroOnProjectsDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  /** Name of the macro being applied (shown in the intro line) */
  macroName: string;
  /** The user's saved projects — the batch targets */
  projects: MacroTargetProject[];
  /** Called once every selected project has finished processing */
  onRunComplete?: (projectIds: string[]) => void;
  os?: 'macos' | 'windows';
  /** Simulated per-project processing time (ms) — exposed for tests */
  perProjectMs?: number;
}

type Phase = 'pick' | 'running' | 'done';

/**
 * RunMacroOnProjectsDialog — batch-apply a macro to saved projects
 * (the sandbox's stand-in for AU3's "apply macro to files": projects
 * play the role of .aup files). Pick projects → simulated per-project
 * processing with live row status → completion summary. Processing is
 * a prototype simulation; the caller owns any real work and the
 * completion toast via onRunComplete.
 */
export function RunMacroOnProjectsDialog({
  isOpen,
  onClose,
  macroName,
  projects,
  onRunComplete,
  os = 'macos',
  perProjectMs = 600,
}: RunMacroOnProjectsDialogProps) {
  const { theme } = useTheme();
  const [phase, setPhase] = React.useState<Phase>('pick');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = React.useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const timerRef = React.useRef<number | null>(null);

  // Reset whenever the dialog (re)opens
  React.useEffect(() => {
    if (isOpen) {
      setPhase('pick');
      setSelected(new Set(projects.map((p) => p.id)));
      setDoneIds(new Set());
      setProcessingId(null);
    }
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = projects.length > 0 && selected.size === projects.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(projects.map((p) => p.id)));
  };

  const runQueueRef = React.useRef<string[]>([]);
  const start = () => {
    const queue = projects.filter((p) => selected.has(p.id)).map((p) => p.id);
    if (queue.length === 0) return;
    runQueueRef.current = queue;
    setPhase('running');
    setDoneIds(new Set());
    processNext(queue, 0);
  };

  const processNext = (queue: string[], index: number) => {
    if (index >= queue.length) {
      setProcessingId(null);
      setPhase('done');
      onRunComplete?.(queue);
      return;
    }
    setProcessingId(queue[index]);
    timerRef.current = window.setTimeout(() => {
      setDoneIds((prev) => new Set(prev).add(queue[index]));
      processNext(queue, index + 1);
    }, perProjectMs);
  };

  const cancelRun = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    onClose?.();
  };

  const total = runQueueRef.current.length;
  const doneCount = doneIds.size;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const style = {
    '--rmp-text': theme.foreground.text.primary,
    '--rmp-muted': theme.foreground.text.secondary,
    '--rmp-row-hover': theme.background.surface.hover,
    '--rmp-border': theme.border.default,
    '--rmp-success': theme.accent.primary,
  } as React.CSSProperties;

  const rowStatus = (id: string) => {
    if (doneIds.has(id)) return 'done';
    if (processingId === id) return 'processing';
    return phase === 'pick' ? 'pick' : 'pending';
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Apply macro to projects"
      onClose={phase === 'running' ? undefined : onClose}
      closeOnClickOutside={false}
      os={os}
      width={520}
      minHeight={380}
      customLayout
      className="run-macro-projects"
    >
      <div className="run-macro-projects__body" style={style}>
        <p className="run-macro-projects__intro">
          {phase === 'done'
            ? `"${macroName}" was applied to ${doneCount} project${doneCount === 1 ? '' : 's'}.`
            : `Apply "${macroName}" to your saved projects. Each project is processed in turn — the originals are updated in place.`}
        </p>

        {projects.length === 0 ? (
          <div className="run-macro-projects__empty">
            No saved projects yet. Save a project first, then run the macro on it from here.
          </div>
        ) : (
          <>
            {phase === 'pick' && (
              <label className="run-macro-projects__select-all">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span>Select all</span>
              </label>
            )}
            <div className="run-macro-projects__list" role="list">
              {projects.map((p) => {
                const status = rowStatus(p.id);
                // During/after a run, only the selected projects are shown
                const inRun = phase === 'pick' || selected.has(p.id);
                if (!inRun) return null;
                return (
                  <div key={p.id} className={`run-macro-projects__row run-macro-projects__row--${status}`} role="listitem">
                    {phase === 'pick' ? (
                      <Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    ) : (
                      <span className="run-macro-projects__status" aria-label={status}>
                        {status === 'done' && <Icon name="check" size={16} />}
                        {status === 'processing' && <Spinner size={16} />}
                      </span>
                    )}
                    <div className="run-macro-projects__row-text">
                      <span className="run-macro-projects__row-title">{p.title}</span>
                      <span className="run-macro-projects__row-meta">Modified {formatDate(p.dateModified)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {phase !== 'pick' && (
              <div className="run-macro-projects__progress">
                <ProgressBar value={progress} width="100%" />
                <span className="run-macro-projects__progress-label">
                  {phase === 'done' ? 'Done' : `Processing ${Math.min(doneCount + 1, total)} of ${total}…`}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="run-macro-projects__footer">
        {phase === 'pick' && (
          <>
            <Button variant="secondary" size="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="default"
              disabled={selected.size === 0}
              onClick={start}
            >
              {`Apply to ${selected.size} project${selected.size === 1 ? '' : 's'}`}
            </Button>
          </>
        )}
        {phase === 'running' && (
          <Button variant="secondary" size="default" onClick={cancelRun}>
            Cancel
          </Button>
        )}
        {phase === 'done' && (
          <Button variant="primary" size="default" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </Dialog>
  );
}

export default RunMacroOnProjectsDialog;
