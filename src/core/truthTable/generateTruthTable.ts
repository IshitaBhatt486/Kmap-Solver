import type { LogicValue, TruthTable, TruthValue, Variable } from '../types';

export type TruthTableOutput = (inputs: readonly LogicValue[], index: number) => TruthValue;

export function generateTruthTable(
  variables: readonly Variable[],
  output: TruthTableOutput = () => 0,
): TruthTable {
  if (variables.length === 0) throw new RangeError('At least one variable is required.');

  const positions = new Set(variables.map(({ position }) => position));
  const ids = new Set(variables.map(({ id }) => id));
  if (positions.size !== variables.length || ids.size !== variables.length) {
    throw new Error('Variable ids and positions must be unique.');
  }
  if (variables.some(({ position }, index) => position !== index)) {
    throw new Error('Variables must be ordered with contiguous positions starting at zero.');
  }

  const rows = Array.from({ length: 2 ** variables.length }, (_, index) => {
    const bitString = index.toString(2).padStart(variables.length, '0');
    const inputs = Array.from(bitString, (bit): LogicValue => (bit === '1' ? 1 : 0));
    return { index, inputs, output: output(inputs, index) };
  });

  return { variables: [...variables], rows };
}
