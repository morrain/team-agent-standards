---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Call the Skill tool with `tdd` where possible, at pre-agreed seams.

Run typechecking regularly, run single test files regularly, and run the full test suite once at the end.

Call the Skill tool with `code-review` once the work is complete to review the implementation against standards and spec. Fix all issues raised by the code review.

Commit to the current branch.
