#!/usr/bin/env node
/**
 * check-any.mjs — dependency-free `any` guardrail
 *
 * Scans:
 *   apps/sandbox/src/**\/*.{ts,tsx}
 *   packages/*\/src/**\/*.{ts,tsx}
 *
 * Excludes: __tests__ directories, *.test.* files, dist/, node_modules/
 *
 * Flags lines matching any of:  : any  |  as any  |  <any  |  , any  |  = any  |  | any
 * (covers Record<string, any>, useState<any[]>, <T = any>, :any, union any)
 * UNLESS the line also contains:  // justified:
 *
 * Exit 0 → clean tree (prints OK + scanned-file count)
 * Exit 1 → violations found (prints file:line: <trimmed line> + closing message)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const ANY_PATTERN = /:\s*any\b|as any\b|<\s*any\b|,\s*any\b|=\s*any\b|\|\s*any\b/;
const JUSTIFIED_MARKER = '// justified:';

/** Recursively collect .ts/.tsx files, excluding certain dirs/patterns */
function collectFiles(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (entry === '__tests__' || entry === 'dist' || entry === 'node_modules') continue;
      collectFiles(full, files);
    } else if (stat.isFile()) {
      // Only .ts and .tsx, exclude test files
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      if (/\.test\.(ts|tsx)$/.test(entry) || /\.spec\.(ts|tsx)$/.test(entry)) continue;
      files.push(full);
    }
  }
  return files;
}

/** Strip the inline comment portion of a line (everything from // onwards),
 *  but be careful not to strip inside strings. This is a best-effort approach
 *  that handles the most common case of // comments. */
function codePortionOfLine(line) {
  // If the trimmed line starts with //, the entire line is a comment
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//')) return '';
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';

  // Otherwise, find the first // not inside a string
  // Simple heuristic: find // that isn't preceded by an odd number of quotes
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    if (ch === "'" && !inDouble && !inTemplate && prev !== '\\') inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inTemplate && prev !== '\\') inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble && prev !== '\\') inTemplate = !inTemplate;
    else if (ch === '/' && line[i + 1] === '/' && !inSingle && !inDouble && !inTemplate) {
      return line.slice(0, i);
    }
  }
  return line;
}

// Determine scan roots
const scanRoots = [];

// apps/sandbox/src
const sandboxSrc = join(ROOT, 'apps', 'sandbox', 'src');
scanRoots.push(sandboxSrc);

// packages/*/src
const packagesDir = join(ROOT, 'packages');
let packageDirs;
try {
  packageDirs = readdirSync(packagesDir);
} catch {
  packageDirs = [];
}
for (const pkg of packageDirs) {
  const pkgSrc = join(packagesDir, pkg, 'src');
  try {
    const s = statSync(pkgSrc);
    if (s.isDirectory()) scanRoots.push(pkgSrc);
  } catch {
    // skip
  }
}

// Collect all files
const allFiles = [];
for (const root of scanRoots) {
  collectFiles(root, allFiles);
}

// Scan for violations
const violations = [];

for (const filePath of allFiles) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Extract code portion (strip inline comments)
    const codePart = codePortionOfLine(line);
    if (!codePart) continue;
    if (!ANY_PATTERN.test(codePart)) continue;
    // The full line must not contain the justified marker
    if (line.includes(JUSTIFIED_MARKER)) continue;
    violations.push({
      file: relative(ROOT, filePath),
      line: i + 1,
      text: line.trim(),
    });
  }
}

if (violations.length === 0) {
  console.log(`check-any OK — ${allFiles.length} files scanned, 0 violations`);
  process.exit(0);
} else {
  for (const v of violations) {
    console.error(`${v.file}:${v.line}: ${v.text}`);
  }
  console.error(
    `\n${violations.length} violation(s) — every \`any\` needs a \`// justified:\` comment — see docs/codebase-map.md`
  );
  process.exit(1);
}
