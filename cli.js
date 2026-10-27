#!/usr/bin/env node
// Usage: node cli.js <template.json> <start-date> [--csv] [--holidays 2026-12-25,2026-12-26]
const fs = require("fs");
const { buildPlan, toMarkdown, toCsv } = require("./src/plan");

const argv = process.argv.slice(2);
const csv = argv.includes("--csv");
const hIdx = argv.indexOf("--holidays");
const holidays = hIdx >= 0 ? String(argv[hIdx + 1] || "").split(",").filter(Boolean) : [];
const [templateFile, start] = argv.filter((a, i) => !a.startsWith("--") && !(hIdx >= 0 && i === hIdx + 1));

if (!templateFile || !start) {
  console.error("Usage: node cli.js <template.json> <start-date YYYY-MM-DD> [--csv] [--holidays d1,d2]");
  process.exit(2);
}

try {
  const template = JSON.parse(fs.readFileSync(templateFile, "utf8"));
  const plan = buildPlan(template, start, { holidays });
  console.log(csv ? toCsv(plan) : toMarkdown(plan, { role: template.role, start }));
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
