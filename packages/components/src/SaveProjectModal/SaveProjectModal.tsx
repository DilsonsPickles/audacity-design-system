import React from 'react';
import { DialogHeader } from '../DialogHeader';
import './SaveProjectModal.css';

export interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToCloud: () => void;
  onSaveToComputer: () => void;
  dontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
  cloudImageUrl?: string;
  computerImageUrl?: string;
  className?: string;
}

export function SaveProjectModal({
  isOpen,
  onClose,
  onSaveToCloud,
  onSaveToComputer,
  dontShowAgain = false,
  onDontShowAgainChange,
  cloudImageUrl = '/saveToCloud.png',
  computerImageUrl = '/saveToComputer.png',
  className = '',
}: SaveProjectModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="save-project-modal-backdrop" onClick={onClose} />
      <div className={`save-project-modal ${className}`}>
        <DialogHeader title="Save project" onClose={onClose} />

        {/* Body */}
        <div className="save-project-modal__body">
          <h2 className="save-project-modal__heading">How would you like to save?</h2>

          <div className="save-project-modal__options">
            {/* Cloud Save Option */}
            <div className="save-project-modal__option">
              <div className="save-project-modal__option-image">
                <img src={cloudImageUrl} alt="Cloud storage" />
              </div>
              <div className="save-project-modal__option-content">
                <div className="save-project-modal__option-text">
                  <div className="save-project-modal__option-title">Save to the Cloud (free)</div>
                  <div className="save-project-modal__option-description">
                    Your project is backed up privately on audio.com. You can access your work from any device and collaborate on your project with others. Cloud saving is free for a limited number of projects.
                  </div>
                </div>
                <button
                  className="save-project-modal__button"
                  onClick={onSaveToCloud}
                >
                  Save to cloud
                </button>
              </div>
            </div>

            {/* Computer Save Option */}
            <div className="save-project-modal__option">
              <div className="save-project-modal__option-image">
                <img src={computerImageUrl} alt="Local storage" />
              </div>
              <div className="save-project-modal__option-content">
                <div className="save-project-modal__option-text">
                  <div className="save-project-modal__option-title">On your computer</div>
                  <div className="save-project-modal__option-description">
                    Files are saved on your device.
                    <br />
                    <br />
                    Note: To export MP3 and WAV files, use File → Export Audio instead.
                  </div>
                </div>
                <button
                  className="save-project-modal__button"
                  onClick={onSaveToComputer}
                >
                  Save to computer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="save-project-modal__footer">
          <label className="save-project-modal__checkbox-label">
            <input
              type="checkbox"
              className="save-project-modal__checkbox"
              checked={dontShowAgain}
              onChange={(e) => onDontShowAgainChange?.(e.target.checked)}
            />
            <span className="save-project-modal__checkbox-text">Don't show this again</span>
          </label>
        </div>
      </div>
    </>
  );
}
