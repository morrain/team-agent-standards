---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is an active discipline: challenging terms, identifying edge-case scenarios, and writing down glossary terms and architectural decisions the moment they crystallise.

## File Structure

### Single-Context Repositories (Standard)
Most repositories have a single context:

```text
/
├── GLOSSARY.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

### Multi-Context Repositories (Monorepo)
If a `GLOSSARY-MAP.md` exists at the root, the repository has multiple contexts pointing to localized glossaries and ADRs:

```text
/
├── GLOSSARY-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                 ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

Create files lazily: only when you have something to write. If no `GLOSSARY.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the Session

- **Challenge against the glossary**: When the user uses a term that conflicts with existing definitions in `GLOSSARY.md`, call it out immediately:
  > *"The glossary defines 'account' as X, but here it appears to mean Y. Which definition should we standardize on?"*
- **Sharpen fuzzy language**: When vague or overloaded terms arise, propose a precise canonical term.
- **Stress-test with concrete scenarios**: Verify domain relationships with concrete boundary cases before finalizing the model.
- **Record decisions immediately**: When an architectural choice is finalized, draft an ADR in `docs/adr/<NNNN>-<slug>.md` with Status, Context, Decision, and Consequences.
