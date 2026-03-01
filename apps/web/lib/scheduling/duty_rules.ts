export function mixedDutyAllowed(params: {
  mixedGradeNames: string[];
  candidateGradeName: string;
  matchGradeName: string;
}): boolean {
  const { mixedGradeNames, candidateGradeName, matchGradeName } = params;

  if (mixedGradeNames.length >= 3) {
    return candidateGradeName === matchGradeName;
  }

  if (mixedGradeNames.length === 2) {
    const candidate = candidateGradeName.toLowerCase();
    const match = matchGradeName.toLowerCase();

    if (candidate.includes('b') && match.includes('a')) {
      return false;
    }

    return true;
  }

  return true;
}

export function isDutyCompatible(params: {
  candidateGradeCategory: 'MIXED' | 'LADIES' | 'MENS';
  matchGradeCategory: 'MIXED' | 'LADIES' | 'MENS';
  mixedGradeNames: string[];
  candidateGradeName: string;
  matchGradeName: string;
}): boolean {
  const { candidateGradeCategory, matchGradeCategory } = params;

  if (candidateGradeCategory !== matchGradeCategory) {
    return false;
  }

  if (candidateGradeCategory === 'MIXED') {
    return mixedDutyAllowed({
      mixedGradeNames: params.mixedGradeNames,
      candidateGradeName: params.candidateGradeName,
      matchGradeName: params.matchGradeName,
    });
  }

  return true;
}
