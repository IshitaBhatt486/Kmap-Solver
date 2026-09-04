import { describe, expect, it } from 'vitest';
import { evaluateBooleanExpression } from '../boolean';
import type { BooleanExpression, SolverResult } from '../types';
import { generateValidGroups, isValidKMapGroup, solveKMap } from './solver';

function evaluateAt(expression: BooleanExpression, result: SolverResult, index: number): 0 | 1 {
  const bits = index.toString(2).padStart(result.kMap.variables.length, '0');
  return evaluateBooleanExpression(
    expression,
    Object.fromEntries(
      result.kMap.variables.map((variable, position) => [
        variable.id,
        bits[position] === '1' ? 1 : 0,
      ]),
    ),
  );
}

function expectEquivalent(
  result: SolverResult,
  minterms: readonly number[],
  dontCares: readonly number[] = [],
): void {
  const ones = new Set(minterms);
  const ignored = new Set(dontCares);
  for (let index = 0; index < 2 ** result.kMap.variables.length; index += 1) {
    if (!ignored.has(index))
      expect(evaluateAt(result.expression, result, index)).toBe(ones.has(index) ? 1 : 0);
  }
  for (const alternative of result.alternativeExpressions) {
    for (let index = 0; index < 2 ** result.kMap.variables.length; index += 1) {
      if (!ignored.has(index))
        expect(evaluateAt(alternative, result, index)).toBe(ones.has(index) ? 1 : 0);
    }
  }
}

describe('group generation and validation', () => {
  it('generates only logical power-of-two rectangles containing a one and no zero', () => {
    const input = { variableCount: 4, minterms: [0, 2, 8, 10], dontCares: [1, 3] } as const;
    const result = solveKMap(input);
    const groups = generateValidGroups(input);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => isValidKMapGroup(group, result.kMap))).toBe(true);
    expect(groups.every(({ size }) => (size & (size - 1)) === 0)).toBe(true);
  });

  it('recognizes a four-corner group that wraps both axes', () => {
    const result = solveKMap({ variableCount: 4, minterms: [0, 2, 8, 10] });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      cellIndices: [0, 2, 8, 10],
      variablePattern: '-0-0',
      size: 4,
      wrapsRows: true,
      wrapsColumns: true,
      isPrime: true,
      isEssential: true,
    });
  });

  it('rejects diagonal and zero-containing groups', () => {
    const result = solveKMap({ variableCount: 3, minterms: [0, 3] });
    expect(isValidKMapGroup({ cellIndices: [0, 3] }, result.kMap)).toBe(false);
    expect(isValidKMapGroup({ cellIndices: [0, 1] }, result.kMap)).toBe(false);
  });
});

describe('optimal minimization', () => {
  it("handles all-zero, all-one, and all-don't-care functions", () => {
    const zero = solveKMap({ variableCount: 4, minterms: [] });
    expect(zero.expression).toEqual({ kind: 'constant', value: 0 });
    expect(zero.groups).toEqual([]);

    const all = Array.from({ length: 16 }, (_, index) => index);
    const one = solveKMap({ variableCount: 4, minterms: all });
    expect(one.expression).toEqual({ kind: 'constant', value: 1 });
    expect(one.groups[0]?.variablePattern).toBe('----');

    const onlyX = solveKMap({ variableCount: 4, minterms: [], dontCares: all });
    expect(onlyX.expression).toEqual({ kind: 'constant', value: 0 });
  });

  it('handles a single and isolated minterms', () => {
    const single = solveKMap({ variableCount: 4, minterms: [6] });
    expect(single.groups).toHaveLength(1);
    expect(single.groups[0]?.size).toBe(1);
    expectEquivalent(single, [6]);

    const isolated = solveKMap({ variableCount: 4, minterms: [0, 7, 13] });
    expect(isolated.groups).toHaveLength(3);
    expectEquivalent(isolated, [0, 7, 13]);
  });

  it('combines adjacent and wrap-around minterms', () => {
    const adjacent = solveKMap({ variableCount: 3, minterms: [0, 1] });
    expect(adjacent.groups[0]?.size).toBe(2);
    const wrapped = solveKMap({ variableCount: 3, minterms: [0, 2] });
    expect(wrapped.groups[0]).toMatchObject({ size: 2, wrapsColumns: true });
    expectEquivalent(wrapped, [0, 2]);
  });

  it("uses don't-cares to form a larger beneficial group", () => {
    const result = solveKMap({ variableCount: 3, minterms: [1, 3], dontCares: [5, 7] });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ size: 4, variablePattern: '--1' });
    expectEquivalent(result, [1, 3], [5, 7]);
  });

  it('finds essential implicants and retains multiple equally optimal solutions', () => {
    const result = solveKMap({ variableCount: 3, minterms: [0, 1, 2, 5, 6, 7] });
    expect(result.primeGroups).toHaveLength(6);
    expect(result.essentialGroups).toHaveLength(0);
    expect(result.alternativeExpressions.length).toBeGreaterThan(0);
    expectEquivalent(result, [0, 1, 2, 5, 6, 7]);
  });

  it('solves the known four-variable example by truth-table equivalence', () => {
    const minterms = [0, 2, 5, 7, 8, 10, 13, 15];
    const result = solveKMap({ variableCount: 4, minterms });
    expect(result.groups.map(({ variablePattern }) => variablePattern).sort()).toEqual([
      '-0-0',
      '-1-1',
    ]);
    expectEquivalent(result, minterms);
  });

  it('supports a five-variable half-map implicant', () => {
    const minterms = Array.from({ length: 32 }, (_, index) => index).filter(
      (index) => index % 2 === 0,
    );
    const result = solveKMap({ variableCount: 5, minterms });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ size: 16, variablePattern: '----0' });
    expectEquivalent(result, minterms);
  });

  it('accepts equivalent maxterm representation', () => {
    const fromMaxterms = solveKMap({ variableCount: 3, maxterms: [0, 2, 4, 6] });
    expectEquivalent(fromMaxterms, [1, 3, 5, 7]);
  });
});

describe('exhaustive small-map equivalence', () => {
  it.each([2, 3])('preserves every %i-variable Boolean function', (variableCount) => {
    const termCount = 2 ** variableCount;
    for (let functionBits = 0; functionBits < 2 ** termCount; functionBits += 1) {
      const minterms = Array.from({ length: termCount }, (_, index) => index).filter(
        (index) => (functionBits & (1 << index)) !== 0,
      );
      expectEquivalent(solveKMap({ variableCount, minterms }), minterms);
    }
  });
});
