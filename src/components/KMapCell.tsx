import type { KMapGroup, TruthValue } from '../core';
import { KMapGroupOverlay } from './KMapGroupOverlay';

interface KMapCellProps {
  index: number;
  value: TruthValue;
  binary: string;
  groups: readonly KMapGroup[];
  highlighted: boolean;
  onCycle: (index: number) => void;
}

export function KMapCell({ index, value, binary, groups, highlighted, onCycle }: KMapCellProps) {
  return (
    <button
      aria-label={`Minterm ${index}, binary ${binary}, state ${value}. Activate to cycle state.`}
      className={`kmap-cell state-${String(value).toLowerCase()}${highlighted ? ' step-highlighted' : ''}`}
      data-minterm={index}
      data-state={value}
      data-highlighted={highlighted ? 'true' : 'false'}
      onClick={() => onCycle(index)}
      title={`${binary} · m${index} · click: 0 → 1 → X`}
      type="button"
    >
      <span className="cell-index">m{index}</span>
      <strong>{value}</strong>
      <KMapGroupOverlay groups={groups} termIndex={index} />
    </button>
  );
}
