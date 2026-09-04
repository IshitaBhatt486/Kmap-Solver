import type { KMap, KMapCell, SolverInput, TruthValue, Variable } from '../types';
import { generateKMapLayout, indexToKMapCoordinate, kMapCoordinateToIndex } from './layout';

const DEFAULT_NAMES = ['A', 'B', 'C', 'D', 'E'];

export interface NormalizedKMapInput {
  readonly variables: readonly Variable[];
  readonly minterms: readonly number[];
  readonly maxterms: readonly number[];
  readonly dontCares: readonly number[];
}

export function normalizeKMapInput(input: SolverInput): NormalizedKMapInput {
  generateKMapLayout(input.variableCount);
  const termCount = 2 ** input.variableCount;
  const dontCares = normalizeTerms(input.dontCares ?? [], termCount, 'dontCares');
  const supplied = 'minterms' in input ? input.minterms : input.maxterms;
  const label = 'minterms' in input ? 'minterms' : 'maxterms';
  const terms = normalizeTerms(supplied, termCount, label);
  const overlap = terms.find((term) => dontCares.includes(term));
  if (overlap !== undefined) throw new Error(`${label} and dontCares overlap at index ${overlap}.`);

  const variables = input.variables
    ? validateVariables(input.variables, input.variableCount)
    : Array.from({ length: input.variableCount }, (_, position) => ({
        id: DEFAULT_NAMES[position]?.toLowerCase() ?? `v${position}`,
        name: DEFAULT_NAMES[position] ?? `V${position}`,
        position,
      }));
  const universe = Array.from({ length: termCount }, (_, index) => index);
  const minterms =
    'minterms' in input
      ? terms
      : universe.filter((index) => !terms.includes(index) && !dontCares.includes(index));
  const maxterms =
    'maxterms' in input
      ? terms
      : universe.filter((index) => !terms.includes(index) && !dontCares.includes(index));
  return { variables, minterms, maxterms, dontCares };
}

function normalizeTerms(terms: readonly number[], limit: number, label: string): number[] {
  if (terms.some((term) => !Number.isInteger(term) || term < 0 || term >= limit)) {
    throw new RangeError(`${label} must contain integers from 0 through ${limit - 1}.`);
  }
  if (new Set(terms).size !== terms.length)
    throw new Error(`${label} must not contain duplicates.`);
  return [...terms].sort((left, right) => left - right);
}

function validateVariables(variables: readonly Variable[], count: number): Variable[] {
  if (variables.length !== count) throw new Error('variables length must equal variableCount.');
  if (new Set(variables.map(({ id }) => id)).size !== count)
    throw new Error('Variable ids must be unique.');
  if (variables.some(({ position }, index) => position !== index)) {
    throw new Error('Variables must have contiguous positions starting at zero.');
  }
  return [...variables];
}

export function generateKMap(input: SolverInput): KMap {
  const normalized = normalizeKMapInput(input);
  const layout = generateKMapLayout(input.variableCount);
  const ones = new Set(normalized.minterms);
  const xs = new Set(normalized.dontCares);
  const cells: KMapCell[][] = Array.from({ length: layout.rows }, (_, row) =>
    Array.from({ length: layout.columns }, (_, column) => {
      const termIndex = kMapCoordinateToIndex({ row, column }, input.variableCount);
      const value: TruthValue = ones.has(termIndex) ? 1 : xs.has(termIndex) ? 'X' : 0;
      return { coordinate: { row, column }, termIndex, value };
    }),
  );
  return { variables: normalized.variables, layout, cells };
}

export function areKMapCellsAdjacent(
  left: number | KMapCell,
  right: number | KMapCell,
  variableCount: number,
): boolean {
  const a = typeof left === 'number' ? indexToKMapCoordinate(left, variableCount) : left.coordinate;
  const b =
    typeof right === 'number' ? indexToKMapCoordinate(right, variableCount) : right.coordinate;
  const layout = generateKMapLayout(variableCount);
  const rowDistance = Math.min(Math.abs(a.row - b.row), layout.rows - Math.abs(a.row - b.row));
  const columnDistance = Math.min(
    Math.abs(a.column - b.column),
    layout.columns - Math.abs(a.column - b.column),
  );
  return rowDistance + columnDistance === 1;
}
