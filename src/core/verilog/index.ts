import { getVariables } from '../boolean';
import type { BooleanExpression } from '../types';

export interface VerilogOptions {
  readonly moduleName?: string;
  readonly outputName?: string;
  readonly includeTestbench?: boolean;
}
export interface VerilogResult {
  readonly moduleName: string;
  readonly variables: readonly string[];
  readonly module: string;
  readonly testbench?: string;
  readonly source: string;
}
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;
function assertIdentifier(value: string, label: string): void {
  if (!IDENTIFIER.test(value))
    throw new Error(`${label} "${value}" is not a valid Verilog identifier.`);
}

export function booleanExpressionToVerilog(expression: BooleanExpression): string {
  const render = (node: BooleanExpression, parentPrecedence = 0): string => {
    if (node.kind === 'constant') return `1'b${node.value}`;
    if (node.kind === 'variable') {
      assertIdentifier(node.variableId, 'Variable');
      return node.variableId;
    }
    if (node.operator === 'XOR')
      throw new Error('Verilog generation supports only NOT, AND, and OR expressions.');
    const precedence = node.operator === 'OR' ? 1 : node.operator === 'AND' ? 2 : 3;
    let result: string;
    if (node.operator === 'NOT') {
      const operand = node.operands[0];
      if (!operand) throw new Error('NOT requires exactly one operand.');
      result = `~${render(operand, precedence)}`;
    } else {
      const operator = node.operator === 'AND' ? ' & ' : ' | ';
      result = node.operands.map((operand) => render(operand, precedence)).join(operator);
    }
    return precedence < parentPrecedence ? `(${result})` : result;
  };
  return render(expression);
}

export function generateVerilog(
  expression: BooleanExpression,
  options: VerilogOptions = {},
): VerilogResult {
  const moduleName = options.moduleName ?? 'logic_function';
  const outputName = options.outputName ?? 'F';
  assertIdentifier(moduleName, 'Module name');
  assertIdentifier(outputName, 'Output name');
  const variables = getVariables(expression);
  variables.forEach((variable) => assertIdentifier(variable, 'Variable'));
  if (variables.includes(outputName))
    throw new Error('Output name must not conflict with an input variable.');
  const ports = [
    ...variables.map((variable) => `  input wire ${variable}`),
    `  output wire ${outputName}`,
  ];
  const module = [
    `module ${moduleName} (`,
    ports.map((port, index) => `${port}${index < ports.length - 1 ? ',' : ''}`).join('\n'),
    ');',
    '',
    `  assign ${outputName} = ${booleanExpressionToVerilog(expression)};`,
    '',
    'endmodule',
  ].join('\n');
  const testbench = options.includeTestbench
    ? generateVerilogTestbench(moduleName, variables, outputName)
    : undefined;
  return {
    moduleName,
    variables,
    module,
    ...(testbench ? { testbench } : {}),
    source: testbench ? `${module}\n\n${testbench}` : module,
  };
}

export function generateVerilogTestbench(
  moduleName: string,
  variables: readonly string[],
  outputName = 'F',
): string {
  assertIdentifier(moduleName, 'Module name');
  assertIdentifier(outputName, 'Output name');
  variables.forEach((variable) => assertIdentifier(variable, 'Variable'));
  if (variables.length > 5)
    throw new RangeError('Enumerated testbenches support at most 5 inputs.');
  const width = Math.max(variables.length, 1);
  const assignments = variables.map(
    (variable, index) => `      ${variable} = vector[${variables.length - index - 1}];`,
  );
  return [
    `module ${moduleName}_tb;`,
    '',
    ...variables.map((variable) => `  reg ${variable};`),
    `  wire ${outputName};`,
    `  reg [${width - 1}:0] vector;`,
    '',
    `  ${moduleName} dut (`,
    [...variables, outputName]
      .map((name, index, ports) => `    .${name}(${name})${index < ports.length - 1 ? ',' : ''}`)
      .join('\n'),
    '  );',
    '',
    '  initial begin',
    `    for (vector = 0; vector < ${2 ** variables.length}; vector = vector + 1) begin`,
    ...assignments,
    '      #1;',
    '    end',
    '    $finish;',
    '  end',
    '',
    'endmodule',
  ].join('\n');
}
