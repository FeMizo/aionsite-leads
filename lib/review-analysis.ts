export type ReviewInput = {
  rating?: number;
  text?: string;
  originalText?: string;
  publishTime?: string;
  relativePublishTimeDescription?: string;
  googleMapsUri?: string;
};

export type ReviewAnalysis = {
  sampleSize: number;
  averageRating: number | null;
  strengths: string[];
  weaknesses: string[];
  evidence: Array<{ type: "fortaleza" | "debilidad"; text: string; rating: number | null; sourceUrl: string }>;
  responseStatus: "no_disponible";
  responseNote: string;
};

const STRENGTH_SIGNALS: Array<[string, RegExp]> = [
  ["Atención y trato", /\b(atenci[oó]n|trato|amable|amabilidad|cercan[oa]|simp[aá]tic[oa]|servicio)\b/i],
  ["Asesoría y profesionalismo", /\b(asesoramiento|asesor[ií]a|profesional|experiencia|consejo|recomendaci[oó]n)\b/i],
  ["Calidad", /\b(calidad|buena calidad|excelente calidad|materiales|producto[s]? de calidad)\b/i],
  ["Precio y promociones", /\b(precio[s]?|barato|econ[oó]mic[oa]|oferta[s]?|descuento[s]?|promoci[oó]n)\b/i],
  ["Variedad y disponibilidad", /\b(variedad|surtido|stock|disponibilidad|talla[s]?|marcas?)\b/i],
  ["Rapidez y logística", /\b(r[aá]pido|env[ií]o|entrega|puntual|click\s*&?\s*collect)\b/i],
];

const WEAKNESS_SIGNALS: Array<[string, RegExp]> = [
  ["Atención o trato mejorable", /\b(mal trato|mala atenci[oó]n|desagradable|groser[oa]|poco amable|no atienden)\b/i],
  ["Precios o relación calidad-precio", /\b(caro|caros|precios? altos?|demasiado caro|engaño|estafa)\b/i],
  ["Esperas o lentitud", /\b(espera|tardaron|lento|demora|tarde|cola|retraso)\b/i],
  ["Stock o tallas", /\b(sin stock|stock|agotado|no hay talla|talla[s]?|faltan tallas|no disponible)\b/i],
  ["Cambios, devoluciones o garantía", /\b(devoluci[oó]n|cambio[s]?|garant[ií]a|reclamaci[oó]n|reclamo)\b/i],
  ["Información o comunicación", /\b(no responden|no contestan|no llaman|informaci[oó]n incorrecta|cerrado)\b/i],
];

function cleanReviewText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(value: string) {
  const text = cleanReviewText(value);
  return text.length > 240 ? `${text.slice(0, 237).trim()}...` : text;
}

export function analyzeReviews(reviews: ReviewInput[] = []): ReviewAnalysis {
  const normalized = reviews
    .map((review) => ({ ...review, text: cleanReviewText(review.text || review.originalText || "") }))
    .filter((review) => review.text);
  const strengths = new Set<string>();
  const weaknesses = new Set<string>();
  const evidence: ReviewAnalysis["evidence"] = [];

  for (const review of normalized) {
    const matchedStrengths = STRENGTH_SIGNALS.filter(([, signal]) => signal.test(review.text)).map(([label]) => label);
    const matchedWeaknesses = WEAKNESS_SIGNALS.filter(([, signal]) => signal.test(review.text)).map(([label]) => label);
    matchedStrengths.forEach((label) => strengths.add(label));
    matchedWeaknesses.forEach((label) => weaknesses.add(label));
    const type = matchedWeaknesses.length ? "debilidad" : matchedStrengths.length ? "fortaleza" : null;
    if (type) evidence.push({ type, text: excerpt(review.text), rating: typeof review.rating === "number" ? review.rating : null, sourceUrl: review.googleMapsUri || "" });
  }

  const ratings = normalized.map((review) => review.rating).filter((rating): rating is number => typeof rating === "number" && rating >= 1 && rating <= 5);
  return {
    sampleSize: normalized.length,
    averageRating: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : null,
    strengths: [...strengths],
    weaknesses: [...weaknesses],
    evidence: evidence.slice(0, 12),
    responseStatus: "no_disponible",
    responseNote: "Google Places API entrega reseñas de usuarios, pero no confirma respuestas del propietario; requiere verificación manual en Google Maps.",
  };
}

export function buildCommercialSignals(input: {
  type: string;
  rating: string;
  userRatingCount?: number | null;
  website: string;
  reviewAnalysis?: ReviewAnalysis | null;
  opportunity: string;
  recommendedSite: string;
}) {
  const analysis = input.reviewAnalysis;
  const weakness = analysis?.weaknesses[0] || "No se detectaron quejas recurrentes en la muestra disponible";
  const strength = analysis?.strengths[0] || "La muestra de reseñas es insuficiente para confirmar una fortaleza recurrente";
  const offer = input.website
    ? analysis?.weaknesses.length
      ? "Mejora de conversión y reputación digital"
      : "Optimización de presencia local y captación"
    : "Sitio web local orientado a captación";
  return {
    segmentIdeal: `${input.type || "Negocio local"} con ${input.userRatingCount ?? 0} reseñas públicas y oportunidad de captación local`,
    painPoint: weakness,
    recommendedOffer: offer,
    nextAction: "Validar manualmente la evidencia y aprobar el primer contacto; revisar respuestas del propietario en Google Maps.",
    evidence: {
      source: "Google Places API",
      verifiedAt: new Date().toISOString(),
      rating: input.rating || null,
      userRatingCount: input.userRatingCount ?? null,
      reviewAnalysis: analysis || null,
      strengths: analysis?.strengths || [strength],
      weaknesses: analysis?.weaknesses || [weakness],
      opportunity: input.opportunity,
      recommendedSite: input.recommendedSite,
    },
  };
}
