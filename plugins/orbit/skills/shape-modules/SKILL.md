---
name: shape-modules
description: '[Orbit 2.2.5 Architecture & data] Deep modules: small interface, clean seam, tests through the interface; design it twice. Use when: «как разложить код», «модули и интерфейсы», «спроектируй модули»; module design, deep modules, code layout.'
---

# shape-modules — lay out code as deep modules

> **Orbit · ② Build · step 2.2.5 Architecture & data**
> **Input:** architecture ← `choose-stack`
> **Output:** module structure in `.orbit/task/<id>/design/modules.md` → next `deepen-modules`
> **Works with:** `test-first`, `code-backend`, `deepen-modules`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

How to structure code so it is easy to change and test. Core idea: a **deep module** — lots of behaviour behind a small interface, on a clean seam. The interface, not the file tree, is the unit of design.

## When to use

- A new service or feature area needs its module boundaries before implementation.
- A file/package layout exists but callers know too much: storage formats, protocols, retry order.
- Planning where to add a feature: which module owns the behaviour, where the seam is.
- **Not** for a one-file script or a throwaway prototype: there is no interface worth designing.

## Inputs

- architecture: `.orbit/task/<id>/design/architecture-design.md` — components, interactions, state ownership;
- the data design: `.orbit/task/<id>/design/data-design.md` — entities and where they are persisted;
- the existing code, when extending it: `rg -n "export |public |def " src/`, the package layout;
- the tests that exist and the test runner — tests are the proof that a seam is usable;
- the `deepen-modules` report if the work follows a refactor.

If the architecture is missing, run `design-services` first: modules without components are naming debates. If a needed external system (DB, queue, clock) has no interface yet, list it as a seam before designing call sites.

## Vocabulary (use exactly these words)

| Term | Meaning |
|---|---|
| **Module** | anything with an interface and an implementation: function, class, package, vertical slice |
| **Interface** | everything a caller must know: signature **and** invariants, call order, errors, config, performance |
| **Depth** | behaviour a caller gets per unit of interface they must learn |
| **Seam** | a place where behaviour can be swapped without editing that place; the interface lives there |
| **Adapter** | a concrete implementation at a seam (Postgres repo, in-memory fake) |
| **Locality** | change, bugs and verification concentrated in one place |

## Procedure

1. **Draw the module candidates from the architecture.** One component usually becomes one module plus adapters; a component with two reasons to change may be two modules. Write the list before the interfaces.
2. **For each module, state the interface in the caller's terms.** What does a caller know? Signature, invariants, error cases, call order, configuration, performance envelope. If the list is long, the module is shallow — merge or hide.
3. **Place seams only where swapping is needed.** External systems (DB, HTTP, queue, time, randomness) get a seam; the domain inside a service does not. Every extra seam is code to maintain and mock.
4. **Hide decisions that may change.** Storage format, protocol, library, serialisation — behind an interface that doesn't reveal them. A caller that imports a Postgres type has swallowed the seam.
5. **Handle errors inside where possible.** "Define errors out of existence": return an empty list instead of an exception, make delete idempotent, represent an absent value explicitly. An interface that throws for normal situations pushes work to every caller.
6. **Design it twice for important modules.** Sketch **two different interfaces** — e.g. "narrow with smart defaults" vs "explicit with parameters" — compare depth and call-site ergonomics, then pick one. The first draft is rarely the best.
7. **Write the test strategy through the interface.** Tests call the module the way callers do; a test that breaks on a behaviour-preserving refactor tests the implementation. Fakes live at seams, not inside the domain.
8. **Check call-site ergonomics on paper.** Write 5–10 lines of the caller code for the main use case. If it reads like a protocol manual, the interface is wrong — go back to step 6.
9. **Record the module list in the design.** For each module: interface (what the caller knows), hidden decisions, seam location, how it is tested. `deepen-modules` and `review-code` will use this vocabulary.
10. **Hand over.** Link the module list to tasks: the interface first (test-first), then adapters, then call sites.

## Output

`.orbit/task/<id>/design/modules.md` — module list with interfaces and seams:

```markdown
# Modules: <service>

## orders
- **Interface:** `create(cmd): Order`, `cancel(id, reason): Order`, `byId(id): Order | None`
  - invariants: cancel only from `new`/`paid`; amount fixed at creation
  - errors: `OrderNotFound`, `IllegalTransition` (both explicit, no generic exception)
  - call order: create → (pay | cancel); read at any time
- **Hidden:** table layout, SQL, outbox write, id generation
- **Seam:** `OrdersRepo` (Postgres adapter; in-memory fake in tests)
- **Tested through:** `orders.test.ts` against the fake + contract test against Postgres

## payments
- **Interface:** `charge(order, method): Receipt`, `refund(receiptId): Refund`
- **Hidden:** provider SDK, retries, idempotency key storage
- **Seam:** `PaymentProvider` (adapter per provider)
```

Two interface sketches for the same module, the "design it twice" artifact:

```ts
// A — narrow, smart defaults
createOrder(customer: Customer, items: Item[]): Order

// B — explicit, caller decides
createOrder(input: { customerId: Id; items: Item[]; currency: Currency; idempotencyKey: string }): Order
// A hides too much (currency? retry key?) → callers would need escape hatches.
// B is deeper: one call, explicit inputs, invariant (amount from items) stays inside.
```

## Check

The module structure is usable when call sites are short and tests survive refactors:

```bash
rg -n "\.\./|from ['\"]\.\./\.\./src" src/ | wc -l      # deep imports = leaked internals
rg -n "new .*Repo\(|from ['\"].*postgres" src/            # storage types leaking into domain
npm test -- modules                                       # or: pytest tests/modules -q
rg -n "design it twice|Interface:" .orbit/task/<id>/design/modules.md
```

Pass rule: every module has a written interface (signature + invariants + errors) and a named seam if it touches an external system; no module has an interface nearly as large as its implementation; storage/protocol types do not appear in caller or domain signatures; the main use case reads as ≤10 lines of caller code; the design-it-twice comparison is recorded for the important modules; tests hit modules through their interfaces. Link it from `.orbit/task/<id>/plan.md`.

## Pitfalls

- **A seam per class.** Wrapping everything "for testability" doubles the code and mock burden. Seams only at external systems.
- **Interface = implementation.** Getter/setter pairs, pass-through methods and one-call wrappers add layers without depth. Merge or delete.
- **Leaking storage types.** A caller that knows about `pg`/ORM rows is coupled to the store. Map to domain types at the seam.
- **Errors for normal cases.** Throwing "not found" for an empty list makes every caller write try/catch. Use empty values, idempotent operations, explicit option types.
- **Testing internals.** Tests that assert private calls pin the implementation and block refactoring. Test through the interface.
- **One-shot design.** The first interface is rarely the best; skipping the second sketch is the expensive shortcut.
- **Naming the tree as design.** Folder structure is a consequence of modules, not a substitute. The interface is the decision.

## Portability

The vocabulary and the method are language-agnostic; any agent can read code, sketch interfaces and write the module list. Without a test runner, the check degrades to reading call sites and noting which tests would need to exist. Without subagents, do the "design it twice" comparison inline and keep both sketches in the artifact. No slash commands or Claude-specific features are involved; the module list is Markdown, shared with `deepen-modules` and `review-code`.

## What's improved vs the source

- Vocabulary and principles on one page with practical examples.
- Adds the rule "seams only at external systems" and a check for tests bound to implementation.
- Same vocabulary used by `deepen-modules` for existing code and `review-code` in review.
- Two explicit sketches for "design it twice" and a caller-ergonomics test on paper.
- The module list is a real artifact (`.orbit/task/<id>/design/modules.md`) that later steps read.
- A check for leaked storage types and deep imports.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «codebase-design» (MIT). Rewritten in our own words and improved — see "What's improved".
