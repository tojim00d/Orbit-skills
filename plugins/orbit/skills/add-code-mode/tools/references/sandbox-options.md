# Sandbox Options — Detailed Reference

## Selection Criteria

Every sandbox recommended here meets these baseline requirements:
- **No filesystem access** by default
- **No network access** by default
- **Secure by default** — the script cannot escape the sandbox without explicit grants
- **Has a programmatic API** in the server's language (not a CLI/subprocess)

Beyond the baseline, evaluate by:
- **Weight**: dependency size and startup overhead
- **Script language support**: what the LLM can write (JS, Python, Starlark, etc.)
- **Isolation strength**: WASM > separate interpreter > restricted compile
- **Maintenance**: actively maintained with regular releases
- **Maturity**: production usage, known CVEs, escape history

---

## TypeScript / JavaScript Servers

### quickjs-emscripten

- **npm**: `quickjs-emscripten`
- **Script language**: JavaScript (ES2020)
- **Isolation**: WASM — QuickJS C engine compiled to WebAssembly
- **Size**: ~1MB
- **Maintained by**: justjake (active, regular releases)
- **Strengths**: Lightweight, fast startup, zero native deps, works in Node.js and browsers
- **Limitations**: No ES modules, no top-level await, ES2020 (not latest spec)
- **Production use**: Yes, widely used

**Basic usage:**
```typescript
import { getQuickJS } from "quickjs-emscripten";

const QuickJS = await getQuickJS();
const vm = QuickJS.newContext();

// Inject DATA
const dataHandle = vm.newString(rawJsonString);
vm.setProp(vm.global, "DATA", dataHandle);
dataHandle.dispose();

// Capture console.log as stdout
let stdout = "";
const logHandle = vm.newFunction("log", (...args) => {
  const strings = args.map(a => vm.getString(a));
  stdout += strings.join(" ") + "\n";
});
const consoleHandle = vm.newObject();
vm.setProp(consoleHandle, "log", logHandle);
vm.setProp(vm.global, "console", consoleHandle);
logHandle.dispose();
consoleHandle.dispose();

// Execute
const result = vm.evalCode(userScript);
if (result.error) {
  const err = vm.dump(result.error);
  result.error.dispose();
  throw new Error(`Script error: ${err}`);
}
result.value.dispose();
vm.dispose();

return stdout;
```

### pyodide

- **npm**: `pyodide`
- **Script language**: Python 3.11+
- **Isolation**: WASM — CPython compiled to WebAssembly via Emscripten
- **Size**: ~20MB (core), more with packages
- **Maintained by**: Pyodide team (active, backed by Mozilla heritage)
- **Strengths**: Full CPython, `import json` / `import re` / `import collections` work,
  huge ecosystem of pure-Python packages
- **Limitations**: Large download on first load, slower startup (~2s cold, cached after),
  no C-extension packages unless pre-built for WASM
- **Production use**: Yes (JupyterLite, Cloudflare Workers)

**Basic usage:**
```typescript
import { loadPyodide } from "pyodide";

const pyodide = await loadPyodide();
pyodide.globals.set("DATA", rawJsonString);

// Capture print() output
pyodide.runPython(`
import sys, io
_stdout = io.StringIO()
sys.stdout = _stdout
`);

pyodide.runPython(userScript);

const stdout = pyodide.runPython("_stdout.getvalue()");
return stdout;
```

**Tip**: Initialize Pyodide once at server startup and reuse across requests.
Create a fresh global scope per execution to prevent state leakage.

### isolated-vm

- **npm**: `isolated-vm`
- **Script language**: JavaScript (full V8, latest spec)
- **Isolation**: Separate V8 isolate — own heap, no shared state with host
- **Size**: ~5MB native addon (requires node-gyp build)
- **Maintained by**: laverdet (moderate activity)
- **Strengths**: Full V8 speed, latest ES features, memory limits enforced by V8
- **Limitations**: Native addon (not WASM), requires node-gyp and C++ toolchain,
  less portable, maintenance has slowed
- **Production use**: Yes (used in several production systems)

**Note**: Because it's a native addon rather than WASM, the isolation relies on V8's
isolate mechanism rather than a hardware-enforced sandbox. This is strong but
architecturally different from WASM sandboxing.

---

## Python Servers

### RestrictedPython

- **PyPI**: `RestrictedPython`
- **Script language**: Python (restricted subset)
- **Isolation**: AST-level — compiles Python source with restricted `__builtins__`,
  no `import`, no `open()`, no `exec()`/`eval()`, no attribute access to dunders
- **Size**: Tiny (pure Python, ~50KB)
- **Maintained by**: Zope Foundation (active, long history)
- **Strengths**: Zero overhead, pure Python, battle-tested (20+ years), very lightweight
- **Limitations**: Not a full sandbox — restricts at compile/AST level. A determined
  attacker with deep CPython knowledge could potentially escape. Sufficient for
  LLM-generated processing scripts where the threat model is "prevent accidental
  damage" rather than "adversarial code execution."
- **Production use**: Yes (Zope/Plone ecosystem, 20+ years)

**Basic usage:**
```python
from RestrictedPython import compile_restricted, safe_globals

code = compile_restricted(user_script, filename="<code-mode>", mode="exec")
restricted_globals = safe_globals.copy()
restricted_globals["DATA"] = raw_json_string
restricted_globals["_print_"] = lambda: print  # allow print()
restricted_globals["_getattr_"] = getattr

stdout_lines = []
restricted_globals["print"] = lambda *args: stdout_lines.append(" ".join(str(a) for a in args))

exec(code, restricted_globals)
return "\n".join(stdout_lines)
```

### quickjs (Python bindings)

- **PyPI**: `quickjs`
- **Script language**: JavaScript
- **Isolation**: QuickJS interpreter (C library via cffi)
- **Size**: Small
- **Maintained by**: PetterS (moderate activity)
- **Strengths**: Run JS from Python, lightweight
- **Limitations**: Requires C build, less actively maintained than quickjs-emscripten

### pyodide (self-hosted)

Same as the Node.js version but loaded as a Python package for in-process WASM
sandboxing. Useful if you want Python-in-Python isolation (the sandbox runs a
separate CPython in WASM, isolated from the host Python).

---

## Go Servers

### goja

- **Module**: `github.com/dop251/goja`
- **Script language**: JavaScript (ES2020+)
- **Isolation**: Pure Go interpreter — no CGO, no native deps, no fs/net API
- **Size**: Zero external deps
- **Maintained by**: dop251 (active)
- **Strengths**: Pure Go, fast for an interpreter, well-tested, zero CGO
- **Limitations**: Slower than V8 for heavy computation (fine for data extraction)
- **Production use**: Yes (Grafana, k6 load testing, Caddy)

**Basic usage:**
```go
import "github.com/dop251/goja"

vm := goja.New()
vm.Set("DATA", rawJSONString)

var stdout strings.Builder
vm.Set("print", func(call goja.FunctionCall) goja.Value {
    for i, arg := range call.Arguments {
        if i > 0 { stdout.WriteString(" ") }
        stdout.WriteString(arg.String())
    }
    stdout.WriteString("\n")
    return goja.Undefined()
})

_, err := vm.RunString(userScript)
if err != nil { return "", err }
return stdout.String(), nil
```

### Wazero

- **Module**: `github.com/tetratelabs/wazero`
- **Script language**: Any language compiled to WASM (JS via QuickJS.wasm, Python via Pyodide.wasm)
- **Isolation**: WASM runtime — pure Go, zero CGO, strongest isolation
- **Size**: Moderate (the WASM module itself varies)
- **Maintained by**: Tetrate (very active)
- **Strengths**: Strongest isolation (WASM spec guarantees), pure Go, runs any WASM guest
- **Limitations**: More complex setup — need to compile the guest language to WASM first
- **Production use**: Yes (Envoy, various cloud-native tools)

### starlark-go

- **Module**: `go.starlark.net/starlark`
- **Script language**: Starlark (Python-like, deterministic)
- **Isolation**: Pure Go interpreter, no I/O primitives, deterministic execution
- **Size**: Zero external deps
- **Maintained by**: Google (active, used in Bazel)
- **Strengths**: Deterministic (same input = same output), no I/O, pure Go,
  familiar syntax for Python users
- **Limitations**: Not Python — missing many stdlib modules, no classes,
  limited string formatting. LLMs know Starlark from Bazel but may occasionally
  use Python-only features.
- **Production use**: Yes (Bazel, Buck2, Tilt)

---

## Rust Servers

### boa_engine

- **Crate**: `boa_engine`
- **Script language**: JavaScript (ES2024 partial)
- **Isolation**: Pure Rust interpreter, no unsafe deps for I/O, no fs/net API
- **Size**: Moderate
- **Maintained by**: boa-dev team (active)
- **Strengths**: Pure Rust, no C deps, embeddable, growing ES compliance
- **Limitations**: Slower than V8, ES2024 support is partial (but sufficient for
  data extraction scripts)
- **Production use**: Growing

### wasmtime

- **Crate**: `wasmtime`
- **Script language**: Any WASM guest
- **Isolation**: WASM runtime — Cranelift JIT, strongest isolation
- **Maintained by**: Bytecode Alliance (very active, Mozilla/Fastly/Intel backed)
- **Strengths**: Production-grade, best WASM compliance, WASI support (can
  selectively grant fs/net if needed)
- **Production use**: Yes (Fastly Compute, Fermyon Spin, many others)

### wasmer

- **Crate**: `wasmer`
- **Script language**: Any WASM guest
- **Isolation**: WASM runtime — multiple backends (Cranelift, LLVM, Singlepass)
- **Maintained by**: Wasmer Inc. (very active)
- **Strengths**: Multiple compilation backends, good performance
- **Production use**: Yes

### deno_core

- **Crate**: `deno_core`
- **Script language**: JavaScript / TypeScript
- **Isolation**: V8-based (same engine as Deno)
- **Size**: Large (~30MB+ with V8)
- **Maintained by**: Deno team (very active)
- **Strengths**: Full V8 performance, TypeScript support, latest ES features
- **Limitations**: Heavy dependency (pulls in V8), complex build
- **Production use**: Yes (Deno itself, Supabase Edge Functions)

### rustpython

- **Crate**: `rustpython`
- **Script language**: Python 3
- **Isolation**: Pure Rust interpreter
- **Maintained by**: RustPython team (moderate activity)
- **Strengths**: Pure Rust, embeddable
- **Limitations**: Incomplete stdlib, less mature, some compatibility gaps
- **Production use**: Limited

---

## Security Comparison

| Isolation Type | Escape Difficulty | Threat Model |
|---|---|---|
| **WASM sandbox** (quickjs-emscripten, Wazero, wasmtime) | Very hard — hardware-enforced memory isolation | Adversarial code |
| **V8 isolate** (isolated-vm, deno_core) | Hard — V8's isolate boundary, proven at scale | Adversarial code |
| **Pure interpreter** (goja, boa_engine, starlark-go) | Moderate — no I/O APIs exposed, but shares process memory | LLM-generated code (not adversarial) |
| **AST-restricted** (RestrictedPython) | Moderate — compile-time restrictions, occasional escapes found | LLM-generated code (not adversarial) |

For code mode (where the LLM generates the scripts, not untrusted users),
all options above are sufficient. If the user's threat model includes adversarial
code, recommend WASM or V8 isolate options.
