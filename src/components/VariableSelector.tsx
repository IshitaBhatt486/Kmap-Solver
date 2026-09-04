interface VariableSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function VariableSelector({ value, onChange }: VariableSelectorProps) {
  return (
    <fieldset className="variable-selector">
      <legend>Variables</legend>
      <div className="segmented-control">
        {[2, 3, 4, 5].map((count) => (
          <button
            aria-pressed={value === count}
            className={value === count ? 'active' : ''}
            key={count}
            onClick={() => onChange(count)}
            type="button"
          >
            {count}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
