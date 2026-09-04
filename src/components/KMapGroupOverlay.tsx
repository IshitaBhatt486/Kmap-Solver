import type { KMapGroup } from '../core';
import { GROUP_COLORS } from '../utils/groupColors';

interface KMapGroupOverlayProps {
  groups: readonly KMapGroup[];
  termIndex: number;
}

export function KMapGroupOverlay({ groups, termIndex }: KMapGroupOverlayProps) {
  const covering = groups.flatMap((group, index) =>
    group.cellIndices.includes(termIndex) ? [{ group, index }] : [],
  );
  if (covering.length === 0) return null;
  return (
    <svg
      aria-hidden="true"
      className="group-overlay"
      data-testid={`group-overlay-${termIndex}`}
      viewBox="0 0 100 100"
    >
      {covering.map(({ group, index }, layer) => {
        const inset = 5 + layer * 5;
        return (
          <rect
            fill="none"
            height={100 - inset * 2}
            key={group.id}
            rx="7"
            stroke={GROUP_COLORS[index % GROUP_COLORS.length]}
            strokeDasharray={group.wrapsColumns || group.wrapsRows ? '9 4' : undefined}
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
            width={100 - inset * 2}
            x={inset}
            y={inset}
          />
        );
      })}
    </svg>
  );
}
