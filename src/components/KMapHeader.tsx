interface KMapHeaderProps {
  rowVariables: string;
  columnVariables: string;
  columnLabels: readonly string[];
  planeLabel?: string | undefined;
}

export function KMapHeader({
  rowVariables,
  columnVariables,
  columnLabels,
  planeLabel,
}: KMapHeaderProps) {
  return (
    <div className="kmap-header">
      <div className="axis-corner" aria-label={`Rows ${rowVariables}; columns ${columnVariables}`}>
        <span>{columnVariables}</span>
        <strong>{rowVariables}</strong>
      </div>
      <div className="column-axis">
        <div className="axis-title">
          {planeLabel
            ? `${planeLabel} · ${columnVariables}`
            : `Column variables · ${columnVariables}`}
        </div>
        <div className="column-labels">
          {columnLabels.map((label) => (
            <code key={label}>{label}</code>
          ))}
        </div>
      </div>
    </div>
  );
}
