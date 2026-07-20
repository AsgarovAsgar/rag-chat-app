export function extractCitations(text: string): Set<number> {
  return new Set([...text.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1])))
}