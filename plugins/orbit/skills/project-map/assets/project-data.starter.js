// Starter map data (English UI: META.lang = "en"). This is the ONLY file edited per project.
// No coordinates: the schema lays itself out. How to fill it — ../SKILL.md and ../references/authoring-guide.md
// Russian UI and texts — start from project-data.starter.ru.js instead.

// Page header.
const META = {
  lang: "en",                                  // map UI language: "en" | "ru"
  title: "How the App project works",
  kicker: "App · project map",
  footer: "Built from the sources. Links point to the main branch.",
};

// Code links. GitLab and GitHub are both supported (link format is chosen from GL).
const GL = "https://gitlab.example.com";
const REPO = { app: ["group/app", "main"] };
const A = "app";

// Blocks: [title, caption, "what it is", [how it works...], [[repo,"path"]...], [[chipKey,"label"]...]]
const N = {
  user: ["User", "browser", "Who works with the system.", ["Opens the web UI."], []],
  ui: ["Frontend", "React · SPA", "What the user sees.",
    ["Main screen and forms.", "Calls the API over REST."],
    [[A, "frontend/src/main.jsx"]]],
  api: ["API", "process", "Main process: handles requests.",
    ["Entry point — <code>Program.cs</code>.", "Returns statuses."],
    [[A, "src/Program.cs"]],
    [["ctrl", "Controllers"]]],
  db: ["Database", "PostgreSQL", "What it stores.",
    ["Schema and key tables."],
    [[A, "src/Db/"]]],
};

// Chips: a detail inside a block. [title, [points...], [[repo,"path"]...]]
const CHIP = {
  ctrl: ["Controllers", ["Request validation and mapping."], [[A, "src/Controllers/"]]],
};

// Links: [from, to, kind, "title", "summary", [how it works...], [[repo,"path"]...]]
// Step numbers are assigned by the engine in reading order.
const E = [
  ["user", "ui", "ctrl", "User → frontend", "work in the browser", ["Login and main actions."], []],
  ["ui", "api", "ctrl", "Frontend → API", "REST /api/v1", ["All user actions go here."], [[A, "frontend/src/api.js"]]],
  ["api", "db", "data", "API → DB", "read and write", ["ORM, transactions."], [[A, "src/Db/Context.cs"]]],
];

// Link kinds -> [color, legend label]. Keep 3–5 kinds.
const KIND = {
  ctrl: ["#c9a92b", "control"],
  data: ["#6f8fc9", "data"],
  deploy: ["#7aa36f", "deploy"],
  sec: ["#a57fd0", "secrets"],
};

// Layout: order only. "Entry" row on top, then bands (phases/layers) top to bottom.
// Blocks not named here go to an "Other" band automatically.
const LAYOUT = {
  top: ["user"],
  bands: [
    // [title, caption, [block keys], color? ]
    ["Client", "what runs in the browser", ["ui"]],
    ["Server", "processes and data", ["api", "db"]],
  ],
  labels: { 1: "REST" },                        // optional short arrow labels: {link index: "text"}
  footer: "Shared rules and libraries across all layers", // optional; can be ["text", "block-key"]
};

// Sections below the schema (optional). Helpers: flow, bullets, files, mod.
const PAGES = () => [
  ["flows", "Flows", "What actually happens", "Main scenario step by step.",
    `<div class="grid c2"><div class="card"><h3>Saving a form</h3>${flow([
      ["User clicks “Save”", "<code>Form.jsx</code>"],
      ["API validates and writes to the DB", "<code>FormController</code>"]])}</div></div>`],
];
