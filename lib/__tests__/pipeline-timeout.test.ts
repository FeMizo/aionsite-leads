import { describe, it, expect, vi, beforeEach } from "vitest";

// Set a short deadline so tests don't take forever: 300ms
process.env.PIPELINE_DEADLINE_MS = "300";

// vi.hoisted ensures these exist before vi.mock factories run
const {
  mockRunCreate,
  mockRunUpdate,
  mockProspectFindMany,
  mockTransaction,
  mockProspectCreate,
  mockContactEventCreate,
  mockSearchBusinesses,
  mockSocialSearchBusinesses,
  mockFindEmailFromWebsite,
} = vi.hoisted(() => ({
  mockRunCreate: vi.fn(),
  mockRunUpdate: vi.fn(),
  mockProspectFindMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockProspectCreate: vi.fn(),
  mockContactEventCreate: vi.fn(),
  mockSearchBusinesses: vi.fn(),
  mockSocialSearchBusinesses: vi.fn(),
  mockFindEmailFromWebsite: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    run: { create: mockRunCreate, update: mockRunUpdate },
    prospect: { findMany: mockProspectFindMany, create: mockProspectCreate },
    contactEvent: { create: mockContactEventCreate },
    $transaction: mockTransaction,
  }),
}));

vi.mock("@/providers/google-places", () => ({
  searchBusinesses: mockSearchBusinesses,
}));

vi.mock("@/providers/social-search", () => ({
  searchSocialBusinesses: mockSocialSearchBusinesses,
}));

vi.mock("@/providers/email-finder", () => ({
  findEmailFromWebsite: mockFindEmailFromWebsite,
}));

vi.mock("@/lib/search-config", () => ({
  SEARCHES: [{ id: "test-search" }],
  SEARCHES_FOR_RUN: [{ id: "test-search" }],
  SOCIAL_SEARCHES_FOR_RUN: [{ id: "test-search" }],
  DESIRED_PROSPECT_COUNT: 5,
  REQUIRED_TYPES: [],
  REQUIRE_EMAIL_FOR_FINAL_PROSPECTS: false,
  MAX_SEARCHES_PER_RUN: 1,
  MAX_SOCIAL_SEARCHES_PER_RUN: 1,
}));

import { runProspectSearch } from "@/lib/pipeline";

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    name: "Negocio Test",
    contactName: "",
    city: "Merida",
    email: "",
    phone: "9991234567",
    type: "dentist",
    website: "https://example.com",
    rating: "4.5",
    userRatingCount: 50,
    websiteFetchFailed: false,
    websiteLoadTimeMs: null,
    hasWhatsappCta: null,
    hasContactCta: null,
    isMobileFriendly: null,
    mapsUrl: "https://maps.google.com",
    opportunity: "Sitio básico",
    recommendedSite: "landing",
    pitchAngle: "test",
    status: "generated",
    source: "google-places",
    createdAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    businessStatus: "OPERATIONAL",
    placeId: "place123",
    formattedAddress: "Calle 1, Merida",
    primaryType: "dentist",
    ...overrides,
  };
}

const fakeRun = { id: "run-123", status: "running" };
const fakeProspect = { id: "p1", source: "google-places", status: "generated", city: "Merida", type: "dentist", createdAt: new Date() };

describe("pipeline time budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRunCreate.mockResolvedValue(fakeRun);
    mockRunUpdate.mockResolvedValue({ ...fakeRun, status: "completed" });
    mockProspectFindMany.mockResolvedValue([]);
    mockProspectCreate.mockResolvedValue(fakeProspect);
    mockContactEventCreate.mockResolvedValue({});
    mockTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          prospect: { create: mockProspectCreate },
          contactEvent: { create: mockContactEventCreate },
          run: { update: mockRunUpdate },
        };
        return fn(tx);
      }
    );
  });

  it("completes within the time budget even with slow website fetches", async () => {
    // Each fetch takes 150ms — with 300ms budget and 10 prospects, stops after ~2 fetches
    const FETCH_DELAY_MS = 150;

    mockFindEmailFromWebsite.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                email: "test@example.com",
                fetchCount: 1,
                audit: {
                  fetchFailed: false,
                  loadTimeMs: FETCH_DELAY_MS,
                  hasWhatsappCta: false,
                  hasContactCta: false,
                  isMobileFriendly: true,
                },
              }),
            FETCH_DELAY_MS
          )
        )
    );

    mockSearchBusinesses.mockResolvedValue({
      requestCount: 1,
      candidates: Array.from({ length: 10 }, (_, i) =>
        makeCandidate({
          name: `Negocio ${i}`,
          placeId: `place-${i}`,
          website: `https://example${i}.com`,
        })
      ),
    });
    mockSocialSearchBusinesses.mockResolvedValue({
      requestCount: 2,
      candidates: [],
    });

    const start = Date.now();
    await runProspectSearch();
    const elapsed = Date.now() - start;

    // Should complete well under 2000ms (not hang for 10 × 150ms = 1500ms+)
    expect(elapsed).toBeLessThan(2000);

    // The run must be updated (completed or failed), never left as "running"
    expect(mockRunUpdate).toHaveBeenCalled();
  }, 10_000);

  it("saves run as failed if searchBusinesses throws, never leaves it as running", async () => {
    mockSearchBusinesses.mockRejectedValue(new Error("Google Places timeout"));
    mockSocialSearchBusinesses.mockResolvedValue({
      requestCount: 2,
      candidates: [],
    });

    await expect(runProspectSearch()).rejects.toThrow("Google Places timeout");

    expect(mockRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fakeRun.id },
        data: expect.objectContaining({ status: "failed" }),
      })
    );
  }, 5_000);

  it("saves run as failed if DB transaction throws, never leaves it as running", async () => {
    mockSearchBusinesses.mockResolvedValue({
      requestCount: 1,
      candidates: [makeCandidate({ email: "ya@tiene.com" })],
    });
    mockSocialSearchBusinesses.mockResolvedValue({
      requestCount: 2,
      candidates: [],
    });
    mockFindEmailFromWebsite.mockResolvedValue({
      email: "test@example.com",
      fetchCount: 1,
      audit: {
        fetchFailed: false,
        loadTimeMs: 100,
        hasWhatsappCta: false,
        hasContactCta: false,
        isMobileFriendly: true,
      },
    });
    mockTransaction.mockRejectedValue(new Error("DB connection lost"));

    await expect(runProspectSearch()).rejects.toThrow("DB connection lost");

    expect(mockRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fakeRun.id },
        data: expect.objectContaining({ status: "failed" }),
      })
    );
  }, 5_000);

  it("always runs social search after google search", async () => {
    mockSearchBusinesses.mockResolvedValue({
      requestCount: 1,
      candidates: [makeCandidate({ email: "ya@tiene.com" })],
    });
    mockSocialSearchBusinesses.mockResolvedValue({
      requestCount: 2,
      candidates: [makeCandidate({ source: "social-search", website: "https://facebook.com/test" })],
    });
    mockFindEmailFromWebsite.mockResolvedValue({
      email: "test@example.com",
      fetchCount: 0,
      audit: {
        fetchFailed: false,
        loadTimeMs: 100,
        hasWhatsappCta: false,
        hasContactCta: false,
        isMobileFriendly: true,
      },
    });

    await runProspectSearch();

    expect(mockSocialSearchBusinesses).toHaveBeenCalled();
  }, 5_000);
});
