# Engineering Audit

Audit date: 4 September 2026

## Executive summary

The application is suitable for its stated 2–5 variable scope. The audit found no
remaining correctness failures in the K-map solver, Boolean parser, truth-table
conversions, circuit graph, Verilog generator, synchronized editor state, or
browser exports. The complete automated suite, lint, strict type checking,
production build, and browser flows pass.

The solver and transformation layers remain pure TypeScript modules with no React
dependency. React owns presentation and one canonical truth-table state; K-map
cells, input summaries, solutions, circuits, Verilog, and reports are derived from
that state.

## Architecture summary

- `src/core/types`: shared domain contracts for variables, truth tables, K-maps,
  implicants, Boolean ASTs, circuits, Verilog, and structured solver results.
- `src/core/kmap`: Gray code, logical-coordinate conversion, adjacency, and map
  construction.
- `src/core/minimization`: valid implicant enumeration, prime/essential implicant
  selection, exact minimum covers, Boolean-term construction, and explanations.
- `src/core/boolean` and `src/core/truthTable`: safe parsing, AST evaluation, and
  deterministic binary-order conversion utilities.
- `src/core/circuit` and `src/core/verilog`: pure AST transformations and
  independent evaluators used for equivalence testing.
- `src/hooks/useFunctionState.ts`: the single function-state boundary used by the
  interactive editors.
- `src/components` and `src/pages`: accessible React presentation only; solver
  mathematics is not duplicated here.
- `src/utils/export.ts`: client-side, deterministic text/CSV/SVG/PNG/download
  helpers. Print composition is isolated from application chrome.

## Correctness audit

| Area                    | Finding | Verification                                                                                                                                                         |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K-map and Gray ordering | Pass    | Every index/coordinate round trip for 2–5 variables; cyclic Gray neighbors differ by one bit.                                                                        |
| Adjacency and wrapping  | Pass    | Horizontal, vertical, and corner wrapping are exercised; adjacency is logical rather than screen-coordinate based.                                                   |
| Group detection         | Pass    | Groups are rectangular powers of two, contain no zero, and cover at least one required minterm. Prime and essential flags are derived from the cover chart.          |
| Don't-cares             | Pass    | Don't-cares may enlarge implicants but are never required output coverage. All-don't-care resolves to zero.                                                          |
| Multiple solutions      | Pass    | Exact covers are ranked by implicant count and literal count; equal optima are returned as alternatives.                                                             |
| Boolean parser          | Pass    | Explicit and implicit AND, postfix/prefix NOT, OR, and parentheses normalize to an AST. Malformed input is rejected without executing it.                            |
| Truth tables            | Pass    | Rows remain deterministic binary order while K-map coordinates remain Gray order. Minterm, maxterm, and don't-care round trips pass.                                 |
| Expression equivalence  | Pass    | Solver output is evaluated exhaustively against every defined truth-table row.                                                                                       |
| Circuit graph           | Pass    | AST-derived node connectivity and circuit evaluation match AST evaluation for all assignments.                                                                       |
| Verilog                 | Pass    | AST-derived declarations and expressions are deterministic and structurally tested; normalized generated expressions are independently reparsed and evaluated.       |
| UI synchronization      | Pass    | Cell, table, minterm/maxterm, don't-care, and expression paths converge on the same truth-table state. Component and browser flows cover edits and solution refresh. |
| Exports                 | Pass    | Clipboard payloads, filenames, CSV shape, Verilog content, SVG generation, PNG conversion path, and print-media visibility are tested.                               |

## Test matrix

Each function class below is exercised for every supported variable count.

| Function class           | 2 vars | 3 vars | 4 vars | 5 vars |
| ------------------------ | :----: | :----: | :----: | :----: |
| All zeros                |   ✓    |   ✓    |   ✓    |   ✓    |
| All ones                 |   ✓    |   ✓    |   ✓    |   ✓    |
| Single minterm           |   ✓    |   ✓    |   ✓    |   ✓    |
| Single maxterm           |   ✓    |   ✓    |   ✓    |   ✓    |
| Adjacent group           |   ✓    |   ✓    |   ✓    |   ✓    |
| Wrap-around group        |   ✓    |   ✓    |   ✓    |   ✓    |
| Overlapping groups       |   ✓    |   ✓    |   ✓    |   ✓    |
| Don't-care-heavy         |   ✓    |   ✓    |   ✓    |   ✓    |
| Multiple valid solutions |   ✓    |   ✓    |   ✓    |   ✓    |
| Complex expressions      |   ✓    |   ✓    |   ✓    |   ✓    |

The deterministic property suite additionally covers 160 seeded random functions
(40 at each variable count). Each solution is checked on every truth-table row,
then its AST is converted to a circuit and Verilog representation and checked
again. Existing exhaustive tests cover all 16 two-variable and all 256
three-variable Boolean functions. Parser integration also includes randomized
valid-expression round trips.

## Coverage

`npm run test:coverage` reports:

| Metric     | Coverage |
| ---------- | -------: |
| Statements |   85.42% |
| Branches   |   88.76% |
| Functions  |   86.44% |
| Lines      |   85.42% |

The minimizer, Verilog generator, Gray-code functions, and core truth-table engine
reach 100% statement coverage. Lower browser-export and printable-report figures
reflect Canvas, download, and print branches whose behavior is exercised in
Playwright rather than Vitest's instrumentation.

## Performance findings

- Forty randomized five-variable end-to-end transformations, including exhaustive
  evaluation, completed in 376 ms without coverage instrumentation (about 9.4 ms
  per case) and 635 ms with coverage instrumentation.
- The combined performance guardrail (500 parses, 50 five-variable solves, and 50
  circuit generations) completed in 386 ms under coverage.
- Ten complete initial workspace render/unmount cycles completed in 171 ms in
  jsdom (about 17.1 ms per render). The test uses a deliberately generous 5 s CI
  ceiling to identify regressions without introducing machine-sensitive flakes.
- Derived solution, layout, circuit, and HDL data use memoization at the application
  boundary. No asynchronous solver work or mutable global caches were found, so
  stale-result races and solver-related leaks are not present.

These numbers are development-machine measurements and regression indicators, not
formal browser performance guarantees.

## Accessibility and reliability

- Native buttons, inputs, tables, landmarks, accessible names, error/status text,
  and visible `:focus-visible` styling support keyboard and screen-reader use.
- Responsive step navigation now retains descriptive accessible names when its
  visible labels collapse to step numbers.
- A Playwright keyboard flow verifies focus visibility. Reduced-motion emulation
  verifies that step highlights stop animating, and dark-mode switching is covered.
- Responsive browser flows cover the main editing and solving path. Print CSS
  removes controls and application chrome and targets an A4 report.
- Window print listeners are cleaned up on unmount. Object URLs and temporary
  download elements are released after use.

## Security review

Expression input is treated as untrusted text and processed by a bounded tokenizer
and recursive-descent parser. The source contains no `eval`, `Function`, unsafe
HTML injection, or user-code execution. Exported text is emitted through text/blob
APIs, while generated SVG text is escaped. Verilog is generated from validated AST
nodes and is never executed by the application.

## Known limitations

- Variable counts are intentionally limited to 2–5, and minimization emits SOP
  forms for the supported NOT/AND/OR logic subset.
- Generated Verilog is verified structurally and by logical equivalence; an external
  HDL compiler is not invoked.
- PNG, clipboard, download, and print behavior depends on the host browser's API
  support and permissions.
- Print behavior is covered functionally, but there is no pixel-baseline comparison
  of the final operating-system print/PDF output.
- Automated focus and reduced-motion checks supplement, but do not replace, manual
  testing with several screen readers and high-contrast operating-system modes.

## Future engineering improvements

- Add mutation testing around cover selection and parser error recovery.
- Add automated WCAG scanning and calibrated visual-regression baselines in CI.
- Optionally validate generated HDL with a pinned command-line compiler in the
  development test pipeline while continuing never to execute user HDL in-app.
- Track browser render and interaction timings over time with a stable CI machine.
