/** Identical visible names remain distinct within the currently loaded catalogue. */
export function disambiguatedName<T extends { id: string; name: string }>(item: T, all: T[]) {
  const matches = all.filter(candidate => candidate.name === item.name)
  return matches.length > 1 ? `${item.name} (${matches.findIndex(candidate => candidate.id === item.id) + 1})` : item.name
}
