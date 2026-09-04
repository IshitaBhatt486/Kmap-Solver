import { booleanExpressionToString } from '../core';
import type { SolverResult } from '../core';
import { GROUP_COLORS } from '../utils/groupColors';

export type SolutionViewMode = 'all' | 'steps';

interface SolutionPanelProps {
  solution?: SolverResult | undefined;
  mode: SolutionViewMode;
  stepIndex: number;
  onModeChange: (mode: SolutionViewMode) => void;
  onStepChange: (index: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SolutionPanel({
  solution,
  mode,
  stepIndex,
  onModeChange,
  onStepChange,
  collapsed = false,
  onToggleCollapse,
}: SolutionPanelProps) {
  if (!solution) {
    return (
      <section
        className={`solution-panel empty ${collapsed ? 'panel-collapsed' : ''}`}
        aria-label="Solution"
      >
        <span className="eyebrow">Solution</span>
        {!collapsed && (
          <p>Generate a solution to inspect prime implicants and the minimized expression.</p>
        )}
        <button
          className="collapse-control"
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
          type="button"
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </section>
    );
  }
  const format = (expression: SolverResult['expression']) =>
    booleanExpressionToString(expression, solution.kMap.variables);
  const step = solution.steps[stepIndex] ?? solution.steps[0];
  const lastStep = solution.steps.length - 1;
  return (
    <section
      className={`solution-panel ${collapsed ? 'panel-collapsed' : ''}`}
      aria-live="polite"
      data-testid="solution-panel"
    >
      <div className="solution-toolbar">
        <div className="solution-mode" aria-label="Solution display mode">
          <button aria-pressed={mode === 'all'} onClick={() => onModeChange('all')} type="button">
            Show all groups
          </button>
          <button
            aria-pressed={mode === 'steps'}
            onClick={() => onModeChange('steps')}
            type="button"
          >
            Step-by-step
          </button>
        </div>
        <div className="solution-toolbar-actions">
          <span className="solution-status">Optimal cover</span>
          <button
            className="collapse-control"
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
            type="button"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="solution-content">
          {mode === 'all' ? (
            <div data-testid="all-groups-view">
              <div className="solution-heading">
                <div>
                  <span className="eyebrow">Minimized SOP</span>
                  <h2>{format(solution.expression)}</h2>
                </div>
              </div>
              <div className="solution-metrics">
                <span>
                  <strong>{solution.groups.length}</strong> selected groups
                </span>
                <span>
                  <strong>{solution.primeGroups.length}</strong> prime implicants
                </span>
                <span>
                  <strong>{solution.essentialGroups.length}</strong> essential
                </span>
              </div>
              {solution.groups.length > 0 && (
                <div className="group-list" aria-label="Selected groups">
                  {solution.groups.map((group, index) => (
                    <div className="group-row" key={group.id}>
                      <span
                        className="group-swatch"
                        style={{ borderColor: GROUP_COLORS[index % GROUP_COLORS.length] }}
                      />
                      <code>{format(group.term)}</code>
                      <span>{group.size} cells</span>
                      <span>m({group.coveredMinterms.join(', ')})</span>
                      {group.isEssential && <strong>essential</strong>}
                    </div>
                  ))}
                </div>
              )}
              {solution.alternativeExpressions.length > 0 && (
                <div className="alternatives">
                  <span className="eyebrow">Equivalent optimal forms</span>
                  {solution.alternativeExpressions.map((expression, index) => (
                    <code key={index}>{format(expression)}</code>
                  ))}
                </div>
              )}
            </div>
          ) : step ? (
            <div className="step-workspace" data-testid="step-view">
              <nav className="step-list" aria-label="Solving steps">
                {solution.steps.map((item, index) => (
                  <button
                    aria-label={`Step ${index + 1}: ${item.title}`}
                    aria-current={index === stepIndex ? 'step' : undefined}
                    key={item.id}
                    onClick={() => onStepChange(index)}
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <strong>{item.title}</strong>
                  </button>
                ))}
              </nav>
              <article className="step-detail" key={step.id}>
                <div className="step-progress">
                  <span>
                    Step {stepIndex + 1} of {solution.steps.length}
                  </span>
                  <progress
                    aria-label="Solution progress"
                    max={solution.steps.length}
                    value={stepIndex + 1}
                  />
                </div>
                <span className="eyebrow">Step {stepIndex + 1}</span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
                {step.generatedTerms.length > 0 && (
                  <div className="generated-terms">
                    <span>
                      Generated Boolean {step.generatedTerms.length === 1 ? 'term' : 'terms'}
                    </span>
                    {step.generatedTerms.map((term, index) => (
                      <code key={index}>
                        {step.id === 'final-expression' ? `F = ${format(term)}` : format(term)}
                      </code>
                    ))}
                  </div>
                )}
                <div className="step-actions">
                  <button
                    disabled={stepIndex === 0}
                    onClick={() => onStepChange(stepIndex - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  {stepIndex < lastStep ? (
                    <button
                      className="next-step"
                      onClick={() => onStepChange(stepIndex + 1)}
                      type="button"
                    >
                      Next step
                    </button>
                  ) : (
                    <button className="next-step" onClick={() => onModeChange('all')} type="button">
                      Return to solved map
                    </button>
                  )}
                </div>
              </article>
            </div>
          ) : null}
          <aside className="rules-note" aria-label="K-map grouping rules">
            <strong>K-map rules</strong>
            <ul>
              <li>Use powers of two</li>
              <li>Prefer the largest groups</li>
              <li>Edges wrap around</li>
              <li>Include don’t-cares when useful</li>
              <li>Groups may overlap</li>
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}
