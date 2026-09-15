import { normalizeWebsite } from "@/lib/normalizers";

type CrawlSiteResult = { runId: string; projectId: string };

function getConfig() {
  const base = (process.env.CRAWLSITE_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.CRAWLSITE_API_TOKEN || "").trim();
  if (!base || !token) return null;
  const url = new URL(base);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("CRAWLSITE_URL debe usar HTTPS en producción.");
  }
  return { base, token };
}

async function requestJson(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Crawl-Site respondió ${response.status}: ${data.error || "error"}`);
  return data;
}

async function readCrawlCompletion(response: Response): Promise<string> {
  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    throw new Error(`Crawl-Site respondió ${response.status}: ${message.slice(0, 250)}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary).replace(/\r/g, "");
        buffer = buffer.slice(boundary + 2);
        if (/^event: done$/m.test(frame)) {
          const payload = frame.match(/^data:\s*(.+)$/m)?.[1];
          const parsed = payload ? JSON.parse(payload) : null;
          if (!parsed?.runId) throw new Error("Crawl-Site terminó sin identificador de registro.");
          return String(parsed.runId);
        }
        if (/^event: error$/m.test(frame)) throw new Error("Crawl-Site no pudo completar el rastreo.");
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  throw new Error("La conexión con Crawl-Site terminó antes de guardar el rastreo.");
}

export async function crawlWebsiteInCrawlSite(website: string): Promise<CrawlSiteResult | null> {
  const config = getConfig();
  if (!config) return null;
  const host = normalizeWebsite(website);
  if (!host || /(?:facebook|instagram|linkedin|twitter|tiktok|wa\.me|linktr\.ee)\.com?/i.test(host)) return null;
  const targetUrl = /^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${host}`;
  const projectData = await requestJson(`${config.base}/api/integrations/project`, config.token, {
    method: "PUT",
    body: JSON.stringify({ targetUrl, name: host }),
  });
  const projectId = String(projectData.project?.id || "");
  if (!projectId) throw new Error("Crawl-Site no devolvió el proyecto del sitio.");

  const crawlUrl = new URL(`${config.base}/api/crawl`);
  crawlUrl.searchParams.set("url", targetUrl);
  crawlUrl.searchParams.set("projectId", projectId);
  crawlUrl.searchParams.set("source", "aionsite-leads");
  crawlUrl.searchParams.set("max", "5");
  crawlUrl.searchParams.set("lang", "es");
  const response = await fetch(crawlUrl, {
    headers: { Authorization: `Bearer ${config.token}`, Accept: "text/event-stream" },
    signal: AbortSignal.timeout(75_000),
    cache: "no-store",
  });
  const runId = await readCrawlCompletion(response);
  return { runId, projectId };
}
