import {
  areBooleanExpressionsEquivalent,
  booleanExpressionToString,
  getExpressionMetrics,
} from '../core';
import type { BooleanExpression, Variable } from '../core';

interface ExpressionComparisonProps {
  original: BooleanExpression;
  simplified: BooleanExpression;
  variables: readonly Variable[];
}

export function ExpressionComparison({
  original,
  simplified,
  variables,
}: ExpressionComparisonProps) {
  const before = getExpressionMetrics(original);
  const after = getExpressionMetrics(simplified);
  const equivalent = areBooleanExpressionsEquivalent(original, simplified, variables);
  return (
    <section className="expression-comparison" aria-label="Expression comparison">
      <div className="comparison-expressions">
        <div>
          <span>Original expression</span>
          <code>{booleanExpressionToString(original, variables)}</code>
        </div>
        <div>
          <span>Simplified expression</span>
          <code>{booleanExpressionToString(simplified, variables)}</code>
        </div>
        <strong className={equivalent ? 'equivalent' : 'not-equivalent'}>
          {equivalent ? 'Equivalent ✓' : 'Not equivalent'}
        </strong>
      </div>
      <dl className="comparison-metrics">
        <div>
          <dt>Literals</dt>
          <dd aria-label={`Literals: ${before.literalCount} before, ${after.literalCount} after`}>
            {before.literalCount} <span>→</span> {after.literalCount}
          </dd>
        </div>
        <div>
          <dt>Product terms</dt>
          <dd
            aria-label={`Product terms: ${before.productTermCount} before, ${after.productTermCount} after`}
          >
            {before.productTermCount} <span>→</span> {after.productTermCount}
          </dd>
        </div>
      </dl>
    </section>
  );
}
