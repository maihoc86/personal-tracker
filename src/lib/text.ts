/** Text helpers for search that behaves the way Vietnamese users type. */

/**
 * Lower-case and strip diacritics so "suc khoe" matches "Sức khỏe".
 * "đ" has no combining form, so it is mapped explicitly.
 */
export function foldText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** True when every whitespace-separated term of `query` occurs in `haystack`. */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = foldText(query);
  if (!q) return true;
  const h = foldText(haystack);
  return q.split(/\s+/).every((term) => h.includes(term));
}

/** Upper-case ASCII key derived from a name, e.g. "Website khách" → "WK". */
export function deriveKey(name: string, maxLength = 4): string {
  const words = foldText(name)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, maxLength);
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, maxLength);
}
