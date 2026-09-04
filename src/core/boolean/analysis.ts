import type { BooleanExpression, LogicValue, Variable } from '../types';
import { evaluateBooleanExpression, getVariables } from './expression';

export interface ExpressionMetrics {
  readonly literalCount: number;
  readonly productTermCount: number;
}

export function getExpressionMetrics(expression: BooleanExpression): ExpressionMetrics {
  const countLiterals = (node: BooleanExpression): number => {
    if (node.kind === 'constant') return 0;
    if (node.kind === 'variable') return 1;
    return node.operands.reduce((sum, operand) => sum + countLiterals(operand), 0);
  };
  const productTermCount =
    expression.kind === 'constant' && expression.value === 0
      ? 0
      : expression.kind === 'operation' && expression.operator === 'OR'
        ? expression.operands.length
        : 1;
  return { literalCount: countLiterals(expression), productTermCount };
}

export function areBooleanExpressionsEquivalent(
  left: BooleanExpression,
  right: BooleanExpression,
  variables?: readonly Variable[],
): boolean {
  const ids =
    variables?.map(({ id }) => id) ??
    [...new Set([...getVariables(left), ...getVariables(right)])].sort();
  if (ids.length > 5) throw new RangeError('Equivalence checking supports at most 5 variables.');
  for (let index = 0; index < 2 ** ids.length; index += 1) {
    const bits = index.toString(2).padStart(ids.length, '0');
    const values = Object.fromEntries(
      ids.map((id, position) => [id, bits[position] === '1' ? 1 : 0]),
    ) as Record<string, LogicValue>;
    if (evaluateBooleanExpression(left, values) !== evaluateBooleanExpression(right, values))
      return false;
  }
  return true;
}
