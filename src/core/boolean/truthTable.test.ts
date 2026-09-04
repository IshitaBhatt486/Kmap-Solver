import { describe, expect, it } from 'vitest';
import type { Variable } from '../types';
import { evaluateBooleanExpression } from './expression';
import { parseBooleanExpression } from './parser';
import {
  expressionToTruthTable,
  maxtermsToTruthTable,
  mintermsToTruthTable,
  truthTableToCanonicalExpression,
  truthTableToDontCares,
  truthTableToMaxterms,
  truthTableToMinterms,
} from './truthTable';

const variables: Variable[] = ['A', 'B', 'C'].map((name, position) => ({
  id: name,
  name,
  position,
}));

describe('Boolean truth-table conversions', () => {
  it('creates deterministic binary-order rows from an expression', () => {
    const table = expressionToTruthTable(parseBooleanExpression("A'B + AC"), ['A', 'B', 'C']);
    expect(table.rows.map(({ inputs }) => inputs)).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ]);
    expect(truthTableToMinterms(table)).toEqual([2, 3, 5, 7]);
    expect(truthTableToMaxterms(table)).toEqual([0, 1, 4, 6]);
  });

  it("round-trips minterms and don't-cares", () => {
    const table = mintermsToTruthTable(variables, [1, 4, 7], [2, 6]);
    expect(truthTableToMinterms(table)).toEqual([1, 4, 7]);
    expect(truthTableToMaxterms(table)).toEqual([0, 3, 5]);
    expect(truthTableToDontCares(table)).toEqual([2, 6]);
  });

  it("round-trips maxterms and don't-cares", () => {
    const table = maxtermsToTruthTable(variables, [0, 3, 5], [2, 6]);
    expect(truthTableToMaxterms(table)).toEqual([0, 3, 5]);
    expect(truthTableToMinterms(table)).toEqual([1, 4, 7]);
    expect(truthTableToDontCares(table)).toEqual([2, 6]);
  });

  it('converts a table to an equivalent canonical sum of minterms', () => {
    const table = mintermsToTruthTable(variables, [0, 3, 5, 7]);
    const expression = truthTableToCanonicalExpression(table);
    table.rows.forEach((row) => {
      const values = Object.fromEntries(
        variables.map((variable, index) => [variable.id, row.inputs[index] ?? 0]),
      );
      expect(evaluateBooleanExpression(expression, values)).toBe(row.output);
    });
  });

  it('validates variable count, term domains, duplicates, and overlap', () => {
    expect(() => mintermsToTruthTable(variables.slice(0, 1), [0])).toThrow(RangeError);
    expect(() => mintermsToTruthTable(variables, [8])).toThrow(RangeError);
    expect(() => mintermsToTruthTable(variables, [1, 1])).toThrow('duplicates');
    expect(() => maxtermsToTruthTable(variables, [1], [1])).toThrow('overlap');
  });
});
