import type { Prisma, ProspectStatus } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { filterUniqueProspects, findDuplicate } from "@/lib/dedupe";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeProspectType,
} from "@/lib/normalizers";
import { buildOpportunity } from "@/lib/opportunity";
import {
  DESIRED_PROSPECT_COUNT,
  REQUIRED_TYPES,
  REQUIRE_EMAIL_FOR_FINAL_PROSPECTS,
  SEARCHES,
} from "@/lib/search-config";
import { getProspectAutomationStatus, scoreProspect } from "@/lib/prospect-scoring";
import type { ComparableProspect, ProspectCandidate } from "@/lib/types";
import { findEmailFromWebsite } from "@/providers/email-finder";
import { searchBusinesses } from "@/providers/google-places";

function nowIso() {
  return new Date().toISOString();
}

function normalizeProspect(rawProspect: ProspectCandidate): ProspectCandidate {
  const timestamp = nowIso();
  const derived = buildOpportunity(rawProspect);

  return {
    name: String(rawProspect.name || "").trim(),
    contactName: String(rawProspect.contactName || "").trim(),
    city: String(rawProspect.city || "").trim(),
    email: normalizeEmail(rawProspect.email || "") || "",
    phone: normalizePhone(rawProspect.phone || "") || "",
    type: normalizeProspectType(String(rawProspect.type || "Negocio local")),
    website: String(rawProspect.website || "").trim(),
    rating: rawProspect.rating ? String(rawProspect.rating).trim() : "",
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

    if (!match) {
      throw new Error(
        `No se encontro un prospecto unico para la categoria requerida: ${requiredType}.`
      );
    }

    ordered.push(match);
  }

  for (const item of scoredCandidates) {
    if (!ordered.includes(item)) {
      ordered.push(item);
    }
  }

  return ordered;
}

function ensureRequiredTypes(prospects: ProspectCandidate[]) {
  for (const type of REQUIRED_TYPES) {
    const exists = prospects.some(
      (prospect) => normalizeName(prospect.type) === normalizeName(type)
    );

    if (!exists) {
      throw new Error(`No se pudo conservar un prospecto final de tipo ${type}.`);
    }
  }
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

    if (!match) {
      throw new Error(
        `No se encontro un prospecto final con email para la categoria requerida: ${requiredType}.`
      );
    }

    selected.push(match);
  }

  for (const candidate of candidates) {
    if (selected.length >= DESIRED_PROSPECT_COUNT) {
      break;
    }

    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  if (selected.length < DESIRED_PROSPECT_COUNT) {
    throw new Error(
      `Despues del enriquecimiento solo quedaron ${selected.length} prospectos unicos con email.`
    );
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
    mapsUrl: prospect.mapsUrl,
    opportunity: prospect.opportunity,
    recommendedSite: prospect.recommendedSite,
    pitchAngle: prospect.pitchAngle,
    subject: "",
    message: "",
    contacted: false,
    lastContactedAt: null,
    followupCount: 0,
    status: getProspectAutomationStatus(score) as ProspectStatus,
    source: prospect.source,
    createdAt: new Date(prospect.createdAt),
    lastCheckedAt: new Date(prospect.lastCheckedAt),
    businessStatus: prospect.businessStatus,
    runId,
  };
}

export async function runProspectSearch(source = "google-places") {
  const prisma = getPrismaClient();
  const metrics = {
    source,
    searchesCount: SEARCHES.length,
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

    const googlePlacesResult = await searchBusinesses(SEARCHES);
    metrics.googlePlacesRequests = googlePlacesResult.requestCount;
    metrics.placesFound = googlePlacesResult.candidates.length;

    const rawCandidates = googlePlacesResult.candidates.map(normalizeProspect);
    const { uniqueProspects, duplicates } = filterUniqueProspects(
      rawCandidates,
      existingProspects
    );

    const scoredCandidates = uniqueProspects
      .map((prospect) => ({
        prospect,
        score: scoreProspect(prospect),
      }))
      .sort((left, right) => right.score - left.score);

    if (scoredCandidates.length < DESIRED_PROSPECT_COUNT) {
      throw new Error(
        `Se encontraron ${scoredCandidates.length} prospectos unicos, pero se necesitan ${DESIRED_PROSPECT_COUNT}.`
      );
    }

    const ordered = buildSelectedOrder(scoredCandidates);
    const eligibleProspects: ProspectCandidate[] = [];
    const comparisonPool: ComparableProspect[] = [...existingProspects];
    let enrichmentDuplicates = 0;
    let prospectsWithoutEmail = 0;

    for (const item of ordered) {
      const enriched = await enrichProspectEmail(item.prospect);
      metrics.websiteFetches += enriched.fetchCount;
      metrics.emailsFound += enriched.emailFound;

      if (REQUIRE_EMAIL_FOR_FINAL_PROSPECTS && !normalizeEmail(enriched.prospect.email)) {
        prospectsWithoutEmail += 1;
        continue;
      }

      const duplicate = findDuplicate(enriched.prospect, [
        ...comparisonPool,
        ...eligibleProspects,
      ]);

      if (duplicate) {
        enrichmentDuplicates += 1;
        continue;
      }

      eligibleProspects.push(enriched.prospect);
    }

    const finalProspects = selectFinalProspects(eligibleProspects);
    ensureRequiredTypes(finalProspects);

    metrics.duplicatesFiltered = duplicates.length + enrichmentDuplicates;
    metrics.prospectsSaved = finalProspects.length;

    console.log(`[prospect-run] Google Places requests: ${metrics.googlePlacesRequests}`);
    console.log(`[prospect-run] Website fetches: ${metrics.websiteFetches}`);
    console.log(`[prospect-run] Places encontrados: ${metrics.placesFound}`);
    console.log(
      `[prospect-run] Duplicados filtrados: ${metrics.duplicatesFiltered}`
    );
    console.log(`[prospect-run] Prospectos sin email descartados: ${prospectsWithoutEmail}`);
    console.log(`[prospect-run] Prospectos finales guardados: ${metrics.prospectsSaved}`);

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
          status: "completed",
          error: null,
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
