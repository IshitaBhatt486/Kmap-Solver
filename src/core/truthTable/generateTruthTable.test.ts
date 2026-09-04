import { describe, expect, it } from 'vitest';
import type { Variable } from '../types';
import { generateTruthTable } from './generateTruthTable';

const variables: Variable[] = [
  { id: 'a', name: 'A', position: 0 },
  { id: 'b', name: 'B', position: 1 },
  { id: 'c', name: 'C', position: 2 },
];

describe('generateTruthTable', () => {
  it('generates rows in binary index order', () => {
    const table = generateTruthTable(variables);
    expect(table.rows).toHaveLength(8);
    expect(table.rows.map((row) => row.inputs)).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ]);
    expect(table.rows.every(({ output }) => output === 0)).toBe(true);
  });

  it('evaluates an output function with inputs and minterm index', () => {
    const table = generateTruthTable(variables, (inputs, index) =>
      index === 3 ? 'X' : inputs.filter(Boolean).length >= 2 ? 1 : 0,
    );
    expect(table.rows.map(({ output }) => output)).toEqual([0, 0, 0, 'X', 0, 1, 1, 1]);
  });

  it('does not expose the caller variable array as the table array', () => {
    expect(generateTruthTable(variables).variables).not.toBe(variables);
  });

  it('requires at least one variable', () => {
    expect(() => generateTruthTable([])).toThrow(RangeError);
  });

  it('rejects duplicate ids and positions', () => {
    expect(() =>
      generateTruthTable([
        { id: 'a', name: 'A', position: 0 },
        { id: 'a', name: 'B', position: 0 },
      ]),
    ).toThrow('unique');
  });

  it('rejects unordered or non-contiguous positions', () => {
    expect(() => generateTruthTable([{ id: 'a', name: 'A', position: 1 }])).toThrow('contiguous');
  });
});
