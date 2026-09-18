import { normalizeWebsite } from "@/lib/normalizers";

export type CrawlSiteSummary = { total?: number; withIssues?: number; stats?: Record<string, number> };
export type CrawlSiteResult = { runId: string; projectId: string; ownerUserId: string; status: "completed" | "pending"; summary?: CrawlSiteSummary };
export type CrawlSitePdfAttachment = { filename: string; content: Buffer };

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

function redactToken(value: unknown, token: string) {
  const text = String(value || "error");
  return token ? text.replaceAll(token, "[credencial oculta]") : text;
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
  if (!response.ok) throw new Error(`Crawl-Site respondió ${response.status}: ${redactToken(data.error, token)}`);
  return data;
}

async function readCrawlCompletion(response: Response): Promise<{ runId: string; ownerUserId: string; status: "completed" | "pending"; summary?: CrawlSiteSummary }> {
  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    const error = new Error(`Crawl-Site respondió ${response.status}: ${message.slice(0, 250)}`) as Error & { terminal?: boolean };
    error.terminal = response.status >= 400 && response.status < 500;
    throw error;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let started: { runId: string; ownerUserId: string } | null = null;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary).replace(/\r/g, "");
        buffer = buffer.slice(boundary + 2);
        const eventName = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
        const eventPayload = frame.match(/^data:\s*(.+)$/m)?.[1];
        const eventData = eventPayload ? JSON.parse(eventPayload) : null;
        if (eventName === "started" && eventData?.runId) {
          started = { runId: String(eventData.runId), ownerUserId: String(eventData.ownerUserId || "") };
        }
        if (eventName === "pending" && eventData?.runId) {
          return { runId: String(eventData.runId), ownerUserId: String(eventData.ownerUserId || started?.ownerUserId || ""), status: "pending" };
        }
        if (/^event: done$/m.test(frame)) {
          const parsed = eventData;
          if (!parsed?.runId) throw new Error("Crawl-Site terminó sin identificador de registro.");
          return { runId: String(parsed.runId), ownerUserId: String(parsed.ownerUserId || started?.ownerUserId || ""), status: "completed", summary: {
            total: Number.isFinite(Number(parsed.total)) ? Number(parsed.total) : undefined,
            withIssues: Number.isFinite(Number(parsed.withIssues)) ? Number(parsed.withIssues) : undefined,
            stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : undefined,
          } };
        }
        if (eventName === "error") {
          const error = new Error("Crawl-Site no pudo completar el rastreo.") as Error & { crawlRunId?: string; terminal?: boolean };
          error.crawlRunId = eventData?.runId || started?.runId;
          error.terminal = true;
          throw error;
        }
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
  } catch (error) {
    if (started) return { ...started, status: "pending" };
    throw error;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  if (started) return { ...started, status: "pending" };
  throw new Error("La conexión con Crawl-Site terminó antes de guardar el rastreo.");
}

export async function crawlWebsiteInCrawlSite(website: string, idempotencyKey?: string): Promise<CrawlSiteResult | null> {
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
  crawlUrl.searchParams.set("source", "sitemap");
  crawlUrl.searchParams.set("max", "5");
  crawlUrl.searchParams.set("lang", "es");
  const response = await fetch(crawlUrl, {
    headers: { Authorization: `Bearer ${config.token}`, Accept: "text/event-stream", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    signal: AbortSignal.timeout(75_000),
    cache: "no-store",
  });
  const result = await readCrawlCompletion(response);
  return { ...result, projectId };
}

export async function getCrawlSummaryPdf(runId: string): Promise<CrawlSitePdfAttachment> {
  const config = getConfig();
  if (!config) throw new Error("Configura CRAWLSITE_URL y CRAWLSITE_API_TOKEN para adjuntar el informe del rastreo.");

  const response = await fetch(`${config.base}/api/integrations/runs/${encodeURIComponent(runId)}/summary.pdf`, {
    headers: { Authorization: `Bearer ${config.token}`, Accept: "application/pdf" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`No se pudo obtener el PDF de Crawl-Site (${response.status}): ${redactToken(message.slice(0, 200), config.token)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    throw new Error("Crawl-Site respondió sin un archivo PDF válido.");
  }
  const content = Buffer.from(await response.arrayBuffer());
  if (content.length < 5 || content.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("El informe recibido de Crawl-Site no es un PDF válido.");
  }
  if (content.length > 8 * 1024 * 1024) {
    throw new Error("El informe PDF supera el tamaño permitido para adjuntarlo.");
  }

  const disposition = response.headers.get("content-disposition") || "";
  const rawFilename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `resumen-seo-${runId}.pdf`;
  const filename = redactToken(rawFilename, config.token).replace(/[\\/:*?"<>|\r\n]/g, "-").slice(0, 150);
  return { filename, content };
}
