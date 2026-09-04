import type { TruthTable as TruthTableModel, TruthValue } from '../core';

interface TruthTableProps {
  table: TruthTableModel;
  onCycleOutput: (index: number) => void;
}

export function TruthTable({ table, onCycleOutput }: TruthTableProps) {
  return (
    <section className="truth-table-view" aria-label="Truth table">
      <div className="truth-table-heading">
        <div>
          <span className="eyebrow">Binary order</span>
          <h3>Truth table</h3>
        </div>
        <span>{table.rows.length} rows</span>
      </div>
      <div className="truth-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              {table.variables.map(({ id, name }) => (
                <th scope="col" key={id}>
                  {name}
                </th>
              ))}
              <th scope="col">F</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.index}>
                <th scope="row">{row.index}</th>
                {row.inputs.map((input, index) => (
                  <td key={table.variables[index]?.id}>{input}</td>
                ))}
                <td>
                  <TruthTableOutput index={row.index} onCycle={onCycleOutput} value={row.output} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TruthTableOutput({
  index,
  value,
  onCycle,
}: {
  index: number;
  value: TruthValue;
  onCycle: (index: number) => void;
}) {
  return (
    <button
      aria-label={`Row ${index} output ${value}. Activate to cycle state.`}
      className={`truth-output state-${String(value).toLowerCase()}`}
      data-row={index}
      data-state={value}
      onClick={() => onCycle(index)}
      title="Cycle 0 → 1 → X"
      type="button"
    >
      {value}
    </button>
  );
}
