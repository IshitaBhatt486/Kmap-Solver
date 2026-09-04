import { booleanExpressionToString } from '../boolean';
import type { KMap, KMapGroup, SolverResult, SolverStep } from '../types';

export interface ExplanationSource {
  readonly kMap: KMap;
  readonly groups: readonly KMapGroup[];
  readonly primeGroups: readonly KMapGroup[];
  readonly essentialGroups: readonly KMapGroup[];
  readonly coveredMinterms: readonly number[];
  readonly expression: SolverResult['expression'];
  readonly alternativeExpressions: SolverResult['alternativeExpressions'];
}

function uniqueCells(groups: readonly KMapGroup[]): number[] {
  return [...new Set(groups.flatMap(({ cellIndices }) => cellIndices))].sort((a, b) => a - b);
}

export function generateSolverSteps(result: ExplanationSource): SolverStep[] {
  const dontCares = result.kMap.cells
    .flat()
    .filter(({ value }) => value === 'X')
    .map(({ termIndex }) => termIndex)
    .sort((a, b) => a - b);
  const format = (term: SolverResult['expression']) =>
    booleanExpressionToString(term, result.kMap.variables);
  const selectedIds = result.groups.map(({ id }) => id);
  const primeIds = result.primeGroups.map(({ id }) => id);
  const essentialIds = result.essentialGroups.map(({ id }) => id);
  const selectedTerms = result.groups.map(({ term }) => term);

  const activeDescription = result.coveredMinterms.length
    ? `The function is 1 at minterms ${result.coveredMinterms.join(', ')}.${dontCares.length ? ` Don't-cares ${dontCares.join(', ')} may be used when they enlarge a group.` : ''}`
    : `There are no required 1-cells.${dontCares.length ? " Don't-care cells alone do not require coverage." : ' The function is always 0.'}`;
  const requiredDescription =
    result.groups.length === 0
      ? 'No groups are required because there are no active minterms.'
      : result.essentialGroups.length === result.groups.length
        ? 'Every selected group is essential: each uniquely covers at least one required minterm.'
        : result.essentialGroups.length > 0
          ? `${result.essentialGroups.length} essential group${result.essentialGroups.length === 1 ? '' : 's'} must be selected. The remaining groups complete the minimum cover.`
          : 'No prime implicant is individually essential, so an exact minimum cover is selected from the equivalent choices.';

  return [
    {
      id: 'identify-active-cells',
      title: 'Identify active cells',
      description: activeDescription,
      highlightedCells: [...result.coveredMinterms, ...dontCares].sort((a, b) => a - b),
      highlightedGroups: [],
      generatedTerms: [],
      metadata: { minterms: result.coveredMinterms, dontCares },
    },
    {
      id: 'identify-possible-groups',
      title: 'Identify possible groups',
      description: result.primeGroups.length
        ? `The maximal valid regions produce ${result.primeGroups.length} prime implicant${result.primeGroups.length === 1 ? '' : 's'}. Each contains a power-of-two number of nonzero cells.`
        : 'No valid group is needed for this function.',
      highlightedCells: uniqueCells(result.primeGroups),
      highlightedGroups: primeIds,
      generatedTerms: [],
      metadata: {
        groups: result.primeGroups.map(({ id, cellIndices, coveredMinterms, size }) => ({
          id,
          cellIndices,
          coveredMinterms,
          size,
        })),
      },
    },
    {
      id: 'convert-groups-to-implicants',
      title: 'Convert groups to implicants',
      description: result.groups.length
        ? result.groups
            .map((group, index) => `Group ${index + 1} becomes ${format(group.term)}.`)
            .join(' ')
        : 'With no selected groups, the sum contains no product terms.',
      highlightedCells: uniqueCells(result.groups),
      highlightedGroups: selectedIds,
      generatedTerms: selectedTerms,
      metadata: {
        patterns: result.groups.map(({ variablePattern }) => variablePattern),
      },
    },
    {
      id: 'determine-required-groups',
      title: 'Determine required groups',
      description: requiredDescription,
      highlightedCells: uniqueCells(result.groups),
      highlightedGroups: selectedIds,
      generatedTerms: result.essentialGroups.map(({ term }) => term),
      metadata: { essentialGroupIds: essentialIds, selectedGroupIds: selectedIds },
    },
    {
      id: 'final-expression',
      title: 'Final expression',
      description: `Combining the selected implicants gives F = ${format(result.expression)}.${result.alternativeExpressions.length ? ` ${result.alternativeExpressions.length} equally optimal alternative${result.alternativeExpressions.length === 1 ? '' : 's'} also exists.` : ''}`,
      highlightedCells: result.coveredMinterms,
      highlightedGroups: selectedIds,
      generatedTerms: [result.expression],
      metadata: {
        expression: format(result.expression),
        alternativeCount: result.alternativeExpressions.length,
      },
    },
  ];
}
