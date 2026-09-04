import { useEffect, useState } from 'react';
import { DontCareInput } from '../components/DontCareInput';
import { CircuitDiagram } from '../components/CircuitDiagram';
import { ExpressionComparison } from '../components/ExpressionComparison';
import { ExpressionInput } from '../components/ExpressionInput';
import { ExportActions } from '../components/ExportActions';
import { HelpPanel } from '../components/HelpPanel';
import { KMap } from '../components/KMap';
import { InputSummary } from '../components/InputSummary';
import { MintermInput } from '../components/MintermInput';
import { PrintReport } from '../components/PrintReport';
import { SolutionPanel } from '../components/SolutionPanel';
import type { SolutionViewMode } from '../components/SolutionPanel';
import { VariableSelector } from '../components/VariableSelector';
import { TruthTable } from '../components/TruthTable';
import { VerilogPanel } from '../components/VerilogPanel';
import { useKMapWorkspace } from '../hooks/useKMapWorkspace';
import { expressionToCircuit } from '../core';

export function HomePage() {
  const workspace = useKMapWorkspace();
  const [dark, setDark] = useState(false);
  const [solutionMode, setSolutionMode] = useState<SolutionViewMode>('all');
  const [stepIndex, setStepIndex] = useState(0);
  const [functionView, setFunctionView] = useState<'kmap' | 'truth-table' | 'both'>('kmap');
  const [outputView, setOutputView] = useState<'circuit' | 'verilog'>('circuit');
  const [inputMode, setInputMode] = useState<'terms' | 'expression'>('terms');
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [solutionCollapsed, setSolutionCollapsed] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => setPrinting(true);
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
  const activeStep = workspace.solution?.steps[stepIndex];
  const visibleGroups =
    workspace.solution && solutionMode === 'steps' && activeStep
      ? workspace.solution.primeGroups.filter((group) =>
          activeStep.highlightedGroups.includes(group.id),
        )
      : (workspace.solution?.groups ?? []);
  return (
    <div className="app-shell" data-theme={dark ? 'dark' : 'light'}>
      <header className="app-header">
        <div className="brand-mark">K</div>
        <div className="brand-copy">
          <h1>Karnaugh Studio</h1>
          <p>Boolean minimization workbench</p>
        </div>
        <div className="header-meta">
          <span>{workspace.variableCount} variables</span>
          <strong>Solver ready</strong>
        </div>
        <HelpPanel />
        <button
          className="theme-toggle"
          onClick={() => setDark((value) => !value)}
          type="button"
          aria-label="Toggle dark mode"
        >
          {dark ? 'Light' : 'Dark'} mode
        </button>
      </header>

      <nav className="export-bar" aria-label="Export tools">
        <ExportActions
          onPrint={() => {
            setPrinting(true);
            window.setTimeout(() => window.print(), 0);
          }}
          solution={workspace.solution}
          truthTable={workspace.truthTable}
        />
      </nav>

      <main
        className={`workspace ${inputCollapsed ? 'input-is-collapsed' : ''} ${solutionCollapsed ? 'solution-is-collapsed' : ''}`}
      >
        <aside className={`control-panel ${inputCollapsed ? 'panel-collapsed' : ''}`}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Configuration</span>
              <h2>Function input</h2>
            </div>
            <button
              className="collapse-control"
              aria-expanded={!inputCollapsed}
              onClick={() => setInputCollapsed((value) => !value)}
              type="button"
            >
              {inputCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
          {!inputCollapsed && (
            <div className="panel-content">
              <div className="input-mode-tabs" aria-label="Function input mode">
                <button
                  aria-pressed={inputMode === 'terms'}
                  onClick={() => setInputMode('terms')}
                  type="button"
                >
                  Terms
                </button>
                <button
                  aria-pressed={inputMode === 'expression'}
                  onClick={() => setInputMode('expression')}
                  type="button"
                >
                  Expression
                </button>
              </div>
              {inputMode === 'terms' ? (
                <>
                  <VariableSelector
                    onChange={workspace.setVariableCount}
                    value={workspace.variableCount}
                  />
                  <div className="input-stack">
                    <MintermInput
                      id="minterms"
                      label="Minterms"
                      symbol="Σm( )"
                      onChange={workspace.setMintermText}
                      value={workspace.mintermText}
                    />
                    <MintermInput
                      id="maxterms"
                      label="Maxterms"
                      symbol="ΠM( )"
                      onChange={workspace.setMaxtermText}
                      value={workspace.maxtermText}
                    />
                    <DontCareInput
                      onChange={workspace.setDontCareText}
                      value={workspace.dontCareText}
                    />
                  </div>
                </>
              ) : (
                <ExpressionInput
                  onChange={workspace.setExpressionText}
                  onLoad={() => {
                    workspace.loadExpression();
                    setSolutionMode('all');
                    setStepIndex(0);
                    setFunctionView('kmap');
                  }}
                  value={workspace.expressionText}
                />
              )}
              {workspace.error && (
                <p className="input-error" role="alert">
                  {workspace.error}
                </p>
              )}
              {inputMode === 'terms' && (
                <p className="input-hint">
                  Comma-separated decimal indices. Editing minterms or maxterms updates the same
                  underlying truth table.
                </p>
              )}
              <div className="control-actions">
                {inputMode === 'terms' && (
                  <button
                    className="primary-action"
                    disabled={Boolean(workspace.error)}
                    onClick={() => {
                      workspace.generateSolution();
                      setSolutionMode('all');
                      setStepIndex(0);
                    }}
                    type="button"
                  >
                    Generate solution
                  </button>
                )}
                <button className="secondary-action" onClick={workspace.clear} type="button">
                  Clear map
                </button>
              </div>
            </div>
          )}
        </aside>

        <section className="map-panel">
          <div className="map-panel-heading">
            <div>
              <span className="eyebrow">Function workspace</span>
              <h2>{workspace.variableCount}-variable function</h2>
            </div>
            <div className="state-key">
              <span>
                <i className="key-one" />1
              </span>
              <span>
                <i className="key-x" />X
              </span>
              <span>{workspace.truthTable.rows.length} combinations</span>
            </div>
          </div>
          <div className="view-toolbar">
            <div className="view-tabs" aria-label="Function view">
              <button
                aria-pressed={functionView === 'kmap'}
                onClick={() => setFunctionView('kmap')}
                type="button"
              >
                K-map
              </button>
              <button
                aria-pressed={functionView === 'truth-table'}
                onClick={() => setFunctionView('truth-table')}
                type="button"
              >
                Truth Table
              </button>
              <button
                aria-pressed={functionView === 'both'}
                onClick={() => setFunctionView('both')}
                type="button"
              >
                Both
              </button>
            </div>
            <InputSummary
              dontCares={workspace.dontCares}
              maxterms={workspace.maxterms}
              minterms={workspace.minterms}
            />
          </div>
          <div className={`function-surface mode-${functionView}`}>
            {(functionView === 'kmap' || functionView === 'both') && (
              <div className="map-scroll" data-testid="kmap-view">
                <KMap
                  groups={visibleGroups}
                  highlightedCells={solutionMode === 'steps' ? activeStep?.highlightedCells : []}
                  map={workspace.kMap}
                  onCycleCell={workspace.cycleCell}
                />
                <p className="map-help">
                  Select any cell to cycle <code>0 → 1 → X → 0</code>. Dashed group outlines cross a
                  map boundary.
                </p>
              </div>
            )}
            {(functionView === 'truth-table' || functionView === 'both') && (
              <TruthTable onCycleOutput={workspace.cycleCell} table={workspace.truthTable} />
            )}
          </div>
          {workspace.originalExpression && workspace.solution && (
            <ExpressionComparison
              original={workspace.originalExpression}
              simplified={workspace.solution.expression}
              variables={workspace.variables}
            />
          )}
        </section>

        <SolutionPanel
          collapsed={solutionCollapsed}
          mode={solutionMode}
          onModeChange={setSolutionMode}
          onToggleCollapse={() => setSolutionCollapsed((value) => !value)}
          onStepChange={setStepIndex}
          solution={workspace.solution}
          stepIndex={stepIndex}
        />

        <section className={`output-panel ${outputCollapsed ? 'panel-collapsed' : ''}`}>
          <div className="output-heading">
            <div>
              <span className="eyebrow">Implementation output</span>
              <h2>Logic realization</h2>
            </div>
            <div className="output-actions">
              <div className="view-tabs" aria-label="Implementation view">
                <button
                  aria-pressed={outputView === 'circuit'}
                  onClick={() => {
                    setOutputView('circuit');
                    setOutputCollapsed(false);
                  }}
                  type="button"
                >
                  Circuit
                </button>
                <button
                  aria-pressed={outputView === 'verilog'}
                  onClick={() => {
                    setOutputView('verilog');
                    setOutputCollapsed(false);
                  }}
                  type="button"
                >
                  Verilog
                </button>
              </div>
              <button
                className="collapse-control"
                aria-expanded={!outputCollapsed}
                onClick={() => setOutputCollapsed((value) => !value)}
                type="button"
              >
                {outputCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          </div>
          {!outputCollapsed && (
            <div className="output-content">
              {workspace.solution ? (
                outputView === 'circuit' ? (
                  <CircuitDiagram
                    circuit={expressionToCircuit(
                      workspace.solution.expression,
                      workspace.variables,
                    )}
                  />
                ) : (
                  <VerilogPanel expression={workspace.solution.expression} />
                )
              ) : (
                <p className="circuit-empty">
                  Generate a solution to create implementation output.
                </p>
              )}
            </div>
          )}
        </section>
      </main>
      {printing && (
        <PrintReport
          dontCares={workspace.dontCares}
          maxterms={workspace.maxterms}
          minterms={workspace.minterms}
          solution={workspace.solution}
          truthTable={workspace.truthTable}
        />
      )}
    </div>
  );
}
