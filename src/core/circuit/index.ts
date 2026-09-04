import type {
  BooleanExpression,
  Circuit,
  CircuitEdge,
  CircuitNode,
  LogicValue,
  Variable,
} from '../types';

export interface PositionedCircuitNode extends CircuitNode {
  readonly x: number;
  readonly y: number;
  readonly layer: number;
}

export interface CircuitLayout {
  readonly nodes: readonly PositionedCircuitNode[];
  readonly width: number;
  readonly height: number;
}

export function expressionToCircuit(
  expression: BooleanExpression,
  variables: readonly Variable[],
): Circuit {
  const drafts = new Map<string, Omit<CircuitNode, 'inputConnections' | 'outputConnections'>>();
  const edgeDrafts: Omit<CircuitEdge, 'id'>[] = [];
  let serial = 0;
  for (const variable of variables) {
    drafts.set(`input-${variable.id}`, {
      id: `input-${variable.id}`,
      kind: 'input',
      variableId: variable.id,
      label: variable.name,
    });
  }

  const compile = (node: BooleanExpression): string => {
    if (node.kind === 'variable') {
      const id = `input-${node.variableId}`;
      if (!drafts.has(id)) throw new Error(`Unknown circuit variable "${node.variableId}".`);
      return id;
    }
    if (node.kind === 'constant') {
      const id = `constant-${node.value}`;
      if (!drafts.has(id))
        drafts.set(id, { id, kind: 'constant', value: node.value, label: String(node.value) });
      return id;
    }
    if (node.operator === 'XOR')
      throw new Error('Circuit generation currently supports NOT, AND, and OR gates.');
    const id = `gate-${serial++}`;
    drafts.set(id, { id, kind: 'gate', gateType: node.operator, label: node.operator });
    node.operands.forEach((operand, toInput) =>
      edgeDrafts.push({ fromNodeId: compile(operand), toNodeId: id, toInput }),
    );
    return id;
  };

  const resultId = compile(expression);
  const outputNodeId = 'output-F';
  drafts.set(outputNodeId, { id: outputNodeId, kind: 'output', label: 'F' });
  edgeDrafts.push({ fromNodeId: resultId, toNodeId: outputNodeId, toInput: 0 });
  const edges = edgeDrafts.map((edge, index) => ({ id: `edge-${index}`, ...edge }));
  const nodes = [...drafts.values()].map((node) => ({
    ...node,
    inputConnections: edges
      .filter((edge) => edge.toNodeId === node.id)
      .sort((a, b) => a.toInput - b.toInput)
      .map((edge) => edge.id),
    outputConnections: edges.filter((edge) => edge.fromNodeId === node.id).map((edge) => edge.id),
  }));
  return { nodes, edges, connections: edges, outputNodeId };
}

export function evaluateCircuit(
  circuit: Circuit,
  values: Readonly<Record<string, LogicValue>>,
): LogicValue {
  const nodes = new Map(circuit.nodes.map((node) => [node.id, node]));
  const memo = new Map<string, LogicValue>();
  const visit = (id: string): LogicValue => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const node = nodes.get(id);
    if (!node) throw new Error(`Circuit edge references missing node "${id}".`);
    let result: LogicValue;
    if (node.kind === 'input') {
      const value = node.variableId ? values[node.variableId] : undefined;
      if (value === undefined) throw new Error(`Missing value for input "${node.label ?? id}".`);
      result = value;
    } else if (node.kind === 'constant') result = node.value ?? 0;
    else {
      const inputs = node.inputConnections.map((edgeId) => {
        const edge = circuit.edges.find((candidate) => candidate.id === edgeId);
        if (!edge) throw new Error(`Missing circuit edge "${edgeId}".`);
        return visit(edge.fromNodeId);
      });
      if (node.kind === 'output') result = inputs[0] ?? 0;
      else if (node.gateType === 'NOT') result = inputs[0] === 1 ? 0 : 1;
      else if (node.gateType === 'AND') result = inputs.every((value) => value === 1) ? 1 : 0;
      else if (node.gateType === 'OR') result = inputs.some((value) => value === 1) ? 1 : 0;
      else throw new Error(`Invalid gate "${node.id}".`);
    }
    memo.set(id, result);
    return result;
  };
  return visit(circuit.outputNodeId);
}

export function layoutCircuit(circuit: Circuit): CircuitLayout {
  const nodes = new Map(circuit.nodes.map((node) => [node.id, node]));
  const depthMemo = new Map<string, number>();
  const depth = (id: string): number => {
    const cached = depthMemo.get(id);
    if (cached !== undefined) return cached;
    const node = nodes.get(id);
    if (!node) return 0;
    const incoming = circuit.edges.filter((edge) => edge.toNodeId === id);
    const value =
      incoming.length === 0 ? 0 : Math.max(...incoming.map((edge) => depth(edge.fromNodeId) + 1));
    depthMemo.set(id, value);
    return value;
  };
  circuit.nodes.forEach((node) => depth(node.id));
  const maxDepth = Math.max(...depthMemo.values(), 1);
  const layers = new Map<number, CircuitNode[]>();
  circuit.nodes.forEach((node) => {
    const layer = depthMemo.get(node.id) ?? 0;
    layers.set(layer, [...(layers.get(layer) ?? []), node]);
  });
  const rowGap = 82;
  const height = Math.max(
    180,
    Math.max(...[...layers.values()].map((layer) => layer.length)) * rowGap + 70,
  );
  const positioned = circuit.nodes.map((node) => {
    const layer = depthMemo.get(node.id) ?? 0;
    const peers = layers.get(layer) ?? [];
    const index = peers.findIndex((peer) => peer.id === node.id);
    return { ...node, layer, x: 70 + layer * 180, y: ((index + 1) * height) / (peers.length + 1) };
  });
  return { nodes: positioned, width: 140 + maxDepth * 180, height };
}
