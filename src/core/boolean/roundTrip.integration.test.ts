import { describe, expect, it } from 'vitest';
import { solveKMap } from '../minimization';
import { evaluateBooleanExpression } from './expression';
import { parseBooleanExpression } from './parser';
import { expressionToTruthTable, truthTableToMinterms } from './truthTable';

function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function randomExpression(random: () => number, depth: number): string {
  const variables = ['A', 'B', 'C', 'D'];
  if (depth === 0 || random() < 0.3) {
    const variable = variables[Math.floor(random() * variables.length)] ?? 'A';
    return random() < 0.35 ? `${variable}'` : variable;
  }
  const left = randomExpression(random, depth - 1);
  const right = randomExpression(random, depth - 1);
  const operator = random() < 0.5 ? (random() < 0.5 ? '' : ' AND ') : random() < 0.5 ? '+' : ' OR ';
  return `(${left}${operator}${right})`;
}

describe('expression → table → minterms → solver integration', () => {
  it('preserves exhaustive truth-table equivalence for deterministic random valid expressions', () => {
    const random = generator(0xc0ffee);
    for (let sample = 0; sample < 100; sample += 1) {
      const source = randomExpression(random, 3);
      const original = parseBooleanExpression(source);
      const table = expressionToTruthTable(original, ['A', 'B', 'C', 'D']);
      const minterms = truthTableToMinterms(table);
      const solved = solveKMap({ variableCount: 4, variables: table.variables, minterms });

      table.rows.forEach((row) => {
        const values = Object.fromEntries(
          table.variables.map((variable, index) => [variable.id, row.inputs[index] ?? 0]),
        );
        expect(evaluateBooleanExpression(solved.expression, values)).toBe(
          evaluateBooleanExpression(original, values),
        );
      });
    }
  });
});
