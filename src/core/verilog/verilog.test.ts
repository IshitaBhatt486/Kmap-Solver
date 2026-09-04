import { describe, expect, it } from 'vitest';
import { parseBooleanExpression } from '../boolean';
import { booleanExpressionToVerilog, generateVerilog } from './index';

describe('Verilog HDL generation', () => {
  it('emits exact deterministic syntax for a known expression', () => {
    const result = generateVerilog(parseBooleanExpression("A'B + CD"));
    expect(result.module).toBe(`module logic_function (
  input wire A,
  input wire B,
  input wire C,
  input wire D,
  output wire F
);

  assign F = ~A & B | C & D;

endmodule`);
    expect(result.variables).toEqual(['A', 'B', 'C', 'D']);
  });

  it.each([
    ['A+B', 'A | B'],
    ['(A+B)C', '(A | B) & C'],
    ["!(A+B)+C'D", '~(A | B) | ~C & D'],
    ['ABCDE', 'A & B & C & D & E'],
  ])('preserves AST precedence for %s', (source, expected) => {
    expect(booleanExpressionToVerilog(parseBooleanExpression(source))).toBe(expected);
  });

  it.each(['A+B', 'AB+C', 'AB+CD', 'ABCDE'])(
    'creates a structurally complete 2–5 input module for %s',
    (source) => {
      const result = generateVerilog(parseBooleanExpression(source));
      expect(result.module).toMatch(/^module logic_function \(/);
      expect(result.variables.every((name) => result.module.includes(`input wire ${name}`))).toBe(
        true,
      );
      expect(result.module).toContain('output wire F');
      expect(result.module).toContain('assign F = ');
      expect(result.module.trimEnd().endsWith('endmodule')).toBe(true);
    },
  );

  it('generates an exhaustive deterministic testbench', () => {
    const first = generateVerilog(parseBooleanExpression('A+B+C'), { includeTestbench: true });
    const second = generateVerilog(parseBooleanExpression('A+B+C'), { includeTestbench: true });
    expect(first).toEqual(second);
    expect(first.testbench).toContain('module logic_function_tb;');
    expect(first.testbench).toContain('for (vector = 0; vector < 8; vector = vector + 1) begin');
    expect(first.testbench).toContain('.F(F)');
  });

  it('validates Verilog identifiers and output conflicts', () => {
    const expression = parseBooleanExpression('A+B');
    expect(() => generateVerilog(expression, { moduleName: 'bad-name' })).toThrow(
      /valid Verilog identifier/,
    );
    expect(() => generateVerilog(expression, { outputName: 'A' })).toThrow(/conflict/);
  });
});
