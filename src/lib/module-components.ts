// Display metadata for known Magento component/capability types. `type` strings are
// open-ended (the generator can emit new ones without a schema change); unknown types
// fall back to a prettified label and sort last.

const LABELS: Record<string, string> = {
  plugin: "Plugins",
  observer: "Observers",
  cron: "Cron Jobs",
  webapi: "Web API",
  graphql: "GraphQL",
  db_schema: "DB Schema",
  cli: "CLI Commands",
  preference: "DI Preferences",
  event: "Events",
};

// Preferred display order for facet chips / grouped panels.
export const COMPONENT_ORDER = [
  "plugin",
  "observer",
  "cron",
  "webapi",
  "graphql",
  "db_schema",
  "cli",
  "preference",
  "event",
];

export function componentLabel(type: string): string {
  if (LABELS[type]) return LABELS[type];
  return type.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function componentOrderIndex(type: string): number {
  const i = COMPONENT_ORDER.indexOf(type);
  return i === -1 ? COMPONENT_ORDER.length : i;
}
