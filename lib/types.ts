import type { ProspectPriority } from "@/lib/prospect-scoring";

export type ProspectAction =
  | "approveGenerated"
  | "approveAllGenerated"
  | "rejectRecords"
  | "markContacted"
  | "markAsClient";

export type ProspectCandidate = {
  id?: string;
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
  subject?: string;
  message?: string;
  contacted?: boolean;
  lastContactedAt?: string | null;
  followupCount?: number;
  followupStage?: number;
  status: string;
  source: string;
  createdAt: string;
  lastCheckedAt: string;
  businessStatus: string;
  score?: number;
  priority?: ProspectPriority;
  placeId?: string;
  formattedAddress?: string;
  primaryType?: string;
};

export type ComparableProspect = Pick<
  ProspectCandidate,
  "name" | "email" | "phone"
>;

export type SearchSpec = {
  id: string;
  city: string;
  label: string;
  textQuery: string;
  typeLabel: string;
  includedType: string;
  pageSize?: number;
};

export type DashboardProspect = {
  id: string;
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
  subject: string;
  message: string;
  contacted: boolean;
  lastContactedAt: string | null;
  followupCount: number;
  followupStage: number;
  status: string;
  source: string;
  createdAt: string;
  lastCheckedAt: string;
  businessStatus: string;
  lastError: string;
  lastMessageId: string;
  score: number;
  priority: ProspectPriority;
};

export type DashboardRun = {
  id: string;
  source: string;
  searchesCount: number;
  placesFound: number;
  duplicatesFiltered: number;
  emailsFound: number;
  prospectsSaved: number;
  googlePlacesRequests: number;
  websiteFetches: number;
  status: string;
  error: string | null;
  createdAt: string;
};

export type DashboardActivityItem = {
  at: string;
  status?: string;
  source?: string;
  prospectName?: string;
  email?: string;
};

export type DashboardData = {
  metrics: {
    generated: number;
    prospects: number;
    ready: number;
    contacted: number;
    rejected: number;
    runs: number;
  };
  crawlInProgress: boolean;
  activeRun: DashboardRun | null;
  lastCrawl: DashboardActivityItem | null;
  lastSend: DashboardActivityItem | null;
  generated: DashboardProspect[];
  prospects: DashboardProspect[];
  contacted: DashboardProspect[];
  runs: DashboardRun[];
};
