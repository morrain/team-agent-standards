# Issue Tracker

Specs and tickets live locally in this repository as Markdown files.

- **Specs**: `docs/specs/<NNNN>-<slug>.md`
- **Tickets**: `docs/tickets/<feature-slug>/<NN>-<slug>.md`

## Operations

- **Create a spec**: write `docs/specs/<NNNN>-<slug>.md` with metadata header (`Status`, `Labels`, `Date`).
- **Read a spec**: read the target Markdown file under `docs/specs/`.
- **Create a ticket**: write `docs/tickets/<feature-slug>/<NN>-<slug>.md` with `Status`, `Labels`, `Blocked-By`, and `Spec` fields.
- **Update / Close an item**: update the `Status` field to `in-progress`, `blocked`, or `closed` and adjust `Labels` accordingly.
- **List ready items**: scan Markdown files under `docs/specs/` and `docs/tickets/` containing `ready-for-agent` with `Status: open`.
