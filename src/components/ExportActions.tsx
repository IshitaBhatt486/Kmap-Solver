import { useState } from 'react';
import type { SolverResult, TruthTable } from '../core';
import {
  downloadKMapPng,
  downloadText,
  kMapToSvg,
  solutionExpressionText,
  solutionVerilogText,
  truthTableToCsv,
} from '../utils/export';

interface ExportActionsProps {
  solution?: SolverResult | undefined;
  truthTable: TruthTable;
  onPrint: () => void;
}
type Feedback = 'expression' | 'truth' | 'verilog' | undefined;

export function ExportActions({ solution, truthTable, onPrint }: ExportActionsProps) {
  const [feedback, setFeedback] = useState<Feedback>();
  const [mapFormat, setMapFormat] = useState<'svg' | 'png'>('svg');
  const copy = async (kind: Exclude<Feedback, undefined>, value: string) => {
    await navigator.clipboard.writeText(value);
    setFeedback(kind);
  };
  const svg = solution ? kMapToSvg(solution.kMap, solution.groups) : '';
  return (
    <div className="export-actions" aria-label="Export and sharing">
      <button
        disabled={!solution}
        onClick={() => solution && void copy('expression', solutionExpressionText(solution))}
        type="button"
      >
        {feedback === 'expression' ? 'Expression copied ✓' : 'Copy Expression'}
      </button>
      <button onClick={() => void copy('truth', truthTableToCsv(truthTable))} type="button">
        {feedback === 'truth' ? 'Truth table copied ✓' : 'Copy Truth Table'}
      </button>
      <button
        disabled={!solution}
        onClick={() => solution && void copy('verilog', solutionVerilogText(solution))}
        type="button"
      >
        {feedback === 'verilog' ? 'Verilog copied ✓' : 'Copy Verilog'}
      </button>
      <button
        onClick={() =>
          downloadText(
            truthTableToCsv(truthTable),
            'logic-function-truth-table.csv',
            'text/csv;charset=utf-8',
          )
        }
        type="button"
      >
        Download CSV
      </button>
      <button
        disabled={!solution}
        onClick={() =>
          solution &&
          downloadText(
            solutionVerilogText(solution),
            'logic-function.v',
            'text/x-verilog;charset=utf-8',
          )
        }
        type="button"
      >
        Download Verilog
      </button>
      <div className="map-export-control">
        <label htmlFor="map-export-format">K-map</label>
        <select
          id="map-export-format"
          onChange={(event) => setMapFormat(event.target.value as 'svg' | 'png')}
          value={mapFormat}
        >
          <option value="svg">SVG</option>
          <option value="png">PNG</option>
        </select>
        <button
          disabled={!solution}
          onClick={() => {
            if (!solution) return;
            if (mapFormat === 'svg')
              downloadText(svg, 'logic-function-kmap.svg', 'image/svg+xml;charset=utf-8');
            else void downloadKMapPng(svg, 'logic-function-kmap.png');
          }}
          type="button"
        >
          Export K-map
        </button>
      </div>
      <button className="print-action" disabled={!solution} onClick={onPrint} type="button">
        Print Solution
      </button>
    </div>
  );
}
