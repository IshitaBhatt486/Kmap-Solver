export function HelpPanel() {
  return (
    <details className="help-panel">
      <summary aria-label="Open K-map guide">K-map guide</summary>
      <section aria-labelledby="help-title" className="help-content">
        <div className="help-heading">
          <span className="eyebrow">Quick start</span>
          <h2 id="help-title">How Karnaugh maps work</h2>
        </div>
        <dl>
          <div>
            <dt>What is a K-map?</dt>
            <dd>
              A Karnaugh map arranges truth-table outputs so neighboring cells differ by one input
              bit. This makes simplification patterns visible.
            </dd>
          </div>
          <div>
            <dt>How do I enter minterms?</dt>
            <dd>
              Choose the variable count, then enter the decimal indices where the function is 1,
              such as <code>0, 2, 5, 7</code>. You can also select cells directly.
            </dd>
          </div>
          <div>
            <dt>What are don&apos;t-cares?</dt>
            <dd>
              An <code>X</code> marks an input combination whose output does not matter. The solver
              may use it to form a larger group, or ignore it.
            </dd>
          </div>
          <div>
            <dt>How do groups work?</dt>
            <dd>
              Groups are rectangles containing 1, 2, 4, 8, or more cells, with no zero cells. Larger
              groups remove more changing variables.
            </dd>
          </div>
          <div>
            <dt>Why do groups wrap around?</dt>
            <dd>
              Gray-code ordering makes opposite edges adjacent. The left and right edges touch, as
              do the top and bottom edges.
            </dd>
          </div>
          <div>
            <dt>How is the final expression generated?</dt>
            <dd>
              Each selected group becomes one product term. Variables that change inside the group
              disappear, and the minimum set of terms is combined with OR.
            </dd>
          </div>
        </dl>
        <p className="help-tip">
          Start by entering minterms, select <strong>Generate solution</strong>, then use{' '}
          <strong>Step-by-step</strong> to follow the grouping process.
        </p>
      </section>
    </details>
  );
}
