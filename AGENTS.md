# CRITICAL PROTOCOL: WORKSPACE STATE GUARDRAILS & CACHE BOUNDARY RETENTION

You are an expert software engineer handling a multi-turn long-horizon implementation sprint. To prevent context drift, code regression, and cache-breaking token overhead, you must strictly follow this file state cycle at the beginning and end of EVERY task execution turn.

## 1. EPHEMERAL PROMPT CACHING RULES

- All codebase wide metadata, immutable schemas, and directory topologies must live strictly at the TOP of `.agent-context.md`.
- Durable project-wide architecture requirements must be recorded in `.agent-context.md` under `## Stable Architecture Requirements Log`. This includes required Docker containers for testing, exact validation commands, local run commands, deployment assumptions, and important architectural decisions. Agents must check this section before planning or implementation work and must append new durable requirements below the existing entries when a user or implementation establishes them. Agents must never overwrite, rewrite, reorder, summarize, prune, or delete existing entries in this section unless the user explicitly asks for that exact change in the current turn.
- Never insert timestamps, dynamic session IDs, or localized change notes inside the top blocks. This keeps the prompt prefix mathematically identical across tool calls to enforce active LLM provider caching.
- Dynamic task updates or active error traces must only be written to the designated section at the absolute bottom of `.agent-context.md`.

## 2. PRE-EXECUTION GROUNDING (TURN START)

Before running a shell command, writing code, or refactoring a file, you must:

1. Open and read the complete contents of `.agent-context.md`.
2. Review `## Stable Architecture Requirements Log` in `.agent-context.md` and treat it as mandatory project-wide build, test, run, deployment, and architecture guidance.
3. Check `docs/agent_ledger.md` to see the results and architectural paths taken by previous sessions.
4. Check the branch working files described in Section 3 before planning implementation work.

## 3. BRANCH WORKING FILES

The `docs/` directory contains branch-scoped planning and user-context files. Treat these files as part of the working protocol, not as optional notes.

### `docs/notes.md`

- This file is user-owned and read-only for agents.
- Always read it when it exists before planning or implementing work.
- Use it as durable user context and project intent.
- Never create, overwrite, append to, reformat, summarize into, or clear this file unless the user explicitly asks in that turn.

### `docs/todo.md`

- This file stores implementation todos for the current Git branch.
- Before starting branch work, read it when it exists and use it to understand pending work.
- During implementation, add or update todos for the current branch when new concrete work is discovered.
- Keep todos actionable and scoped to the current branch.
- Do not use `docs/todo.md` as a historical ledger; completed branch history belongs in `docs/agent_ledger.md`.

### `docs/requirements.md`

- This file stores requirements for the current Git branch.
- Before changing behavior, read it when it exists and treat it as branch-scoped acceptance criteria.
- Add or update requirements only when the user gives new branch requirements or the current task clearly establishes them.
- Keep requirements concrete enough to validate against implementation.

### Branch Completion Cleanup

When the current branch's assigned work is complete:

1. Clear the completed branch's entries from `docs/todo.md`.
2. Clear the completed branch's entries from `docs/requirements.md`.
3. Leave `docs/notes.md` unchanged.
4. Record the cleanup in `docs/agent_ledger.md`.

If `docs/todo.md` or `docs/requirements.md` contains entries for multiple branches, remove only the completed branch's section. If the file only contains the completed branch's entries, leave the file present but empty.

## 4. ARCHITECTURE DECISION DOCUMENTATION

Every architectural design decision must be recorded under `docs/docs/`, grouped by the affected feature, domain, or entity.

Rules:

- Use a feature/entity directory such as `docs/docs/users/`, `docs/docs/ai/`, `docs/docs/ui/`, `docs/docs/projects/`, or another concrete domain name that matches the affected architecture.
- Record each new architectural change in its own Markdown file using a monotonic migration-style prefix: `0001-change-done.md`, `0002-add-security-measure.md`, `0003-adjust-ownership-model.md`, etc.
- Numbering is scoped to the feature/entity directory. For example, `docs/docs/users/0001-add-session-security.md` and `docs/docs/ai/0001-add-extraction-pipeline.md` may both exist.
- Do not overwrite or repurpose previous architecture decision files. If a decision changes, create the next numbered file in the same feature/entity directory and describe the superseding decision.
- While actively discussing or implementing a change on the same feature branch that created or owns an architecture decision file, agents may keep editing that same numbered file. After switching away from that feature branch, after completing the branch work, or when revisiting the decision from another branch, agents must not modify that prior file; create the next numbered decision file instead.
- Each architecture decision file should state the decision, the reason for the decision, the affected entities/components, and any validation or migration implications.
- When implementation changes architecture, update the relevant `docs/docs/<feature-or-entity>/` decision file in the same turn as the code change.

## 5. POST-EXECUTION RECORD KEEPING (TURN COMPLETION)

As your very last step before declaring a task complete, you must execute two file sync tools sequentially:

### STEP A: Update the Active Ledger (`docs/agent_ledger.md`)

Append a new h2 section detailing your choices. You must output your logic explicitly so human developers can pinpoint where regressions occurred. Use this schema exactly:

## [YYYY-MM-DD HH:MM] - Commit: <commit-hash> - Task: <Brief descriptive title>

- **Objective:** What feature or bug were you assigned to solve?
- **Assumptions Declared:** What architecture, state parameters, or database traits did you assume were true during execution?
- **Modifications Matrix:** List the path to every file you changed, created, or pruned.
- **Decision Logic:** _CRITICAL_ Explain the exact technical engineering rationale behind your implementation method. Why did you structure the logic this way?
- **Result Status:** Compile state, active tests outcome, or standard output evaluations.

*(Note: To populate the commit hash, commit your code changes first, grab the new hash, append to the ledger using that hash, and then run `git commit --amend` to include the ledger file in the same atomic commit.)*

### STEP B: Update Working Memory (`.agent-context.md`)

Modify ONLY the section underneath the `# ACTIVE WORKING MEMORY BLOCK (DYNAMIC SUFFIX)` divider line.

- If an architectural shift occurred (e.g., you added a brand new model schema field or modified directory topology structures), update the stable top sections of `.agent-context.md`.
- If a durable project-wide architecture requirement was established, append it below the existing entries in `## Stable Architecture Requirements Log` in `.agent-context.md` so future agents cannot miss it. Do not overwrite, rewrite, reorder, summarize, prune, or delete existing entries in this section unless the user explicitly asks for that exact change in the current turn.
- Clear out finished objectives and update the `## Active Working Objective` text to accurately reflect the current state of the workspace for the next agent iteration loop.

DO NOT ask for permission to write to these files. Execute these context maintenance writes automatically as an uncompromisable cleanup loop step.

## 6. Git Commit Policy

### Git Commit Requirements

- You must run 'git add' and 'git commit' for every change you make to the codebase, including small edits. Every file you touch must be tracked.
- Commits must be atomic, describing only what was changed in that specific step.
- Prefer `git commit --amend` over creating a new commit when the latest local commit already represents the same logical task and the new change is a correction, cleanup, typo fix, formatting fix, or small follow-up to that same task. This prevents noisy commits such as "changed A to B."
- Do not use `git commit --amend` for unrelated work, a new task, a new branch objective, or any commit that has already been pushed/shared unless the user explicitly authorizes rewriting that history.
- You must use the past tense and be concise for commit messages (e.g., "Added authentication to user model" instead of "Adding...").
- Do not create commits for unrelated tasks. Each commit should represent a single, logical unit of work.
- Never commit on main branch.
- You should only commit on feature branches with permissions.
- You are prohibited from writing to remote branches but are allowed to read from them.
- If you are asked to create a commit on main branch or on any remote branch without permission, you must refuse and ask the user for permission.

## 7. graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).