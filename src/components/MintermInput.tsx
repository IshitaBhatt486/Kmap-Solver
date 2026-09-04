interface MintermInputProps {
  id: string;
  label: string;
  symbol: string;
  value: string;
  onChange: (value: string) => void;
}

export function MintermInput({ id, label, symbol, value, onChange }: MintermInputProps) {
  return (
    <label className="term-input" htmlFor={id}>
      <span>
        {label} <code>{symbol}</code>
      </span>
      <input
        id={id}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        placeholder="0, 2, 5, 7"
        spellCheck={false}
        value={value}
      />
    </label>
  );
}
