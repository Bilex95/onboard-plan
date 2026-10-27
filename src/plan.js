// Builds a dated onboarding plan from a role template and a start date.
// Task offsets are in WORKING days relative to day 1 (0 = first day,
// -3 = three working days before), so plans never land on weekends or
// listed public holidays.

const DAY_MS = 86400000;

function parseDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) throw new Error(`Invalid date "${iso}" (use YYYY-MM-DD)`);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) throw new Error(`Invalid date "${iso}"`);
  return d;
}

const toISO = (d) => d.toISOString().slice(0, 10);

function isWorkday(d, holidays) {
  const dow = d.getUTCDay();
  return dow !== 0 && dow !== 6 && !holidays.has(toISO(d));
}

// Move `n` working days from `start` (negative = earlier).
function addWorkdays(start, n, holidays = new Set()) {
  let d = new Date(start.getTime());
  const step = n < 0 ? -1 : 1;
  let left = Math.abs(n);
  while (left > 0) {
    d = new Date(d.getTime() + step * DAY_MS);
    if (isWorkday(d, holidays)) left--;
  }
  return d;
}

function phaseOf(day) {
  if (day < 0) return "Before day 1";
  if (day === 0) return "Day 1";
  if (day < 5) return "Week 1";
  if (day < 20) return "First month";
  return "First 90 days";
}

function buildPlan(template, startISO, { holidays = [] } = {}) {
  const hol = new Set(holidays);
  const start = parseDate(startISO);
  if (!isWorkday(start, hol)) throw new Error(`Start date ${startISO} is a weekend or holiday`);
  if (!template || !Array.isArray(template.tasks) || template.tasks.length === 0) {
    throw new Error("Template needs a non-empty tasks list");
  }
  return template.tasks
    .map((t, i) => {
      if (!t.task || !t.owner || !Number.isInteger(t.day)) {
        throw new Error(`Task ${i + 1} needs task, owner and an integer day`);
      }
      return { due: toISO(addWorkdays(start, t.day, hol)), day: t.day, phase: phaseOf(t.day), owner: t.owner, task: t.task };
    })
    .sort((a, b) => a.day - b.day || a.owner.localeCompare(b.owner));
}

function toMarkdown(plan, { role = "New hire", start = "" } = {}) {
  const lines = [`# Onboarding plan: ${role}${start ? ` (starts ${start})` : ""}`];
  let phase = null;
  for (const t of plan) {
    if (t.phase !== phase) {
      phase = t.phase;
      lines.push("", `## ${phase}`, "");
    }
    lines.push(`- [ ] **${t.due}** · ${t.owner} — ${t.task}`);
  }
  return lines.join("\n");
}

// A cell starting with = + - @ (or a tab / carriage return) can be run as a
// formula when the CSV is opened in a spreadsheet. Prefixing a single quote
// makes spreadsheets treat it as text (the OWASP-recommended mitigation).
// The quote stays visible in plain-text viewers.
function neutralise(v) {
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function csvCell(v) {
  const s = neutralise(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(plan) {
  return ["due,phase,owner,task", ...plan.map((t) => [t.due, t.phase, t.owner, t.task].map(csvCell).join(","))].join("\n");
}

module.exports = { parseDate, addWorkdays, isWorkday, phaseOf, buildPlan, toMarkdown, toCsv, csvCell };
