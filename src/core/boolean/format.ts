import type { BooleanExpression, Variable } from '../types';
import { booleanExpressionToString, getVariables } from './expression';
import { parseBooleanExpression } from './parser';

export function simplifyExpressionFormatting(input: string | BooleanExpression): string {
  const expression = typeof input === 'string' ? parseBooleanExpression(input) : input;
  const variables: Variable[] = getVariables(expression).map((id, position) => ({
    id,
    name: id,
    position,
  }));
  return booleanExpressionToString(expression, variables);
}
