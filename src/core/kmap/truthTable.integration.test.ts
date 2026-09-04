import { describe, expect, it } from 'vitest';
import {
  generateKMap,
  maxtermsToTruthTable,
  mintermsToTruthTable,
  truthTableToDontCares,
  truthTableToMaxterms,
  truthTableToMinterms,
} from '../index';
import type { TruthValue, Variable } from '../types';

function variables(count: number): Variable[] {
  return Array.from({ length: count }, (_, position) => ({
    id: String.fromCharCode(65 + position),
    name: String.fromCharCode(65 + position),
    position,
  }));
}

function mapValues(
  variableCount: number,
  minterms: readonly number[],
  dontCares: readonly number[],
): TruthValue[] {
  const map = generateKMap({
    variableCount,
    variables: variables(variableCount),
    minterms,
    dontCares,
  });
  return map.cells
    .flat()
    .sort((a, b) => a.termIndex - b.termIndex)
    .map(({ value }) => value);
}

describe.each([2, 3, 4, 5])('%i-variable truth-table and K-map integration', (variableCount) => {
  const terms = 2 ** variableCount;
  const all = Array.from({ length: terms }, (_, index) => index);
  const mixedMinterms = all.filter((index) => index % 3 === 0);
  const mixedDontCares = all.filter((index) => index % 3 === 1 && index % 2 === 1);

  it("round-trips truth table → K-map → truth table with don't-cares", () => {
    const original = mintermsToTruthTable(variables(variableCount), mixedMinterms, mixedDontCares);
    const minterms = truthTableToMinterms(original);
    const dontCares = truthTableToDontCares(original);
    const values = mapValues(variableCount, minterms, dontCares);
    const reconstructed = mintermsToTruthTable(
      variables(variableCount),
      values.flatMap((value, index) => (value === 1 ? [index] : [])),
      values.flatMap((value, index) => (value === 'X' ? [index] : [])),
    );
    expect(reconstructed.rows.map(({ output }) => output)).toEqual(
      original.rows.map(({ output }) => output),
    );
  });

  it('round-trips K-map → truth table → K-map', () => {
    const original = mapValues(variableCount, mixedMinterms, mixedDontCares);
    const table = mintermsToTruthTable(variables(variableCount), mixedMinterms, mixedDontCares);
    const reconstructed = mapValues(
      variableCount,
      truthTableToMinterms(table),
      truthTableToDontCares(table),
    );
    expect(reconstructed).toEqual(original);
  });

  it('preserves all-zero and all-one functions', () => {
    expect(mapValues(variableCount, [], [])).toEqual(Array<TruthValue>(terms).fill(0));
    const oneTable = maxtermsToTruthTable(variables(variableCount), []);
    expect(truthTableToMinterms(oneTable)).toEqual(all);
    expect(truthTableToMaxterms(oneTable)).toEqual([]);
    expect(mapValues(variableCount, all, [])).toEqual(Array<TruthValue>(terms).fill(1));
  });
});
