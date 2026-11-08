// Example: a map of the Orbit pack, built with the project-map skill (English UI).
// Russian version — ../example-ru/. Per project only this file is edited: META, N, CHIP, E, KIND, LAYOUT, PAGES.
const GL = "https://github.com";
const REPO = { orbit: ["tojim00d/Orbit-skills", "main"] };
const R = "orbit";
const SK = n => [R, `plugins/orbit/skills/${n}/SKILL.md`];

// Blocks: [title, caption, "what it is", [how it works...], [[repo,"path"]...], [[chipKey,"label"]...]]
const N = {
  orbit: ["orbit", "entry · picks a route", "Pack entry point: sizes the task and proposes a 3–7 step route.",
    ["A small task is done at once, without the pipeline.", "A big one gets a route of skills in order, each step with its own artifact.", "Command <code>/orbit:orbit &lt;task&gt;</code>."],
    [SK("orbit")]],

  intake: ["Intake", "clarify what's needed", "Turn a fuzzy request into unambiguous requirements.",
    ["Sharp questions one at a time until the goal is clear.", "Business request → structured requirements.", "Idea → agreed design before code."],
    [SK("clarify-task"), SK("shape-idea")], [["grill", "clarify-task"], ["req", "capture-requirements"], ["brain", "shape-idea"]]],
  recon: ["Code recon", "facts from code", "Understand the system from its code, not guesses.",
    ["Knowledge graph: modules and links with <code>file:line</code> evidence.", "Working index: index first, then targeted reading.", "Codebase state: stack, conventions, concerns."],
    [SK("map-knowledge")], [["und", "map-knowledge"], ["graft", "index-code"], ["mapc", "survey-codebase"]]],
  reverse: ["Reverse engineering", "when there are no sources or docs", "Take apart an artifact, binary, web app or API.",
    ["Scope line: whose target and why.", "Findings log: observation / inference / unknown.", "Static before dynamic; run only in isolation."],
    [SK("reverse-app")], [["re", "reverse-app"], ["art", "teardown-artifact"], ["api", "recover-api-spec"]]],
  spec: ["Specification", "spec before code", "Agree on what changes before writing code.",
    ["Conversation → spec.", "OpenSpec: proposal → requirement delta → validate.", "Risks and threats become requirements."],
    [SK("run-spec-loop")], [["tospec", "write-spec"], ["sdd", "run-spec-loop"]]],

  plan: ["Plan", "small tasks", "A detailed implementation plan and slice tickets.", ["Tasks of 2–5 minutes with files and check commands.", "Tickets are vertical slices with dependencies."],
    [SK("plan-steps")], [["wp", "plan-steps"], ["tt", "slice-tickets"]]],
  build: ["Implementation", "test → code → refactor", "Code in small steps with tests.", ["Failing test first.", "Each task to a fresh subagent, with review between tasks."],
    [SK("test-first")], [["tdd", "test-first"], ["sdd2", "delegate-tasks"]]],
  check: ["Verification", "prove it works", "Reviews and checks before the word \"done\".", ["Run the checks and show the output.", "Review code, security and unnecessary complexity."],
    [SK("prove-done")], [["ver", "prove-done"], ["cr", "review-code"], ["sec", "review-security"]]],
  release: ["Release", "MR and deploy", "Finish the branch, open the MR, ship.", ["MR with a description and verification.", "Kubernetes/Helm: render and diff, deploy through git."],
    [SK("open-mr")], [["pr", "open-mr"], ["k8s", "ship-k8s"]]],

  map: ["Project map", "interactive schema", "A map like this one: blocks, links, step numbers, code links.", ["Updated in the same change as the code.", "Command <code>/orbit:map</code>."],
    [SK("project-map")], [["pm", "project-map"], ["sd", "draw-stack"]]],
  memory: ["Memory & hand-over", "knowledge across sessions", "Learnings next to code, hand-over, retros.", ["Bug causes and rejected approaches — in <code>.orbit/learnings/</code>.", "HANDOFF.md for a fresh session."],
    [SK("keep-learnings")], [["trail", "keep-learnings"], ["ho", "handoff-session"]]],
  ops: ["Operations", "see it and fix it", "Observability, runbooks, incidents.", ["Symptom alerts, each with a runbook.", "Incident: mitigate → timeline → postmortem."],
    [SK("handle-incident")], [["mon", "review-observability"], ["inc", "handle-incident"]]],
};

const CHIP = {};
for (const [, node] of Object.entries(N))
  for (const [key, label] of node[5] || []) CHIP[key] = [label, [`Skill <code>${label}</code>. Open the file to read the method.`], [SK(label)]];

// Links: [from, to, kind, "title", "summary", [how it works...], [[repo,"path"]...]]
// Step numbers are set by the engine in reading order: entry → phase ① → transition → phase ② → …
const E = [
  ["orbit", "intake", "r", "Start", "a route for the task", ["A big task starts with clarification."], [SK("orbit")]],
  ["intake", "recon", "r", "Requirements → recon", "what the code has", ["Check requirements against the real code."], []],
  ["recon", "reverse", "r", "No sources → reverse", "artifact, binary, API", ["When there's no code or docs."], [SK("reverse-app")]],
  ["recon", "spec", "r", "Facts → spec", "agree before code", ["The proposal is born from facts."], [SK("write-spec")]],
  ["spec", "plan", "l", "Spec → plan", "spec before code", ["Build starts only after an agreed spec."], [SK("plan-steps")]],
  ["plan", "build", "l", "Plan → code", "task by task", [], []],
  ["build", "check", "l", "Code → verification", "evidence", [], []],
  ["check", "release", "l", "Verification → release", "MR and deploy", [], []],
  ["release", "map", "m", "Release → map", "recorded in the map", ["The map is updated in the same change."], [SK("project-map")]],
  ["map", "memory", "m", "Map → memory", "learnings", [], []],
  ["memory", "ops", "m", "Memory → operations", "runbooks and alerts", [], []],
  ["ops", "intake", "m", "Next loop", "incident or idea → new task", ["The orbit closes: operations produce the next task."], []],
];

const KIND = { r: ["#6f8fc9", "① Understand"], l: ["#7aa36f", "② Build"], m: ["#c9a92b", "③ Operate"] };

const META = {
  lang: "en",
  title: "Orbit — the full project lifecycle",
  kicker: "Orbit · example map",
  mapTitle: "Phases and steps",
  mapIntro: "Phases top to bottom, steps left to right. The number on an arrow is the reading order. A thick ringed arrow is a transition to the next phase. Click a block, chip or arrow.",
  footer: "Built with the project-map skill.",
};

const LAYOUT = {
  top: ["orbit"],
  bands: [
    ["Understand", "the task and the system", ["intake", "recon", "reverse", "spec"]],
    ["Build", "plan → code → verify → release", ["plan", "build", "check", "release"]],
    ["Operate", "map, memory, operations", ["map", "memory", "ops"]],
  ],
  labels: { 0: "start", 4: "spec before code", 8: "into the map", 11: "next loop" },
  footer: "Across all phases: plain-language answers, work within agreed scope, small changes",
};

const PAGES = () => [
  ["use", "How to use", "Commands", "",
    `<div class="table-scroll"><table><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody>
      <tr><td><code>/orbit:orbit &lt;task&gt;</code></td><td>Pick a route and walk it</td></tr>
      <tr><td><code>/orbit:understand</code></td><td>Understand a repository</td></tr>
      <tr><td><code>/orbit:map</code></td><td>Build a project map</td></tr>
      <tr><td><code>/orbit:reverse</code></td><td>Take apart an app or artifact</td></tr>
    </tbody></table></div>`],
];
