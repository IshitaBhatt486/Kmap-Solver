import type { KMapCoordinate, KMapLayout } from '../types';
import { generateGrayCode } from './grayCode';

const MIN_VARIABLES = 2;
const MAX_VARIABLES = 5;

function assertSupportedVariableCount(variableCount: number): void {
  if (
    !Number.isInteger(variableCount) ||
    variableCount < MIN_VARIABLES ||
    variableCount > MAX_VARIABLES
  ) {
    throw new RangeError('K-map variableCount must be an integer from 2 through 5.');
  }
}

function assertIndex(index: number, variableCount: number): void {
  const termCount = 2 ** variableCount;
  if (!Number.isInteger(index) || index < 0 || index >= termCount) {
    throw new RangeError(`index must be an integer from 0 through ${termCount - 1}.`);
  }
}

export function generateKMapLayout(variableCount: number): KMapLayout {
  assertSupportedVariableCount(variableCount);

  const rowVariableCount = Math.floor(variableCount / 2);
  const columnVariableCount = variableCount - rowVariableCount;
  const rowVariableIndices = Array.from({ length: rowVariableCount }, (_, index) => index);
  const columnVariableIndices = Array.from(
    { length: columnVariableCount },
    (_, index) => rowVariableCount + index,
  );
  const rowLabels = generateGrayCode(rowVariableCount);
  const columnLabels = generateGrayCode(columnVariableCount);

  return {
    variableCount,
    rowVariableCount,
    columnVariableCount,
    rowVariableIndices,
    columnVariableIndices,
    rowLabels,
    columnLabels,
    rows: rowLabels.length,
    columns: columnLabels.length,
  };
}

export function indexToKMapCoordinate(index: number, variableCount: number): KMapCoordinate {
  assertSupportedVariableCount(variableCount);
  assertIndex(index, variableCount);

  const layout = generateKMapLayout(variableCount);
  const bits = index.toString(2).padStart(variableCount, '0');
  const rowBits = bits.slice(0, layout.rowVariableCount);
  const columnBits = bits.slice(layout.rowVariableCount);
  const row = layout.rowLabels.indexOf(rowBits);
  const column = layout.columnLabels.indexOf(columnBits);

  if (row < 0 || column < 0) throw new Error('Failed to map index to Gray-code coordinate.');
  return { row, column };
}

export function kMapCoordinateToIndex(coordinate: KMapCoordinate, variableCount: number): number {
  assertSupportedVariableCount(variableCount);
  const layout = generateKMapLayout(variableCount);
  const { row, column } = coordinate;

  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 0 ||
    row >= layout.rows ||
    column < 0 ||
    column >= layout.columns
  ) {
    throw new RangeError('coordinate is outside the K-map layout.');
  }

  const rowLabel = layout.rowLabels[row];
  const columnLabel = layout.columnLabels[column];
  if (rowLabel === undefined || columnLabel === undefined) {
    throw new Error('K-map layout is internally inconsistent.');
  }
  return Number.parseInt(`${rowLabel}${columnLabel}`, 2);
}
