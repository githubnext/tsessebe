# Playground Pages — Design & Requirements

Every feature in **tsb** ships with an interactive playground page hosted on
GitHub Pages. This document describes the required properties that every
playground page must satisfy.

## Required Properties

### 1. Executable Code Blocks

Each code example on a playground page **must** be executable in the browser.
Users can edit the code, click **▶ Run** (or press **Ctrl+Enter**), and see
real output rendered below the editor.

- Use `<textarea class="playground-editor">` for the editable code area.
- Wrap each example in a `<div class="playground-block">` container.
- Provide **▶ Run** and **↺ Reset** buttons in a `.playground-header`.
- Display results in a `<div class="playground-output">`.

### 2. Full TypeScript Support

Code blocks accept TypeScript. The playground runtime loads the TypeScript
compiler from CDN and transpiles user code to JavaScript before execution.
Users can write type annotations, interfaces, and generics — the compiler
strips them automatically.

- TypeScript compiler: bundled locally (`playground/dist/typescript.js`) with
  CDN fallback (`https://cdn.jsdelivr.net/npm/typescript@5/lib/typescript.js`).
- No WASM required — the compiler runs natively in JavaScript.

### 3. Live tsb Library Access

The full tsb API is available in every code block. Users import from `"tsb"`
exactly as they would in a real project:

```typescript
import { Index, Series, Dtype } from "tsb";
```

The playground runtime transforms these imports to reference the browser
bundle built by CI (`playground/dist/index.js`).

### 4. Output Capture

All `console.log()`, `console.error()`, and `console.warn()` output is
intercepted and rendered in the output area. tsb objects (Index, Series, etc.)
display their human-readable `toString()` representation.

### 5. Dark Theme

Pages use the project's standard dark GitHub-inspired theme (CSS variables
`--bg`, `--surface`, `--border`, `--text`, `--accent`, `--green`). See
`playground/index-playground.html` for the canonical style definitions.

### 6. Loading State

A loading overlay with a spinner is shown while the TypeScript compiler and
tsb bundle are fetched. All Run buttons are disabled until initialization
completes, preventing premature execution.

### 7. Keyboard Shortcuts

- **Ctrl+Enter** (or **Cmd+Enter** on macOS): Run the current code block.
- **Tab**: Insert two spaces (does not move focus).

### 8. Reset Support

Every code block has a **↺ Reset** button that restores the original example
code and clears the output.

### 9. Free-form Scratch Pad

Each playground page should include a final "Try It Yourself" section with an
empty (or lightly seeded) code block where users can experiment freely.

## Architecture

```
playground/
  index.html                 ← Landing page / feature roadmap
  index-playground.html      ← Index & RangeIndex interactive tutorial
  playground-runtime.js      ← Shared runtime (TS transpilation + execution)
  dist/                      ← Built by CI (bun build, not committed)
    index.js                 ← tsb browser bundle (ESM)
```

### Runtime Flow

1. The HTML page loads `playground-runtime.js` as an ES module.
2. The runtime imports the tsb bundle from `./dist/index.js` and stores it
   on `window.__tsb`.
3. The TypeScript compiler is loaded from CDN via a dynamic `<script>` tag.
4. Each `.playground-block` is initialized with event listeners for Run,
   Reset, Tab, and Ctrl+Enter.
5. On **Run**:
   - `import { … } from "tsb"` is rewritten to `const { … } = window.__tsb;`
   - The TypeScript compiler transpiles the code to JavaScript.
   - The JavaScript is executed via `new Function()` with console output
     captured and displayed.

### Adding a New Playground Page

1. Create `playground/{feature}.html` following the template in
   `index-playground.html`.
2. Include the runtime: `<script type="module" src="playground-runtime.js"></script>`
3. Add the loading overlay (`#playground-loading`).
4. Structure examples as `.playground-block` containers with `.playground-editor`,
   `.playground-run`, `.playground-reset`, and `.playground-output` elements.
5. End with a "Try It Yourself" scratch pad.
6. Link the page from `playground/index.html`.

### Building the Bundle Locally

```bash
bun build ./src/index.ts --outdir ./playground/dist --target browser --minify
cp node_modules/typescript/lib/typescript.js ./playground/dist/typescript.js
```

The CI pipeline (`pages.yml`) runs this automatically during deployment.

## Non-Goals (Current Scope)

- **Syntax highlighting** in the editor: the current implementation uses a
  plain `<textarea>`. A future enhancement could integrate CodeMirror or
  Monaco for richer editing.
- **Infinite loop protection**: long-running or infinite loops will hang the
  browser tab. A Web Worker–based sandbox could be added later.
- **Type checking**: the playground transpiles but does not type-check.
  Adding diagnostics display is a potential future enhancement.
