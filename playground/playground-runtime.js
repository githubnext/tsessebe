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
 *
 * No WASM needed — the TypeScript compiler runs natively in JavaScript.
 */

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
  if (!editor || !runBtn || !output) return;

  var originalCode = getEditorCode(editor);

  // Auto-resize textarea to fit content
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

  // Run button handler
  runBtn.addEventListener("click", function () {
    output.classList.remove("error");
    output.classList.add("active");
    try {
      var code = getEditorCode(editor);
      var js = transformCode(code, ts);
      var result = executeCode(js);
      output.textContent =
        result || "(no output \u2014 add console.log() to see results)";
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
