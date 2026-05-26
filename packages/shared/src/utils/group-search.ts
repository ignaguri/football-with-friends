// Dependency-free fuzzy scorer for group discovery. Returns 0..1. Normalizes
// case + diacritics, boosts exact/prefix/substring, and otherwise falls back to
// a Levenshtein-based ratio. Tuned for the small curated-launch dataset; the
// search service applies a threshold and ranks by this score.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function scoreGroupMatch(query: string, name: string): number {
  const q = normalize(query);
  const n = normalize(name);
  if (!q) return 0;
  if (q === n) return 1;
  if (n.startsWith(q)) return 0.9;
  if (n.includes(q)) return 0.8;
  const dist = levenshtein(q, n);
  const maxLen = Math.max(q.length, n.length);
  return maxLen === 0 ? 0 : Math.max(0, 1 - dist / maxLen);
}
