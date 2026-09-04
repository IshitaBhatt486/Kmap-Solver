import { describe, expect, it } from 'vitest';
import {
  areBooleanExpressionsEquivalent,
  areKMapCellsAdjacent,
  booleanExpressionToVerilog,
  evaluateBooleanExpression,
  evaluateCircuit,
  expressionToCircuit,
  generateKMap,
  generateKMapLayout,
  getVariables,
  indexToKMapCoordinate,
  kMapCoordinateToIndex,
  parseBooleanExpression,
  solveKMap,
} from '../core';
import type { BooleanExpression, LogicValue, Variable } from '../core';

function variables(count: number): Variable[] {
  return Array.from({ length: count }, (_, position) => {
    const name = String.fromCharCode(65 + position);
    return { id: name, name, position };
  });
}

function evaluateAt(
  expression: BooleanExpression,
  vars: readonly Variable[],
  index: number,
): LogicValue {
  const bits = index.toString(2).padStart(vars.length, '0');
  return evaluateBooleanExpression(
    expression,
    Object.fromEntries(
      vars.map((variable, position) => [variable.id, bits[position] === '1' ? 1 : 0]),
    ),
  );
}

function verifyFunction(
  count: number,
  minterms: readonly number[],
  dontCares: readonly number[] = [],
): void {
  const vars = variables(count);
  const result = solveKMap({ variableCount: count, variables: vars, minterms, dontCares });
  const ones = new Set(minterms);
  const ignored = new Set(dontCares);
  for (let index = 0; index < 2 ** count; index += 1) {
    if (!ignored.has(index))
      expect(evaluateAt(result.expression, vars, index)).toBe(ones.has(index) ? 1 : 0);
  }
  result.groups.forEach((group) => {
    expect(group.size & (group.size - 1)).toBe(0);
    expect(group.cellIndices.every((index) => ones.has(index) || ignored.has(index))).toBe(true);
  });
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('engineering audit matrix', () => {
  it.each([2, 3, 4, 5])('covers major %i-variable function classes', (count) => {
    const size = 2 ** count;
    const all = Array.from({ length: size }, (_, index) => index);
    const wrapA = kMapCoordinateToIndex({ row: 0, column: 0 }, count);
    const wrapB = kMapCoordinateToIndex(
      { row: 0, column: generateKMapLayout(count).columns - 1 },
      count,
    );
    const cases = [
      { name: 'all zeros', minterms: [] },
      { name: 'all ones', minterms: all },
      { name: 'single minterm', minterms: [Math.min(1, size - 1)] },
      { name: 'single maxterm', minterms: all.filter((index) => index !== size - 1) },
      { name: 'adjacent group', minterms: [0, 1] },
      { name: 'wrap-around group', minterms: [wrapA, wrapB] },
      { name: 'overlapping cover', minterms: all.filter((index) => index % 3 !== 0) },
      {
        name: 'dont-care-heavy',
        minterms: [0],
        dontCares: all.slice(1, Math.min(size, 1 + size / 2)),
      },
    ];
    cases.forEach(({ minterms, dontCares }) => verifyFunction(count, minterms, dontCares));
    expect(areKMapCellsAdjacent(wrapA, wrapB, count)).toBe(true);
  });

  it('retains multiple optimal solutions and verifies every alternative', () => {
    const minterms = [0, 1, 2, 5, 6, 7];
    const result = solveKMap({ variableCount: 3, variables: variables(3), minterms });
    expect(result.alternativeExpressions.length).toBeGreaterThan(0);
    result.alternativeExpressions.forEach((expression) => {
      expect(areBooleanExpressionsEquivalent(result.expression, expression, variables(3))).toBe(
        true,
      );
    });
  });

  it('round-trips every index through Gray coordinates for all supported sizes', () => {
    for (let count = 2; count <= 5; count += 1) {
      const map = generateKMap({ variableCount: count, variables: variables(count), minterms: [] });
      for (let index = 0; index < 2 ** count; index += 1) {
        expect(kMapCoordinateToIndex(indexToKMapCoordinate(index, count), count)).toBe(index);
      }
      [map.layout.rowLabels, map.layout.columnLabels].forEach((labels) => {
        labels.slice(1).forEach((label, index) => {
          const previous = labels[index];
          expect([...label].filter((bit, bitIndex) => bit !== previous?.[bitIndex])).toHaveLength(
            1,
          );
        });
        const first = labels[0];
        const last = labels.at(-1);
        expect([...(first ?? '')].filter((bit, bitIndex) => bit !== last?.[bitIndex])).toHaveLength(
          1,
        );
      });
    }
  });
});

describe('deterministic property testing', () => {
  it.each([2, 3, 4, 5])(
    'preserves random %i-variable functions through solver, circuit, and Verilog',
    (count) => {
      const random = seeded(0xa11d17 + count);
      const vars = variables(count);
      const size = 2 ** count;
      for (let sample = 0; sample < 40; sample += 1) {
        const minterms = Array.from({ length: size }, (_, index) => index).filter(
          () => random() < 0.48,
        );
        const solved = solveKMap({ variableCount: count, variables: vars, minterms });
        const circuit = expressionToCircuit(solved.expression, vars);
        const verilogExpression = booleanExpressionToVerilog(solved.expression);
        const reparsedVerilog = parseBooleanExpression(
          verilogExpression.replaceAll('&', '*').replaceAll("1'b", ''),
        );
        for (let index = 0; index < size; index += 1) {
          const bits = index.toString(2).padStart(count, '0');
          const values = Object.fromEntries(
            vars.map((variable, position) => [variable.id, bits[position] === '1' ? 1 : 0]),
          ) as Record<string, LogicValue>;
          const expected = minterms.includes(index) ? 1 : 0;
          expect(evaluateBooleanExpression(solved.expression, values)).toBe(expected);
          expect(evaluateCircuit(circuit, values)).toBe(expected);
          expect(evaluateBooleanExpression(reparsedVerilog, values)).toBe(expected);
        }
      }
    },
  );

  it('preserves complex parsed ASTs through circuit and HDL representations', () => {
    const sources = ["(A+B')C + A'BC", 'NOT A AND (B OR C)', '(A+B)(C+D)', "A'B + CD + E(A+B')"];
    sources.forEach((source) => {
      const ast = parseBooleanExpression(source);
      const names = getVariables(ast);
      const vars = names.map((name, position) => ({ id: name, name, position }));
      const circuit = expressionToCircuit(ast, vars);
      const hdlAst = parseBooleanExpression(
        booleanExpressionToVerilog(ast).replaceAll('&', '*').replaceAll("1'b", ''),
      );
      for (let index = 0; index < 2 ** vars.length; index += 1) {
        const bits = index.toString(2).padStart(vars.length, '0');
        const values = Object.fromEntries(
          vars.map((variable, position) => [variable.id, bits[position] === '1' ? 1 : 0]),
        ) as Record<string, LogicValue>;
        const expected = evaluateBooleanExpression(ast, values);
        expect(evaluateCircuit(circuit, values)).toBe(expected);
        expect(evaluateBooleanExpression(hdlAst, values)).toBe(expected);
      }
    });
  });
});

describe('supported-range performance guardrails', () => {
  it('keeps parser, solver, and circuit generation within interactive budgets', () => {
    const source = "(A+B')C + A'BC + DE";
    const parseStart = performance.now();
    for (let index = 0; index < 500; index += 1) parseBooleanExpression(source);
    const parseElapsed = performance.now() - parseStart;
    const random = seeded(42);
    const vars = variables(5);
    const solveStart = performance.now();
    const results = Array.from({ length: 50 }, () =>
      solveKMap({
        variableCount: 5,
        variables: vars,
        minterms: Array.from({ length: 32 }, (_, index) => index).filter(() => random() < 0.5),
      }),
    );
    const solveElapsed = performance.now() - solveStart;
    const circuitStart = performance.now();
    results.forEach((result) => expressionToCircuit(result.expression, vars));
    const circuitElapsed = performance.now() - circuitStart;
    expect(parseElapsed).toBeLessThan(1000);
    expect(solveElapsed).toBeLessThan(5000);
    expect(circuitElapsed).toBeLessThan(1000);
  });
});
