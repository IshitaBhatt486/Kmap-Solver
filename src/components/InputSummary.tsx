interface InputSummaryProps {
  minterms: readonly number[];
  maxterms: readonly number[];
  dontCares: readonly number[];
}

export function InputSummary({ minterms, maxterms, dontCares }: InputSummaryProps) {
  return (
    <div className="input-summary" aria-label="Function summary">
      <code>Σm({minterms.join(', ')})</code>
      <code>ΠM({maxterms.join(', ')})</code>
      <code>d({dontCares.join(', ')})</code>
    </div>
  );
}
