# JSON format for project-diagram

```json
{
  "title": "Diagram title",
  "subtitle": "One line: how to read it",
  "theme": "blueprint",                      // or "paper"; the --theme flag wins
  "columnWidth": 300,                        // optional, phase column width
  "phases": [
    {
      "title": "Understand",                 // ①②③ is added automatically
      "sub": "what happens in this phase",
      "steps": [
        {"id": "intake", "title": "Intake", "sub": "unambiguous requirements", "items": ["clarify-task", "shape-idea"]}
      ]
    }
  ],
  "edges": [                                 // optional; default — a chain in step order
    {"from": "intake", "to": "recon"},
    {"from": "spec", "to": "plan", "label": "spec"},
    {"from": "ops", "to": "intake", "label": "next loop", "dashed": true}
  ],
  "footer": "Bottom line: what applies across all phases"   // optional
}
```
The `//` comments above are explanations only; real JSON must not contain them. Titles and captions are written in the audience's language.

How links are drawn:
| Link | Looks like |
|---|---|
| adjacent steps in one column | short arrow down |
| non-adjacent steps in one column | detour left of the column |
| to a later phase (forward) | through the gap between columns; label as a pill on the line |
| to an earlier phase (return) | dashed along the bottom with a label |

Step numbers follow step order in the JSON: top to bottom in a column, columns left to right.
The script checks: duplicate `id`s, links to unknown steps.
