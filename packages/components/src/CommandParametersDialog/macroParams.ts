/**
 * Parse/serialize helpers for the Audacity macro parameters string format:
 *   Start="1", End="1", RelativeTo="ProjectStart"
 */

export function parseMacroParameters(parameters: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!parameters) return result;
  // Keys may contain hyphens and spaces after the first character — real
  // Audacity parameter names include both (e.g. "delay-type", "Threshold dB").
  const re = /([A-Za-z_][A-Za-z0-9_ -]*?) *="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(parameters)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

export function serializeMacroParameters(entries: Array<[key: string, value: string]>): string {
  return entries.map(([key, value]) => `${key}="${value}"`).join(', ');
}
