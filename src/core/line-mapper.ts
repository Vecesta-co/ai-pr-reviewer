import { ParsedDiffFile } from './types';

export interface LineValidationResult {
  isValid: boolean;
  targetLine: number;
  snapped: boolean;
  reason?: string;
}

export class LineMapper {
  private fileMap: Map<string, ParsedDiffFile>;

  constructor(files: ParsedDiffFile[]) {
    this.fileMap = new Map();
    for (const f of files) {
      const path = f.to || f.from;
      if (path) {
        this.fileMap.set(path, f);
      }
    }
  }

  public validateLine(filePath: string, requestedLine: number): LineValidationResult {
    const file = this.fileMap.get(filePath);
    if (!file) {
      return {
        isValid: false,
        targetLine: requestedLine,
        snapped: false,
        reason: `File "${filePath}" not found in parsed diff.`,
      };
    }

    if (file.validLines.has(requestedLine)) {
      return {
        isValid: true,
        targetLine: requestedLine,
        snapped: false,
      };
    }

    // Attempt to snap to the closest valid changed line within the same hunk
    let closestLine: number | null = null;
    let minDistance = Infinity;

    for (const hunk of file.hunks) {
      // Check if requestedLine falls within or near this hunk range
      const hunkEnd = hunk.newStart + hunk.newLines;
      const margin = 5;

      if (requestedLine >= hunk.newStart - margin && requestedLine <= hunkEnd + margin) {
        for (const validLine of hunk.changedLines) {
          const dist = Math.abs(validLine - requestedLine);
          if (dist < minDistance) {
            minDistance = dist;
            closestLine = validLine;
          }
        }
      }
    }

    if (closestLine !== null && minDistance <= 3) {
      return {
        isValid: true,
        targetLine: closestLine,
        snapped: true,
        reason: `Snapped requested line ${requestedLine} to nearest modified line ${closestLine} (diff distance: ${minDistance}).`,
      };
    }

    return {
      isValid: false,
      targetLine: requestedLine,
      snapped: false,
      reason: `Line ${requestedLine} is not part of the modified hunk in "${filePath}".`,
    };
  }

  public getValidLinesForFile(filePath: string): number[] {
    const file = this.fileMap.get(filePath);
    if (!file) return [];
    return Array.from(file.validLines).sort((a, b) => a - b);
  }
}
