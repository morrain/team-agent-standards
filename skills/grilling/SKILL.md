---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

# Grilling

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer with brief rationale>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer with brief rationale>
```

## Rules of Grilling

1. **Finding facts is your job, never the user's**: If an answer can be discovered by reading the codebase, configuration, existing ADRs, or documentation, look it up instead of asking the user.
2. **The decisions belong to the user**: For every question you ask, always propose your recommended answer with trade-offs. The user can simply confirm with "yes" or "Q1: A, Q2: B" without having to write paragraphs.
3. **Wait for answers**: Never assume answers to current round questions to forge ahead into child branches. Wait for the user's feedback before proceeding to the next round.
4. **Guard against premature execution**: Do not start writing code or implementing the plan until the user explicitly confirms that a shared understanding has been reached.
