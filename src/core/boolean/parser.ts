import type { AndNode, BooleanExpression, NotNode, OrNode } from '../types';

type TokenKind =
  'VARIABLE' | 'CONSTANT' | 'NOT' | 'AND' | 'OR' | 'LPAREN' | 'RPAREN' | 'APOSTROPHE' | 'EOF';

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly position: number;
}

export class BooleanExpressionSyntaxError extends SyntaxError {
  readonly position: number;

  constructor(message: string, position: number) {
    super(`${message} at position ${position + 1}.`);
    this.name = 'BooleanExpressionSyntaxError';
    this.position = position;
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  while (position < input.length) {
    const character = input[position] ?? '';
    if (/\s/.test(character)) {
      position += 1;
      continue;
    }
    const keyword = input.slice(position).match(/^(AND|OR|NOT)\b/i)?.[0];
    if (keyword) {
      tokens.push({ kind: keyword.toUpperCase() as 'AND' | 'OR' | 'NOT', text: keyword, position });
      position += keyword.length;
      continue;
    }
    if (/[A-Za-z]/.test(character))
      tokens.push({ kind: 'VARIABLE', text: character.toUpperCase(), position });
    else if (character === '0' || character === '1')
      tokens.push({ kind: 'CONSTANT', text: character, position });
    else if (character === '!' || character === '~')
      tokens.push({ kind: 'NOT', text: character, position });
    else if (character === '*') tokens.push({ kind: 'AND', text: character, position });
    else if (character === '+' || character === '|')
      tokens.push({ kind: 'OR', text: character, position });
    else if (character === '(') tokens.push({ kind: 'LPAREN', text: character, position });
    else if (character === ')') tokens.push({ kind: 'RPAREN', text: character, position });
    else if (character === "'") tokens.push({ kind: 'APOSTROPHE', text: character, position });
    else throw new BooleanExpressionSyntaxError(`Unexpected character "${character}"`, position);
    position += 1;
  }
  tokens.push({ kind: 'EOF', text: '', position: input.length });
  return tokens;
}

function combine(
  operator: 'AND' | 'OR',
  left: BooleanExpression,
  right: BooleanExpression,
): AndNode | OrNode {
  const operands =
    left.kind === 'operation' && left.operator === operator
      ? [...left.operands, right]
      : [left, right];
  return { kind: 'operation', operator, operands };
}

class Parser {
  private current = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): BooleanExpression {
    const expression = this.parseOr();
    const token = this.peek();
    if (token.kind !== 'EOF') throw this.error(`Unexpected token "${token.text}"`, token);
    return expression;
  }

  private parseOr(): BooleanExpression {
    let expression = this.parseAnd();
    while (this.match('OR')) expression = combine('OR', expression, this.parseAnd());
    return expression;
  }

  private parseAnd(): BooleanExpression {
    let expression = this.parseUnary();
    while (true) {
      if (this.match('AND')) expression = combine('AND', expression, this.parseUnary());
      else if (this.startsOperand(this.peek().kind))
        expression = combine('AND', expression, this.parseUnary());
      else break;
    }
    return expression;
  }

  private parseUnary(): BooleanExpression {
    if (this.match('NOT')) return this.not(this.parseUnary());
    let expression = this.parsePrimary();
    while (this.match('APOSTROPHE')) expression = this.not(expression);
    return expression;
  }

  private parsePrimary(): BooleanExpression {
    const token = this.advance();
    if (token.kind === 'VARIABLE') return { kind: 'variable', variableId: token.text };
    if (token.kind === 'CONSTANT') return { kind: 'constant', value: token.text === '1' ? 1 : 0 };
    if (token.kind === 'LPAREN') {
      const expression = this.parseOr();
      const closing = this.peek();
      if (!this.match('RPAREN')) throw this.error('Expected closing parenthesis', closing);
      return expression;
    }
    if (token.kind === 'EOF')
      throw this.error('Expected a variable, constant, or parenthesized expression', token);
    throw this.error(`Expected an operand but found "${token.text}"`, token);
  }

  private not(operand: BooleanExpression): NotNode {
    return { kind: 'operation', operator: 'NOT', operands: [operand] };
  }

  private startsOperand(kind: TokenKind): boolean {
    return kind === 'VARIABLE' || kind === 'CONSTANT' || kind === 'NOT' || kind === 'LPAREN';
  }

  private match(kind: TokenKind): boolean {
    if (this.peek().kind !== kind) return false;
    this.current += 1;
    return true;
  }

  private advance(): Token {
    const token = this.peek();
    if (token.kind !== 'EOF') this.current += 1;
    return token;
  }

  private peek(): Token {
    return this.tokens[this.current] ?? { kind: 'EOF', text: '', position: 0 };
  }

  private error(message: string, token: Token): BooleanExpressionSyntaxError {
    return new BooleanExpressionSyntaxError(message, token.position);
  }
}

export function parseBooleanExpression(input: string): BooleanExpression {
  if (input.trim() === '') throw new BooleanExpressionSyntaxError('Expression cannot be empty', 0);
  return new Parser(tokenize(input)).parse();
}

export function parseBooleanFunction(input: string): BooleanExpression {
  const trimmed = input.trim();
  const equalsCount = [...trimmed].filter((character) => character === '=').length;
  if (equalsCount === 0) return parseBooleanExpression(trimmed);
  if (equalsCount !== 1)
    throw new BooleanExpressionSyntaxError('Expected a single assignment', trimmed.indexOf('='));
  const assignment = trimmed.match(/^([A-Za-z])\s*=\s*(.*)$/);
  if (!assignment)
    throw new BooleanExpressionSyntaxError(
      'Use an assignment such as F = A + B',
      trimmed.indexOf('='),
    );
  const outputName = assignment[1]?.toUpperCase();
  if (outputName !== 'F')
    throw new BooleanExpressionSyntaxError('The output variable must be F', 0);
  const source = assignment[2] ?? '';
  const expression = parseBooleanExpression(source);
  if (getVariablesFromNode(expression).includes('F')) {
    throw new BooleanExpressionSyntaxError(
      'F cannot reference itself on the right side',
      trimmed.indexOf('=') + 1,
    );
  }
  return expression;
}

function getVariablesFromNode(expression: BooleanExpression): string[] {
  if (expression.kind === 'variable') return [expression.variableId];
  if (expression.kind === 'constant') return [];
  return [...new Set(expression.operands.flatMap(getVariablesFromNode))];
}
