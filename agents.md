# agents.md — how AI agents work on this project

This project is built in Claude Cowork sessions using a deliberate mix of two models,
chosen per task to conserve tokens without sacrificing quality.

## Model mix policy

| Model | Used for | Rationale |
|---|---|---|
| **Fable 5** (session model) | Main build work: data extraction, layout/rendering code, docs, mechanical cross-checks of numbers against the spreadsheet | The primary session already holds full context (spreadsheet contents, PaulDz's sketch, design decisions); delegating build work would cost more tokens in context transfer than it saves |
| **Opus 5** (subagents) | Judgment-heavy review: visual QA of rendered screenshots, data-accuracy audits, catching layout/legibility problems | Careful-eye tasks where an independent, stronger reviewer pays for itself and a fresh perspective (no anchoring on the author's intent) is a feature |

Ground rules:

1. **Build inline, review out-of-line.** The main session writes the code; independent
   subagents verify it. A reviewer that didn't write the code finds more.
2. **Cheapest capable model wins.** Mechanical verification (recompute numbers, diff
   against the xlsx) goes to a Fable 5 subagent; anything requiring visual or editorial
   judgment goes to Opus 5.
3. **Agents get artifacts, not conversation.** Subagents receive file paths
   (screenshots, `index.html`, `data/john-data.json`, the source xlsx) and a concrete
   checklist — never a transcript dump.
4. **Findings land in commits.** Review findings that lead to changes are noted in
   `conversations.md` alongside the commit that addressed them.

## Session log

See `conversations.md` for the running log of working sessions, decisions, and the
commit IDs they produced.
