import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { ExportStepDialog } from '../ExportStepDialog';
import { resolveExportTemplate } from '../exportTemplate';
import { exportFilePreview } from '../../ExportModal/ExportModal';

afterEach(cleanup);

const NOW = new Date(2026, 10, 24, 15, 3, 0);

describe('resolveExportTemplate', () => {
  it('fills the tags', () => {
    expect(resolveExportTemplate('{ProjectName}_{Date}_{Time}_N-{N}', { projectName: 'Podcast', now: NOW, run: 1 }))
      .toEqual({ ok: true, name: 'Podcast_2026-11-24_15-03-00_N-1' });
  });

  it('a project name becomes a file name: characters a path cannot hold turn to hyphens', () => {
    expect(resolveExportTemplate('{ProjectName}', { projectName: 'New Project 11/19/2026, 15:54', now: NOW, run: 1 }))
      .toEqual({ ok: true, name: 'New Project 11-19-2026, 15-54' });
  });

  it('names an unknown tag, and refuses an empty name', () => {
    expect(resolveExportTemplate('{Projct}', { projectName: 'P', now: NOW, run: 1 })).toEqual({ ok: false, error: 'Unknown tag {Projct}' });
    expect(resolveExportTemplate('  ', { projectName: 'P', now: NOW, run: 1 })).toEqual({ ok: false, error: 'Enter a file name' });
  });
});

describe('exportFilePreview (the export modal\'s multi-file name)', () => {
  it('is number, prefix, item and extension, each only when there is one', () => {
    expect(exportFilePreview({ prefix: 'HelloThere', item: 'TrackName', numbered: false, extension: 'mp3' })).toBe('HelloThere.TrackName.mp3');
    expect(exportFilePreview({ prefix: '', item: 'TrackName', numbered: true, extension: 'wav' })).toBe('01-TrackName.wav');
  });
});

describe('ExportStepDialog', () => {
  const renderDialog = (initialParameters?: string) => {
    const onSubmit = vi.fn();
    render(
      <ThemeProvider>
        <ExportStepDialog isOpen initialParameters={initialParameters} projectName="Podcast" now={NOW} onSubmit={onSubmit} onClose={() => {}} />
      </ThemeProvider>,
    );
    const preview = () => document.querySelector('[data-export-file-preview]') as HTMLElement;
    const message = () => document.querySelector('[data-export-name-message]') as HTMLElement;
    const nameInput = () => document.querySelector('[data-export-step-field="FileName"] input') as HTMLInputElement;
    const ok = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'OK') as HTMLButtonElement;
    return { onSubmit, preview, message, nameInput, ok };
  };

  it('the Preview row is the folder and the resolved name, with the file type\'s extension', () => {
    const d = renderDialog('FileName="{ProjectName}_{Date}" Folder="~/Exports/" Format="FLAC"');
    expect(d.nameInput().value).toBe('{ProjectName}_{Date}');
    expect(d.preview().textContent).toBe('~/Exports/Podcast_2026-11-24.flac');
  });

  it('no row comes or goes: the message slot and the type\'s setting row are always drawn', () => {
    for (const format of ['WAV', 'MP3', 'FLAC', 'OggVorbis']) {
      const d = renderDialog(`FileName="{ProjectName}" Format="${format}"`);
      expect(d.message()).not.toBeNull();
      expect(document.querySelector('[data-export-step-field="Encoding"]')).not.toBeNull();
      cleanup();
    }
  });

  it('checks the name on OK, not as you type: an empty name errors on OK, and editing clears it', () => {
    const d = renderDialog();
    fireEvent.change(d.nameInput(), { target: { value: '' } });
    expect(d.message().textContent).toBe('');
    expect(d.ok().disabled).toBe(false);
    fireEvent.click(d.ok());
    expect(d.onSubmit).not.toHaveBeenCalled();
    expect(d.message().textContent).toBe('Enter a file name');
    expect(d.message().hasAttribute('data-error')).toBe(true);
    fireEvent.change(d.nameInput(), { target: { value: '{Projct}' } });
    expect(d.message().hasAttribute('data-error')).toBe(false);
    fireEvent.click(d.ok());
    expect(d.message().textContent).toBe('Unknown tag {Projct}');
    expect(d.preview().textContent).toBe('—');
  });

  it('a fixed name says, quietly, that a batch would overwrite; {ProjectName} or {N} answer it', () => {
    const d = renderDialog('FileName="asd"');
    const note = () => d.message().textContent || null;
    expect(note()).toBe('Several files? Add {ProjectName} so each gets its own name');
    expect(d.preview().textContent).toBe('~/Documents/Audacity/asd.wav');
    expect(d.message().hasAttribute('data-error')).toBe(false);
    expect(d.ok().disabled).toBe(false);
    fireEvent.change(d.nameInput(), { target: { value: 'asd_{N}' } });
    expect(note()).toBeNull();
    fireEvent.change(d.nameInput(), { target: { value: '{ProjectName}' } });
    expect(note()).toBe("On files, {ProjectName} is each file's own name");
  });

  it('a name with {ProjectName} says what it becomes on files', () => {
    const d = renderDialog('FileName="{ProjectName}_001"');
    expect(d.preview().textContent).toBe('~/Documents/Audacity/Podcast_001.wav');
    expect(d.message().textContent).toBe("On files, {ProjectName} is each file's own name");
    fireEvent.change(d.nameInput(), { target: { value: 'Take_{N}' } });
    expect(d.message().textContent).toBe('');
  });

  it('OK serializes every setting in key order', () => {
    const d = renderDialog();
    fireEvent.change(d.nameInput(), { target: { value: 'Show_{N}' } });
    fireEvent.click(d.ok());
    expect(d.onSubmit).toHaveBeenCalledWith(
      'FileName="Show_{N}", Folder="~/Documents/Audacity", Format="WAV", Encoding="Signed16-bitPCM", Channels="Auto", SampleRate="Projectrate"',
    );
  });
});
