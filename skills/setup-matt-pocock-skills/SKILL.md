---
name: setup-matt-pocock-skills
description: "Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills."
disable-model-invocation: true
---

# Setup Matt Pocock's Skills

Scaffold or reconfigure the per-repo configuration that the engineering skills assume:

- **Issue tracker**: where issues live (`docs/agents/issue-tracker.md`)
- **Triage labels**: canonical triage status roles (`docs/agents/triage-labels.md`)
- **Domain docs**: `GLOSSARY.md` and ADR directory (`docs/adr/`)

This is a prompt-driven configuration skill. Explore the repository, present findings, confirm with the user, then write.

## Process

### 1. Explore
Examine the current repository:
- `git remote -v`: determine if GitHub (`github.com`), GitLab, or local.
- `docs/agents/`: check if `issue-tracker.md` or `triage-labels.md` already exist.
- `GLOSSARY.md` and `docs/adr/`: check if domain docs already exist.

### 2. Present Findings and Confirm
Confirm with the user the desired configuration:
1. **Issue Tracker**:
   - **GitHub**: issues live in GitHub Issues (uses `gh` CLI).
   - **GitLab**: issues live in GitLab Issues (uses `glab` CLI).
   - **Local Markdown**: issues live locally under `.scratch/<feature>/issues/` or `docs/tickets/`.
2. **Triage Labels**:
   - `ready-for-agent` (default)
   - `in-progress`
   - `blocked`
3. **Domain Documentation**:
   - Vocabulary in `GLOSSARY.md`
   - ADRs in `docs/adr/`

### 3. Write Configuration
Write the selected configuration files under `docs/agents/`:
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`

Ensure downstream skills (`to-spec`, `to-tickets`, `implement-spec`, `code-review`) can read these files cleanly.
