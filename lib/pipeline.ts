import type { Prisma, ProspectStatus } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { filterUniqueProspects, findDuplicate } from "@/lib/dedupe";
import { resolveLeadType } from "@/lib/lead-types";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/normalizers";
import { buildOpportunity } from "@/lib/opportunity";
import {
  DESIRED_PROSPECT_COUNT,
  MAX_SEARCHES_PER_RUN,
  SOCIAL_SEARCHES_FOR_RUN,
  REQUIRED_TYPES,
  REQUIRE_EMAIL_FOR_FINAL_PROSPECTS,
  SEARCHES_FOR_RUN,
  SEARCHES,
} from "@/lib/search-config";
import {
  MINIMUM_SAVE_SCORE,
  MINIMUM_QUALIFIED_PROSPECT_SCORE,
  getProspectAutomationStatus,
  hasRatingOpportunity,
  hasDirectContactPath,
  scoreProspect,
} from "@/lib/prospect-scoring";
import type { ComparableProspect, ProspectCandidate } from "@/lib/types";
import { inferWebsiteSignal } from "@/lib/website-signals";
import { findEmailFromWebsite } from "@/providers/email-finder";
import { searchBusinesses } from "@/providers/google-places";
import { searchSocialBusinesses } from "@/providers/social-search";

function nowIso() {
  return new Date().toISOString();
}

function shouldAuditProspect(prospect: ProspectCandidate) {
  const websiteSignal = inferWebsiteSignal(prospect);

  return (
    websiteSignal === "missing" ||
    websiteSignal === "social-only" ||
    websiteSignal === "basic" ||
    hasRatingOpportunity(prospect)
  );
}

function normalizeProspect(rawProspect: ProspectCandidate): ProspectCandidate {
  const timestamp = nowIso();
  const type = resolveLeadType(rawProspect);
  const derived = buildOpportunity({
    type,
    website: rawProspect.website,
    rating: rawProspect.rating,
    userRatingCount: rawProspect.userRatingCount,
    websiteFetchFailed: rawProspect.websiteFetchFailed,
    websiteLoadTimeMs: rawProspect.websiteLoadTimeMs,
    hasWhatsappCta: rawProspect.hasWhatsappCta,
    hasContactCta: rawProspect.hasContactCta,
    isMobileFriendly: rawProspect.isMobileFriendly,
  });

  return {
    name: String(rawProspect.name || "").trim(),
    contactName: String(rawProspect.contactName || "").trim(),
    city: String(rawProspect.city || "").trim(),
    email: normalizeEmail(rawProspect.email || "") || "",
    phone: normalizePhone(rawProspect.phone || "") || "",
    type,
    website: String(rawProspect.website || "").trim(),
    rating: rawProspect.rating ? String(rawProspect.rating).trim() : "",
    userRatingCount: rawProspect.userRatingCount ?? null,
    websiteFetchFailed: rawProspect.websiteFetchFailed ?? false,
    websiteLoadTimeMs: rawProspect.websiteLoadTimeMs ?? null,
    hasWhatsappCta: rawProspect.hasWhatsappCta ?? null,
    hasContactCta: rawProspect.hasContactCta ?? null,
    isMobileFriendly: rawProspect.isMobileFriendly ?? null,
    mapsUrl: String(rawProspect.mapsUrl || "").trim(),
    opportunity: rawProspect.opportunity || derived.opportunity,
    recommendedSite: rawProspect.recommendedSite || derived.recommendedSite,
    pitchAngle: rawProspect.pitchAngle || derived.pitchAngle,
    status: "generated",
    source: String(rawProspect.source || "google-places").trim(),
    createdAt: rawProspect.createdAt || timestamp,
    lastCheckedAt: rawProspect.lastCheckedAt || timestamp,
    businessStatus: String(rawProspect.businessStatus || "").trim(),
    placeId: rawProspect.placeId || "",
    formattedAddress: rawProspect.formattedAddress || "",
    primaryType: rawProspect.primaryType || "",
    hasRecentPhotos: rawProspect.hasRecentPhotos ?? false,
    mostRecentPhotoDate: rawProspect.mostRecentPhotoDate ?? null,
    photoCount: rawProspect.photoCount ?? 0,
    hasCompleteHours: rawProspect.hasCompleteHours ?? false,
    openingHours: rawProspect.openingHours ?? null,
    businessTypes: rawProspect.businessTypes ?? [],
  };
}

function buildSelectedOrder(
  scoredCandidates: Array<{ prospect: ProspectCandidate; score: number }>
) {
  const ordered: Array<{ prospect: ProspectCandidate; score: number }> = [];

  for (const requiredType of REQUIRED_TYPES) {
    const match = scoredCandidates.find((item) => {
      if (ordered.includes(item)) {
        return false;
      }

      return normalizeName(item.prospect.type) === normalizeName(requiredType);
    });

    if (match) {
      ordered.push(match);
    }
  }

  for (const item of scoredCandidates) {
    if (!ordered.includes(item)) {
      ordered.push(item);
    }
  }

  return ordered;
}

function ensureRequiredTypes(prospects: ProspectCandidate[]) {
  return prospects;
}

function selectFinalProspects(candidates: ProspectCandidate[]) {
  const selected: ProspectCandidate[] = [];

  for (const requiredType of REQUIRED_TYPES) {
    const match = candidates.find((candidate) => {
      if (selected.includes(candidate)) {
        return false;
      }

      return normalizeName(candidate.type) === normalizeName(requiredType);
    });

    if (match) {
      selected.push(match);
    }
  }

  for (const candidate of candidates) {
    if (selected.length >= DESIRED_PROSPECT_COUNT) {
      break;
    }

    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected;
}

async function enrichProspectEmail(prospect: ProspectCandidate) {
  if (prospect.email) {
    return {
      prospect,
      fetchCount: 0,
      emailFound: 1,
    };
  }

  const enrichment = await findEmailFromWebsite(prospect.website);
  const normalized = normalizeEmail(enrichment.email);

  return {
    prospect: {
      ...prospect,
      email: normalized || prospect.email,
      websiteFetchFailed: enrichment.audit.fetchFailed,
      websiteLoadTimeMs: enrichment.audit.loadTimeMs,
      hasWhatsappCta: enrichment.audit.hasWhatsappCta,
      hasContactCta: enrichment.audit.hasContactCta,
      isMobileFriendly: enrichment.audit.isMobileFriendly,
      lastCheckedAt: nowIso(),
    },
    fetchCount: enrichment.fetchCount,
    emailFound: normalized ? 1 : 0,
  };
}

function buildCreateProspectData(prospect: ProspectCandidate, runId: string) {
  const score = scoreProspect(prospect);

  return {
    name: prospect.name,
    normalizedName: normalizeName(prospect.name),
    contactName: prospect.contactName,
    city: prospect.city,
    email: prospect.email,
    normalizedEmail: normalizeEmail(prospect.email),
    phone: prospect.phone,
    normalizedPhone: normalizePhone(prospect.phone),
    type: prospect.type,
    website: prospect.website,
    rating: prospect.rating,
    websiteFetchFailed: prospect.websiteFetchFailed ?? false,
    websiteLoadTimeMs: prospect.websiteLoadTimeMs ?? null,
    hasWhatsappCta: prospect.hasWhatsappCta ?? null,
    hasContactCta: prospect.hasContactCta ?? null,
    isMobileFriendly: prospect.isMobileFriendly ?? null,
    mapsUrl: prospect.mapsUrl,
    opportunity: prospect.opportunity,
    recommendedSite: prospect.recommendedSite,
    pitchAngle: prospect.pitchAngle,
    subject: "",
    message: "",
    contacted: false,
    hotLead: false,
    lastContactedAt: null,
    followupCount: 0,
    followupStage: 0,
    status: getProspectAutomationStatus(score) as ProspectStatus,
    source: prospect.source,
    createdAt: new Date(prospect.createdAt),
    lastCheckedAt: new Date(prospect.lastCheckedAt),
    businessStatus: prospect.businessStatus,
    primaryType: prospect.primaryType || "",
    runId,
  };
}

const PIPELINE_DEADLINE_MS = Number(process.env.PIPELINE_DEADLINE_MS ?? 220_000);
const MINIMUM_PROSPECTS_TO_SAVE = 15;

export async function runProspectSearch(source = "google-places") {
  const pipelineStart = Date.now();
  const prisma = getPrismaClient();
  const metrics = {
    source,
    searchesCount: SEARCHES_FOR_RUN.length,
    placesFound: 0,
    duplicatesFiltered: 0,
    emailsFound: 0,
    prospectsSaved: 0,
    googlePlacesRequests: 0,
    websiteFetches: 0,
  };
  const startedRun = await prisma.run.create({
    data: {
      ...metrics,
      status: "running",
    },
  });

  try {
    const existingProspects = await prisma.prospect.findMany({
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    const googlePlacesResult = await searchBusinesses(SEARCHES_FOR_RUN);
    metrics.googlePlacesRequests = googlePlacesResult.requestCount;
    metrics.placesFound = googlePlacesResult.candidates.length;

    const socialResult = await searchSocialBusinesses(SOCIAL_SEARCHES_FOR_RUN);
    const socialCandidates = socialResult.candidates;
    console.log(
      `[prospect-run] Social search requests: ${socialResult.requestCount} (${SOCIAL_SEARCHES_FOR_RUN.length} search specs x 2 domains).`
    );
    console.log(
      `[prospect-run] Social candidates encontrados: ${socialCandidates.length}.`
    );

    const mergedCandidates = [
      ...googlePlacesResult.candidates,
      ...socialCandidates,
    ];

    const activeCandidates = mergedCandidates.filter((p) => {
      if (p.businessStatus === "CLOSED_PERMANENTLY") return false;
      if (p.businessStatus === "CLOSED_TEMPORARILY") {
        console.warn(`[pipeline] ${p.name} cerrado temporalmente`);
      }
      return true;
    });
    const rawCandidates = activeCandidates.map(normalizeProspect);
    const { uniqueProspects, duplicates } = filterUniqueProspects(
      rawCandidates,
      existingProspects
    );

    const enrichedCandidates: ProspectCandidate[] = [];

    for (const prospect of uniqueProspects) {
      if (!shouldAuditProspect(prospect)) {
        enrichedCandidates.push(prospect);
        continue;
      }

      if (Date.now() - pipelineStart > PIPELINE_DEADLINE_MS) {
        console.warn("[prospect-run] Presupuesto de tiempo agotado, saltando enrichment restante.");
        enrichedCandidates.push(prospect);
        continue;
      }

      const enriched = await enrichProspectEmail(prospect);
      metrics.websiteFetches += enriched.fetchCount;
      metrics.emailsFound += enriched.emailFound;
      enrichedCandidates.push(enriched.prospect);
    }

    const scoredCandidates = enrichedCandidates
      .map((prospect) => ({
        prospect,
        score: scoreProspect(prospect),
      }))
      .filter((item) => item.score >= MINIMUM_SAVE_SCORE)
      .sort((left, right) => right.score - left.score);

    const lowScoreDiscarded = enrichedCandidates.length - scoredCandidates.length;

    if (scoredCandidates.length < DESIRED_PROSPECT_COUNT) {
      console.warn(
        `[prospect-run] Solo ${scoredCandidates.length} prospectos con score >= ${MINIMUM_SAVE_SCORE} (objetivo: ${DESIRED_PROSPECT_COUNT}). Se guardaran los disponibles.`
      );
    }

    const ordered = buildSelectedOrder(scoredCandidates);
    const eligibleProspects: ProspectCandidate[] = [];
    const comparisonPool: ComparableProspect[] = [...existingProspects];
    let enrichmentDuplicates = 0;
    let prospectsWithoutContact = 0;

    for (const item of ordered) {
      if (REQUIRE_EMAIL_FOR_FINAL_PROSPECTS && !hasDirectContactPath(item.prospect)) {
        prospectsWithoutContact += 1;
        continue;
      }

      const duplicate = findDuplicate(item.prospect, [
        ...comparisonPool,
        ...eligibleProspects,
      ]);

      if (duplicate) {
        enrichmentDuplicates += 1;
        continue;
      }

      eligibleProspects.push(item.prospect);
    }

    const rankedFallbackCandidates = enrichedCandidates
      .map((prospect) => ({
        prospect,
        score: scoreProspect(prospect),
      }))
      .sort((left, right) => {
        const contactDiff =
          Number(hasDirectContactPath(right.prospect)) -
          Number(hasDirectContactPath(left.prospect));

        return right.score - left.score || contactDiff;
      });

    let finalProspects = selectFinalProspects(eligibleProspects);

    if (finalProspects.length < MINIMUM_PROSPECTS_TO_SAVE) {
      const selectedIds = new Set(finalProspects.map((item) => `${item.name}|${item.email}|${item.phone}`));

      for (const item of rankedFallbackCandidates) {
        const dedupeKey = `${item.prospect.name}|${item.prospect.email}|${item.prospect.phone}`;

        if (selectedIds.has(dedupeKey)) {
          continue;
        }

        finalProspects.push(item.prospect);
        selectedIds.add(dedupeKey);

        if (finalProspects.length >= MINIMUM_PROSPECTS_TO_SAVE) {
          break;
        }
      }

      if (finalProspects.length) {
        console.warn(
          `[prospect-run] Se completara el lote hasta ${Math.min(
            MINIMUM_PROSPECTS_TO_SAVE,
            finalProspects.length
          )} prospectos con respaldo de candidatos sin canal de contacto o con score bajo.`
        );
      }
    }

    metrics.duplicatesFiltered = duplicates.length + enrichmentDuplicates;
    metrics.prospectsSaved = finalProspects.length;

    console.log(
      `[prospect-run] Busquedas ejecutadas: ${metrics.searchesCount} de ${SEARCHES.length} configuradas (limite ${MAX_SEARCHES_PER_RUN}).`
    );
    console.log(`[prospect-run] Google Places requests: ${metrics.googlePlacesRequests}`);
    console.log(`[prospect-run] Website fetches: ${metrics.websiteFetches}`);
    console.log(`[prospect-run] Places encontrados: ${metrics.placesFound}`);
    console.log(`[prospect-run] Candidatos unicos: ${uniqueProspects.length} (${duplicates.length} duplicados vs BD)`);
    console.log(`[prospect-run] Descartados por score < ${MINIMUM_QUALIFIED_PROSPECT_SCORE}: ${lowScoreDiscarded}`);
    console.log(`[prospect-run] Descartados por duplicado post-enriquecimiento: ${enrichmentDuplicates}`);
    console.log(`[prospect-run] Descartados por sin canal de contacto: ${prospectsWithoutContact}`);
    console.log(`[prospect-run] Prospectos finales guardados: ${metrics.prospectsSaved}`);

    const runStatus = finalProspects.length
      ? googlePlacesResult.quotaExceeded
        ? "completed_with_warnings"
        : "completed"
      : "failed";
    const runError = finalProspects.length
      ? googlePlacesResult.quotaExceeded
        ? `Google Places alcanzo cuota tras ${metrics.googlePlacesRequests} requests.`
        : null
      : googlePlacesResult.quotaExceeded
        ? `Google Places alcanzo cuota tras ${metrics.googlePlacesRequests} requests y no se guardaron prospectos.`
        : "No se encontraron prospectos guardables.";

    const run = await prisma.$transaction(async (tx) => {
      for (const prospect of finalProspects) {
        const createdProspect = await tx.prospect.create({
          data: buildCreateProspectData(prospect, startedRun.id),
        });

        await tx.contactEvent.create({
          data: {
            prospectId: createdProspect.id,
            eventType: "generated",
            metadata: {
              source: createdProspect.source,
              status: createdProspect.status,
              city: createdProspect.city,
              type: createdProspect.type,
            } as Prisma.InputJsonObject,
            createdAt: createdProspect.createdAt,
          },
        });
      }

      return tx.run.update({
        where: { id: startedRun.id },
        data: {
          ...metrics,
          status: runStatus,
          error: runError,
        },
      });
    });

    return {
      runId: run.id,
      ...metrics,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo ejecutar la busqueda.";

    console.error(`[prospect-run] Error: ${message}`);

    await prisma.run.update({
      where: { id: startedRun.id },
      data: {
        ...metrics,
        status: "failed",
        error: message,
      },
    });

    throw new Error(message);
  }
}
