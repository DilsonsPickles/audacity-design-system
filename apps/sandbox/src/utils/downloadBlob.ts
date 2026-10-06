/**
 * Hand a Blob to the browser as a download (2026-10-06, the Clip
 * properties panel's Export). Names are sanitised to a safe file name.
 */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'clip';
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
