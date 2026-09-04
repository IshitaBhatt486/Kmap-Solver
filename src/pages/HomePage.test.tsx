import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

function cell(index: number): HTMLButtonElement {
  return screen.getByRole('button', { name: new RegExp(`^Minterm ${index},`) });
}

describe('HomePage K-map workbench', () => {
  it('provides a concise keyboard-accessible onboarding guide', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByText('K-map guide'));

    expect(screen.getByRole('heading', { name: 'How Karnaugh maps work' })).toBeVisible();
    expect(screen.getByText('What is a K-map?')).toBeVisible();
    expect(screen.getByText("What are don't-cares?")).toBeVisible();
    expect(screen.getByText('Why do groups wrap around?')).toBeVisible();
  });

  it('changes variable count and renders the correct number of cells', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    expect(screen.getAllByRole('button', { name: /^Minterm \d+,/ })).toHaveLength(16);
    await user.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByRole('heading', { name: '3-variable function' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Minterm \d+,/ })).toHaveLength(8);
  });

  it('cycles a cell through 0, 1, X, and 0', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    expect(cell(0)).toHaveAttribute('data-state', '0');
    await user.click(cell(0));
    expect(cell(0)).toHaveAttribute('data-state', '1');
    await user.click(cell(0));
    expect(cell(0)).toHaveAttribute('data-state', 'X');
    await user.click(cell(0));
    expect(cell(0)).toHaveAttribute('data-state', '0');
  });

  it('enters minterms and synchronizes map states', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    const input = screen.getByLabelText(/Minterms/);
    await user.type(input, '0, 2, 5');
    expect(cell(0)).toHaveAttribute('data-state', '1');
    expect(cell(2)).toHaveAttribute('data-state', '1');
    expect(cell(5)).toHaveAttribute('data-state', '1');
    expect(cell(1)).toHaveAttribute('data-state', '0');
  });

  it('clears the map and synchronized inputs', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(cell(3));
    await user.click(screen.getByRole('button', { name: 'Clear map' }));
    expect(cell(3)).toHaveAttribute('data-state', '0');
    expect(screen.getByLabelText(/Minterms/)).toHaveValue('');
    expect(screen.getByLabelText(/Maxterms/)).toHaveValue(
      '0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15',
    );
  });

  it('generates a solution and displays SVG group overlays', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.type(screen.getByLabelText(/Minterms/), '0, 2, 8, 10');
    await user.click(screen.getByRole('button', { name: 'Generate solution' }));
    const solution = screen.getByTestId('solution-panel');
    expect(within(solution).getByRole('heading', { name: "B'D'" })).toBeInTheDocument();
    expect(screen.getAllByTestId(/^group-overlay-/)).toHaveLength(4);
  });

  it('renders five variables as two distinct four-by-four planes', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: '5' }));
    const planes = screen.getByTestId('five-variable-map');
    expect(within(planes).getByLabelText('Karnaugh map plane C equals 0')).toBeInTheDocument();
    expect(within(planes).getByLabelText('Karnaugh map plane C equals 1')).toBeInTheDocument();
    expect(within(planes).getAllByRole('button', { name: /^Minterm \d+,/ })).toHaveLength(32);
  });

  it('navigates educational steps and restores the complete solved map', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.type(screen.getByLabelText(/Minterms/), '0, 2, 5, 7, 8, 10, 13, 15');
    await user.click(screen.getByRole('button', { name: 'Generate solution' }));
    await user.click(screen.getByRole('button', { name: 'Step-by-step' }));

    expect(screen.getByRole('heading', { name: 'Identify active cells' })).toBeInTheDocument();
    expect(cell(0)).toHaveAttribute('data-highlighted', 'true');
    expect(cell(1)).toHaveAttribute('data-highlighted', 'false');
    expect(screen.getByRole('progressbar', { name: 'Solution progress' })).toHaveValue(1);

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByRole('heading', { name: 'Identify possible groups' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Final expression/ }));
    expect(screen.getByText("F = B'D' + BD")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Return to solved map' }));
    expect(screen.getByTestId('all-groups-view')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^group-overlay-/)).toHaveLength(8);
  });

  it('switches among K-map, truth-table, and combined views', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: 'Truth Table' }));
    expect(screen.getByRole('region', { name: 'Truth table' })).toBeInTheDocument();
    expect(screen.queryByTestId('kmap-view')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Row \d+ output/ })).toHaveLength(16);

    await user.click(screen.getByRole('button', { name: 'Both' }));
    expect(screen.getByTestId('kmap-view')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Truth table' })).toBeInTheDocument();
  });

  it('edits truth-table outputs and synchronizes the K-map and term summary', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: 'Both' }));
    const output = screen.getByRole('button', { name: /^Row 2 output 0/ });
    await user.click(output);
    expect(output).toHaveAttribute('data-state', '1');
    expect(cell(2)).toHaveAttribute('data-state', '1');
    expect(screen.getByLabelText('Function summary')).toHaveTextContent('Σm(2)');
    await user.click(output);
    expect(output).toHaveAttribute('data-state', 'X');
    expect(cell(2)).toHaveAttribute('data-state', 'X');
    expect(screen.getByLabelText('Function summary')).toHaveTextContent('d(2)');
  });

  it('updates an active solver result after a truth-table edit', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.type(screen.getByLabelText(/Minterms/), '0');
    await user.click(screen.getByRole('button', { name: 'Generate solution' }));
    expect(screen.getByRole('heading', { name: "A'B'" })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Truth Table' }));
    await user.click(screen.getByRole('button', { name: /^Row 1 output 0/ }));
    expect(screen.getByRole('heading', { name: "A'" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Minterms/)).toHaveValue('0, 1');
  });

  it('loads, solves, and compares a Boolean expression', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: 'Expression' }));
    await user.type(screen.getByLabelText(/Boolean expression/), "F = (A + B)C + A'BC");
    await user.click(screen.getByRole('button', { name: 'Load into K-map' }));

    expect(screen.getByRole('heading', { name: '3-variable function' })).toBeInTheDocument();
    expect(cell(3)).toHaveAttribute('data-state', '1');
    expect(cell(5)).toHaveAttribute('data-state', '1');
    expect(cell(7)).toHaveAttribute('data-state', '1');
    const comparison = screen.getByRole('region', { name: 'Expression comparison' });
    expect(within(comparison).getByText('Equivalent ✓')).toBeInTheDocument();
    expect(within(comparison).getByText('Original expression')).toBeInTheDocument();
    expect(within(comparison).getByText('Simplified expression')).toBeInTheDocument();
    expect(within(comparison).getByLabelText('Literals: 6 before, 4 after')).toBeInTheDocument();
  });

  it('reports malformed and unsupported expressions without replacing the function', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: 'Expression' }));
    const input = screen.getByLabelText(/Boolean expression/);
    await user.type(input, 'A+++B');
    await user.click(screen.getByRole('button', { name: 'Load into K-map' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Expected an operand/);
    expect(screen.getByRole('heading', { name: '4-variable function' })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'A+B+C+D+E+G');
    await user.click(screen.getByRole('button', { name: 'Load into K-map' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /between 2 and 5 distinct variables; found 6/,
    );
  });

  it('renders and zooms a circuit that updates with the simplified expression', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.type(screen.getByLabelText(/Minterms/), '3, 7, 11, 15');
    await user.click(screen.getByRole('button', { name: 'Generate solution' }));
    await user.click(screen.getByRole('button', { name: 'Circuit' }));
    expect(screen.getByRole('img', { name: 'Generated logic circuit' })).toBeInTheDocument();
    expect(screen.getByLabelText('Circuit summary')).toHaveTextContent('1 Gates');
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Circuit zoom')).toHaveTextContent('120%');
    await user.click(screen.getByRole('button', { name: 'Fit to screen' }));
    expect(screen.getByLabelText('Circuit zoom')).toHaveTextContent('100%');

    await user.click(screen.getByRole('button', { name: 'Terms' }));
    await user.clear(screen.getByLabelText(/Minterms/));
    await user.type(screen.getByLabelText(/Minterms/), '0, 1, 2, 3, 4, 5, 6, 7');
    expect(screen.getByLabelText('Circuit summary')).toHaveTextContent('1 Gates');
  });

  it('renders, copies, and adds a testbench to generated Verilog', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<HomePage />);
    await user.type(screen.getByLabelText(/Minterms/), '0, 2, 8, 10');
    await user.click(screen.getByRole('button', { name: 'Generate solution' }));
    await user.click(screen.getByRole('button', { name: 'Verilog' }));
    const code = screen.getByTestId('verilog-code');
    expect(code).toHaveTextContent('module logic_function');
    expect(code).toHaveTextContent('assign F = ~B & ~D;');
    expect(screen.getByRole('button', { name: 'Download .v' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('assign F = ~B & ~D;'));
    expect(screen.getByRole('button', { name: 'Copied ✓' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Include exhaustive testbench'));
    expect(code).toHaveTextContent('module logic_function_tb');
    expect(code).toHaveTextContent('vector < 4');
  });

  it('collapses and restores focus panels without losing their state', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.type(screen.getByLabelText(/Minterms/), '0, 2');
    const inputCollapse = screen.getAllByRole('button', { name: 'Collapse' })[0];
    expect(inputCollapse).toBeDefined();
    await user.click(inputCollapse!);
    expect(screen.queryByLabelText(/Minterms/)).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Expand' })[0]!);
    expect(screen.getByLabelText(/Minterms/)).toHaveValue('0, 2');
  });

  it('copies and downloads the current solution exports with sensible filenames', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const downloads: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    render(<HomePage />);
    await user.type(screen.getByLabelText(/Minterms/), '0, 2, 8, 10');
    await user.click(screen.getByRole('button', { name: 'Generate solution' }));

    await user.click(screen.getByRole('button', { name: 'Copy Expression' }));
    await user.click(screen.getByRole('button', { name: 'Copy Truth Table' }));
    await user.click(screen.getByRole('button', { name: 'Copy Verilog' }));
    expect(writeText).toHaveBeenNthCalledWith(1, "F = B'D'");
    expect(writeText).toHaveBeenNthCalledWith(2, expect.stringMatching(/^Index,A,B,C,D,F/));
    expect(writeText).toHaveBeenNthCalledWith(3, expect.stringContaining('assign F = ~B & ~D;'));

    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    await user.click(screen.getByRole('button', { name: 'Download Verilog' }));
    await user.click(screen.getByRole('button', { name: 'Export K-map' }));
    expect(downloads).toEqual([
      'logic-function-truth-table.csv',
      'logic-function.v',
      'logic-function-kmap.svg',
    ]);
  });
});
