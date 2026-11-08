---
name: analyze-binary
description: '[Orbit 1.3.3 Reverse engineering] Take apart a binary ELF/Mach-O/PE/.NET/JVM: dependencies, capabilities, logic, version diff. Use when: «разбери бинарник», «что делает dll», «сравни версии», «зависимости бинарника», «что умеет бинарь»; binary analysis, compare builds.'
---

# analyze-binary — take apart an executable

> **Orbit · ① Understand · step 1.3.3 Reverse engineering**
> **Input:** one binary (ELF/Mach-O/PE, .NET assembly, JVM class/JAR) + `.orbit/reverse/<target>/findings.md`
> **Output:** capability map and typed answers appended to `.orbit/reverse/<target>/findings.md` → next `extract-rules`
> **Works with:** `reverse-app`, `teardown-artifact`, `review-security`
> **Shared rules:** reply in the user's language; generated artifacts default to English; own or authorized targets only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A native (ELF, Mach-O, PE) or managed (.NET, JVM) binary: what it is, what it depends on, what it can do, how it differs from the previous version. Typical cases: a legacy utility without sources, a vendor agent on servers, "why does it crash on the new OS", comparing two builds, a component audit. Scope line and findings log — as in `reverse-app`. Static analysis first; run only in isolation and only if static analysis did not answer.

## When to use

- A binary ships into production and nobody has its sources or build recipe.
- It starts, crashes or behaves differently on a new OS, architecture or base image.
- Two versions of the same component must be compared before an upgrade.
- An audit needs the dependency set, network/file capabilities and embedded config of a binary.
- A clean-room rewrite needs a behavior description with evidence, not guesses.

Do **not** use it for archives, images or packages — `teardown-artifact` has the recipes; if the sources exist, `map-knowledge` is cheaper and more accurate.

## Inputs

- the binary plus its origin, version and hash (registry, CI job, vendor delivery, ticket);
- `.orbit/reverse/<target>/findings.md` from `reverse-app` — the target slug and question checklist;
- the previous build when the task is a diff;
- an isolated container or VM for the behavior level, with no network unless the observation needs it;
- `.orbit/task/<id>/brief.md` when a task depends on the answer.

If `findings.md` is missing, create it with the `reverse-app` template before starting. If the binary is stripped or packed, say so in the log and lean on imports, strings and configs — an answer may end as `unknown`, which is honest. If `file` cannot identify the format, stop and ask for the build platform.

## Procedure

1. **Confirm scope and identity.** The scope line comes from `reverse-app`; this skill only adds answers. Record hash, size and version in the first line of the section.
   ```bash
   file <bin>; shasum -a 256 <bin>; ls -la <bin>
   ```
2. **Level 1 — identify the platform and linkage.** Linkage tells you the runtime and the minimum OS.
   ```bash
   otool -L <bin>        # macOS libs
   ldd <bin>             # Linux
   objdump -p <bin.exe>  # PE imports and DLLs
   otool -l <bin> | grep -A3 LC_BUILD_VERSION   # minimum OS version
   codesign -dv --verbose=2 <bin> 2>&1          # signature (macOS)
   go version -m <bin>; strings <bin> | grep -m5 -E 'rustc|GCC:|clang'
   ```
3. **Level 2 — capabilities from symbols.** Exported symbols say what it offers; imported functions say what it can do. Group imports by meaning: network (`socket`, `connect`), files, processes (`fork`, `exec*`), crypto, config. That is a capability map without decompiling.
   ```bash
   nm -gU <bin> | head -100      # exported
   nm -u <bin> | head -100       # imported
   strings -n 8 <bin> | grep -E 'https?://|/api/|\.(yml|json|conf)$|SELECT |ERROR|usage:' | sort -u | head -80
   ```
4. **Read embedded config and resource strings.** URLs, queue names, config filenames and error messages are the cheapest evidence of behavior. Add them to the log as observations with the `strings` command that produced them.
5. **.NET string literals are UTF-16** — plain `strings` misses them. Extract with a one-liner and sort:
   ```bash
   python3 -c "import re,sys;b=open(sys.argv[1],'rb').read();[print(m.decode('utf-16le')) for m in set(re.findall(rb'(?:[\x20-\x7e]\x00){8,}',b))]" <bin.dll> | sort | head -100
   ```
6. **Level 3 — logic, only the functions the question needs.** JVM: `javap -c -p <Class>`, decompiler CFR/jadx. .NET: `ilspycmd <bin.dll>` or `monodis` if installed. Native: Ghidra headless or `objdump -d --no-show-raw-insn` at the function; `radare2`/`rizin` if present. Work backwards from the question: the string or import related to it → references → function → callers.
7. **Level 4 — behavior, only if literals and logic cannot answer.** Run in isolation (container without network, or a controlled network) and log the command with the observation.
   ```bash
   strace -f -e trace=file,network ./<bin> <args>   # Linux
   sudo fs_usage -w -f filesys <bin>                # macOS
   ltrace ./<bin>
   ```
8. **Version diff.** Diff symbols and strings between the two builds; a new import or a new URL is usually the whole answer.
   ```bash
   diff <(nm -gU v1 | awk '{print $3}' | sort) <(nm -gU v2 | awk '{print $3}' | sort)
   diff <(strings -n 8 v1 | sort -u) <(strings -n 8 v2 | sort -u) | head -100
   ```
9. **Write the capability map** into the binary section of the log (template below), then append the answers as normal findings rows with type `observation` / `inference` / `unknown` and a confidence.
10. **Summarize and hand off.** Identity, platform, dependencies, capabilities by import group, and the typed answers. Next: `extract-rules` to describe behavior for a rewrite, or `review-security` for CVEs and exposure.

## Output

Append to `.orbit/reverse/<target>/findings.md` — a section per build, then rows in the shared table:

```markdown
## Binary: <name> — sha256:<hash> — <version>
Identity: format …, arch …, min OS …, linker …, signature …
Dependencies: libssl 1.1, libc 2.31, libz …
| Capability | Evidence (import / string / symbol) | Notes |
|---|---|---|
| network client | import connect, string https://… | outbound only |
| file writes | import open/write, path /etc/agent | config + spool |
| process spawn | import fork/exec* | restarts child |
Answers: rows 4–7 in the table above.
```

A row example: `| 5 | Which TLS stack? | OpenSSL 1.1 via libssl import | observation | readelf -d / ldd output | high |`.

## Check

Prove the section is complete before moving on:

```bash
test -f .orbit/reverse/<target>/findings.md && echo "log ok"
grep -n 'sha256:' .orbit/reverse/<target>/findings.md | head -2       # both builds, if diffing
grep -cE '^\| (network|file|process|crypto|config)' .orbit/reverse/<target>/findings.md  # capability rows
grep -E '^\| [0-9]+ \|' .orbit/reverse/<target>/findings.md | grep -vE '\| (observation|inference|unknown) \|' || echo "all typed"
```

Pass rule: hash and platform recorded; at least three capability groups named with evidence; every answer row typed and given a confidence; version diff, if requested, lists added/removed symbols and strings; anything not observed is marked `unknown`. When the answer feeds a task, copy the conclusion into `.orbit/task/<id>/evidence.md` (`prove-done`).

## Pitfalls

- **Decompiling before asking.** A full auto-analysis of a large binary burns hours and answers nothing. Start from the question, then open only the functions that reference the relevant string or import.
- **Treating strings as behavior.** A URL in the binary is an observation that the string exists, not proof the program connects to it. Mark the capability and, if it matters, confirm the call path.
- **Missing a second runtime.** A Go or Rust binary has few dynamic symbols; a .NET assembly hides strings in UTF-16. Choose the extraction method for the runtime before concluding "no URLs".
- **Executing on the workstation.** Even `--help` can write files or contact a server. Use a container or VM without network; if you cannot isolate, report static findings only.
- **Comparing unlike builds.** Diffing a debug build against a release build lists noise. Confirm version, flags and platform before drawing conclusions.
- **Leaking a secret found in the artifact.** Log the file and "rotation needed", never the value — artifacts end up in shared folders.

## Portability

Works with any agent and model: shell commands plus one Markdown log. There is no subagent dependency; if behavior runs are needed, do them in a local container from the same terminal the agent uses. Tools are standard reverse-engineering utilities (binutils, `otool`, Ghidra, `javap`, `ilspycmd`); when one is absent, use the platform equivalent and record which tool produced each observation. No Claude Code features are required.

## What's improved vs the source

- Four depth levels: identify → capabilities via imports → logic of needed functions → behavior in isolation.
- UTF-16 string extraction for .NET and a one-command version diff.
- Capability rows carry the producing command, so a reader can re-run the evidence.
- Import grouping by meaning (network, files, processes, crypto, config) replaces a raw symbol dump.
- An explicit `.orbit/reverse/<target>/findings.md` contract ties the analysis to the rest of the pipeline.

## Based on

- [REA](https://github.com/morluto/rea) — method «reverse-engineer-anything» (MIT). Rewritten in our own words and improved — see "What's improved".
