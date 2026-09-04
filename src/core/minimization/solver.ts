import { patternToExpression, termsToSum } from '../boolean';
import { generateKMap, normalizeKMapInput } from '../kmap';
import type { BooleanExpression, KMap, KMapGroup, SolverInput, SolverResult } from '../types';
import { generateSolverSteps } from './explanation';

interface Candidate {
  readonly pattern: string;
  readonly cellIndices: readonly number[];
  readonly coveredMinterms: readonly number[];
}

function patternMatches(pattern: string, index: number): boolean {
  const bits = index.toString(2).padStart(pattern.length, '0');
  return [...pattern].every((symbol, position) => symbol === '-' || symbol === bits[position]);
}

function enumeratePatterns(length: number): string[] {
  let patterns = [''];
  for (let position = 0; position < length; position += 1) {
    patterns = patterns.flatMap((pattern) => [`${pattern}0`, `${pattern}1`, `${pattern}-`]);
  }
  return patterns;
}

function candidateFromPattern(
  pattern: string,
  minterms: ReadonlySet<number>,
  allowed: ReadonlySet<number>,
): Candidate | undefined {
  const cellIndices = Array.from({ length: 2 ** pattern.length }, (_, index) => index).filter(
    (index) => patternMatches(pattern, index),
  );
  if (!cellIndices.every((index) => allowed.has(index))) return undefined;
  const coveredMinterms = cellIndices.filter((index) => minterms.has(index));
  if (coveredMinterms.length === 0) return undefined;
  return { pattern, cellIndices, coveredMinterms };
}

function isSuperset(superset: readonly number[], subset: readonly number[]): boolean {
  const values = new Set(superset);
  return subset.every((value) => values.has(value));
}

function wrapsAxis(positions: readonly number[], dimension: number): boolean {
  const unique = [...new Set(positions)].sort((left, right) => left - right);
  return (
    unique.length > 1 &&
    unique.length < dimension &&
    unique[0] === 0 &&
    unique.at(-1) === dimension - 1
  );
}

function toGroup(
  candidate: Candidate,
  kMap: KMap,
  isPrime: boolean,
  isEssential: boolean,
): KMapGroup {
  const byIndex = new Map(kMap.cells.flat().map((cell) => [cell.termIndex, cell]));
  const coordinates = candidate.cellIndices.map((index) => {
    const cell = byIndex.get(index);
    if (!cell) throw new Error(`K-map is missing cell ${index}.`);
    return cell.coordinate;
  });
  return {
    id: `group-${candidate.pattern.replaceAll('-', 'x')}`,
    cellIndices: candidate.cellIndices,
    coordinates,
    coveredMinterms: candidate.coveredMinterms,
    variablePattern: candidate.pattern,
    term: patternToExpression(candidate.pattern, kMap.variables),
    size: candidate.cellIndices.length,
    isPrime,
    isEssential,
    wrapsRows: wrapsAxis(
      coordinates.map(({ row }) => row),
      kMap.layout.rows,
    ),
    wrapsColumns: wrapsAxis(
      coordinates.map(({ column }) => column),
      kMap.layout.columns,
    ),
  };
}

export function generateValidGroups(input: SolverInput): KMapGroup[] {
  const normalized = normalizeKMapInput(input);
  const kMap = generateKMap(input);
  const minterms = new Set(normalized.minterms);
  const allowed = new Set([...normalized.minterms, ...normalized.dontCares]);
  const candidates = enumeratePatterns(input.variableCount)
    .map((pattern) => candidateFromPattern(pattern, minterms, allowed))
    .filter((candidate): candidate is Candidate => candidate !== undefined)
    .sort(
      (left, right) =>
        right.cellIndices.length - left.cellIndices.length ||
        left.pattern.localeCompare(right.pattern),
    );
  return candidates.map((candidate) => toGroup(candidate, kMap, false, false));
}

export function isValidKMapGroup(group: Pick<KMapGroup, 'cellIndices'>, kMap: KMap): boolean {
  const indices = [...new Set(group.cellIndices)].sort((left, right) => left - right);
  if (indices.length === 0 || indices.length !== group.cellIndices.length) return false;
  if ((indices.length & (indices.length - 1)) !== 0) return false;
  const cells = new Map(kMap.cells.flat().map((cell) => [cell.termIndex, cell.value]));
  if (indices.some((index) => cells.get(index) === undefined || cells.get(index) === 0))
    return false;
  if (!indices.some((index) => cells.get(index) === 1)) return false;

  const bitRows = indices.map((index) => index.toString(2).padStart(kMap.variables.length, '0'));
  const pattern = Array.from({ length: kMap.variables.length }, (_, position) => {
    const bit = bitRows[0]?.[position];
    return bitRows.every((row) => row[position] === bit) ? bit : '-';
  }).join('');
  const expected = Array.from({ length: 2 ** kMap.variables.length }, (_, index) => index).filter(
    (index) => patternMatches(pattern, index),
  );
  return (
    expected.length === indices.length &&
    expected.every((index, position) => index === indices[position])
  );
}

function findPrimeCandidates(candidates: readonly Candidate[]): Candidate[] {
  return candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) =>
          other.cellIndices.length > candidate.cellIndices.length &&
          isSuperset(other.cellIndices, candidate.cellIndices),
      ),
  );
}

function literalCount(candidate: Candidate): number {
  return [...candidate.pattern].filter((symbol) => symbol !== '-').length;
}

function findOptimalCovers(
  primes: readonly Candidate[],
  minterms: readonly number[],
  essentialIndices: ReadonlySet<number>,
): number[][] {
  if (minterms.length === 0) return [[]];
  const essentialCovered = new Set(
    [...essentialIndices].flatMap((index) => primes[index]?.coveredMinterms ?? []),
  );
  const initiallyUncovered = minterms.filter((minterm) => !essentialCovered.has(minterm));
  const results: number[][] = [];
  let bestTerms = Number.POSITIVE_INFINITY;
  let bestLiterals = Number.POSITIVE_INFINITY;

  // Explore the prime-implicant chart by choosing the uncovered minterm with the
  // fewest candidate primes first. This is an exact branch-and-bound search, not
  // a greedy choice: every cover tied on term and literal count is retained.
  const visit = (selected: Set<number>, uncovered: readonly number[]): void => {
    if (selected.size > bestTerms) return;
    if (uncovered.length === 0) {
      const indices = [...new Set([...essentialIndices, ...selected])].sort((a, b) => a - b);
      const literals = indices.reduce(
        (sum, index) => sum + literalCount(primes[index] as Candidate),
        0,
      );
      if (indices.length < bestTerms || (indices.length === bestTerms && literals < bestLiterals)) {
        bestTerms = indices.length;
        bestLiterals = literals;
        results.splice(0);
      }
      if (indices.length === bestTerms && literals === bestLiterals) results.push(indices);
      return;
    }
    const target = uncovered
      .map((minterm) => ({
        minterm,
        options: primes
          .map((prime, index) => ({ prime, index }))
          .filter(
            ({ prime, index }) =>
              !essentialIndices.has(index) && prime.coveredMinterms.includes(minterm),
          ),
      }))
      .sort((left, right) => left.options.length - right.options.length)[0];
    if (!target) return;
    for (const { prime, index } of target.options) {
      const next = new Set(selected).add(index);
      visit(
        next,
        uncovered.filter((minterm) => !prime.coveredMinterms.includes(minterm)),
      );
    }
  };
  visit(new Set(), initiallyUncovered);
  const unique = new Map(results.map((indices) => [indices.join(','), indices]));
  return [...unique.values()].sort((left, right) => left.join(',').localeCompare(right.join(',')));
}

function expressionForGroups(groups: readonly KMapGroup[]): BooleanExpression {
  return termsToSum(groups.map(({ term }) => term));
}

export function solveKMap(input: SolverInput): SolverResult {
  const normalized = normalizeKMapInput(input);
  const kMap = generateKMap(input);
  const mintermSet = new Set(normalized.minterms);
  const allowed = new Set([...normalized.minterms, ...normalized.dontCares]);
  const validCandidates = enumeratePatterns(input.variableCount)
    .map((pattern) => candidateFromPattern(pattern, mintermSet, allowed))
    .filter((candidate): candidate is Candidate => candidate !== undefined);
  const primes = findPrimeCandidates(validCandidates).sort((left, right) =>
    left.pattern.localeCompare(right.pattern),
  );
  const essentialIndices = new Set<number>();
  for (const minterm of normalized.minterms) {
    const covering = primes
      .map((prime, index) => ({ prime, index }))
      .filter(({ prime }) => prime.coveredMinterms.includes(minterm));
    if (covering.length === 1) essentialIndices.add(covering[0]?.index ?? -1);
  }
  essentialIndices.delete(-1);
  const primeGroups = primes.map((prime, index) =>
    toGroup(prime, kMap, true, essentialIndices.has(index)),
  );
  const covers = findOptimalCovers(primes, normalized.minterms, essentialIndices);
  const groupings = covers.map((cover) => cover.map((index) => primeGroups[index] as KMapGroup));
  const canonical = groupings[0] ?? [];
  const expressions = groupings.map(expressionForGroups);
  const expression = expressions[0] ?? { kind: 'constant', value: 0 };
  const essentialGroups = primeGroups.filter(({ isEssential }) => isEssential);
  const resultWithoutSteps = {
    kMap,
    groups: canonical,
    primeGroups,
    essentialGroups,
    coveredMinterms: normalized.minterms,
    expression,
    alternativeExpressions: expressions.slice(1),
    alternativeGroupings: groupings.slice(1),
  };
  return { ...resultWithoutSteps, steps: generateSolverSteps(resultWithoutSteps) };
}
