import { describe, expect, it } from 'vitest';
import type { Variable } from '../types';
import {
  booleanExpressionToString,
  evaluateBooleanExpression,
  patternToExpression,
} from './expression';

const variables: Variable[] = [
  { id: 'a', name: 'A', position: 0 },
  { id: 'b', name: 'B', position: 1 },
];

describe('Boolean expressions', () => {
  it('represents and evaluates literals, complements, AND, and OR', () => {
    const left = patternToExpression('01', variables);
    const right = patternToExpression('10', variables);
    const expression = { kind: 'operation', operator: 'OR', operands: [left, right] } as const;
    expect(evaluateBooleanExpression(expression, { a: 0, b: 1 })).toBe(1);
    expect(evaluateBooleanExpression(expression, { a: 1, b: 1 })).toBe(0);
    expect(booleanExpressionToString(expression, variables)).toBe("A'B + AB'");
  });

  it('uses parentheses when a sum is nested in a product', () => {
    const expression = {
      kind: 'operation',
      operator: 'AND',
      operands: [
        { kind: 'variable', variableId: 'a' },
        {
          kind: 'operation',
          operator: 'OR',
          operands: [
            { kind: 'variable', variableId: 'a' },
            { kind: 'variable', variableId: 'b' },
          ],
        },
      ],
    } as const;
    expect(booleanExpressionToString(expression, variables)).toBe('A(A + B)');
  });
});
