import type { CSSProperties } from 'react';
import type { KMap as KMapModel, KMapGroup } from '../core';
import { KMapCell } from './KMapCell';
import { KMapHeader } from './KMapHeader';

interface KMapProps {
  map: KMapModel;
  groups: readonly KMapGroup[];
  highlightedCells?: readonly number[] | undefined;
  onCycleCell: (index: number) => void;
}

interface GridProps extends KMapProps {
  columnLabels: readonly string[];
  columnVariables: string;
  plane?: 0 | 1;
}

function MapGrid({
  map,
  groups,
  highlightedCells = [],
  onCycleCell,
  columnLabels,
  columnVariables,
  plane,
}: GridProps) {
  const rowVariables = map.variables
    .slice(0, map.layout.rowVariableCount)
    .map(({ name }) => name)
    .join('');
  const style = { '--kmap-columns': columnLabels.length } as CSSProperties;
  return (
    <section
      className="map-plane"
      aria-label={plane === undefined ? 'Karnaugh map' : `Karnaugh map plane C equals ${plane}`}
      style={style}
    >
      <KMapHeader
        columnLabels={columnLabels}
        columnVariables={columnVariables}
        planeLabel={plane === undefined ? undefined : `C = ${plane}`}
        rowVariables={rowVariables}
      />
      <div className="map-body">
        <div className="row-axis-title">Row variables · {rowVariables}</div>
        <div className="map-rows">
          {map.layout.rowLabels.map((rowLabel, row) => (
            <div className="map-row" key={rowLabel} style={style}>
              <code className="row-label">{rowLabel}</code>
              {columnLabels.map((columnLabel, column) => {
                const binary =
                  plane === undefined
                    ? `${rowLabel}${columnLabel}`
                    : `${rowLabel}${plane}${columnLabel}`;
                const index = Number.parseInt(binary, 2);
                const cell = map.cells.flat().find(({ termIndex }) => termIndex === index);
                if (!cell) return null;
                return (
                  <KMapCell
                    binary={binary}
                    groups={groups}
                    highlighted={highlightedCells.includes(index)}
                    index={index}
                    key={`${row}-${column}`}
                    onCycle={onCycleCell}
                    value={cell.value}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KMap({ map, groups, highlightedCells = [], onCycleCell }: KMapProps) {
  if (map.variables.length === 5) {
    const deLabels = ['00', '01', '11', '10'];
    return (
      <div className="five-variable-map" data-testid="five-variable-map">
        <MapGrid
          columnLabels={deLabels}
          columnVariables="DE"
          groups={groups}
          highlightedCells={highlightedCells}
          map={map}
          onCycleCell={onCycleCell}
          plane={0}
        />
        <MapGrid
          columnLabels={deLabels}
          columnVariables="DE"
          groups={groups}
          highlightedCells={highlightedCells}
          map={map}
          onCycleCell={onCycleCell}
          plane={1}
        />
      </div>
    );
  }
  const columnVariables = map.variables
    .slice(map.layout.rowVariableCount)
    .map(({ name }) => name)
    .join('');
  return (
    <MapGrid
      columnLabels={map.layout.columnLabels}
      columnVariables={columnVariables}
      groups={groups}
      highlightedCells={highlightedCells}
      map={map}
      onCycleCell={onCycleCell}
    />
  );
}
