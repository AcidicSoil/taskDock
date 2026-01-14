---

## Agent Skills playbook (use when working on: refactoring a single-file SPA into a structured front-end architecture)

Selection policy:

* Use only the skills listed below (SECTION 1 — RECOMMENDED SKILLS), in the order provided.
* Prefer the skill’s Adoption steps for actions; do not exceed 3 action bullets per skill.
* If multiple skills overlap, follow the Dedupe rules and prefer Local skills before External skills.

### Priority order (apply in sequence)

1. component-cleanup (Local; Local)

* Load: `skills/component-cleanup/SKILL.md`
* Use when: break a single-file SPA into maintainable components
* Do:

  * Identify stable UI slices and extract them into components with minimal props.
  * Pull side-effects/state into dedicated hooks/services while keeping the UI pure.
  * Add guardrails (lint rules, naming conventions) to prevent regression into “one file.”
* Risks / notes: Missing context: framework (React/Vue/etc), current state management approach, routing needs.

2. repo-codebase-deconstruct (Local; Local)

* Load: `skills/repo-codebase-deconstruct/SKILL.md`
* Use when: design module boundaries and folder structure
* Do:

  * Generate a module map (current responsibilities → target modules).
  * Define dependency direction rules (e.g., UI → domain → data).
  * Produce a migration plan that moves code in small, reversible commits.
* Risks / notes: Missing context: target architecture style (feature-first vs domain-first), team conventions, tolerance for breaking changes.

3. repo-architecture-infer_v2 (Local; Local)

* Load: `skills/repo-architecture-infer_v2/SKILL.md`
* Use when: infer an architecture baseline from the current SPA
* Do:

  * Extract current “as-is” architecture signals (imports, dependencies, responsibilities).
  * Identify hotspots (high churn / high coupling) to prioritize extraction.
  * Turn findings into a target “to-be” architecture outline.
* Risks / notes: Missing context: access to dependency graph tooling and build system details.

4. architecture-patterns (Local; Local)

* Load: `skills/architecture-patterns/SKILL.md`
* Use when: select a scalable front-end architecture pattern
* Do:

  * Pick a pattern (feature-based, clean-ish layering, modular monolith UI) and define rules.
  * Translate rules into folder layout + import constraints.
  * Apply the rules during incremental extraction (start with one vertical slice).
* Risks / notes: Missing context: whether you need SSR, multi-app workspace, or shared packages.

5. react-vite-expert (Local; Local)

* Load: `skills/react-vite-expert/SKILL.md`
* Use when: implement a practical React/Vite project structure
* Do:

  * Establish the top-level folders and conventions (features/, shared/, services/, routes/).
  * Migrate one feature end-to-end to validate the structure.
  * Add tooling enforcement (path aliases, lint import rules, CI checks).
* Risks / notes: Missing context: if this is not React+Vite, applicability is partial.

6. add-module (Local; Local)

* Load: `skills/add-module/SKILL.md`
* Use when: migrate incrementally by adding modules without destabilizing the app
* Do:

  * Define a module template (public API surface + internal implementation).
  * Move one responsibility from the single file into the new module.
  * Lock in the boundary (no backsliding imports into the monolith file).
* Risks / notes: Missing context: preferred module granularity (feature vs domain vs layer).

7. architecture-decision-records (Local; Local)

* Load: `plugins/documentation-generation/skills/architecture-decision-records/SKILL.md`
* Use when: keep restructuring decisions consistent and explainable
* Do:

  * Write ADRs for module boundaries, layering rules, and state management choices.
  * Add “decision required” checkpoints to the migration plan.
  * Tie ADRs to lint rules / code review checklist items.
* Risks / notes: Missing context: who approves architecture decisions and what governance exists.

8. react-component-architecture (External; B (Search Verified))

* Load if available: [https://smithery.ai/skills/aj-geddes/react-component-architecture](https://smithery.ai/skills/aj-geddes/react-component-architecture)
* Use when: establish scalable component composition patterns while refactoring
* Do:

  * Define component layering (page/feature/shared) and prop/state rules.
  * Convert extracted chunks into composable units (hooks + presentational components).
  * Add review checks for cohesion/coupling at component boundaries.
* Risks / notes: Missing context: whether your SPA is React; if not, the patterns need adaptation.

### Dedupe rules (when multiple similar skills exist)

* Prefer local registry skills over external/web skills when overlapping.
* Prefer higher verification over lower verification when overlapping.

### Missing-context checklist (resolve before major architecture decisions)

* Target framework/runtime (React/Vue/etc) and whether the app is React+Vite.
* Build system details and availability of dependency graph tooling.
* Routing needs (current + target) and any SSR requirement.
* Current state management approach and intended target approach.
* Target architecture style (feature-first vs domain-first) and preferred module granularity.
* Team conventions and code review/approval governance for architecture decisions.
* Tolerance for breaking changes during migration.
* Multi-app workspace needs and whether shared packages are required.

---

# SPA Refactor Skill Playbook Runner (agent priming instructions)

You are an AI agent refactoring a **single-file SPA** into:

1) maintainable UI components, and
2) a structured module/layer/folder architecture.

You MUST follow these rules exactly.

## Hard rules (non-negotiable)

1. Use ONLY the skills listed in “Allowed skills” below.
2. Apply skills strictly in the given priority order (top to bottom).
3. Prefer each skill’s Adoption steps when choosing actions.
4. Do not exceed **3 action bullets per skill**.
5. Apply dedupe rules: prefer **Local** skills over **External** skills; if overlap exists, keep the earlier skill and skip the later one.
6. If any missing context blocks a correct first-skill choice or sequence (framework, routing/SSR, state management, build tooling, module granularity), output ONLY the minimal missing detail needed (no plan, no skills, no extra text).

## Inputs you should use (if provided by the user)

- The single-file SPA source (file path or pasted content)
- Framework/runtime (React/Vue/Svelte/etc.)
- Routing and SSR requirements (SPA only vs SSR, router library)
- State management approach (useState, Redux, Zustand, Vuex, etc.)
- Build tooling (Vite, Next.js, CRA, custom, etc.)
- Desired module granularity (feature-first vs domain-first vs layer-first; mono-repo packages or single app)

## Decision procedure (deterministic)

A) Check whether missing context *prevents* a correct plan.

- If yes: produce ONLY the “Minimal missing detail needed” output (see format below) and stop.
B) Otherwise:

   1) Select the first applicable skill in priority order that advances the goals immediately.
   2) Produce the intended sequence (still in priority order) until both goals are covered.
   3) For each selected skill, output 1–3 actions derived from its Adoption steps.
   4) Do not include actions not grounded in Adoption steps.
   5) Do not add extra commentary, rationale, or alternatives.

## Output format (must match exactly)

### If blocked by missing context

Minimal missing detail needed:

- <item 1>
- <item 2>
(only the minimum necessary; no other text)

### If not blocked

First skill to apply now: <skill-name>

Intended skill sequence:

1) <skill-name>

- <action bullet 1>
- <action bullet 2>
- <action bullet 3 (optional)>

2) <skill-name>

- <action bullet 1>
- <action bullet 2>
- <action bullet 3 (optional)>
(continue only as needed; max 3 bullets per skill)

## Allowed skills (priority order; use only these)

1) component-cleanup (Local)
Adoption steps:

- Identify stable UI slices and extract them into components with minimal props.
- Pull side-effects/state into dedicated hooks/services while keeping the UI pure.
- Add guardrails (lint rules, naming conventions) to prevent regression into “one file.”

1) repo-codebase-deconstruct (Local)
Adoption steps:

- Generate a module map (current responsibilities → target modules).
- Define dependency direction rules (e.g., UI → domain → data).
- Produce a migration plan that moves code in small, reversible commits.

1) repo-architecture-infer_v2 (Local)
Adoption steps:

- Extract current “as-is” architecture signals (imports, dependencies, responsibilities).
- Identify hotspots (high churn / high coupling) to prioritize extraction.
- Turn findings into a target “to-be” architecture outline.

1) architecture-patterns (Local)
Adoption steps:

- Pick a pattern (feature-based, clean-ish layering, modular monolith UI) and define rules.
- Translate rules into folder layout + import constraints.
- Apply the rules during incremental extraction (start with one vertical slice).

1) react-vite-expert (Local; apply only if React + Vite)
Adoption steps:

- Establish the top-level folders and conventions (features/, shared/, services/, routes/).
- Migrate one feature end-to-end to validate the structure.
- Add tooling enforcement (path aliases, lint import rules, CI checks).

1) add-module (Local)
Adoption steps:

- Define a module template (public API surface + internal implementation).
- Move one responsibility from the single file into the new module.
- Lock in the boundary (no backsliding imports into the monolith file).

1) architecture-decision-records (Local)
Adoption steps:

- Write ADRs for module boundaries, layering rules, and state management choices.
- Add “decision required” checkpoints to the migration plan.
- Tie ADRs to lint rules / code review checklist items.

1) react-component-architecture (External; apply only if React; only if no Local skill covers the need)
Adoption steps:

- Define component layering (page/feature/shared) and prop/state rules.
- Convert extracted chunks into composable units (hooks + presentational components).
- Add review checks for cohesion/coupling at component boundaries.

