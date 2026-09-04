import { expect, test } from '@playwright/test';

test('solves a four-variable function from minterm input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByLabel(/Minterms/).fill('0, 2, 8, 10');
  await page.getByRole('button', { name: 'Generate solution' }).click();

  await expect(page.getByRole('button', { name: /^Minterm 0,/ })).toHaveAttribute(
    'data-state',
    '1',
  );
  await expect(page.getByRole('button', { name: /^Minterm 2,/ })).toHaveAttribute(
    'data-state',
    '1',
  );
  await expect(page.getByRole('button', { name: /^Minterm 1,/ })).toHaveAttribute(
    'data-state',
    '0',
  );
  await expect(page.getByTestId('solution-panel')).toBeVisible();
  await expect(
    page.getByTestId('solution-panel').getByRole('heading', { name: "B'D'" }),
  ).toBeVisible();
  await expect(page.getByTestId('group-overlay-0')).toBeVisible();

  await page.getByRole('button', { name: 'Step-by-step' }).click();
  await expect(page.getByRole('heading', { name: 'Identify active cells' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Minterm 0,/ })).toHaveAttribute(
    'data-highlighted',
    'true',
  );
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByRole('heading', { name: 'Identify possible groups' })).toBeVisible();
  await page.getByRole('button', { name: /Final expression/ }).click();
  await expect(page.getByText("F = B'D'", { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to solved map' }).click();
  await expect(page.getByTestId('all-groups-view')).toBeVisible();

  await page.getByRole('button', { name: 'Both' }).click();
  await expect(page.getByRole('region', { name: 'Truth table' })).toBeVisible();
  await page.getByRole('button', { name: /^Row 1 output 0/ }).click();
  await expect(page.getByRole('button', { name: /^Row 1 output 1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Minterm 1,/ })).toHaveAttribute(
    'data-state',
    '1',
  );
  await expect(page.getByLabel('Function summary')).toContainText('Σm(0, 1, 2, 8, 10)');
});

test('loads and simplifies a Boolean expression', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Expression', exact: true }).click();
  await page.getByLabel(/Boolean expression/).fill("F = (A + B)C + A'BC");
  await page.getByRole('button', { name: 'Load into K-map' }).click();

  await expect(page.getByRole('heading', { name: '3-variable function' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Minterm 3,/ })).toHaveAttribute(
    'data-state',
    '1',
  );
  await expect(page.getByLabel('Expression comparison')).toContainText('Equivalent ✓');
  await expect(page.getByLabel('Expression comparison')).toContainText('Original expression');
  await expect(page.getByLabel('Expression comparison')).toContainText('Simplified expression');
  await expect(page.getByTestId('solution-panel')).toBeVisible();
});

test('workspace remains contained at target viewport sizes', async ({ page }, testInfo) => {
  const viewports = [
    { width: 1280, height: 720, name: '1280x720' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 390, height: 844, name: 'mobile' },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '4-variable function' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, viewport.name).toBeLessThanOrEqual(1);
    await testInfo.attach(`workspace-${viewport.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
});

test('print media contains the solution report without application chrome', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/Minterms/).fill('0, 2, 8, 10');
  await page.getByRole('button', { name: 'Generate solution' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  const report = page.locator('.print-report');
  await expect(report).toBeVisible();
  await expect(page.locator('.app-header')).toBeHidden();
  await expect(page.locator('.workspace')).toBeHidden();
  await expect(report).toContainText("F = B'D'");
});

test('keyboard focus and reduced-motion accessibility remain effective', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe('none');
  await page.getByRole('button', { name: 'Toggle dark mode' }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel(/Minterms/).fill('0, 2, 8, 10');
  await page.getByRole('button', { name: 'Generate solution' }).click();
  await page.getByRole('button', { name: 'Step-by-step' }).click();
  const animation = await page
    .locator('.step-detail')
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animation).toBe('none');
});
