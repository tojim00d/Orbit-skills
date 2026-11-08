# Orbit artifacts — the shared pipeline contract

All skills write and read results in known places, so one step's output is immediately the next step's input, and any task can continue in a new session.

```
.orbit/
  task/<id>/                 one task; <id> = task key (ABC-123) or a short slug
    brief.md                 goal, done-criteria, constraints, scope         ← clarify-task, capture-requirements, shape-idea
    risks.md                 risks and threats with controls                ← scan-risks, model-threats
    plan.md                  plan: tasks, files, check commands, status     ← plan-steps, slice-tickets
    evidence.md              proof: command → output → conclusion           ← prove-done, test-flows, fix-ci
    review.md                review findings and what was done with them    ← review-code, review-security, cut-complexity, handle-review
    handoff.md               state for the next session                     ← handoff-session
  knowledge/
    graph.json, overview.md  knowledge graph and system overview            ← map-knowledge
    index/                   working code index                             ← index-code
    codebase/*.md            codebase state: stack, architecture, concerns  ← survey-codebase
    rules.md                 business rules catalog                         ← extract-rules
  reverse/<target>/
    findings.md              observation / inference / unknown log          ← reverse-app and the whole 1.3 block
  product/<name>/            product teardown, user pains, parity           ← teardown-product, mine-user-pain, check-parity
  learnings/*.md             learnings: causes, decisions, rejected paths   ← keep-learnings
openspec/                    specs and changes (OpenSpec)                   ← write-spec, run-spec-loop
docs/project-map/            interactive project map                        ← project-map
docs/diagrams/               static diagrams                                ← project-diagram, draw-stack
```

Rules:
- **Read before writing.** A step starts by reading earlier artifacts, not from scratch.
- **Write briefly, with evidence:** `file:line` paths, commands, links. Artifact text defaults to **English** (the pack default) unless the team or repo uses another language.
- **`.orbit/` is a work folder.** Commit it only if the team agrees. By default add `.orbit/` to `.git/info/exclude`, not to the repo's `.gitignore`.
- **Task status** lives in `plan.md`: `[ ]` not started, `[~]` in progress, `[x]` done and proven in `evidence.md`.
