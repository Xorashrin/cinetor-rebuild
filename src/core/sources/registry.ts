// Source registry. Adapters self-register to exactly ONE section.
// The registry is the single place that knows which sources feed which feed —
// nothing outside a section can reach another section's sources.

import type { SectionId, SourceAdapter } from './types';

const registry = new Map<SectionId, SourceAdapter[]>();
const enabled = new Map<string, boolean>(); // source id -> user toggle

export function registerSource(adapter: SourceAdapter) {
  const list = registry.get(adapter.section) ?? [];
  list.push(adapter);
  registry.set(adapter.section, list);
  if (!enabled.has(adapter.id)) enabled.set(adapter.id, adapter.enabled);
}

export function sourcesFor(section: SectionId): SourceAdapter[] {
  return (registry.get(section) ?? []).filter((a) => isEnabled(a.id));
}

export function allSources(): SourceAdapter[] {
  return [...registry.values()].flat();
}

export function setEnabled(id: string, on: boolean) {
  enabled.set(id, on);
}

export function isEnabled(id: string): boolean {
  return enabled.get(id) ?? true;
}

export function sectionSources(section: SectionId): { id: string; name: string; enabled: boolean }[] {
  return (registry.get(section) ?? []).map((a) => ({ id: a.id, name: a.name, enabled: isEnabled(a.id) }));
}
