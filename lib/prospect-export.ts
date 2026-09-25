import ExcelJS from "exceljs";
import { getPrismaClient } from "@/lib/db";
import { getProspectScoreBreakdown, getPriority } from "@/lib/prospect-scoring";

type Evidence = {
  reviewAnalysis?: {
    strengths?: string[];
    weaknesses?: string[];
    responseStatus?: string;
    responseNote?: string;
    sampleSize?: number;
  } | null;
  strengths?: string[];
  weaknesses?: string[];
};

function asEvidence(value: unknown): Evidence {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Evidence : {};
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("; ") : "No disponible";
}

export async function exportProspectsWorkbook() {
  const prisma = getPrismaClient();
  const prospects = await prisma.prospect.findMany({ orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }] });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AionSite CRM";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Prospectos", { views: [{ state: "frozen", ySplit: 1 }] });
  const columns = [
    ["Nombre", "name", 28], ["Dirección", "formattedAddress", 34], ["Ciudad", "city", 16],
    ["Puntuación Google", "rating", 16], ["Reseñas Google", "userRatingCount", 15], ["Teléfono", "phone", 18],
    ["Correo", "email", 28], ["WhatsApp", "whatsapp", 24], ["Instagram", "instagram", 28], ["Web oficial", "website", 34], ["Google Maps", "mapsUrl", 34], ["Tipo", "type", 24],
    ["Público objetivo aparente", "segmentIdeal", 42], ["Fortalezas según reseñas", "strengths", 48],
    ["Debilidades o quejas frecuentes", "weaknesses", 48], ["Presencia digital", "digitalPresence", 18],
    ["Responde a reseñas", "reviewResponse", 32], ["Muestra analizada", "reviewSample", 16],
    ["Ajuste", "fitScore", 10], ["Urgencia", "urgencyScore", 10], ["Contactabilidad", "contactabilityScore", 16],
    ["Actividad", "activityScore", 10], ["Prioridad", "priority", 12], ["Dolor principal", "painPoint", 42],
    ["Oferta recomendada", "recommendedOffer", 34], ["Siguiente acción", "nextAction", 54], ["Fuente", "source", 18],
    ["Fecha de investigación", "lastCheckedAt", 22],
  ] as const;
  sheet.columns = columns.map(([header, key, width]) => ({ header, key, width }));

  for (const prospect of prospects) {
    const evidence = asEvidence(prospect.evidence);
    const review = evidence.reviewAnalysis || {};
    const strengths = review.strengths?.length ? review.strengths : evidence.strengths;
    const weaknesses = review.weaknesses?.length ? review.weaknesses : evidence.weaknesses;
    const score = getProspectScoreBreakdown(prospect);
    const website = prospect.website || "";
    const websiteHost = (() => { try { return new URL(website).hostname.toLowerCase(); } catch { return ""; } })();
    const instagram = websiteHost === "instagram.com" || websiteHost.endsWith(".instagram.com") ? website : "";
    sheet.addRow({
      name: prospect.name,
      formattedAddress: prospect.formattedAddress || "No disponible",
      city: prospect.city,
      rating: prospect.rating || "No disponible",
      userRatingCount: prospect.userRatingCount ?? "No disponible",
      phone: prospect.phone || "No disponible",
      email: prospect.email || "No disponible",
      whatsapp: prospect.hasWhatsappCta ? "Enlace detectado en el sitio" : "No disponible o no verificado",
      instagram: instagram || "No disponible",
      website: website || "No disponible",
      mapsUrl: prospect.mapsUrl || "No disponible",
      type: prospect.type || prospect.primaryType || "No disponible",
      segmentIdeal: prospect.segmentIdeal || "No disponible",
      strengths: textList(strengths),
      weaknesses: textList(weaknesses),
      digitalPresence: website ? (prospect.hasWhatsappCta || prospect.hasContactCta ? "Fuerte" : "Media") : "Baja",
      reviewResponse: review.responseStatus === "no_disponible"
        ? "No disponible vía Google Places; verificar manualmente en Maps"
        : "No disponible",
      reviewSample: review.sampleSize ?? 0,
      fitScore: score.fit,
      urgencyScore: score.urgency,
      contactabilityScore: score.contactability,
      activityScore: score.activity,
      priority: getPriority(score.total),
      painPoint: prospect.painPoint || "No disponible",
      recommendedOffer: prospect.recommendedOffer || "No disponible",
      nextAction: prospect.nextAction || "Aprobación humana pendiente",
      source: prospect.source,
      lastCheckedAt: prospect.lastCheckedAt.toISOString(),
    });
  }

  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + columns.length)}${Math.max(sheet.rowCount, 1)}` };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B5D" } };
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "top", wrapText: rowNumber === 1 ? false : true };
  });

  const notes = workbook.addWorksheet("Fuentes y control");
  notes.columns = [{ header: "Campo", key: "field", width: 28 }, { header: "Nota", key: "note", width: 110 }];
  notes.addRows([
    { field: "Cobertura", note: "Prospectos guardados por la búsqueda automática configurada en Google Places." },
    { field: "Reseñas", note: "Se analizan hasta cinco reseñas devueltas por Google Places; fortalezas y debilidades son señales por palabras y requieren revisión humana." },
    { field: "Respuestas del propietario", note: "Google Places no confirma respuestas del propietario. La exportación marca este campo para verificación manual en Google Maps." },
    { field: "Aprobación", note: "La búsqueda, clasificación y exportación no envían mensajes. El primer contacto requiere aprobación humana." },
    { field: "Scoring", note: "Ajuste, urgencia, contactabilidad y actividad se mantienen separados para priorizar sin ocultar el motivo." },
  ]);
  notes.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  notes.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B5D" } };
  notes.eachRow((row, rowNumber) => { row.alignment = { vertical: "top", wrapText: rowNumber > 1 }; });
  return workbook.xlsx.writeBuffer();
}
