import { describe, expect, it } from 'vitest';
import { booleanExpressionToString } from '../boolean';
import { solveKMap } from './solver';

describe('structured solver explanations', () => {
  it('references only cells and groups from the actual result', () => {
    const result = solveKMap({
      variableCount: 4,
      minterms: [0, 2, 5, 7, 8, 10, 13, 15],
    });
    const validCells = new Set(result.kMap.cells.flat().map(({ termIndex }) => termIndex));
    const validGroups = new Set(result.primeGroups.map(({ id }) => id));

    expect(result.steps).toHaveLength(5);
    for (const step of result.steps) {
      expect(step.id).toBeTruthy();
      expect(step.highlightedCells.every((cell) => validCells.has(cell))).toBe(true);
      expect(step.highlightedGroups.every((group) => validGroups.has(group))).toBe(true);
    }
  });

  it('derives active cells, selected groups, and terms from the result', () => {
    const result = solveKMap({ variableCount: 4, minterms: [0, 2, 8, 10], dontCares: [1] });
    const active = result.steps[0];
    const groups = result.steps[2];
    expect(active?.highlightedCells).toEqual([0, 1, 2, 8, 10]);
    expect(active?.metadata).toEqual({ minterms: result.coveredMinterms, dontCares: [1] });
    expect(groups?.highlightedGroups).toEqual(result.groups.map(({ id }) => id));
    expect(groups?.generatedTerms).toEqual(result.groups.map(({ term }) => term));
  });

  it('makes the final step exactly match the generated expression', () => {
    const result = solveKMap({ variableCount: 4, minterms: [0, 2, 5, 7, 8, 10, 13, 15] });
    const final = result.steps.at(-1);
    const rendered = booleanExpressionToString(result.expression, result.kMap.variables);
    expect(final).toMatchObject({ id: 'final-expression', generatedTerms: [result.expression] });
    expect(final?.description).toContain(`F = ${rendered}`);
    expect(final?.metadata.expression).toBe(rendered);
  });

  it("explains constant-zero and all-don't-care functions without invented groups", () => {
    const zeros = solveKMap({ variableCount: 3, minterms: [] });
    expect(zeros.steps.every(({ highlightedGroups }) => highlightedGroups.length === 0)).toBe(true);
    expect(zeros.steps[3]?.description).toContain('No groups are required');
    expect(zeros.steps.at(-1)?.metadata.expression).toBe('0');
  });
});
