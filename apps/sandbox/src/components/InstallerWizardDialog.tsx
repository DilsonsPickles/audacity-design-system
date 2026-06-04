// MuseHub plugin installer wizard. Modeled on Apple's PackageKit installer
// (Introduction → Destination Select → Installation Type → Installation →
// Summary) when the OS preference is macOS, and on a classic Windows
// program installer (Welcome → License → Destination → Installing →
// Complete) when set to Windows. The actual install simulation is the
// MuseHubContext's simulateInstall — the wizard just sequences the steps
// and triggers it at the Installation step.

import React from 'react';
import { usePreferences } from '@dilsonspickles/components';
import { useMuseHub } from '../contexts/MuseHubContext';
import './InstallerWizardDialog.css';

type Step = 'intro' | 'destination' | 'type' | 'install' | 'summary';
const ORDER: Step[] = ['intro', 'destination', 'type', 'install', 'summary'];

const MAC_LABELS: Record<Step, string> = {
  intro: 'Introduction',
  destination: 'Destination Select',
  type: 'Installation Type',
  install: 'Installation',
  summary: 'Summary',
};

const WIN_LABELS: Record<Step, string> = {
  intro: 'Welcome',
  destination: 'License Agreement',
  type: 'Destination Folder',
  install: 'Installing',
  summary: 'Complete',
};

export const InstallerWizardDialog: React.FC = () => {
  const { preferences } = usePreferences();
  const os = preferences.operatingSystem;
  const {
    installerWizardEffect: effect,
    closeInstallerWizard,
    beginWizardInstall,
    activeInstall,
  } = useMuseHub();

  const [step, setStep] = React.useState<Step>('intro');
  const [licenseAccepted, setLicenseAccepted] = React.useState(false);

  // Reset wizard state whenever the effect changes (new install or close).
  React.useEffect(() => {
    if (!effect) return;
    setStep('intro');
    setLicenseAccepted(false);
  }, [effect?.id]);

  // While on the install step, advance to summary when the install
  // simulation marks itself done. activeInstall stays around in 'done'
  // until the user dismisses the wizard.
  React.useEffect(() => {
    if (step !== 'install') return;
    if (activeInstall?.phase === 'done') setStep('summary');
  }, [step, activeInstall]);

  if (!effect) return null;

  const installPath =
    os === 'macos'
      ? `/Library/Audio/Plug-Ins/Components/${effect.name}.component`
      : `C:\\Program Files\\MuseHub\\Plugins\\${effect.name}`;

  const labels = os === 'macos' ? MAC_LABELS : WIN_LABELS;
  const stepIndex = ORDER.indexOf(step);

  const goBack = () => {
    if (stepIndex === 0) return;
    setStep(ORDER[stepIndex - 1]);
  };

  const goForward = () => {
    if (step === 'type') {
      // Kick off the actual install simulation, then advance to the
      // installing screen. The simulation drives the progress bar.
      setStep('install');
      beginWizardInstall(effect);
      return;
    }
    if (stepIndex < ORDER.length - 1) {
      setStep(ORDER[stepIndex + 1]);
    }
  };

  const handleClose = () => {
    // closeInstallerWizard tears down any active simulation as part of its
    // cleanup, so we don't need to cancel separately here.
    closeInstallerWizard();
  };

  const progress = activeInstall?.progress ?? (step === 'summary' ? 1 : 0);

  // ---- Step content -------------------------------------------------------
  const renderBody = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="installer-body__center">
            <h2 className="installer-body__title">
              Welcome to the {effect.name} Installer
            </h2>
            <p className="installer-body__lead">
              You will be guided through the steps necessary to install
              this software.
            </p>
            <dl className="installer-body__meta">
              <dt>Product</dt>
              <dd>{effect.name}</dd>
              <dt>Publisher</dt>
              <dd>{effect.vendor}</dd>
              <dt>Version</dt>
              <dd>1.0.0</dd>
            </dl>
          </div>
        );
      case 'destination':
        // On macOS, Destination Select is just a "Install for all users of
        // this computer" picker. On Windows, this slot is the License
        // Agreement to match the typical setup flow.
        if (os === 'macos') {
          return (
            <div className="installer-body__center">
              <h2 className="installer-body__title">
                Select a Destination
              </h2>
              <p className="installer-body__lead">
                Install {effect.name} on the following disk.
              </p>
              <div className="installer-disk">
                <div className="installer-disk__icon" aria-hidden="true">💿</div>
                <div className="installer-disk__name">Macintosh HD</div>
                <div className="installer-disk__meta">241.2 GB available</div>
              </div>
            </div>
          );
        }
        return (
          <div className="installer-body__stack">
            <h2 className="installer-body__title">License Agreement</h2>
            <div className="installer-license" tabIndex={0}>
              <p><strong>SOFTWARE LICENSE AGREEMENT</strong></p>
              <p>
                This is a software license agreement between you and{' '}
                {effect.vendor}. By installing {effect.name} you agree to be
                bound by the terms of this agreement.
              </p>
              <p>
                1. <strong>Grant of License.</strong>{' '}
                {effect.vendor} grants you a non-exclusive, non-transferable
                license to use {effect.name} on any compatible computer you
                own or control.
              </p>
              <p>
                2. <strong>Restrictions.</strong> You may not reverse
                engineer, decompile, or disassemble the software, except to
                the extent that such activity is expressly permitted by
                applicable law.
              </p>
              <p>
                3. <strong>Limitation of Liability.</strong> In no event
                shall {effect.vendor} be liable for any indirect, incidental,
                special, or consequential damages arising out of the use of
                or inability to use this software.
              </p>
            </div>
            <label className="installer-checkbox">
              <input
                type="checkbox"
                checked={licenseAccepted}
                onChange={(e) => setLicenseAccepted(e.target.checked)}
              />
              <span>I accept the terms in the License Agreement</span>
            </label>
          </div>
        );
      case 'type':
        return (
          <div className="installer-body__stack">
            <h2 className="installer-body__title">
              {os === 'macos' ? 'Standard Install' : 'Destination Folder'}
            </h2>
            <p className="installer-body__lead">
              {os === 'macos'
                ? `This will take up 8.4 MB of space on your computer.`
                : `Setup will install ${effect.name} in the following folder.`}
            </p>
            <div className="installer-path">
              <span className="installer-path__label">Install location</span>
              <code className="installer-path__value">{installPath}</code>
            </div>
          </div>
        );
      case 'install':
        return (
          <div className="installer-body__stack">
            <h2 className="installer-body__title">
              Installing {effect.name}…
            </h2>
            <p className="installer-body__lead">
              {activeInstall?.paused
                ? 'Installation paused.'
                : 'Please wait while Setup installs the files.'}
            </p>
            <div className="installer-progress">
              <div
                className="installer-progress__fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="installer-progress__label">
              {Math.round(progress * 100)}%
            </div>
            <ul className="installer-log" aria-hidden="true">
              <li>Validating package signature…</li>
              {progress > 0.15 && <li>Preparing destination volume…</li>}
              {progress > 0.35 && <li>Writing {effect.name}.component…</li>}
              {progress > 0.55 && <li>Linking shared libraries…</li>}
              {progress > 0.8 && <li>Registering plug-in with host…</li>}
              {progress >= 1 && <li>Finishing up…</li>}
            </ul>
          </div>
        );
      case 'summary':
        return (
          <div className="installer-body__center">
            <div
              className="installer-checkmark"
              aria-hidden="true"
              role="presentation"
            >
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#22C55E" strokeWidth="3" />
                <path
                  d="M18 33 L28 43 L46 23"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="installer-body__title">
              The installation was successful.
            </h2>
            <p className="installer-body__lead">The software was installed.</p>
          </div>
        );
    }
  };

  // ---- Footer buttons -----------------------------------------------------
  const renderFooter = () => {
    const backDisabled =
      stepIndex === 0 || step === 'install' || step === 'summary';
    const forwardDisabled =
      (step === 'destination' && os === 'windows' && !licenseAccepted) ||
      step === 'install';

    if (step === 'summary') {
      return (
        <>
          <button
            className="installer-btn installer-btn--secondary"
            type="button"
            disabled
          >
            Go Back
          </button>
          <button
            className="installer-btn installer-btn--primary"
            type="button"
            onClick={handleClose}
          >
            Close
          </button>
        </>
      );
    }

    return (
      <>
        <button
          className="installer-btn installer-btn--ghost"
          type="button"
          onClick={handleClose}
        >
          Cancel
        </button>
        <span className="installer-footer__spacer" />
        <button
          className="installer-btn installer-btn--secondary"
          type="button"
          onClick={goBack}
          disabled={backDisabled}
        >
          Go Back
        </button>
        <button
          className="installer-btn installer-btn--primary"
          type="button"
          onClick={goForward}
          disabled={forwardDisabled}
        >
          {step === 'type' ? 'Install' : 'Continue'}
        </button>
      </>
    );
  };

  // Step-specific top header text (mirrors the screenshot reference).
  const headerCopy =
    step === 'summary' ? 'The installation was completed successfully.' : '';

  return (
    <div
      className={`installer-backdrop installer-backdrop--${os}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="installer-title"
    >
      <div className={`installer-window installer-window--${os}`}>
        {/* Title bar — purely cosmetic, mimics the host OS chrome. */}
        <div className="installer-titlebar">
          {os === 'macos' ? (
            <>
              <div className="installer-titlebar__lights" aria-hidden="true">
                <span className="installer-titlebar__light installer-titlebar__light--close" />
                <span className="installer-titlebar__light installer-titlebar__light--min" />
                <span className="installer-titlebar__light installer-titlebar__light--max" />
              </div>
              <div className="installer-titlebar__title" id="installer-title">
                <span className="installer-titlebar__icon" aria-hidden="true">📦</span>
                Install {effect.name}
              </div>
              <div className="installer-titlebar__lights" aria-hidden="true" />
            </>
          ) : (
            <>
              <div className="installer-titlebar__title" id="installer-title">
                {effect.name} Setup
              </div>
              <button
                className="installer-titlebar__close"
                type="button"
                onClick={handleClose}
                aria-label="Cancel install"
              >
                ✕
              </button>
            </>
          )}
        </div>

        <div className="installer-content">
          {/* Step list — macOS uses a left sidebar with bulleted steps;
              Windows uses an implicit top-to-bottom flow with no list. */}
          {os === 'macos' && (
            <aside className="installer-steps" aria-label="Install steps">
              <ul>
                {ORDER.map((s, i) => (
                  <li
                    key={s}
                    className={s === step ? 'installer-steps__item--active' : ''}
                    aria-current={s === step ? 'step' : undefined}
                  >
                    <span
                      className={`installer-steps__dot ${
                        s === step ? 'installer-steps__dot--active' : ''
                      } ${i < stepIndex ? 'installer-steps__dot--done' : ''}`}
                      aria-hidden="true"
                    />
                    <span className="installer-steps__label">
                      {labels[s]}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <main className="installer-pane">
            {headerCopy && (
              <div className="installer-pane__header">{headerCopy}</div>
            )}
            <div className="installer-pane__body">{renderBody()}</div>
          </main>
        </div>

        <footer className="installer-footer">{renderFooter()}</footer>
      </div>
    </div>
  );
};

export default InstallerWizardDialog;
