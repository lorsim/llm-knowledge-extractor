const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "that",
  "this",
  "it",
  "its",
  "we",
  "you",
  "they",
  "i",
  "he",
  "she",
  "them",
  "our",
  "us",
  "your",
  "their",
  "there",
  "here",
  "so",
  "not",
  "no",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "shall",
  "may",
  "might",
]);

const POS = new Set([
  "good",
  "great",
  "excellent",
  "positive",
  "benefit",
  "improve",
  "success",
  "win",
  "happy",
  "love",
  "fast",
  "efficient",
  "secure",
  "reliable",
  "robust",
  "easy",
  "simple",
]);
const NEG = new Set([
  "bad",
  "poor",
  "terrible",
  "negative",
  "bug",
  "fail",
  "issue",
  "slow",
  "sad",
  "hate",
  "complex",
  "hard",
  "difficult",
  "risky",
  "unstable",
  "crash",
  "problem",
  "error",
]);

const TOKEN_RE = /[A-Za-z']+/g;

export function sentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function summaryLead2(text: string): string {
  const s = sentences(text);
  return s.slice(0, 2).join(" ");
}

export function inferTitle(text: string): string | null {
  const first = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return first && first.length <= 90 && !first.includes(".") ? first : null;
}

export function tokenize(text: string): string[] {
  return (text.match(TOKEN_RE) || []).map((w) => w.toLowerCase());
}

export function stem(w: string): string {
  for (const suf of ["ing", "ed", "ly", "es", "s"]) {
    if (w.endsWith(suf) && w.length > suf.length + 2)
      return w.slice(0, -suf.length);
  }
  return w;
}

export function topTopics(text: string, k: number): string[] {
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) {
    if (STOP.has(t) || t.length <= 2) continue;
    const s = stem(t);
    freq.set(s, (freq.get(s) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([w]) => w);
}

export function nounKeywords(text: string, k: number): string[] {
  // capitalized words + frequent words; filter verb-like suffixes
  const originals = text.match(TOKEN_RE) || [];
  const caps = originals
    .filter(
      (w) => /^[A-Z]/.test(w) && !STOP.has(w.toLowerCase()) && w.length > 2
    )
    .map((w) => stem(w.toLowerCase()));
  const content = tokenize(text)
    .filter((w) => !STOP.has(w) && w.length > 2)
    .map(stem);
  const freq = new Map<string, number>();
  for (const w of content) freq.set(w, (freq.get(w) || 0) + 1);
  const ordered = [
    ...new Set([
      ...caps,
      ...[...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w),
    ]),
  ];
  const notVerb = (w: string) => !(w.endsWith("ed") || w.endsWith("ing"));
  return ordered.filter(notVerb).slice(0, k);
}

export type Sentiment = "positive" | "neutral" | "negative";
export function sentiment(text: string): Sentiment {
  const set = new Set(tokenize(text));
  const score = [...set].reduce(
    (acc, w) => acc + (POS.has(w) ? 1 : 0) - (NEG.has(w) ? 1 : 0),
    0
  );
  return score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
}

export function confidence(
  text: string,
  summary: string,
  keywords: string[]
): number {
  const L = Math.min(text.length / 800, 1);
  const coverage = keywords.length
    ? keywords.filter((k) => text.toLowerCase().includes(k)).length /
      keywords.length
    : 0;
  return Number((0.5 * L + 0.5 * coverage).toFixed(2));
}
