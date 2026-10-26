import { parse } from "yaml";
import type { Scenario } from "./types";

// Markdown is data. No eval, templates, executable expressions, or plugins.
export function parseScenario(markdown: string): Scenario {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Scenario requires YAML front matter");
  const config = parse(match[1], { maxAliasCount: 0 }) as Record<string, unknown>;
  const sections: Record<string, string> = {};
  for (const part of match[2].split(/^# /m).slice(1)) {
    const line = part.indexOf("\n");
    sections[part.slice(0, line).trim()] = part.slice(line + 1).trim();
  }
  const s = { ...config, briefing: sections.Briefing, groundTruth: sections["Ground truth"], debrief: sections.Debrief, template: sections["Status template"] } as unknown as Scenario;
  for (const field of ["id", "title", "category", "author", "summary", "briefing", "groundTruth", "debrief", "template"] as const) {
    if (typeof s[field] !== "string" || !s[field].trim()) throw new Error(`Missing scenario field: ${field}`);
  }
  if (!/^[a-z0-9-]+$/.test(s.id)) throw new Error("Invalid scenario ID");
  if (!Number.isInteger(s.version) || s.version < 1) throw new Error("Invalid version");
  for (const field of ["exercise_minutes", "debrief_minutes"] as const) {
    if (!Number.isFinite(s[field]) || s[field] <= 0 || s[field] > 60) throw new Error(`Invalid ${field}`);
  }
  for (const field of ["roles", "actions", "endings", "developments", "observe"] as const) {
    if (!Array.isArray(s[field])) throw new Error(`Missing array: ${field}`);
  }
  const unique = (xs: { id: string }[], label: string) => {
    if (new Set(xs.map(x => x.id)).size !== xs.length || xs.some(x => !/^[a-z0-9-]+$/.test(x.id))) throw new Error(`Duplicate or invalid ${label} ID`);
  };
  unique(s.roles, "role"); unique(s.actions, "action"); unique(s.endings, "ending"); unique(s.developments, "development");
  if (!s.roles.length || !s.endings.length) throw new Error("Roles and endings must be nonempty");
  const roles = new Set(s.roles.map(r => r.id));
  const flags = new Set(s.actions.flatMap(a => a.sets));
  for (const role of s.roles) for (const key of ["name", "responsibility", "authority", "knowledge", "hint"] as const) {
    if (typeof role[key] !== "string" || !role[key]) throw new Error(`Invalid role ${role.id}: ${key}`);
  }
  for (const item of [...s.actions, ...s.endings]) {
    if (!Array.isArray(item.roles) || item.roles.some(r => !roles.has(r))) throw new Error(`Unknown role in ${item.id}`);
    if (!item.label) throw new Error(`Missing label in ${item.id}`);
    if (item.requires?.some(f => !flags.has(f))) throw new Error(`Unknown prerequisite in ${item.id}`);
  }
  for (const action of s.actions) {
    if (!action.result || !Array.isArray(action.sets)) throw new Error(`Invalid action ${action.id}`);
    if (action.end && !s.endings.some(e => e.id === action.end && e.kind !== "declaration")) throw new Error(`Invalid action ending ${action.id}`);
  }
  for (const end of s.endings) if (!["declaration", "world", "terminal"].includes(end.kind) || !end.assessment) throw new Error(`Invalid ending ${end.id}`);
  for (const dev of s.developments) {
    if (!Number.isFinite(dev.minute) || dev.minute < 0 || !dev.text) throw new Error(`Invalid development ${dev.id}`);
    if (dev.requires?.some(f => !flags.has(f))) throw new Error(`Unknown development prerequisite ${dev.id}`);
  }
  for (const o of s.observe) if (!flags.has(o.flag) || !o.label || !o.reflection) throw new Error("Invalid observation");
  return s;
}

export function overview(s: Scenario) {
  return { id: s.id, title: s.title, category: s.category, summary: s.summary, version: s.version,
    exercise_minutes: s.exercise_minutes, debrief_minutes: s.debrief_minutes, briefing: s.briefing,
    roles: s.roles.map(({ id, name, responsibility, authority }) => ({ id, name, responsibility, authority })) };
}
