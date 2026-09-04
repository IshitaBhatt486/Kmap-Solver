import { generateTruthTable } from '../truthTable';
import type { BooleanExpression, LogicValue, TruthTable, Variable } from '../types';
import {
  evaluateBooleanExpression,
  getVariables,
  patternToExpression,
  termsToSum,
} from './expression';

function assertSupportedCount(count: number): void {
  if (!Number.isInteger(count) || count < 2 || count > 5) {
    throw new RangeError('Boolean truth tables require 2 through 5 variables.');
  }
}

function assertTerms(terms: readonly number[], count: number, label: string): void {
  const limit = 2 ** count;
  if (new Set(terms).size !== terms.length)
    throw new Error(`${label} must not contain duplicates.`);
  if (terms.some((term) => !Number.isInteger(term) || term < 0 || term >= limit)) {
    throw new RangeError(`${label} must contain integers from 0 through ${limit - 1}.`);
  }
}

function assertTable(table: TruthTable): void {
  assertSupportedCount(table.variables.length);
  const expectedRows = 2 ** table.variables.length;
  if (table.rows.length !== expectedRows)
    throw new Error(`Truth table must contain ${expectedRows} rows.`);
  table.rows.forEach((row, index) => {
    if (row.index !== index || row.inputs.length !== table.variables.length) {
      throw new Error('Truth-table rows must be complete and in deterministic binary index order.');
    }
  });
}

export function expressionToTruthTable(
  expression: BooleanExpression,
  variableNames: readonly string[] = getVariables(expression),
): TruthTable {
  assertSupportedCount(variableNames.length);
  if (new Set(variableNames).size !== variableNames.length)
    throw new Error('Variable names must be unique.');
  const variables: Variable[] = variableNames.map((name, position) => ({
    id: name,
    name,
    position,
  }));
  return generateTruthTable(variables, (inputs) => {
    const values = Object.fromEntries(
      variables.map((variable, position) => [variable.id, inputs[position] as LogicValue]),
    );
    return evaluateBooleanExpression(expression, values);
  });
}

export function truthTableToMinterms(table: TruthTable): number[] {
  assertTable(table);
  return table.rows.filter(({ output }) => output === 1).map(({ index }) => index);
}

export function truthTableToMaxterms(table: TruthTable): number[] {
  assertTable(table);
  return table.rows.filter(({ output }) => output === 0).map(({ index }) => index);
}

export function truthTableToDontCares(table: TruthTable): number[] {
  assertTable(table);
  return table.rows.filter(({ output }) => output === 'X').map(({ index }) => index);
}

export function mintermsToTruthTable(
  variables: readonly Variable[],
  minterms: readonly number[],
  dontCares: readonly number[] = [],
): TruthTable {
  assertSupportedCount(variables.length);
  assertTerms(minterms, variables.length, 'minterms');
  assertTerms(dontCares, variables.length, 'dontCares');
  if (minterms.some((term) => dontCares.includes(term)))
    throw new Error('minterms and dontCares must not overlap.');
  const ones = new Set(minterms);
  const ignored = new Set(dontCares);
  return generateTruthTable(variables, (_inputs, index) =>
    ones.has(index) ? 1 : ignored.has(index) ? 'X' : 0,
  );
}

export function maxtermsToTruthTable(
  variables: readonly Variable[],
  maxterms: readonly number[],
  dontCares: readonly number[] = [],
): TruthTable {
  assertSupportedCount(variables.length);
  assertTerms(maxterms, variables.length, 'maxterms');
  assertTerms(dontCares, variables.length, 'dontCares');
  if (maxterms.some((term) => dontCares.includes(term)))
    throw new Error('maxterms and dontCares must not overlap.');
  const zeros = new Set(maxterms);
  const ignored = new Set(dontCares);
  return generateTruthTable(variables, (_inputs, index) =>
    zeros.has(index) ? 0 : ignored.has(index) ? 'X' : 1,
  );
}

export function truthTableToCanonicalExpression(table: TruthTable): BooleanExpression {
  assertTable(table);
  const terms = truthTableToMinterms(table).map((index) =>
    patternToExpression(index.toString(2).padStart(table.variables.length, '0'), table.variables),
  );
  return termsToSum(terms);
}
