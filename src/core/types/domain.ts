export type LogicValue = 0 | 1;
export type TruthValue = LogicValue | 'X';

export interface Variable {
  readonly id: string;
  readonly name: string;
  readonly position: number;
}

export interface Minterm {
  readonly kind: 'minterm';
  readonly index: number;
}

export interface Maxterm {
  readonly kind: 'maxterm';
  readonly index: number;
}

export interface DontCare {
  readonly kind: 'dont-care';
  readonly index: number;
}

export interface TruthTableRow {
  readonly index: number;
  readonly inputs: readonly LogicValue[];
  readonly output: TruthValue;
}

export interface TruthTable {
  readonly variables: readonly Variable[];
  readonly rows: readonly TruthTableRow[];
}

export interface KMapCoordinate {
  readonly row: number;
  readonly column: number;
}

export interface KMapLayout {
  readonly variableCount: number;
  readonly rowVariableCount: number;
  readonly columnVariableCount: number;
  readonly rowVariableIndices: readonly number[];
  readonly columnVariableIndices: readonly number[];
  readonly rowLabels: readonly string[];
  readonly columnLabels: readonly string[];
  readonly rows: number;
  readonly columns: number;
}

export interface KMapCell {
  readonly coordinate: KMapCoordinate;
  readonly termIndex: number;
  readonly value: TruthValue;
}

export interface KMap {
  readonly variables: readonly Variable[];
  readonly layout: KMapLayout;
  readonly cells: readonly (readonly KMapCell[])[];
}

export interface KMapGroup {
  readonly id: string;
  readonly cellIndices: readonly number[];
  readonly coordinates: readonly KMapCoordinate[];
  readonly coveredMinterms: readonly number[];
  /** `0`, `1`, or `-` (eliminated variable), in variable-position order. */
  readonly variablePattern: string;
  readonly term: BooleanExpression;
  readonly size: number;
  readonly isPrime: boolean;
  readonly isEssential: boolean;
  readonly wrapsRows: boolean;
  readonly wrapsColumns: boolean;
}

export type BooleanOperator = 'AND' | 'OR' | 'NOT' | 'XOR';

export interface ConstantNode {
  readonly kind: 'constant';
  readonly value: LogicValue;
}

export interface VariableNode {
  readonly kind: 'variable';
  readonly variableId: string;
}

export interface NotNode {
  readonly kind: 'operation';
  readonly operator: 'NOT';
  readonly operands: readonly [BooleanExpression];
}

export interface AndNode {
  readonly kind: 'operation';
  readonly operator: 'AND';
  readonly operands: readonly BooleanExpression[];
}

export interface OrNode {
  readonly kind: 'operation';
  readonly operator: 'OR';
  readonly operands: readonly BooleanExpression[];
}

export interface XorNode {
  readonly kind: 'operation';
  readonly operator: 'XOR';
  readonly operands: readonly BooleanExpression[];
}

export type BooleanExpression = ConstantNode | VariableNode | NotNode | AndNode | OrNode | XorNode;

export interface CircuitNode {
  readonly id: string;
  readonly kind: 'input' | 'constant' | 'gate' | 'output';
  readonly gateType?: 'NOT' | 'AND' | 'OR';
  readonly variableId?: string;
  readonly value?: LogicValue;
  readonly label?: string;
  readonly inputConnections: readonly string[];
  readonly outputConnections: readonly string[];
}

export interface CircuitEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly toInput: number;
}

export type CircuitConnection = CircuitEdge;

export interface Circuit {
  readonly nodes: readonly CircuitNode[];
  readonly edges: readonly CircuitEdge[];
  /** Compatibility alias for graph consumers. */
  readonly connections: readonly CircuitEdge[];
  readonly outputNodeId: string;
}

export interface SolverStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly highlightedCells: readonly number[];
  readonly highlightedGroups: readonly string[];
  readonly generatedTerms: readonly BooleanExpression[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolverResult {
  readonly kMap: KMap;
  /** Groups selected by the canonical optimal solution. */
  readonly groups: readonly KMapGroup[];
  readonly primeGroups: readonly KMapGroup[];
  readonly essentialGroups: readonly KMapGroup[];
  readonly coveredMinterms: readonly number[];
  readonly expression: BooleanExpression;
  readonly alternativeExpressions: readonly BooleanExpression[];
  readonly alternativeGroupings: readonly (readonly KMapGroup[])[];
  readonly steps: readonly SolverStep[];
  readonly circuit?: Circuit;
  readonly verilog?: string;
}

export interface MintermSolverInput {
  readonly variableCount: number;
  readonly variables?: readonly Variable[];
  readonly minterms: readonly number[];
  readonly dontCares?: readonly number[];
  readonly maxterms?: never;
}

export interface MaxtermSolverInput {
  readonly variableCount: number;
  readonly variables?: readonly Variable[];
  readonly maxterms: readonly number[];
  readonly dontCares?: readonly number[];
  readonly minterms?: never;
}

export type SolverInput = MintermSolverInput | MaxtermSolverInput;
