import { describe, expect, it } from 'vitest';
import { isDutyCompatible, mixedDutyAllowed } from './duty_rules';

describe('mixedDutyAllowed', () => {
  it('requires exact grade match when three or more mixed grades exist', () => {
    expect(
      mixedDutyAllowed({
        mixedGradeNames: ['Mixed A', 'Mixed B', 'Mixed C'],
        candidateGradeName: 'Mixed B',
        matchGradeName: 'Mixed B',
      }),
    ).toBe(true);

    expect(
      mixedDutyAllowed({
        mixedGradeNames: ['Mixed A', 'Mixed B', 'Mixed C'],
        candidateGradeName: 'Mixed C',
        matchGradeName: 'Mixed A',
      }),
    ).toBe(false);
  });

  it('blocks mixed B from officiating mixed A when two mixed grades exist', () => {
    expect(
      mixedDutyAllowed({
        mixedGradeNames: ['Mixed A', 'Mixed B'],
        candidateGradeName: 'Mixed B',
        matchGradeName: 'Mixed A',
      }),
    ).toBe(false);

    expect(
      mixedDutyAllowed({
        mixedGradeNames: ['Mixed A', 'Mixed B'],
        candidateGradeName: 'Mixed A',
        matchGradeName: 'Mixed B',
      }),
    ).toBe(true);
  });

  it('allows duties when there is one or fewer mixed grades', () => {
    expect(
      mixedDutyAllowed({
        mixedGradeNames: ['Mixed A'],
        candidateGradeName: 'Mixed A',
        matchGradeName: 'Mixed A',
      }),
    ).toBe(true);
  });
});

describe('isDutyCompatible', () => {
  it('rejects cross-category assignments', () => {
    expect(
      isDutyCompatible({
        candidateGradeCategory: 'LADIES',
        matchGradeCategory: 'MIXED',
        mixedGradeNames: ['Mixed A'],
        candidateGradeName: 'Ladies',
        matchGradeName: 'Mixed A',
      }),
    ).toBe(false);
  });

  it('allows non-mixed same-category assignments', () => {
    expect(
      isDutyCompatible({
        candidateGradeCategory: 'MENS',
        matchGradeCategory: 'MENS',
        mixedGradeNames: ['Mixed A'],
        candidateGradeName: 'Mens',
        matchGradeName: 'Mens',
      }),
    ).toBe(true);
  });
});
