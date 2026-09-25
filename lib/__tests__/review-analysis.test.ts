import { describe, expect, it } from "vitest";
import { analyzeReviews, buildCommercialSignals } from "@/lib/review-analysis";

describe("review analysis", () => {
  it("separa fortalezas y debilidades a partir de reseñas visibles", () => {
    const result = analyzeReviews([
      { rating: 5, text: "" },
      { rating: 5, text: "Muy buena atención, personal profesional y buenos precios." },
      { rating: 2, text: "Mala atención y no había stock de mi talla." },
    ]);

    expect(result.sampleSize).toBe(2);
    expect(result.strengths).toEqual(expect.arrayContaining(["Atención y trato", "Asesoría y profesionalismo", "Precio y promociones"]));
    expect(result.weaknesses).toEqual(expect.arrayContaining(["Atención o trato mejorable", "Stock o tallas"]));
    expect(result.responseStatus).toBe("no_disponible");
  });

  it("genera señales comerciales sin aprobar ni enviar contacto", () => {
    const result = buildCommercialSignals({
      type: "tienda de deportes",
      rating: "4.4",
      userRatingCount: 80,
      website: "https://example.com",
      opportunity: "Captación local",
      recommendedSite: "Landing local",
      reviewAnalysis: analyzeReviews([{ rating: 2, text: "Muy caro y tardaron mucho." }]),
    });

    expect(result.recommendedOffer).toContain("reputación");
    expect(result.nextAction).toContain("aprobar");
    expect(result.evidence.reviewAnalysis).toBeTruthy();
  });
});
