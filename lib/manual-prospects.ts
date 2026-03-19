import type { Prisma, ProspectStatus } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { findDuplicate } from "@/lib/dedupe";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeWhitespace,
} from "@/lib/normalizers";
import { buildOpportunity } from "@/lib/opportunity";

export type ManualProspectInput = {
  name?: string;
  contactName?: string;
  city?: string;
  email?: string;
  phone?: string;
  type?: string;
  website?: string;
};

export type PreparedManualProspect = {
  name: string;
  contactName: string;
  city: string;
  email: string;
  phone: string;
  type: string;
  website: string;
  rating: string;
  mapsUrl: string;
  opportunity: string;
  recommendedSite: string;
  pitchAngle: string;
  source: string;
  businessStatus: string;
};

function normalizeWebsiteInput(value: string) {
  const website = normalizeWhitespace(value);

  if (!website) {
    return "";
  }

  if (/^https?:\/\//i.test(website)) {
    return website;
  }

  return `https://${website}`;
}

function formatDuplicateReason(reason: "email" | "phone" | "name") {
  if (reason === "email") {
    return "email";
  }

  if (reason === "phone") {
    return "telefono";
  }

  return "nombre";
}

export function prepareManualProspect(input: ManualProspectInput = {}): PreparedManualProspect {
  const name = normalizeWhitespace(input.name || "");
  const contactName = normalizeWhitespace(input.contactName || "");
  const city = normalizeWhitespace(input.city || "");
  const email = normalizeEmail(input.email || "");
  const phone = normalizePhone(input.phone || "");
  const type = normalizeWhitespace(input.type || "Negocio local");
  const website = normalizeWebsiteInput(input.website || "");
  const derived = buildOpportunity({
    type,
    website,
  });

  return {
    name,
    contactName,
    city,
    email,
    phone,
    type,
    website,
    rating: "",
    mapsUrl: "",
    opportunity: derived.opportunity,
    recommendedSite: derived.recommendedSite,
    pitchAngle: derived.pitchAngle,
    source: "manual-entry",
    businessStatus: "",
  };
}

export function validateManualProspect(
  input: ManualProspectInput = {},
  options: { requireEmail?: boolean } = {}
) {
  const prepared = prepareManualProspect(input);

  if (!prepared.name) {
    throw new Error("El nombre de la empresa es obligatorio.");
  }

  if (!prepared.city) {
    throw new Error("La ciudad es obligatoria.");
  }

  if (!prepared.type) {
    throw new Error("El tipo de empresa es obligatorio.");
  }

  if (options.requireEmail && !prepared.email) {
    throw new Error("El correo es obligatorio para enviar una prueba.");
  }

  return prepared;
}

function buildProspectCreateData(prepared: PreparedManualProspect, status: ProspectStatus) {
  const timestamp = new Date();

  return {
    name: prepared.name,
    normalizedName: normalizeName(prepared.name),
    contactName: prepared.contactName,
    city: prepared.city,
    email: prepared.email,
    normalizedEmail: normalizeEmail(prepared.email),
    phone: prepared.phone,
    normalizedPhone: normalizePhone(prepared.phone),
    type: prepared.type,
    website: prepared.website,
    rating: prepared.rating,
    mapsUrl: prepared.mapsUrl,
    opportunity: prepared.opportunity,
    recommendedSite: prepared.recommendedSite,
    pitchAngle: prepared.pitchAngle,
    status,
    source: prepared.source,
    createdAt: timestamp,
    lastCheckedAt: timestamp,
    businessStatus: prepared.businessStatus,
  };
}

export async function createManualProspect(input: ManualProspectInput = {}) {
  const prisma = getPrismaClient();
  const prepared = validateManualProspect(input);
  const existingRecords = await prisma.prospect.findMany({
    where: {
      status: {
        not: "deleted",
      },
    },
    select: {
      name: true,
      email: true,
      phone: true,
    },
  });
  const duplicate = findDuplicate(prepared, existingRecords);

  if (duplicate) {
    throw new Error(
      `Ya existe un prospecto similar por ${formatDuplicateReason(
        duplicate.reason
      )}: ${duplicate.existing.name || duplicate.existing.email || duplicate.existing.phone}.`
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const prospect = await tx.prospect.create({
      data: buildProspectCreateData(prepared, "prospect"),
    });

    await tx.contactEvent.create({
      data: {
        prospectId: prospect.id,
        eventType: "manual_created",
        metadata: {
          source: prospect.source,
          status: prospect.status,
          city: prospect.city,
          type: prospect.type,
          note: "Prospect created manually from dashboard",
        } as Prisma.InputJsonObject,
        createdAt: prospect.createdAt,
      },
    });

    return prospect;
  });

  return created;
}
