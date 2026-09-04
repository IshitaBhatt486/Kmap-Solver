import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HomePage } from './HomePage';

describe('workspace render performance', () => {
  afterEach(cleanup);

  it('renders and disposes the initial workspace repeatedly within the UI budget', () => {
    const iterations = 10;
    const startedAt = performance.now();

    for (let index = 0; index < iterations; index += 1) {
      const view = render(<HomePage />);
      view.unmount();
    }

    const elapsedMilliseconds = performance.now() - startedAt;

    // The suite runs files concurrently, so this ceiling allows for CPU contention
    // while still detecting a substantial render-cost regression. Browser behavior
    // is covered separately by Playwright's responsive smoke flows.
    expect(elapsedMilliseconds).toBeLessThan(5_000);
  });
});
