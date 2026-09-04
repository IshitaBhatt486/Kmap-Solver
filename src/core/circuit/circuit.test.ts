import { describe, expect, it } from 'vitest';
import { evaluateBooleanExpression } from '../boolean';
import { getVariables, parseBooleanExpression } from '../boolean';
import type { LogicValue, Variable } from '../types';
import { evaluateCircuit, expressionToCircuit, layoutCircuit } from './index';

function variablesFor(source: string): {
  expression: ReturnType<typeof parseBooleanExpression>;
  variables: Variable[];
} {
  const expression = parseBooleanExpression(source);
  const variables = getVariables(expression).map((name, position) => ({
    id: name,
    name,
    position,
  }));
  return { expression, variables };
}

describe('Boolean AST to circuit graph', () => {
  it("creates the expected graph for A'B + CD", () => {
    const { expression, variables } = variablesFor("A'B + CD");
    const circuit = expressionToCircuit(expression, variables);
    expect(circuit.nodes.filter((node) => node.kind === 'input')).toHaveLength(4);
    expect(
      circuit.nodes
        .filter((node) => node.kind === 'gate')
        .map((node) => node.gateType)
        .sort(),
    ).toEqual(['AND', 'AND', 'NOT', 'OR']);
    expect(circuit.nodes.filter((node) => node.kind === 'output')).toHaveLength(1);
    expect(circuit.edges).toHaveLength(8);
    expect(circuit.nodes.find((node) => node.id === circuit.outputNodeId)?.label).toBe('F');
    for (const edge of circuit.edges) {
      expect(
        circuit.nodes.find((node) => node.id === edge.fromNodeId)?.outputConnections,
      ).toContain(edge.id);
      expect(circuit.nodes.find((node) => node.id === edge.toNodeId)?.inputConnections).toContain(
        edge.id,
      );
    }
  });

  it.each(["A'B + CD", '(A+B)C', '!A|B', 'AB+AC+BC', '(A+B)(C+D)', "A'B'C+ABC'"])(
    'matches AST evaluation exhaustively for %s',
    (source) => {
      const { expression, variables } = variablesFor(source);
      const circuit = expressionToCircuit(expression, variables);
      for (let index = 0; index < 2 ** variables.length; index += 1) {
        const bits = index.toString(2).padStart(variables.length, '0');
        const values = Object.fromEntries(
          variables.map((variable, position) => [variable.id, bits[position] === '1' ? 1 : 0]),
        ) as Record<string, LogicValue>;
        expect(evaluateCircuit(circuit, values)).toBe(
          evaluateBooleanExpression(expression, values),
        );
      }
    },
  );

  it('places inputs left of gates and the output on the right', () => {
    const { expression, variables } = variablesFor("A'B + CD");
    const layout = layoutCircuit(expressionToCircuit(expression, variables));
    const inputs = layout.nodes.filter((node) => node.kind === 'input');
    const output = layout.nodes.find((node) => node.kind === 'output');
    expect(output).toBeDefined();
    expect(inputs.every((node) => node.x < (output?.x ?? 0))).toBe(true);
  });
});
