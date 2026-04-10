/**
 * tsb Playground Runtime
 *
 * Provides interactive TypeScript execution in the browser for tsb tutorials.
 *
 * Architecture:
 *   1. Loads the tsb browser bundle (built by CI into playground/dist/)
 *   2. Loads the TypeScript compiler (local bundle first, CDN fallback)
 *   3. Converts playground blocks into editable editors with Run/Reset buttons
 *   4. Transforms imports, transpiles TS → JS, and executes with output capture
 *   5. Shows equivalent Python/pandas code in a switchable tab (read-only)
 *   6. Reports execution timing for each code run
 *
 * No WASM needed — the TypeScript compiler runs natively in JavaScript.
 */

// ── Inject tab-related CSS ─────────────────────────────────────────

(function injectTabStyles() {
  var style = document.createElement("style");
  style.textContent = [
    ".playground-tabs { display: flex; gap: 0; margin-bottom: -1px; position: relative; z-index: 1; }",
    ".playground-tab {",
    "  padding: 0.35rem 0.9rem; font-size: 0.8rem; font-weight: 500;",
    "  border: 1px solid #30363d; border-bottom: none;",
    "  border-radius: 0.4rem 0.4rem 0 0; cursor: pointer;",
    "  background: #0d1117; color: #8b949e; transition: background 0.15s, color 0.15s;",
    "}",
    ".playground-tab:hover { background: #161b22; color: #e6edf3; }",
    ".playground-tab.active { background: #1c2128; color: #58a6ff; border-bottom-color: #1c2128; }",
    ".playground-tab-python.active { color: #3572A5; }",
    ".playground-python-view {",
    "  display: none; width: 100%; background: #0d1117; color: #e6edf3;",
    "  border: 1px solid #30363d; border-top: none; border-bottom: none;",
    "  padding: 1rem; font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;",
    "  font-size: 0.875rem; line-height: 1.55; white-space: pre; overflow-x: auto;",
    "  tab-size: 4;",
    "}",
    ".playground-python-view.active { display: block; }",
    ".playground-timing {",
    "  font-size: 0.75rem; color: #8b949e; margin-left: auto; font-family: system-ui, sans-serif;",
    "}",
    ".playground-timing .timing-value { color: #3fb950; font-weight: 600; }",
  ].join("\n");
  document.head.appendChild(style);
})();

// ── Load TypeScript compiler (local bundle → CDN fallback) ─────────

function loadScriptWithTimeout(src, timeoutMs) {
  return new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    var timer = setTimeout(function () {
      reject(new Error("Timeout loading " + src));
    }, timeoutMs);
    script.src = src;
    script.onload = function () {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = function () {
      clearTimeout(timer);
      reject(new Error("Failed to load " + src));
    };
    document.head.appendChild(script);
  });
}

function loadTypeScript() {
  if (window.ts) return Promise.resolve(window.ts);

  // Try local bundle first (built by CI), then fall back to CDN
  return loadScriptWithTimeout("./dist/typescript.js", 15000)
    .catch(function () {
      return loadScriptWithTimeout(
        "https://cdn.jsdelivr.net/npm/typescript@5/lib/typescript.js",
        30000,
      );
    })
    .then(function () {
      if (!window.ts) {
        throw new Error(
          "TypeScript compiler loaded but window.ts is not available",
        );
      }
      return window.ts;
    });
}

// ── Load tsb browser bundle ────────────────────────────────────────

function loadTsb() {
  return import("./dist/index.js").catch(function () {
    throw new Error(
      "tsb bundle not found. Build with: bun build ./src/index.ts --outdir ./playground/dist --target browser",
    );
  });
}

// ── Value formatting ───────────────────────────────────────────────

function formatValue(val) {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (Array.isArray(val)) {
    return "[" + val.map(formatValue).join(", ") + "]";
  }
  if (typeof val === "object") {
    var str = String(val);
    if (str !== "[object Object]") return str;
    try {
      return JSON.stringify(val, null, 2);
    } catch (_e) {
      return str;
    }
  }
  return String(val);
}

// ── Code transformation ────────────────────────────────────────────

function transformCode(code, ts) {
  // Replace:  import { X, Y } from "tsb";  →  const { X, Y } = window.__tsb;
  var transformed = code.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']tsb["']\s*;?/g,
    function (_match, names) {
      return "const {" + names.trim() + "} = window.__tsb;";
    },
  );

  var result = ts.transpileModule(transformed, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: false, // relaxed for playground ease-of-use
      removeComments: false,
    },
    reportDiagnostics: true,
  });

  if (result.diagnostics && result.diagnostics.length > 0) {
    var errors = result.diagnostics
      .map(function (d) {
        return ts.flattenDiagnosticMessageText(d.messageText, "\n");
      })
      .join("\n");
    throw new Error("TypeScript error:\n" + errors);
  }

  return result.outputText;
}

// ── Code execution with output capture ─────────────────────────────

function executeCode(jsCode) {
  var outputs = [];
  var origLog = console.log;
  var origError = console.error;
  var origWarn = console.warn;

  console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    outputs.push(args.map(formatValue).join(" "));
  };
  console.error = function () {
    var args = Array.prototype.slice.call(arguments);
    outputs.push("\u274c " + args.map(formatValue).join(" "));
  };
  console.warn = function () {
    var args = Array.prototype.slice.call(arguments);
    outputs.push("\u26a0\ufe0f " + args.map(formatValue).join(" "));
  };

  try {
    new Function(jsCode)();
  } catch (err) {
    outputs.push("\u274c Runtime error: " + err.message);
  } finally {
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;
  }

  return outputs.join("\n");
}

// ── Editor abstraction (supports both <textarea> and <pre contenteditable>) ──

function isTextarea(el) {
  return el.tagName === "TEXTAREA";
}

function getEditorCode(editor) {
  return isTextarea(editor) ? editor.value : editor.textContent;
}

function setEditorCode(editor, code) {
  if (isTextarea(editor)) {
    editor.value = code;
  } else {
    editor.textContent = code;
  }
}

// ── Playground block setup ─────────────────────────────────────────

function setupBlock(block, ts) {
  var editor = block.querySelector(".playground-editor");
  var runBtn = block.querySelector(".playground-run");
  var resetBtn = block.querySelector(".playground-reset");
  var output = block.querySelector(".playground-output");
  var pythonSource = block.querySelector(".playground-python");
  if (!editor || !runBtn || !output) return;

  var originalCode = getEditorCode(editor);

  // ── Python tab setup ───────────────────────────────
  if (pythonSource) {
    var pythonCode = getEditorCode(pythonSource);
    pythonSource.style.display = "none"; // hide the source textarea

    // Create tab bar
    var header = block.querySelector(".playground-header");
    var tabBar = document.createElement("div");
    tabBar.className = "playground-tabs";

    var tsTab = document.createElement("div");
    tsTab.className = "playground-tab playground-tab-ts active";
    tsTab.textContent = "TypeScript";

    var pyTab = document.createElement("div");
    pyTab.className = "playground-tab playground-tab-python";
    pyTab.textContent = "Python";

    tabBar.appendChild(tsTab);
    tabBar.appendChild(pyTab);

    // Insert tab bar before the header
    block.insertBefore(tabBar, header);

    // Hide the label in the header since tabs show the language
    var label = header.querySelector(".playground-label");
    if (label) label.style.display = "none";

    // Create Python read-only view
    var pythonView = document.createElement("pre");
    pythonView.className = "playground-python-view";
    pythonView.textContent = pythonCode;

    // Insert Python view after editor
    editor.parentNode.insertBefore(pythonView, editor.nextSibling);

    // Tab switching
    tsTab.addEventListener("click", function () {
      tsTab.classList.add("active");
      pyTab.classList.remove("active");
      editor.style.display = "";
      pythonView.classList.remove("active");
      runBtn.style.display = "";
      if (resetBtn) resetBtn.style.display = "";
    });

    pyTab.addEventListener("click", function () {
      pyTab.classList.add("active");
      tsTab.classList.remove("active");
      editor.style.display = "none";
      pythonView.classList.add("active");
      runBtn.style.display = "none";
      if (resetBtn) resetBtn.style.display = "none";
    });
  }

  // ── Auto-resize textarea to fit content ────────────
  function autoResize() {
    if (!isTextarea(editor)) return;
    editor.style.height = "auto";
    editor.style.height = editor.scrollHeight + 2 + "px";
  }
  editor.addEventListener("input", autoResize);
  autoResize();

  // Tab inserts spaces (instead of moving focus)
  editor.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      if (isTextarea(editor)) {
        var start = editor.selectionStart;
        var end = editor.selectionEnd;
        editor.value =
          editor.value.substring(0, start) +
          "  " +
          editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
      } else {
        document.execCommand("insertText", false, "  ");
      }
    }
    // Ctrl+Enter or Cmd+Enter runs the code
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runBtn.click();
    }
  });

  // Create timing display element
  var timingEl = document.createElement("span");
  timingEl.className = "playground-timing";
  var actionsEl = block.querySelector(".playground-actions");
  if (actionsEl) {
    actionsEl.parentNode.insertBefore(timingEl, actionsEl);
  }

  // Run button handler (with timing)
  runBtn.addEventListener("click", function () {
    output.classList.remove("error");
    output.classList.add("active");
    timingEl.innerHTML = "";
    try {
      var code = getEditorCode(editor);
      var startTime = performance.now();
      var js = transformCode(code, ts);
      var result = executeCode(js);
      var elapsed = performance.now() - startTime;
      output.textContent =
        result || "(no output \u2014 add console.log() to see results)";
      timingEl.innerHTML =
        "\u23f1 <span class=\"timing-value\">" +
        elapsed.toFixed(1) +
        "ms</span>";
    } catch (err) {
      output.textContent = "\u274c " + err.message;
      output.classList.add("error");
    }
  });

  // Reset button handler
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      setEditorCode(editor, originalCode);
      output.textContent = "";
      output.classList.remove("error", "active");
      timingEl.innerHTML = "";
      autoResize();
    });
  }
}

// ── Initialization ─────────────────────────────────────────────────

async function initPlayground() {
  var loadingEl = document.getElementById("playground-loading");
  var statusEl = document.getElementById("playground-status");

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  try {
    setStatus("Loading tsb library\u2026");
    var tsb = await loadTsb();
    window.__tsb = tsb;

    setStatus("Loading TypeScript compiler\u2026");
    var ts = await loadTypeScript();

    setStatus("Initializing editors\u2026");

    // Initialize all playground blocks on the page
    var blocks = document.querySelectorAll(".playground-block");
    blocks.forEach(function (block) {
      setupBlock(block, ts);
    });

    // Enable all Run buttons (disabled during loading)
    document.querySelectorAll(".playground-run").forEach(function (btn) {
      btn.disabled = false;
    });

    // Hide loading overlay
    if (loadingEl) loadingEl.style.display = "none";
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = "\u26a0\ufe0f " + err.message;
      statusEl.style.color = "#f85149";
    }
    console.error("Playground initialization failed:", err);
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPlayground);
} else {
  initPlayground();
}
