import { describe, expect, it } from 'vitest';
import { areKMapCellsAdjacent, generateKMap, normalizeKMapInput } from './map';

describe('generateKMap', () => {
  it("places minterms and don't-cares at Gray-code coordinates", () => {
    const map = generateKMap({ variableCount: 4, minterms: [0, 2, 15], dontCares: [5] });
    expect(map.cells.map((row) => row.map(({ termIndex }) => termIndex))).toEqual([
      [0, 1, 3, 2],
      [4, 5, 7, 6],
      [12, 13, 15, 14],
      [8, 9, 11, 10],
    ]);
    expect(map.cells[0]?.[3]?.value).toBe(1);
    expect(map.cells[1]?.[1]?.value).toBe('X');
    expect(map.cells[2]?.[2]?.value).toBe(1);
  });

  it("derives minterms from maxterms and don't-cares", () => {
    const normalized = normalizeKMapInput({ variableCount: 2, maxterms: [0, 3], dontCares: [1] });
    expect(normalized).toMatchObject({ minterms: [2], maxterms: [0, 3], dontCares: [1] });
  });

  it('rejects duplicate, overlapping, and out-of-range terms', () => {
    expect(() => generateKMap({ variableCount: 3, minterms: [1, 1] })).toThrow('duplicates');
    expect(() => generateKMap({ variableCount: 3, minterms: [1], dontCares: [1] })).toThrow(
      'overlap',
    );
    expect(() => generateKMap({ variableCount: 3, minterms: [8] })).toThrow(RangeError);
  });
});

describe('areKMapCellsAdjacent', () => {
  it('detects ordinary, horizontal-wrap, and vertical-wrap neighbors', () => {
    expect(areKMapCellsAdjacent(0, 1, 4)).toBe(true);
    expect(areKMapCellsAdjacent(0, 2, 4)).toBe(true);
    expect(areKMapCellsAdjacent(0, 8, 4)).toBe(true);
  });

  it('rejects diagonals, non-neighbors, and identical cells', () => {
    expect(areKMapCellsAdjacent(0, 3, 4)).toBe(false);
    expect(areKMapCellsAdjacent(0, 5, 4)).toBe(false);
    expect(areKMapCellsAdjacent(0, 0, 4)).toBe(false);
  });
});
