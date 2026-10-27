# onboard-plan

Turn a role's onboarding template and a start date into a dated checklist — with owners, phases, and no tasks landing on weekends or holidays.

## The problem

Every new hire gets onboarded from a spreadsheet someone copies and re-dates by hand. Laptops get ordered late because "5 days before start" was counted in calendar days across a weekend, the welcome email lands on a bank holiday, and nobody is sure whether IT or the manager owns account setup. The new person's first week depends on one busy coordinator's arithmetic.

## Who it's for

HR generalists and people-ops coordinators who run onboarding, and the managers and IT staff who share the tasks. New hires benefit from a first week that is actually ready.

## What it does

- Reads a role template: a list of tasks, each with an owner and an offset in **working days** from day 1 (`-5` = five working days before, `0` = first day).
- Dates every task from the start date, skipping weekends and any public holidays you pass in.
- Groups tasks into phases (Before day 1, Day 1, Week 1, First month, First 90 days).
- Prints a Markdown checklist, or CSV for importing into a tracker or spreadsheet.
- Refuses a start date that falls on a weekend or holiday, instead of silently shifting it.

## Try it

Requires Node 18+. No install step, no dependencies.

```bash
node cli.js examples/engineer.json 2026-11-02
node cli.js examples/engineer.json 2026-11-02 --holidays 2026-11-03 --csv
node --test
```

The laptop order in the example lands on Monday 26 October — five working days before a Monday 2 November start.

## Acceptance criteria

- Offsets count working days in both directions and skip weekends and listed holidays.
- A weekend or holiday start date is rejected with a clear error and exit code 1.
- Tasks are sorted by day and grouped into phases; Markdown uses checkboxes.
- CSV output quotes values containing commas, quotes or newlines.
- CSV cells starting with `=`, `+`, `-`, `@`, a tab or a carriage return are prefixed with `'` so spreadsheets treat them as text, not formulas.
- Invalid templates (no tasks, missing owner, non-integer day) fail with the task number.

## How it's built

`src/plan.js` holds pure functions — `addWorkdays`, `buildPlan`, `toMarkdown`, `toCsv` — all working in UTC so a plan never shifts by a day across time zones. Templates are plain JSON so HR can edit them without touching code.

## Limits and safety

- The tool never needs a person's name or personal details: plans are generated per role and start date. Keep it that way when you adapt templates — don't put personal data in task text.
- Templates are often shared and edited by several people, so CSV output neutralises formula-like cells (see Acceptance criteria). This is the standard mitigation for Excel, Google Sheets and LibreOffice, not a guarantee for every spreadsheet tool; the visible `'` on such cells is the trade-off.
- Holidays must be passed in; there is no built-in holiday calendar because they differ by country and company.
- It plans tasks; it doesn't send reminders or assign anything in other systems. A person still reviews the plan and shares it.

## Contribute

- Load holidays from a file (`--holidays-file holidays.txt`).
- Add an `.ics` calendar export so owners get the dates in their calendar.
- Support part-time schedules (custom working days).

---

Scaffolded by an automated weekly pipeline, then refined by hand — see the factory repo for how it works.
