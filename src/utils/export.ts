import { booleanExpressionToString, generateVerilog } from '../core';
import type { KMap, KMapGroup, SolverResult, TruthTable } from '../core';

export function truthTableToCsv(table: TruthTable): string {
  const header = ['Index', ...table.variables.map(({ name }) => name), 'F'].join(',');
  const rows = table.rows.map((row) => [row.index, ...row.inputs, row.output].join(','));
  return [header, ...rows].join('\n');
}

export function solutionExpressionText(solution: SolverResult): string {
  return `F = ${booleanExpressionToString(solution.expression, solution.kMap.variables)}`;
}

export function solutionVerilogText(solution: SolverResult): string {
  return generateVerilog(solution.expression).source;
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[character] ??
      character,
  );
}

export function kMapToSvg(map: KMap, groups: readonly KMapGroup[] = []): string {
  const cellWidth = 92;
  const cellHeight = 66;
  const left = 76;
  const top = 58;
  const width = left + map.layout.columns * cellWidth + 18;
  const height = top + map.layout.rows * cellHeight + 18;
  const cells = map.cells
    .flatMap((row) =>
      row.map((cell) => {
        const x = left + cell.coordinate.column * cellWidth;
        const y = top + cell.coordinate.row * cellHeight;
        return `<g><rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="#f8fafc" stroke="#94a3b8"/><text x="${x + 7}" y="${y + 14}" font-size="9" fill="#64748b">m${cell.termIndex}</text><text x="${x + cellWidth / 2}" y="${y + 40}" text-anchor="middle" font-size="20" font-weight="700" fill="#17202a">${cell.value}</text></g>`;
      }),
    )
    .join('');
  const labels = [
    ...map.layout.columnLabels.map(
      (label, column) =>
        `<text x="${left + column * cellWidth + cellWidth / 2}" y="42" text-anchor="middle">${escapeXml(label)}</text>`,
    ),
    ...map.layout.rowLabels.map(
      (label, row) =>
        `<text x="52" y="${top + row * cellHeight + cellHeight / 2 + 4}" text-anchor="middle">${escapeXml(label)}</text>`,
    ),
  ].join('');
  const colors = ['#2563eb', '#dc2626', '#059669', '#9333ea', '#d97706', '#0891b2'];
  const outlines = groups
    .flatMap((group, groupIndex) =>
      group.coordinates.map(
        (coordinate) =>
          `<rect x="${left + coordinate.column * cellWidth + 4}" y="${top + coordinate.row * cellHeight + 4}" width="${cellWidth - 8}" height="${cellHeight - 8}" rx="8" fill="none" stroke="${colors[groupIndex % colors.length]}" stroke-width="3"/>`,
      ),
    )
    .join('');
  const rowNames = map.layout.rowVariableIndices
    .map((index) => map.variables[index]?.name)
    .join('');
  const columnNames = map.layout.columnVariableIndices
    .map((index) => map.variables[index]?.name)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Karnaugh map"><rect width="100%" height="100%" fill="#ffffff"/><g font-family="ui-monospace,monospace" fill="#334155"><text x="${left + (map.layout.columns * cellWidth) / 2}" y="18" text-anchor="middle" font-size="11">Columns · ${escapeXml(columnNames)}</text><text x="14" y="${top + (map.layout.rows * cellHeight) / 2}" transform="rotate(-90 14 ${top + (map.layout.rows * cellHeight) / 2})" text-anchor="middle" font-size="11">Rows · ${escapeXml(rowNames)}</text>${labels}${cells}${outlines}</g></svg>`;
}

export function downloadText(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadKMapPng(svg: string, filename: string): Promise<void> {
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to render K-map image.'));
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth * 2;
  canvas.height = image.naturalHeight * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is unavailable.');
  context.scale(2, 2);
  context.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Unable to encode PNG.'))),
      'image/png',
    ),
  );
  const pngUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = pngUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(pngUrl);
}
