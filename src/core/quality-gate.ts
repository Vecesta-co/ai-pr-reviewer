import { ReviewFinding, SeverityLevel } from './types';

export const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  SECURITY: 5,
  CRITICAL: 4,
  MAJOR: 3,
  MINOR: 2,
  NIT: 1,
};

export interface GateEvaluation {
  passed: boolean;
  violations: ReviewFinding[];
  reason: string;
}

export function filterFindingsByMinSeverity(
  findings: ReviewFinding[],
  minSeverity?: SeverityLevel
): ReviewFinding[] {
  if (!minSeverity) return findings;
  const minWeight = SEVERITY_WEIGHTS[minSeverity] ?? 1;
  return findings.filter((f) => (SEVERITY_WEIGHTS[f.severity] ?? 1) >= minWeight);
}

export function evaluateQualityGate(
  findings: ReviewFinding[],
  failOnSeverity?: SeverityLevel[]
): GateEvaluation {
  if (!failOnSeverity || failOnSeverity.length === 0) {
    return {
      passed: true,
      violations: [],
      reason: 'No quality gates configured; passing by default.',
    };
  }

  const failSet = new Set<SeverityLevel>(failOnSeverity);
  const violations = findings.filter((f) => failSet.has(f.severity));

  if (violations.length > 0) {
    const severities = Array.from(new Set(violations.map((v) => v.severity))).join(', ');
    return {
      passed: false,
      violations,
      reason: `Quality gate failed: Found ${violations.length} blocking issue(s) matching [${severities}].`,
    };
  }

  return {
    passed: true,
    violations: [],
    reason: `Quality gate passed: 0 blocking issues matching [${failOnSeverity.join(', ')}].`,
  };
}
