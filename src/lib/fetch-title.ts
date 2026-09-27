/**
 * Best-effort fetch of a page's <title>. Browsers block cross-origin reads,
 * so we route through public read-only proxies and fall back to "" on any
 * failure (timeout, blocked, no title) — callers then use the hostname.
 */
export async function fetchPageTitle(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const target = publicPart(url);
  if (!target) return "";
  const fromHtml = await tryProxy(
    `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
    extractHtmlTitle,
    signal,
  );
  if (fromHtml) return fromHtml;

  // Reader proxy returns plain text with a "Title:" header line.
  return tryProxy(
    `https://r.jina.ai/${encodeURI(target)}`,
    (text) => text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? "",
    signal,
  );
}

/**
 * Only origin + path leave the browser: query strings and fragments often
 * carry tokens (reset links, shared docs) that third-party proxies must not see.
 */
export function publicPart(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}

async function tryProxy(
  endpoint: string,
  parse: (text: string) => string,
  signal?: AbortSignal,
): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  signal?.addEventListener("abort", () => controller.abort());
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return "";
    return parse(await res.text()).slice(0, 120);
  } catch {
    return "";
  } finally {
    window.clearTimeout(timeout);
  }
}

function extractHtmlTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!match) return "";
  const el = document.createElement("textarea");
  el.innerHTML = match[1].trim();
  return el.value;
}
