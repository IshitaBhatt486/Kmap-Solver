import { describe, expect, it } from 'vitest';
import { generateKMap, mintermsToTruthTable, solveKMap } from '../core';
import { kMapToSvg, solutionExpressionText, solutionVerilogText, truthTableToCsv } from './export';

const variables = ['A', 'B'].map((name, position) => ({ id: name, name, position }));

describe('solution export serialization', () => {
  it('creates deterministic RFC-style CSV rows in binary order', () => {
    const table = mintermsToTruthTable(variables, [1], [2]);
    expect(truthTableToCsv(table)).toBe('Index,A,B,F\n0,0,0,0\n1,0,1,1\n2,1,0,X\n3,1,1,0');
  });

  it('exports a standalone SVG K-map with values and group outlines', () => {
    const solution = solveKMap({ variableCount: 2, variables, minterms: [0, 1] });
    const svg = kMapToSvg(
      generateKMap({ variableCount: 2, variables, minterms: [0, 1] }),
      solution.groups,
    );
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).toContain('aria-label="Karnaugh map"');
    expect(svg).toContain('m0');
    expect(svg).toContain('stroke-width="3"');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('exports expression and Verilog from the selected solver result', () => {
    const solution = solveKMap({ variableCount: 2, variables, minterms: [0, 1] });
    expect(solutionExpressionText(solution)).toBe("F = A'");
    expect(solutionVerilogText(solution)).toContain('assign F = ~A;');
  });
});
