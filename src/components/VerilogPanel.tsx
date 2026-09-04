import { useMemo, useState } from 'react';
import { generateVerilog } from '../core';
import type { BooleanExpression } from '../core';

interface VerilogPanelProps {
  expression: BooleanExpression;
}

function HighlightedCode({ source }: { source: string }) {
  const pattern =
    /(\b(?:module|endmodule|input|output|logic|assign|initial|begin|end|for)\b|\b\d+'b[01]\b|[~&|])/g;
  return (
    <code>
      {source.split(pattern).map((token, index) =>
        /^(?:module|endmodule|input|output|logic|assign|initial|begin|end|for)$/.test(token) ? (
          <span className="hdl-keyword" key={index}>
            {token}
          </span>
        ) : /^[~&|]$/.test(token) || /^\d+'b[01]$/.test(token) ? (
          <span className="hdl-operator" key={index}>
            {token}
          </span>
        ) : (
          token
        ),
      )}
    </code>
  );
}

export function VerilogPanel({ expression }: VerilogPanelProps) {
  const [includeTestbench, setIncludeTestbench] = useState(false);
  const [copied, setCopied] = useState(false);
  const result = useMemo(
    () => generateVerilog(expression, { includeTestbench }),
    [expression, includeTestbench],
  );
  const copy = async () => {
    await navigator.clipboard.writeText(result.source);
    setCopied(true);
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([result.source], { type: 'text/x-verilog;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${result.moduleName}${includeTestbench ? '_with_tb' : ''}.v`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="verilog-workspace" aria-label="Verilog HDL">
      <div className="verilog-toolbar">
        <div>
          <span className="eyebrow">Synthesizable combinational logic</span>
          <strong>{result.moduleName}.v</strong>
        </div>
        <label>
          <input
            checked={includeTestbench}
            onChange={(event) => setIncludeTestbench(event.target.checked)}
            type="checkbox"
          />{' '}
          Include exhaustive testbench
        </label>
        <button onClick={() => void copy()} type="button">
          {copied ? 'Copied ✓' : 'Copy code'}
        </button>
        <button className="download-action" onClick={download} type="button">
          Download .v
        </button>
      </div>
      <pre data-testid="verilog-code">
        <HighlightedCode source={result.source} />
      </pre>
    </section>
  );
}
