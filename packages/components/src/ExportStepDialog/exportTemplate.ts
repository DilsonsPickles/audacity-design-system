/**
 * The macro Export step's file name TEMPLATE (2026-11-24): tags in braces
 * are filled in when the macro runs. The dialog shows what the template
 * resolves to under its field, or what is wrong with it.
 */

export const EXPORT_TEMPLATE_TAGS = ['ProjectName', 'Date', 'Time', 'N'] as const;

export interface ExportTemplateContext {
  projectName: string;
  /** When the macro runs */
  now: Date;
  /** The run's number: the N-th file this step has written */
  run: number;
}

export type ExportTemplateResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** Fill the template's tags; an unknown tag or an empty result is an error. */
export function resolveExportTemplate(template: string, ctx: ExportTemplateContext): ExportTemplateResult {
  const unknown: string[] = [];
  const name = template.replace(/\{([^{}]*)\}/g, (whole, tag: string) => {
    switch (tag) {
      case 'ProjectName': return ctx.projectName;
      case 'Date': return `${ctx.now.getFullYear()}-${pad(ctx.now.getMonth() + 1)}-${pad(ctx.now.getDate())}`;
      case 'Time': return `${pad(ctx.now.getHours())}-${pad(ctx.now.getMinutes())}-${pad(ctx.now.getSeconds())}`;
      case 'N': return String(ctx.run);
      default: unknown.push(whole); return whole;
    }
  }).trim();
  if (unknown.length > 0) return { ok: false, error: `Unknown tag ${unknown[0]}` };
  if (!name) return { ok: false, error: 'Enter a file name' };
  return { ok: true, name };
}
