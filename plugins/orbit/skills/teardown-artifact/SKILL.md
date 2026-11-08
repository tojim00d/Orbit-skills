---
name: teardown-artifact
description: '[Orbit 1.3.2 Reverse engineering] Take apart an artifact: JAR, Docker image, Helm chart, npm/pip/NuGet, APK/IPA, Electron, PyInstaller. Use when: «что внутри образа», «разбери jar», «почему образ большой», «что реально в проде»; inspect image, artifact.'
---

# teardown-artifact — take apart a built artifact

> **Orbit · ① Understand · step 1.3.2 Reverse engineering**
> **Input:** a built artifact — JAR/WAR, Docker/OCI image, Helm chart, npm/pip/NuGet package, archive, APK/IPA, Electron ASAR, PyInstaller build
> **Output:** contents, versions, configs, risks → next `review-security`
> **Works with:** `reverse-app`, `ship-k8s`, `review-security`
> **Shared rules:** reply in the user's language; generated artifacts default to English; own or authorized targets only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

What's inside a JAR, Docker image, Helm chart, npm/pip package, archive, mobile build or Electron app: contents, dependencies, configs, entry points, versions. Daily DevOps work: "what actually shipped to prod", "why is the image 1.2 GB", "which log4j is inside". Scope line and findings log — as in `reverse-app`. Work in `.orbit/reverse/<target>/work/`; never modify the original artifact.

## When to use

- A production container or package must be inventoried: what code, which versions, which config.
- An image is unexpectedly large or slow to pull and the layer composition is unknown.
- A CVE advisory names a library and you must find which shipped artifacts contain it.
- A vendor delivery arrives as a JAR, APK or installer and the acceptance checklist needs facts.
- Before `ship-k8s` or a rebuild you need the real entry point, user, ports and env.

Do **not** use it when the artifact is a plain native binary — `analyze-binary` has the right tools; when the sources are available, `survey-codebase` is faster.

## Inputs

- the artifact and its origin: registry, artifact repository, CI job, vendor, ticket;
- its digest (`sha256`) and tag — findings are tied to this exact build;
- `.orbit/reverse/<target>/findings.md` for the scope line and question checklist;
- `.orbit/task/<id>/brief.md` when the teardown serves a task;
- a clean work directory under `.orbit/reverse/<target>/work/`.

If the artifact cannot be pulled, record the exact error and the credentials source (never the secret). If the file is truncated or corrupt, stop — do not analyze a partial download.

## Procedure

1. **Pin identity.** `file`, `shasum -a 256`, size, origin, and the digest the registry reports. Record it at the top of the section.
   ```bash
   file <artifact>; shasum -a 256 <artifact>; ls -la <artifact>
   ```
2. **Inventory without unpacking where possible.** List the archive or image manifest before extracting; this avoids writing gigabytes for one question.
   ```bash
   unzip -l <app.jar> | head -50
   docker image inspect <img:tag> | jq '.[0].Config | {Entrypoint,Cmd,Env,User,ExposedPorts,WorkingDir}'
   ```
3. **Unpack into a clean directory** under `.orbit/reverse/<target>/work/` and never in place. For images, save and extract layers when the engine is unavailable:
   ```bash
   docker save <img:tag> -o .orbit/reverse/<target>/work/img.tar
   mkdir -p .orbit/reverse/<target>/work/layers && tar -xf .orbit/reverse/<target>/work/img.tar -C .orbit/reverse/<target>/work/layers
   ```
4. **Find entry points → configs → dependencies → anything suspicious**, in that order. An entry point defines what runs; configs define behavior; dependencies define risk.
5. **JAR / WAR / EAR:** manifest and Spring Boot layout.
   ```bash
   unzip -p <app.jar> META-INF/MANIFEST.MF            # Main-Class, Start-Class, Spring-Boot-Version
   unzip -l <app.jar> | grep -E 'BOOT-INF/lib/.*\.jar' | awk '{print $4}'   # Spring Boot deps
   unzip -p <app.jar> BOOT-INF/classes/application.yml
   javap -p -classpath <app.jar> com.example.Service
   ```
   Deeper: a decompiler (CFR, Fernflower, jadx) if installed and the target is your own code.
6. **Docker / OCI image:** history, env, layers, base image.
   ```bash
   docker history --no-trunc <img:tag>
   # dive <img:tag> — layer sizes; syft <img:tag> — SBOM; trivy/grype <img:tag> — CVEs (podman works the same)
   ```
   Check: root user, secrets in ENV or layers, extra tools (`curl`, shell) in a prod image, base image and its age.
7. **Helm chart:** rendered output is the truth, values are the intent.
   ```bash
   helm show chart ./chart; helm show values ./chart
   helm template <rel> ./chart -f values-prod.yaml > rendered.yaml
   yq 'select(.kind=="Deployment") | .spec.template.spec.containers[] | {image, resources, securityContext}' rendered.yaml
   helm dependency list ./chart
   ```
8. **npm / pip / Go / NuGet:** package contents and install-time code.
   ```bash
   npm pack <pkg>@<ver> && tar -xzf *.tgz && cat package/package.json   # scripts.postinstall!
   pip download <pkg>==<ver> --no-deps && unzip -l *.whl
   go version -m ./<binary>
   grep -o '<dependency id="[^"]*" version="[^"]*"' ~/.nuget/packages/<pkg>/<ver>/*.nuspec
   ```
   Watch install scripts (`postinstall`, `setup.py`, NuGet `.ps1`/`.targets`) — code that runs on install.
9. **ZIP / APK / IPA / MSIX, Electron and PyInstaller:** archives and app bundles.
   ```bash
   unzip -l <app.apk> | head; aapt2 dump badging <app.apk>      # apktool d — if installed
   unzip -l <App.ipa>; plutil -p Payload/*.app/Info.plist
   npx --yes @electron/asar extract <app.asar> out/ && cat out/package.json
   # PyInstaller: pyextractor-style tool against <app.exe> → .pyc, then a decompiler matching the Python version
   ```
10. **Record the summary** — table "component — version — where — risk" — and hand off: CVEs and licences → `review-security`; secrets → rotation via the owner; image size and layers → `ship-k8s`.

## Output

A section appended to `.orbit/reverse/<target>/findings.md`:

```markdown
## <artifact> sha256:<digest>
Entry point: <cmd>   User: <user>   Ports: <ports>   Base: <base image + age>
| Component | Version | Found at | Risk |
|---|---|---|---|
| log4j-core | 2.14.1 | BOOT-INF/lib/log4j-core-2.14.1.jar | CVE-2021-44228 |
Configs and env: application.yml keys, secrets found: (fact and path only)
Conclusion: 3–5 lines
```

## Check

```bash
test -f .orbit/reverse/<target>/findings.md && echo "log ok"
grep -n 'sha256:' .orbit/reverse/<target>/findings.md | head -1
grep -cE '^\| .* \| .* \| .* \|' .orbit/reverse/<target>/findings.md   # inventory rows
grep -nE 'secret found in' .orbit/reverse/<target>/findings.md          # facts only, no values
git status --short | grep reverse || echo "work dir not staged"
```

Pass rule: digest and origin recorded; entry point, user and ports named for an image; the dependency table contains the versions that matter for CVEs; any secret is reported as path + rotation, never value; the original artifact is untouched (`shasum` before and after matches). Put the digest and the CVE list into `.orbit/task/<id>/evidence.md` when the teardown supports a task.

## Pitfalls

- **Unpacking next to the sources.** Extraction in the repo root pollutes the working tree and can shadow package names; always use `.orbit/reverse/<target>/work/`.
- **Trusting `docker history` for content.** History hides build-context files; only layer extraction or `dive` shows what actually shipped.
- **Reading `values.yaml` as deployed config.** Prod overrides live elsewhere; `helm template -f values-prod.yaml` is the rendered truth.
- **Skipping install scripts.** `postinstall`, `setup.py` and NuGet targets execute at install time — they are the cheapest supply-chain attack.
- **Printing a secret.** An env var or layer may hold a token. Record the file and "rotation needed"; a value in the log is a leak even in a private repo.
- **One artifact assumed to be all environments.** A `latest` tag may differ between registries; pin the digest and record which registry you inspected.

## Portability

Shell, `docker`/`podman`, `unzip`, `jq`, `yq` and the package managers already on the machine. Any agent and model can follow it; no subagents required. If `dive`, `syft`, `trivy` or `aapt2` are absent, use the listed fallbacks (`docker history`, `tar`, `unzip`) and record which tool was missing instead of guessing. No Claude Code features are required.

## What's improved vs the source

- Ready recipes for DevOps artifacts: Spring Boot JAR, OCI image, Helm chart, npm/pip/Go/NuGet, APK/IPA, Electron, PyInstaller.
- Found secrets are never printed — only the path and "rotation needed".
- Identity by digest, and a before/after `shasum` proves the original artifact was not modified.
- Install-time code paths are called out explicitly, not buried in dependency listings.
- A single summary table feeds `review-security` and `ship-k8s` without re-reading the artifact.

## Based on

- [REA](https://github.com/morluto/rea) — method «reverse-engineer-anything» (MIT). Rewritten in our own words and improved — see "What's improved".
