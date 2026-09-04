import { useMemo, useState } from 'react';
import { layoutCircuit } from '../core';
import type { Circuit, PositionedCircuitNode } from '../core';

interface CircuitDiagramProps {
  circuit: Circuit;
}

function Gate({ node }: { node: PositionedCircuitNode }) {
  if (node.kind === 'input' || node.kind === 'constant')
    return (
      <>
        <circle cx={node.x} cy={node.y} r="18" />
        <text x={node.x} y={node.y + 5}>
          {node.label}
        </text>
      </>
    );
  if (node.kind === 'output')
    return (
      <>
        <circle cx={node.x} cy={node.y} r="18" />
        <text x={node.x} y={node.y + 5}>
          {node.label}
        </text>
      </>
    );
  if (node.gateType === 'NOT')
    return (
      <>
        <path
          d={`M ${node.x - 28} ${node.y - 22} L ${node.x - 28} ${node.y + 22} L ${node.x + 18} ${node.y} Z`}
        />
        <circle cx={node.x + 24} cy={node.y} r="6" />
        <text x={node.x - 5} y={node.y - 31}>
          NOT
        </text>
      </>
    );
  return (
    <>
      <rect
        x={node.x - 34}
        y={node.y - 25}
        width="68"
        height="50"
        rx={node.gateType === 'OR' ? 24 : 4}
      />
      <text x={node.x} y={node.y + 5}>
        {node.gateType}
      </text>
    </>
  );
}

export function CircuitDiagram({ circuit }: CircuitDiagramProps) {
  const layout = useMemo(() => layoutCircuit(circuit), [circuit]);
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));
  const [zoom, setZoom] = useState(1);
  const [animated, setAnimated] = useState(false);
  const viewWidth = layout.width / zoom;
  const viewHeight = layout.height / zoom;
  const x = (layout.width - viewWidth) / 2;
  const y = (layout.height - viewHeight) / 2;
  const inputs = circuit.nodes.filter((node) => node.kind === 'input').length;
  const gates = circuit.nodes.filter((node) => node.kind === 'gate').length;
  const outputs = circuit.nodes.filter((node) => node.kind === 'output').length;

  return (
    <section className="circuit-workspace" aria-label="Logic circuit">
      <div className="circuit-toolbar">
        <div className="circuit-counts" aria-label="Circuit summary">
          <span>
            <strong>{inputs}</strong> Inputs
          </span>
          <span>
            <strong>{gates}</strong> Gates
          </span>
          <span>
            <strong>{outputs}</strong> Outputs
          </span>
        </div>
        <div className="circuit-controls">
          <button
            aria-label="Zoom out"
            disabled={zoom <= 0.6}
            onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}
            type="button"
          >
            −
          </button>
          <output aria-label="Circuit zoom">{Math.round(zoom * 100)}%</output>
          <button
            aria-label="Zoom in"
            disabled={zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.2))}
            type="button"
          >
            +
          </button>
          <button onClick={() => setZoom(1)} type="button">
            Fit to screen
          </button>
          <label>
            <input
              checked={animated}
              onChange={(event) => setAnimated(event.target.checked)}
              type="checkbox"
            />{' '}
            Signal animation
          </label>
        </div>
      </div>
      <div className="circuit-canvas">
        <svg
          className={animated ? 'signal-animated' : ''}
          data-testid="circuit-svg"
          role="img"
          aria-label="Generated logic circuit"
          viewBox={`${x} ${y} ${viewWidth} ${viewHeight}`}
        >
          <g className="circuit-edges">
            {circuit.edges.map((edge) => {
              const from = positions.get(edge.fromNodeId);
              const to = positions.get(edge.toNodeId);
              if (!from || !to) return null;
              const endX = to.kind === 'output' ? to.x - 18 : to.x - 34;
              const startX =
                from.kind === 'input' || from.kind === 'output' ? from.x + 18 : from.x + 34;
              const bend = startX + (endX - startX) / 2;
              return (
                <path
                  data-from={edge.fromNodeId}
                  data-to={edge.toNodeId}
                  d={`M ${startX} ${from.y} C ${bend} ${from.y}, ${bend} ${to.y}, ${endX} ${to.y}`}
                  key={edge.id}
                />
              );
            })}
          </g>
          <g className="circuit-nodes">
            {layout.nodes.map((node) => (
              <g data-kind={node.kind} data-gate={node.gateType} key={node.id}>
                <Gate node={node} />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}
