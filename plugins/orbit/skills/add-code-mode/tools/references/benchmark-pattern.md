# Benchmark Pattern for Code Mode

## Purpose

The benchmark proves code mode actually reduces context size. It runs the same
queries through both paths (regular tool vs. code mode) and compares the byte
sizes of what would enter the LLM context.

## Methodology

1. **Generate or fetch test data** — realistic responses that match what the
   tool returns in production
2. **Define scenarios** — each scenario is a pair: the query + a representative
   processing script that extracts what an LLM would typically need
3. **Measure both paths**:
   - **Before**: `JSON.stringify(toolResponse).length` (what the regular tool returns)
   - **After**: `codeModeOutput.length` (what the code mode script produces)
4. **Calculate reduction**: `(1 - after/before) * 100`

## Scenario Design

Good benchmark scenarios reflect real LLM usage patterns:

| Pattern | Example | Expected Reduction |
|---|---|---|
| **List → summary table** | 200 users → `id, name, active` table | 60–80% |
| **Filter** | All users → only inactive ones | 80–99% (depends on ratio) |
| **Aggregate** | All users → count per department | 95–99% |
| **Search** | All events → only errors | 90–99% |
| **Extract field** | Full resources → just names/IDs | 70–90% |

## Template (TypeScript)

Adapt this to the server's language. The structure stays the same.

```typescript
interface Scenario {
  name: string;
  description: string;
  // Function that returns the raw API response (or mock data)
  getData: () => Promise<string>;
  // The processing script the LLM would write
  code: string;
  language: "javascript" | "python";
}

const scenarios: Scenario[] = [
  {
    name: "List all users",
    description: "Extract id, userName, active from all users",
    getData: async () => {
      // Option A: Hit real API
      // const res = await fetch(`${baseUrl}/Users`, { headers });
      // return await res.text();

      // Option B: Generate mock data
      return JSON.stringify({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        totalResults: 200,
        Resources: Array.from({ length: 200 }, (_, i) => generateFakeUser(i)),
      });
    },
    code: `
      const data = JSON.parse(DATA);
      const lines = data.Resources.map(u =>
        [u.id, u.userName, u.active].join("\\t")
      );
      console.log(["id\\tuserName\\tactive", ...lines].join("\\n"));
    `,
    language: "javascript",
  },
  // ... more scenarios
];

async function runBenchmark() {
  const results: Array<{
    name: string;
    before: number;
    after: number;
    reduction: number;
  }> = [];

  for (const scenario of scenarios) {
    const rawData = await scenario.getData();
    const before = Buffer.byteLength(rawData, "utf-8");

    // Run through code mode sandbox
    const output = await executeInSandbox(rawData, scenario.code, scenario.language);
    const after = Buffer.byteLength(output, "utf-8");

    const reduction = ((1 - after / before) * 100).toFixed(1);
    results.push({ name: scenario.name, before, after, reduction: parseFloat(reduction) });
  }

  // Print results table
  console.log("| Test | Tool Response | Code-Mode Output | Reduction |");
  console.log("|---|---|---|---|");
  for (const r of results) {
    console.log(
      `| ${r.name} | ${formatBytes(r.before)} | ${formatBytes(r.after)} | ${r.reduction}% |`
    );
  }

  const totalBefore = results.reduce((s, r) => s + r.before, 0);
  const totalAfter = results.reduce((s, r) => s + r.after, 0);
  const totalReduction = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log(
    `| **Total** | **${formatBytes(totalBefore)}** | **${formatBytes(totalAfter)}** | **${totalReduction}%** |`
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}
```

## Template (Python)

```python
import json
import sys

scenarios = [
    {
        "name": "List all users",
        "description": "Extract id, userName, active from all users",
        "get_data": lambda: json.dumps({
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "totalResults": 200,
            "Resources": [generate_fake_user(i) for i in range(200)],
        }),
        "code": """
import json
data = json.loads(DATA)
for u in data["Resources"]:
    print(f"{u['id']}\\t{u['userName']}\\t{u['active']}")
""",
        "language": "python",
    },
]

def run_benchmark():
    results = []
    for s in scenarios:
        raw = s["get_data"]()
        before = len(raw.encode("utf-8"))
        output = execute_in_sandbox(raw, s["code"], s["language"])
        after = len(output.encode("utf-8"))
        reduction = (1 - after / before) * 100
        results.append({"name": s["name"], "before": before, "after": after, "reduction": reduction})

    print("| Test | Tool Response | Code-Mode Output | Reduction |")
    print("|---|---|---|---|")
    for r in results:
        print(f"| {r['name']} | {format_bytes(r['before'])} | {format_bytes(r['after'])} | {r['reduction']:.1f}% |")

def format_bytes(b):
    return f"{b}B" if b < 1024 else f"{b/1024:.1f}KB"
```

## Template (Go)

```go
type Scenario struct {
    Name     string
    GetData  func() string
    Code     string
}

func runBenchmark(scenarios []Scenario) {
    fmt.Println("| Test | Tool Response | Code-Mode Output | Reduction |")
    fmt.Println("|---|---|---|---|")

    var totalBefore, totalAfter int
    for _, s := range scenarios {
        raw := s.GetData()
        before := len(raw)
        output, _ := executeInSandbox(raw, s.Code)
        after := len(output)
        reduction := (1 - float64(after)/float64(before)) * 100
        fmt.Printf("| %s | %s | %s | %.1f%% |\n",
            s.Name, formatBytes(before), formatBytes(after), reduction)
        totalBefore += before
        totalAfter += after
    }
}
```

## What to Include in Scenarios

Tailor scenarios to the specific MCP server's domain:

**For SCIM servers**: list users, list groups, find inactive users, count by department,
find users without email, group membership summary

**For Kubernetes servers**: list pods, list deployments, list events (huge!),
node status summary, pods not running, resource usage

**For GitHub servers**: list issues, list PRs, search code results, repo contributors,
commit history summary

**For Stripe servers**: list transactions, list customers, revenue by product,
failed payments summary

The key is picking scenarios where the full response is large but the LLM
typically only needs a small subset of the data.
