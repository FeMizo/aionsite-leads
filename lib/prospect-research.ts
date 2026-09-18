import type { Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { normalizeEmail, normalizeName, normalizePhone, normalizeWebsite } from "@/lib/normalizers";
import { findEmailFromWebsite } from "@/providers/email-finder";
import { researchBraveSocialProfile, researchGooglePlace, type ResearchSourceResult } from "@/providers/prospect-research";

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre del negocio", formattedAddress: "Dirección", website: "Sitio o perfil público",
  phone: "Teléfono", rating: "Calificación", userRatingCount: "Reseñas en Google", primaryType: "Giro detectado",
  mapsUrl: "Google Maps", businessStatus: "Estado del negocio", email: "Correo público",
  websiteFetchFailed: "El sitio no respondió", websiteLoadTimeMs: "Tiempo de respuesta (ms)",
  hasWhatsappCta: "Tiene enlace de WhatsApp", hasContactCta: "Tiene llamada a contacto",
  isMobileFriendly: "El sitio declara vista móvil",
};

function encodeValue(value: unknown) { return JSON.stringify(value === undefined ? null : value); }
function sameValue(field: string, current: unknown, proposed: unknown) {
  if (field === "phone") return normalizePhone(String(current || "")) === normalizePhone(String(proposed || ""));
  if (field === "email") return normalizeEmail(String(current || "")) === normalizeEmail(String(proposed || ""));
  if (field === "website") return normalizeWebsite(String(current || "")) === normalizeWebsite(String(proposed || ""));
  if (field === "name") return normalizeName(String(current || "")) === normalizeName(String(proposed || ""));
  if (typeof current === "number" || typeof proposed === "number") return Number(current) === Number(proposed);
  return String(current ?? "") === String(proposed ?? "");
}

function pushSourceValues(values: ResearchSourceResult["values"], target: Map<string, ResearchSourceResult["values"][number]>) {
  for (const item of values) {
    if (!target.has(item.field)) target.set(item.field, item);
  }
}

export function getResearchFieldLabel(field: string) { return FIELD_LABELS[field] || field; }
export function decodeResearchValue(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return value; }
}

function isHttpUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; }
  catch { return false; }
}

export async function runProspectResearch(prospectId: string) {
  const prisma = getPrismaClient();
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospecto no encontrado.");
  const activeResearch = await prisma.prospectResearch.findFirst({ where: { prospectId, status: "running" }, select: { id: true } });
  if (activeResearch) throw new Error("Ya hay una investigación en curso para este prospecto.");

  const research = await prisma.prospectResearch.create({ data: { prospectId, status: "running" } });
  const sourceResults: Record<string, { status: string; error?: string }> = {};
  const suggestions = new Map<string, ResearchSourceResult["values"][number]>();
  const identity = { name: prospect.name, city: prospect.city, type: prospect.type, website: prospect.website };

  const [places, brave, website] = await Promise.allSettled([
    researchGooglePlace(identity),
    researchBraveSocialProfile(identity),
    prospect.website ? findEmailFromWebsite(prospect.website) : Promise.resolve(null),
  ]);

  if (places.status === "fulfilled") {
    sourceResults.googlePlaces = { status: places.value.error ? "partial" : "completed", ...(places.value.error ? { error: places.value.error } : {}) };
    pushSourceValues(places.value.values, suggestions);
  } else sourceResults.googlePlaces = { status: "failed", error: "Falló la consulta de Google Places." };

  if (brave.status === "fulfilled") {
    sourceResults.brave = { status: brave.value.skipped ? "skipped" : brave.value.error ? "partial" : "completed", ...(brave.value.error ? { error: brave.value.error } : {}) };
    // Never replace an official website with a social profile, or replace an existing site.
    if (!prospect.website) pushSourceValues(brave.value.values, suggestions);
  } else sourceResults.brave = { status: "failed", error: "Falló la consulta de Brave Search." };

  if (website.status === "fulfilled" && website.value) {
    const result = website.value;
    sourceResults.website = { status: result.audit.fetchFailed ? "partial" : "completed", ...(result.audit.fetchFailed ? { error: "No se pudo leer el sitio." } : {}) };
    if (result.email && result.sourceUrl) {
      const host = (() => { try { return new URL(result.sourceUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
      const emailHost = result.email.split("@")[1]?.toLowerCase() || "";
      suggestions.set("email", {
        field: "email", value: result.email, sourceName: "Sitio del negocio", sourceUrl: result.sourceUrl,
        confidence: host && (emailHost === host || emailHost.endsWith(`.${host}`)) ? "high" : "medium",
        confidenceReason: host && (emailHost === host || emailHost.endsWith(`.${host}`))
          ? "El correo aparece en el sitio del negocio y coincide con su dominio."
          : "El correo aparece en el sitio del negocio, pero usa otro dominio.",
      });
    }
    if (!result.audit.fetchFailed) {
      const sourceUrl = result.auditSourceUrl || prospect.website;
      for (const [field, value] of Object.entries({
        websiteFetchFailed: false,
        websiteLoadTimeMs: result.audit.loadTimeMs,
        hasWhatsappCta: result.audit.hasWhatsappCta,
        hasContactCta: result.audit.hasContactCta,
        isMobileFriendly: result.audit.isMobileFriendly,
      })) {
        if (value !== null && value !== undefined) suggestions.set(field, { field, value, sourceName: "Sitio del negocio", sourceUrl, confidence: "high", confidenceReason: "Se observó directamente en el HTML del sitio consultado." });
      }
    }
  } else if (website.status === "rejected") {
    sourceResults.website = { status: "failed", error: "No se pudo inspeccionar el sitio." };
  } else sourceResults.website = { status: "skipped", error: "El prospecto no tiene sitio web." };

  const currentValues: Record<string, unknown> = {
    name: prospect.name, formattedAddress: prospect.formattedAddress, website: prospect.website,
      phone: prospect.phone, rating: prospect.rating ? Number(prospect.rating) : "", userRatingCount: prospect.userRatingCount,
    primaryType: prospect.primaryType, mapsUrl: prospect.mapsUrl, businessStatus: prospect.businessStatus,
    email: prospect.email, websiteFetchFailed: prospect.websiteFetchFailed,
    websiteLoadTimeMs: prospect.websiteLoadTimeMs, hasWhatsappCta: prospect.hasWhatsappCta,
    hasContactCta: prospect.hasContactCta, isMobileFriendly: prospect.isMobileFriendly,
  };
  const findings = [...suggestions.values()]
    .filter((item) => FIELD_LABELS[item.field] && isHttpUrl(item.sourceUrl) && !sameValue(item.field, currentValues[item.field], item.value))
    .map((item) => ({
      researchId: research.id, field: item.field, currentValue: encodeValue(currentValues[item.field]),
      proposedValue: encodeValue(item.value), sourceName: item.sourceName, sourceUrl: item.sourceUrl,
      confidence: item.confidence, confidenceReason: item.confidenceReason,
    }));

  const completedSources = Object.values(sourceResults).filter((entry) => entry.status === "completed").length;
  const status = completedSources ? "completed" : "failed";
  const error = status === "failed" ? "Ninguna fuente pudo verificar información." : "";
  return prisma.$transaction(async (tx) => {
    if (findings.length) await tx.prospectResearchFinding.createMany({ data: findings });
    return tx.prospectResearch.update({
      where: { id: research.id },
      data: { status, sourceResults: sourceResults as Prisma.InputJsonObject, error, completedAt: new Date() },
      include: { findings: { orderBy: { createdAt: "asc" } } },
    });
  });
}

const APPLICABLE_FIELDS = new Set([
  "name", "formattedAddress", "website", "phone", "rating", "userRatingCount", "primaryType", "mapsUrl", "businessStatus", "email",
  "websiteFetchFailed", "websiteLoadTimeMs", "hasWhatsappCta", "hasContactCta", "isMobileFriendly",
]);

function fieldUpdate(field: string, value: unknown): Prisma.ProspectUpdateInput {
  if (!APPLICABLE_FIELDS.has(field)) throw new Error("Campo de investigación no permitido.");
  if (field === "phone") return { phone: String(value), normalizedPhone: normalizePhone(String(value)) };
  if (field === "email") return { email: String(value), normalizedEmail: normalizeEmail(String(value)) };
  if (field === "name") return { name: String(value), normalizedName: normalizeName(String(value)) };
  if (field === "rating") return { rating: String(value) };
  if (field === "websiteLoadTimeMs") {
    const milliseconds = Number(value);
    if (!Number.isInteger(milliseconds) || milliseconds < 0) throw new Error("Tiempo de respuesta inválido.");
    return { websiteLoadTimeMs: milliseconds };
  }
  if (field === "userRatingCount") {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 0) throw new Error("Cantidad de reseñas inválida.");
    return { userRatingCount: count };
  }
  if (["websiteFetchFailed", "hasWhatsappCta", "hasContactCta", "isMobileFriendly"].includes(field)) {
    if (typeof value !== "boolean") throw new Error("Valor booleano inválido.");
  }
  return { [field]: value } as Prisma.ProspectUpdateInput;
}

function fieldCurrentValue(prospect: Record<string, unknown>, field: string) {
  const value = prospect[field];
  if (field === "rating" && value) return Number(value);
  return value;
}

export async function decideResearchFinding(findingId: string, decision: "approve" | "dismiss", decidedBy: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const finding = await tx.prospectResearchFinding.findUnique({ where: { id: findingId }, include: { research: true } });
    if (!finding) throw new Error("Propuesta no encontrada.");
    if (finding.status !== "pending") throw new Error("Esta propuesta ya tiene una decisión.");
    const prospect = await tx.prospect.findUnique({ where: { id: finding.research.prospectId } });
    if (!prospect) throw new Error("Prospecto no encontrado.");

    const currentValue = fieldCurrentValue(prospect as unknown as Record<string, unknown>, finding.field);
    if (decision === "approve" && !sameValue(finding.field, currentValue, decodeResearchValue(finding.currentValue))) {
      await tx.prospectResearchFinding.update({ where: { id: finding.id }, data: { status: "stale", decision: "stale", decidedBy, decidedAt: new Date() } });
      await tx.contactEvent.create({ data: {
        prospectId: prospect.id, eventType: "research_finding_stale",
        metadata: { researchId: finding.researchId, findingId: finding.id, field: finding.field, decision: "stale", decidedBy } as Prisma.InputJsonObject,
      } });
      return { stale: true };
    }

    const value = decodeResearchValue(finding.proposedValue);
    if (decision === "approve") await tx.prospect.update({
      where: { id: prospect.id }, data: { ...fieldUpdate(finding.field, value), lastCheckedAt: new Date() },
    });
    const now = new Date();
    await tx.prospectResearchFinding.update({ where: { id: finding.id }, data: {
      status: decision === "approve" ? "approved" : "dismissed", decision, decidedBy, decidedAt: now,
    } });
    await tx.contactEvent.create({ data: {
      prospectId: prospect.id, eventType: decision === "approve" ? "research_finding_approved" : "research_finding_dismissed",
      metadata: {
        researchId: finding.researchId, findingId: finding.id, field: finding.field,
        oldValue: currentValue ?? null, proposedValue: value, sourceName: finding.sourceName,
        sourceUrl: finding.sourceUrl, confidence: finding.confidence, confidenceReason: finding.confidenceReason,
        decision, decidedBy,
      } as Prisma.InputJsonObject,
      createdAt: now,
    } });
    return { stale: false };
  });
}
