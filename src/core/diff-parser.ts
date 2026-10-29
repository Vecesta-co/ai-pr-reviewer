import parseDiff, { File as RawDiffFile } from 'parse-diff';
import { ParsedDiffFile, ParsedDiffHunk } from './types';

export const IGNORED_EXTENSIONS = new Set([
  '.lock',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.mp4',
  '.mp3',
  '.map',
  '.min.js',
  '.min.css',
]);

export const IGNORED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'cargo.lock',
  'poetry.lock',
  'gemfile.lock',
  'composer.lock',
  'go.sum',
]);

export function shouldIgnoreFile(filePath: string): boolean {
  if (!filePath) return true;
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const fileName = normalized.split('/').pop() || '';

  if (IGNORED_FILENAMES.has(fileName)) {
    return true;
  }

  for (const ext of IGNORED_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      return true;
    }
  }

  if (
    normalized.startsWith('node_modules/') ||
    normalized.includes('/node_modules/') ||
    normalized.startsWith('vendor/') ||
    normalized.includes('/vendor/') ||
    normalized.startsWith('dist/') ||
    normalized.includes('/dist/') ||
    normalized.startsWith('build/') ||
    normalized.includes('/build/') ||
    normalized.startsWith('.git/') ||
    normalized.includes('/.git/')
  ) {
    return true;
  }

  return false;
}

export function parseUnifiedDiff(rawDiff: string): ParsedDiffFile[] {
  if (!rawDiff || rawDiff.trim().length === 0) {
    return [];
  }

  const rawFiles: RawDiffFile[] = parseDiff(rawDiff);
  const result: ParsedDiffFile[] = [];

  for (const rawFile of rawFiles) {
    const filePath = rawFile.to || rawFile.from || '';
    const cleanPath = filePath.replace(/^[ab]\//, '');

    const validLines = new Set<number>();
    const hunks: ParsedDiffHunk[] = [];

    for (const chunk of rawFile.chunks) {
      const changedLines: number[] = [];
      let currentNewLine = chunk.newStart;

      for (const change of chunk.changes) {
        if (change.type === 'add') {
          const lineNum = change.ln !== undefined ? change.ln : currentNewLine;
          validLines.add(lineNum);
          changedLines.push(lineNum);
          currentNewLine++;
        } else if (change.type === 'normal') {
          currentNewLine++;
        }
      }

      const fullHunkContent = [
        chunk.content,
        ...chunk.changes.map((c) => c.content),
      ].join('\n');

      hunks.push({
        content: fullHunkContent,
        oldStart: chunk.oldStart,
        oldLines: chunk.oldLines,
        newStart: chunk.newStart,
        newLines: chunk.newLines,
        changedLines,
      });
    }

    result.push({
      from: rawFile.from ? rawFile.from.replace(/^[ab]\//, '') : undefined,
      to: rawFile.to ? rawFile.to.replace(/^[ab]\//, '') : undefined,
      isNew: Boolean(rawFile.new),
      isDeleted: Boolean(rawFile.deleted),
      isBinary: !rawFile.chunks || rawFile.chunks.length === 0,
      hunks,
      validLines,
      rawDiff: hunks.map((h) => h.content).join('\n'),
    });
  }

  return result;
}
