import { useMemo, useState } from 'react';
import {
  expressionToTruthTable,
  generateKMap,
  getVariables,
  mintermsToTruthTable,
  parseBooleanFunction,
  solveKMap,
} from '../core';
import type { BooleanExpression, SolverResult, TruthValue } from '../core';

function parseTerms(text: string, limit: number): number[] {
  if (text.trim() === '') return [];
  const parts = text.split(',').map((part) => part.trim());
  if (parts.some((part) => part === '' || !/^\d+$/.test(part))) {
    throw new Error('Use comma-separated whole numbers, for example 0, 2, 5.');
  }
  const terms = parts.map(Number);
  if (terms.some((term) => term >= limit))
    throw new Error(`Terms must be between 0 and ${limit - 1}.`);
  if (new Set(terms).size !== terms.length) throw new Error('Each term may appear only once.');
  return terms.sort((a, b) => a - b);
}

function list(values: readonly TruthValue[], state: TruthValue): string {
  return values.flatMap((value, index) => (value === state ? [index] : [])).join(', ');
}

export function useKMapWorkspace() {
  const [variableCount, setVariableCountState] = useState(4);
  const [variableNames, setVariableNames] = useState(['A', 'B', 'C', 'D']);
  const [values, setValues] = useState<TruthValue[]>(() => Array<TruthValue>(16).fill(0));
  const [mintermText, setMintermText] = useState('');
  const [maxtermText, setMaxtermText] = useState(
    '0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15',
  );
  const [dontCareText, setDontCareText] = useState('');
  const [error, setError] = useState<string>();
  const [solutionEnabled, setSolutionEnabled] = useState(false);
  const [expressionText, setExpressionText] = useState('');
  const [originalExpression, setOriginalExpression] = useState<BooleanExpression>();

  const variables = useMemo(
    () =>
      variableNames.map((name, position) => ({
        id: name,
        name,
        position,
      })),
    [variableNames],
  );
  const minterms = useMemo(
    () => values.flatMap((value, index) => (value === 1 ? [index] : [])),
    [values],
  );
  const dontCares = useMemo(
    () => values.flatMap((value, index) => (value === 'X' ? [index] : [])),
    [values],
  );
  const maxterms = useMemo(
    () => values.flatMap((value, index) => (value === 0 ? [index] : [])),
    [values],
  );
  const kMap = useMemo(
    () => generateKMap({ variableCount, variables, minterms, dontCares }),
    [dontCares, minterms, variableCount, variables],
  );
  const truthTable = useMemo(
    () => mintermsToTruthTable(variables, minterms, dontCares),
    [dontCares, minterms, variables],
  );
  const solution = useMemo<SolverResult | undefined>(
    () =>
      solutionEnabled ? solveKMap({ variableCount, variables, minterms, dontCares }) : undefined,
    [dontCares, minterms, solutionEnabled, variableCount, variables],
  );

  const syncText = (
    next: readonly TruthValue[],
    preserve?: 'minterms' | 'maxterms' | 'dontCares',
    raw = '',
  ) => {
    setMintermText(preserve === 'minterms' ? raw : list(next, 1));
    setMaxtermText(preserve === 'maxterms' ? raw : list(next, 0));
    setDontCareText(preserve === 'dontCares' ? raw : list(next, 'X'));
  };

  const commit = (
    next: TruthValue[],
    preserve?: 'minterms' | 'maxterms' | 'dontCares',
    raw = '',
  ) => {
    setValues(next);
    setOriginalExpression(undefined);
    syncText(next, preserve, raw);
    setError(undefined);
  };

  const setVariableCount = (count: number) => {
    const next = Array<TruthValue>(2 ** count).fill(0);
    setVariableCountState(count);
    setVariableNames(
      Array.from({ length: count }, (_, position) => String.fromCharCode(65 + position)),
    );
    commit(next);
  };

  const cycleCell = (index: number) => {
    const next = [...values];
    const current = next[index] ?? 0;
    next[index] = current === 0 ? 1 : current === 1 ? 'X' : 0;
    commit(next);
  };

  const updateTermInput = (kind: 'minterms' | 'maxterms' | 'dontCares', text: string) => {
    if (kind === 'minterms') setMintermText(text);
    else if (kind === 'maxterms') setMaxtermText(text);
    else setDontCareText(text);
    try {
      const terms = parseTerms(text, values.length);
      const next = [...values];
      if (kind === 'minterms') {
        next.forEach(
          (value, index) => (next[index] = terms.includes(index) ? 1 : value === 'X' ? 'X' : 0),
        );
      } else if (kind === 'maxterms') {
        next.forEach(
          (value, index) => (next[index] = terms.includes(index) ? 0 : value === 'X' ? 'X' : 1),
        );
      } else {
        next.forEach((value, index) => {
          if (value === 'X') next[index] = 0;
        });
        for (const term of terms) next[term] = 'X';
      }
      commit(next, kind, text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid term list.');
    }
  };

  const clear = () => commit(Array<TruthValue>(values.length).fill(0));
  const generateSolution = () => {
    setSolutionEnabled(true);
    setError(undefined);
  };

  const loadExpression = () => {
    try {
      const expression = parseBooleanFunction(expressionText);
      const inferredVariables = getVariables(expression);
      if (inferredVariables.length < 2 || inferredVariables.length > 5) {
        throw new Error(
          `Expressions must contain between 2 and 5 distinct variables; found ${inferredVariables.length}.`,
        );
      }
      const table = expressionToTruthTable(expression, inferredVariables);
      const next = table.rows.map(({ output }) => output);
      setVariableCountState(inferredVariables.length);
      setVariableNames(inferredVariables);
      setValues(next);
      syncText(next);
      setOriginalExpression(expression);
      setSolutionEnabled(true);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to parse the expression.');
    }
  };

  return {
    variableCount,
    values,
    variables,
    minterms,
    maxterms,
    dontCares,
    mintermText,
    maxtermText,
    dontCareText,
    error,
    solution,
    expressionText,
    originalExpression,
    kMap,
    truthTable,
    setVariableCount,
    cycleCell,
    setMintermText: (text: string) => updateTermInput('minterms', text),
    setMaxtermText: (text: string) => updateTermInput('maxterms', text),
    setDontCareText: (text: string) => updateTermInput('dontCares', text),
    clear,
    generateSolution,
    setExpressionText,
    loadExpression,
  };
}
