import type { BooleanExpression, LogicValue, Variable } from '../types';

export function evaluateBooleanExpression(
  expression: BooleanExpression,
  values: Readonly<Record<string, LogicValue>>,
): LogicValue {
  switch (expression.kind) {
    case 'constant':
      return expression.value;
    case 'variable': {
      const value = values[expression.variableId];
      if (value === undefined)
        throw new Error(`Missing value for variable "${expression.variableId}".`);
      return value;
    }
    case 'operation': {
      const operands = expression.operands.map((operand) =>
        evaluateBooleanExpression(operand, values),
      );
      switch (expression.operator) {
        case 'NOT':
          if (operands.length !== 1) throw new Error('NOT requires exactly one operand.');
          return operands[0] === 1 ? 0 : 1;
        case 'AND':
          return operands.every((value) => value === 1) ? 1 : 0;
        case 'OR':
          return operands.some((value) => value === 1) ? 1 : 0;
        case 'XOR':
          return operands.reduce<number>((parity, value) => parity ^ value, 0) as LogicValue;
      }
    }
  }
}

export function booleanExpressionToString(
  expression: BooleanExpression,
  variables: readonly Variable[],
): string {
  const names = new Map(variables.map((variable) => [variable.id, variable.name]));
  const render = (node: BooleanExpression, parent?: 'AND' | 'OR' | 'XOR' | 'NOT'): string => {
    if (node.kind === 'constant') return String(node.value);
    if (node.kind === 'variable') return names.get(node.variableId) ?? node.variableId;
    if (node.operator === 'NOT') {
      const operand = node.operands[0];
      if (!operand) throw new Error('NOT requires exactly one operand.');
      const rendered = render(operand, 'NOT');
      return operand.kind === 'variable' ? `${rendered}'` : `(${rendered})'`;
    }
    const separator = node.operator === 'AND' ? '' : node.operator === 'OR' ? ' + ' : ' ⊕ ';
    const rendered = node.operands.map((operand) => render(operand, node.operator)).join(separator);
    return parent === 'AND' && node.operator !== 'AND' ? `(${rendered})` : rendered;
  };
  return render(expression);
}

export function patternToExpression(
  pattern: string,
  variables: readonly Variable[],
): BooleanExpression {
  if (pattern.length !== variables.length) throw new Error('Pattern and variable counts differ.');
  const literals: BooleanExpression[] = [];
  for (let position = 0; position < pattern.length; position += 1) {
    const bit = pattern[position];
    const variable = variables[position];
    if (!variable) throw new Error('Variable positions must be contiguous.');
    if (bit === '1') literals.push({ kind: 'variable', variableId: variable.id });
    else if (bit === '0') {
      literals.push({
        kind: 'operation',
        operator: 'NOT',
        operands: [{ kind: 'variable', variableId: variable.id }],
      });
    } else if (bit !== '-') throw new Error(`Invalid pattern symbol "${String(bit)}".`);
  }
  if (literals.length === 0) return { kind: 'constant', value: 1 };
  if (literals.length === 1) return literals[0] ?? { kind: 'constant', value: 1 };
  return { kind: 'operation', operator: 'AND', operands: literals };
}

export function termsToSum(terms: readonly BooleanExpression[]): BooleanExpression {
  if (terms.length === 0) return { kind: 'constant', value: 0 };
  if (terms.length === 1) return terms[0] ?? { kind: 'constant', value: 0 };
  return { kind: 'operation', operator: 'OR', operands: terms };
}

export function getVariables(expression: BooleanExpression): string[] {
  const variables = new Set<string>();
  const visit = (node: BooleanExpression): void => {
    if (node.kind === 'variable') variables.add(node.variableId);
    else if (node.kind === 'operation') node.operands.forEach(visit);
  };
  visit(expression);
  return [...variables].sort((left, right) => left.localeCompare(right));
}
