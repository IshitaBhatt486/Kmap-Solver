interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  onLoad: () => void;
}

export function ExpressionInput({ value, onChange, onLoad }: ExpressionInputProps) {
  return (
    <form
      className="expression-input"
      onSubmit={(event) => {
        event.preventDefault();
        onLoad();
      }}
    >
      <label htmlFor="boolean-expression">
        Boolean expression <span>2–5 variables</span>
      </label>
      <textarea
        id="boolean-expression"
        onChange={(event) => onChange(event.target.value)}
        placeholder="F = A'B + CD"
        rows={4}
        spellCheck={false}
        value={value}
      />
      <p>
        Use <code>'</code>, <code>!</code>, or <code>~</code> for NOT; adjacency or <code>*</code>{' '}
        for AND; and <code>+</code> or <code>|</code> for OR.
      </p>
      <button className="primary-action" type="submit">
        Load into K-map
      </button>
    </form>
  );
}
