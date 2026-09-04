import { describe, expect, it } from 'vitest';
import { generateKMapLayout, indexToKMapCoordinate, kMapCoordinateToIndex } from './layout';

describe('generateKMapLayout', () => {
  it.each([
    [2, 2, 2],
    [3, 2, 4],
    [4, 4, 4],
    [5, 4, 8],
  ])('creates a %i-variable map with %i rows and %i columns', (variables, rows, columns) => {
    const layout = generateKMapLayout(variables);
    expect(layout).toMatchObject({ variableCount: variables, rows, columns });
    expect(layout.rowVariableCount + layout.columnVariableCount).toBe(variables);
  });

  it('uses Gray-code ordering on a four-variable map', () => {
    const layout = generateKMapLayout(4);
    expect(layout.rowLabels).toEqual(['00', '01', '11', '10']);
    expect(layout.columnLabels).toEqual(['00', '01', '11', '10']);
    expect(layout.rowVariableIndices).toEqual([0, 1]);
    expect(layout.columnVariableIndices).toEqual([2, 3]);
  });

  it.each([0, 1, 6, 3.5])('rejects unsupported variable count %s', (count) => {
    expect(() => generateKMapLayout(count)).toThrow(RangeError);
  });
});

describe('K-map coordinate conversion', () => {
  it('maps four-variable indices into Gray-code coordinates', () => {
    expect(indexToKMapCoordinate(0, 4)).toEqual({ row: 0, column: 0 });
    expect(indexToKMapCoordinate(2, 4)).toEqual({ row: 0, column: 3 });
    expect(indexToKMapCoordinate(7, 4)).toEqual({ row: 1, column: 2 });
    expect(indexToKMapCoordinate(15, 4)).toEqual({ row: 2, column: 2 });
    expect(indexToKMapCoordinate(8, 4)).toEqual({ row: 3, column: 0 });
  });

  it.each([2, 3, 4, 5])('round-trips every index for %i variables', (variableCount) => {
    for (let index = 0; index < 2 ** variableCount; index += 1) {
      const coordinate = indexToKMapCoordinate(index, variableCount);
      expect(kMapCoordinateToIndex(coordinate, variableCount)).toBe(index);
    }
  });

  it('places horizontally adjacent cells one input bit apart, including wraparound', () => {
    const layout = generateKMapLayout(5);
    for (let row = 0; row < layout.rows; row += 1) {
      for (let column = 0; column < layout.columns; column += 1) {
        const first = kMapCoordinateToIndex({ row, column }, 5);
        const second = kMapCoordinateToIndex({ row, column: (column + 1) % layout.columns }, 5);
        expect((first ^ second).toString(2).replaceAll('0', '')).toHaveLength(1);
      }
    }
  });

  it.each([-1, 16, 1.5])('rejects invalid indices', (index) => {
    expect(() => indexToKMapCoordinate(index, 4)).toThrow(RangeError);
  });

  it.each([
    { row: -1, column: 0 },
    { row: 0, column: 4 },
    { row: 0.5, column: 0 },
  ])('rejects invalid coordinate $row,$column', (coordinate) => {
    expect(() => kMapCoordinateToIndex(coordinate, 4)).toThrow(RangeError);
  });
});
