export type AnalyticsProspect = {
  city: string;
  type: string;
  source: string;
  promptVersion: string;
  recommendedOffer: string;
  status: string;
  responseCategory: string;
  revenue: number | null;
};

export type CrmAnalytics = {
  totals: {
    prospects: number;
    contacted: number;
    replied: number;
    interested: number;
    meetings: number;
    proposals: number;
    closed: number;
    revenue: number;
  };
  byCity: Record<string, { prospects: number; replied: number; interested: number }>;
  byType: Record<string, { prospects: number; replied: number; interested: number }>;
  bySource: Record<string, { prospects: number; replied: number; interested: number }>;
  byPrompt: Record<string, { prospects: number; replied: number; interested: number }>;
  byOffer: Record<string, { prospects: number; replied: number; interested: number }>;
};

function emptyBucket() {
  return { prospects: 0, replied: 0, interested: 0 };
}

function addBucket(target: Record<string, ReturnType<typeof emptyBucket>>, key: string, prospect: AnalyticsProspect) {
  const bucket = target[key || "sin dato"] || (target[key || "sin dato"] = emptyBucket());
  bucket.prospects += 1;
  if (prospect.status === "replied" || prospect.responseCategory) bucket.replied += 1;
  if (prospect.responseCategory === "interesado") bucket.interested += 1;
}

export function buildCrmAnalytics(prospects: AnalyticsProspect[]): CrmAnalytics {
  const analytics: CrmAnalytics = {
    totals: { prospects: prospects.length, contacted: 0, replied: 0, interested: 0, meetings: 0, proposals: 0, closed: 0, revenue: 0 },
    byCity: {},
    byType: {},
    bySource: {},
    byPrompt: {},
    byOffer: {},
  };

  for (const prospect of prospects) {
    if (prospect.status !== "generated" && prospect.status !== "analyzed") analytics.totals.contacted += 1;
    if (prospect.status === "replied" || prospect.responseCategory) analytics.totals.replied += 1;
    if (prospect.responseCategory === "interesado") analytics.totals.interested += 1;
    if (prospect.status === "closed") analytics.totals.closed += 1;
    if (prospect.revenue) analytics.totals.revenue += prospect.revenue;
    addBucket(analytics.byCity, prospect.city, prospect);
    addBucket(analytics.byType, prospect.type, prospect);
    addBucket(analytics.bySource, prospect.source, prospect);
    addBucket(analytics.byPrompt, prospect.promptVersion, prospect);
    addBucket(analytics.byOffer, prospect.recommendedOffer, prospect);
  }

  return analytics;
}
