import { describe, expect, it } from 'vitest';
import { solveKMap } from '../minimization';
import { areBooleanExpressionsEquivalent, getExpressionMetrics } from './analysis';
import { getVariables } from './expression';
import { parseBooleanFunction } from './parser';
import { expressionToTruthTable, truthTableToMinterms } from './truthTable';

const expressions = [
  'A+B',
  "A'B+AB",
  'AB+A!B',
  '(A+B)C',
  "(A+B)C+A'BC",
  'A AND B OR C',
  '!(A+B)+AB',
  '~A|B',
  "A'B'+A'B+AB'+AB",
  'AB+AB',
  'A+AB',
  'A(A+B)',
  '(A+B)(A+C)',
  'AB+AC+BC',
  "A'BC+ABC'",
  'A|B|C',
  'ABC+A!BC',
  "A'B'C+A'BC",
  '(A+B)+(AB)',
  'A(B+C)+AB',
  'ABCD+ABCD',
  "A'BCD+ABCD",
  '(A+B)(C+D)',
  'AB+CD',
  "A'B+CD",
  '(A|B)*(C|D)',
  'NOT A AND B OR C',
  'A(B(C+D))',
  '(A+B+C)D',
  "AB'C+ABC",
  'ABCDE+ABC!D!E',
  '(A+B+C+D+E)A',
  "A'B'C'D'+ABCD",
  '(A+B)(C+D)(A+E)',
  'AB+AC+AD+AE',
  '!(!A)+B',
];

describe('expression analysis and solver integration', () => {
  it('counts literals and top-level product terms', () => {
    expect(getExpressionMetrics(parseBooleanFunction("(A+B)C+A'BC"))).toEqual({
      literalCount: 6,
      productTermCount: 2,
    });
  });

  it.each(expressions)('exhaustively preserves %s through truth table and solver', (source) => {
    const original = parseBooleanFunction(source);
    const variableNames = getVariables(original);
    const table = expressionToTruthTable(original, variableNames);
    const minterms = truthTableToMinterms(table);
    const solved = solveKMap({
      variableCount: variableNames.length,
      variables: table.variables,
      minterms,
    });
    expect(areBooleanExpressionsEquivalent(original, solved.expression, table.variables)).toBe(
      true,
    );
  });
});
