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
    const nameInput = () => document.querySelector('[data-export-step-field="FileName"] input') as HTMLInputElement;
    const ok = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'OK') as HTMLButtonElement;
    return { onSubmit, preview, nameInput, ok };
  };

  it('shows what the file name resolves to UNDER the field, with the file type\'s extension', () => {
    const d = renderDialog('FileName="{ProjectName}_{Date}" Format="FLAC"');
    expect(d.nameInput().value).toBe('{ProjectName}_{Date}');
    expect(d.preview().textContent).toBe('Podcast_2026-11-24.flac');
  });

  it('an unknown tag shows the error there and dims OK', () => {
    const d = renderDialog();
    fireEvent.change(d.nameInput(), { target: { value: '{Projct}' } });
    expect(d.preview().textContent).toBe('Unknown tag {Projct}');
    expect(d.preview().hasAttribute('data-error')).toBe(true);
    expect(d.ok().disabled).toBe(true);
  });

  it('a fixed name says, quietly, that a batch would overwrite; {ProjectName} or {N} answer it', () => {
    const d = renderDialog('FileName="asd"');
    const note = () => document.querySelector('[data-export-batch-note]');
    expect(d.preview().textContent).toBe('asd.wav · Running on several files? Add {ProjectName} so each gets its own name');
    expect(d.preview().hasAttribute('data-error')).toBe(false);
    expect(d.ok().disabled).toBe(false);
    fireEvent.change(d.nameInput(), { target: { value: 'asd_{N}' } });
    expect(note()).toBeNull();
    fireEvent.change(d.nameInput(), { target: { value: '{ProjectName}' } });
    expect(note()).toBeNull();
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
