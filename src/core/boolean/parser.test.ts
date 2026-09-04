import { describe, expect, it } from 'vitest';
import { evaluateBooleanExpression } from './expression';
import { simplifyExpressionFormatting } from './format';
import {
  BooleanExpressionSyntaxError,
  parseBooleanExpression,
  parseBooleanFunction,
} from './parser';

describe('parseBooleanExpression', () => {
  it('gives AND higher precedence than OR', () => {
    const expression = parseBooleanExpression("A'B + CD");
    expect(expression).toMatchObject({
      kind: 'operation',
      operator: 'OR',
      operands: [
        { kind: 'operation', operator: 'AND' },
        { kind: 'operation', operator: 'AND' },
      ],
    });
    expect(evaluateBooleanExpression(expression, { A: 0, B: 1, C: 0, D: 0 })).toBe(1);
  });

  it('respects parentheses and implicit multiplication', () => {
    const expression = parseBooleanExpression("(A + B')C");
    expect(evaluateBooleanExpression(expression, { A: 0, B: 0, C: 1 })).toBe(1);
    expect(evaluateBooleanExpression(expression, { A: 1, B: 1, C: 0 })).toBe(0);
  });

  it.each(["A'", '~A', '!A', 'NOT A'])('normalizes complement notation %s', (source) => {
    const expression = parseBooleanExpression(source);
    expect(expression).toMatchObject({ kind: 'operation', operator: 'NOT' });
    expect(evaluateBooleanExpression(expression, { A: 0 })).toBe(1);
    expect(evaluateBooleanExpression(expression, { A: 1 })).toBe(0);
  });

  it.each(['AB', 'A*B', 'A AND B'])('normalizes AND notation %s', (source) => {
    expect(parseBooleanExpression(source)).toMatchObject({ kind: 'operation', operator: 'AND' });
  });

  it.each(['A+B', 'A|B', 'A OR B'])('normalizes OR notation %s', (source) => {
    expect(parseBooleanExpression(source)).toMatchObject({ kind: 'operation', operator: 'OR' });
  });

  it('parses a word-form expression', () => {
    const expression = parseBooleanExpression('(A AND B) OR (C AND NOT D)');
    expect(evaluateBooleanExpression(expression, { A: 1, B: 1, C: 0, D: 1 })).toBe(1);
    expect(evaluateBooleanExpression(expression, { A: 0, B: 1, C: 1, D: 0 })).toBe(1);
  });

  it.each(['A++B', '((A+B)', 'A B C +', '', 'A(B', 'A+++B', 'A & B', "'A", 'A)'])(
    'rejects malformed input %j with a useful positioned error',
    (source) => {
      expect(() => parseBooleanExpression(source)).toThrow(BooleanExpressionSyntaxError);
      try {
        parseBooleanExpression(source);
      } catch (error) {
        expect((error as Error).message).toMatch(/position \d+/);
      }
    },
  );

  it('produces stable canonical formatting', () => {
    expect(simplifyExpressionFormatting('( A AND !B ) OR (C*D)')).toBe("AB' + CD");
  });
});

describe('parseBooleanFunction', () => {
  it('accepts raw expressions and F assignments', () => {
    expect(parseBooleanFunction("A'B + CD")).toEqual(parseBooleanFunction("F = A'B + CD"));
  });

  it.each(['G = A+B', 'F = F+A', 'F == A+B'])('rejects inconsistent assignment %s', (source) => {
    expect(() => parseBooleanFunction(source)).toThrow(BooleanExpressionSyntaxError);
  });
});
