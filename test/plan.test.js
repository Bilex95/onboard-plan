const test = require("node:test");
const assert = require("node:assert");
const { parseDate, addWorkdays, buildPlan, toMarkdown, toCsv, csvCell } = require("../src/plan");

const iso = (d) => d.toISOString().slice(0, 10);

test("working-day offsets skip weekends in both directions", () => {
  const mon = parseDate("2026-11-02"); // a Monday
  assert.strictEqual(iso(addWorkdays(mon, 0)), "2026-11-02");
  assert.strictEqual(iso(addWorkdays(mon, 4)), "2026-11-06"); // Friday
  assert.strictEqual(iso(addWorkdays(mon, 5)), "2026-11-09"); // next Monday
  assert.strictEqual(iso(addWorkdays(mon, -1)), "2026-10-30"); // previous Friday
});

test("holidays are skipped", () => {
  const mon = parseDate("2026-12-21");
  const hol = new Set(["2026-12-25"]);
  assert.strictEqual(iso(addWorkdays(mon, 4, hol)), "2026-12-28"); // Fri 25th skipped -> Mon 28th
});

test("plan is dated, phased and sorted by day", () => {
  const plan = buildPlan(
    { tasks: [{ day: 5, owner: "Manager", task: "Check-in" }, { day: -2, owner: "IT", task: "Laptop" }, { day: 0, owner: "HR", task: "Contract" }] },
    "2026-11-02"
  );
  assert.deepStrictEqual(
    plan.map((t) => [t.due, t.phase, t.task]),
    [
      ["2026-10-29", "Before day 1", "Laptop"],
      ["2026-11-02", "Day 1", "Contract"],
      ["2026-11-09", "First month", "Check-in"],
    ]
  );
});

test("bad input is rejected with a clear message", () => {
  assert.throws(() => buildPlan({ tasks: [{ day: 0, owner: "HR", task: "x" }] }, "2026-11-07"), /weekend or holiday/);
  assert.throws(() => buildPlan({ tasks: [] }, "2026-11-02"), /non-empty tasks/);
  assert.throws(() => buildPlan({ tasks: [{ day: 1.5, owner: "HR", task: "x" }] }, "2026-11-02"), /integer day/);
  assert.throws(() => parseDate("2026-02-30"), /Invalid date/);
});

test("csv cells that could run as spreadsheet formulas are neutralised", () => {
  for (const bad of ["=HYPERLINK(\"http://x\")", "+1+2", "-2+3", "@SUM(A1)", "\t=1", "\r=1"]) {
    assert.ok(csvCell(bad).replace(/^"/, "").startsWith("'"), `not neutralised: ${JSON.stringify(bad)}`);
  }
  assert.strictEqual(csvCell("=1+1"), "'=1+1");
  assert.strictEqual(csvCell("=A1,B1"), "\"'=A1,B1\""); // neutralised AND quoted
});

test("ordinary csv values are unchanged", () => {
  for (const ok of ["2026-11-02", "Day 1", "IT", "Order laptop", "a-b", "x=1", "email me@home", ""]) {
    assert.strictEqual(csvCell(ok), ok);
  }
});

test("a malicious template task cannot become a formula in the csv", () => {
  const plan = buildPlan({ tasks: [{ day: 0, owner: "@HR", task: "=cmd|' /C calc'!A0" }] }, "2026-11-02");
  const row = toCsv(plan).split("\n")[1];
  assert.strictEqual(row, "2026-11-02,Day 1,'@HR,'=cmd|' /C calc'!A0");
});

test("markdown groups by phase with checkboxes; csv quotes commas", () => {
  const plan = buildPlan({ tasks: [{ day: 0, owner: "HR", task: "Payroll, contract" }] }, "2026-11-02");
  assert.match(toMarkdown(plan, { role: "Engineer", start: "2026-11-02" }), /## Day 1\n\n- \[ \] \*\*2026-11-02\*\* · HR — Payroll, contract/);
  assert.strictEqual(toCsv(plan), 'due,phase,owner,task\n2026-11-02,Day 1,HR,"Payroll, contract"');
});
