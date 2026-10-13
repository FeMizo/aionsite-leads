import { getPrismaClient } from "@/lib/db";
import { getNextProspectingCrawlAt } from "@/lib/automation";
import { getProspectScoreBreakdown, getProspectScoreCard } from "@/lib/prospect-scoring";
import type { Prisma, ProspectStatus } from "@/generated/prisma";
import type {
  DashboardActivityItem,
  DashboardData,
  DashboardProspect,
  DashboardRun,
} from "@/lib/types";

type DashboardProspectRecord = Pick<
  Prisma.ProspectGetPayload<{}>,
  | "id"
  | "name"
  | "contactName"
  | "city"
  | "languageCode"
  | "email"
  | "phone"
  | "type"
  | "website"
  | "rating"
  | "mapsUrl"
  | "opportunity"
  | "recommendedSite"
  | "pitchAngle"
  | "userRatingCount"
  | "websiteFetchFailed"
  | "websiteLoadTimeMs"
  | "hasWhatsappCta"
  | "hasContactCta"
  | "isMobileFriendly"
  | "subject"
  | "message"
  | "contacted"
  | "hotLead"
  | "scheduledSendAt"
  | "lastContactedAt"
  | "followupCount"
  | "followupStage"
  | "status"
  | "source"
  | "createdAt"
  | "lastCheckedAt"
  | "businessStatus"
  | "primaryType"
  | "updatedAt"
>;

const DASHBOARD_PROSPECT_SELECT = {
  id: true,
  name: true,
  contactName: true,
  city: true,
  languageCode: true,
  email: true,
  phone: true,
  type: true,
  website: true,
  rating: true,
  mapsUrl: true,
  opportunity: true,
  recommendedSite: true,
  pitchAngle: true,
  userRatingCount: true,
  websiteFetchFailed: true,
  websiteLoadTimeMs: true,
  hasWhatsappCta: true,
  hasContactCta: true,
  isMobileFriendly: true,
  subject: true,
  message: true,
  contacted: true,
  hotLead: true,
  scheduledSendAt: true,
  lastContactedAt: true,
  followupCount: true,
  followupStage: true,
  status: true,
  source: true,
  createdAt: true,
  lastCheckedAt: true,
  businessStatus: true,
  primaryType: true,
  updatedAt: true,
} satisfies Prisma.ProspectSelect;

function serializeProspect(prospect: DashboardProspectRecord): DashboardProspect {
  const scoring = getProspectScoreCard(prospect);
  const scoreBreakdown = getProspectScoreBreakdown(prospect);

  return {
    id: prospect.id,
    name: prospect.name,
    contactName: prospect.contactName,
    city: prospect.city,
    languageCode: prospect.languageCode,
    email: prospect.email,
    phone: prospect.phone,
    type: prospect.type,
    website: prospect.website,
    rating: prospect.rating,
    mapsUrl: prospect.mapsUrl,
    opportunity: prospect.opportunity,
    recommendedSite: prospect.recommendedSite,
    pitchAngle: prospect.pitchAngle,
    segmentIdeal: "",
    painPoint: "",
    evidence: null,
    recommendedOffer: "",
    nextAction: "",
    owner: "",
    nextFollowupAt: null,
    promptVersion: "",
    responseCategory: "",
    meetingAt: null,
    proposalAt: null,
    closedAt: null,
    revenue: null,
    subject: prospect.subject,
    message: prospect.message,
    contacted: prospect.contacted,
    hotLead: prospect.hotLead,
    followupCount: prospect.followupCount,
    followupStage: prospect.followupStage,
    status: prospect.status,
    source: prospect.source,
    businessStatus: prospect.businessStatus,
    primaryType: prospect.primaryType,
    userRatingCount: prospect.userRatingCount,
    lastError: "",
    lastMessageId: "",
    updatedAt: prospect.updatedAt.toISOString(),
    scheduledSendAt: prospect.scheduledSendAt
      ? prospect.scheduledSendAt.toISOString()
      : null,
    lastContactedAt: prospect.lastContactedAt
      ? prospect.lastContactedAt.toISOString()
      : null,
    createdAt: prospect.createdAt.toISOString(),
    lastCheckedAt: prospect.lastCheckedAt.toISOString(),
    score: scoring.score,
    priority: scoring.priority,
    scoreBreakdown,
  };
}

function serializeRun(run: {
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
  createdAt: Date;
}): DashboardRun {
  return {
    ...run,
    createdAt: run.createdAt.toISOString(),
  };
}

function serializeActivityItem(item: {
  createdAt: Date;
  status?: string;
  source?: string;
  prospect?: {
    name: string;
    email: string;
  };
}): DashboardActivityItem {
  return {
    at: item.createdAt.toISOString(),
    status: item.status,
    source: item.source,
    prospectName: item.prospect?.name || "",
    email: item.prospect?.email || "",
  };
}

export async function getPaginatedProspects(options: {
  statuses: string[];
  page: number;
  pageSize: number;
  orderBy?: "createdAt" | "lastCheckedAt" | "lastContactedAt";
}): Promise<{ items: DashboardProspect[]; totalCount: number }> {
  const prisma = getPrismaClient();
  const { statuses, page, pageSize, orderBy = "createdAt" } = options;
  const skip = (page - 1) * pageSize;

  const statusFilter = statuses as ProspectStatus[];

  const [items, totalCount] = await Promise.all([
    prisma.prospect.findMany({
      where: { status: { in: statusFilter } },
      select: DASHBOARD_PROSPECT_SELECT,
      orderBy: { [orderBy]: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.prospect.count({ where: { status: { in: statusFilter } } }),
  ]);

  return { items: items.map(serializeProspect), totalCount };
}

export async function getProspectsByStatuses(options: {
  statuses: string[];
  orderBy?: "createdAt" | "lastCheckedAt" | "lastContactedAt";
  scheduledOnly?: boolean;
  unscheduledOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ items: DashboardProspect[]; totalCount: number }> {
  const prisma = getPrismaClient();
  const {
    statuses,
    orderBy = "createdAt",
    scheduledOnly = false,
    unscheduledOnly = false,
    page,
    pageSize,
  } = options;
  const statusFilter = statuses as ProspectStatus[];
  const where = {
    status: { in: statusFilter },
    ...(scheduledOnly ? { scheduledSendAt: { gt: new Date() } } : {}),
    ...(unscheduledOnly ? { scheduledSendAt: null } : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.prospect.findMany({
      where,
      select: DASHBOARD_PROSPECT_SELECT,
      orderBy: { [orderBy]: "desc" },
      ...(page && pageSize
        ? {
            skip: Math.max(0, (page - 1) * pageSize),
            take: pageSize,
          }
        : {}),
    }),
    prisma.prospect.count({ where }),
  ]);

  return { items: items.map(serializeProspect), totalCount };
}

export async function getAllDashboardProspects(): Promise<DashboardProspect[]> {
  const result = await getProspectsByStatuses({
    statuses: ["generated", "analyzed", "approved", "ready", "contacted", "second_attempt", "followup", "replied", "closed", "rejected", "uncontactable"],
  });
  return result.items;
}

export async function getDashboardData(options: { includeCollections?: boolean } = {}): Promise<DashboardData> {
  const prisma = getPrismaClient();
  const includeCollections = options.includeCollections !== false;
  const emptyProspects = Promise.resolve([] as never[]);
  const emptyRuns = Promise.resolve([] as never[]);
  const nextCrawlAt = getNextProspectingCrawlAt();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const stalledBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    generated,
    prospects,
    ready,
    contacted,
    runs,
    prospectStatusGroups,
    runsCount,
    activeRun,
    lastRun,
    lastSend,
    sentTodayCount,
    readyToSendCount,
    whatsappOnlyCount,
    stalledProspectsCount,
    jobStatusGroups,
    jobsTodayCount,
    jobsStalledCount,
    jobSettings,
  ] = await Promise.all([
    includeCollections ? prisma.prospect.findMany({
      where: { status: { in: ["generated", "analyzed"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }) : emptyProspects,
    includeCollections ? prisma.prospect.findMany({
      where: { status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }) : emptyProspects,
    includeCollections ? prisma.prospect.findMany({
      where: { status: "ready" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }) : emptyProspects,
    includeCollections ? prisma.prospect.findMany({
      where: { status: { in: ["contacted", "second_attempt", "replied", "closed"] } },
      orderBy: { lastCheckedAt: "desc" },
      take: 20,
    }) : emptyProspects,
    includeCollections ? prisma.run.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }) : emptyRuns,
    prisma.prospect.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.run.count(),
    prisma.run.findFirst({
      where: { status: "running" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.run.findFirst({
      orderBy: { createdAt: "desc" },
    }),
    prisma.contactEvent.findFirst({
      where: { eventType: "send_success" },
      orderBy: { createdAt: "desc" },
      include: {
        prospect: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.contactEvent.count({
      where: { eventType: "send_success", createdAt: { gte: todayStart } },
    }),
    prisma.prospect.count({
      where: { status: "ready", scheduledSendAt: null },
    }),
    prisma.prospect.count({
      where: { phone: { not: "" }, email: "" },
    }),
    prisma.prospect.count({
      where: {
        status: { in: ["generated", "analyzed", "approved", "ready"] },
        updatedAt: { lt: stalledBefore },
      },
    }),
    prisma.job.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.job.count({ where: { addedAt: { gte: todayStart } } }),
    prisma.job.count({
      where: {
        status: { in: ["para_aplicar", "follow_up"] },
        updatedAt: { lt: stalledBefore },
      },
    }),
    prisma.jobSettings.findUnique({ where: { id: 1 } }),
  ]);

  const prospectCounts = Object.fromEntries(
    prospectStatusGroups.map((item) => [item.status, item._count._all])
  );
  const generatedCount = (prospectCounts.generated || 0) + (prospectCounts.analyzed || 0);
  const prospectsCount = prospectCounts.approved || 0;
  const readyCount = prospectCounts.ready || 0;
  const contactedCount =
    (prospectCounts.contacted || 0) +
    (prospectCounts.second_attempt || 0) +
    (prospectCounts.replied || 0) +
    (prospectCounts.closed || 0);
  const rejectedCount = prospectCounts.rejected || 0;
  const jobCounts = Object.fromEntries(
    jobStatusGroups.map((item) => [item.status, item._count._all])
  );
  const jobsCount = Object.values(jobCounts).reduce((total, count) => total + count, 0);
  const jobsParaAplicarCount = jobCounts.para_aplicar || 0;
  const jobsFollowUpCount = jobCounts.follow_up || 0;
  const jobsBlockedCount = (jobCounts.bloqueado || 0) + (jobCounts.no_disponible || 0);

  return {
    metrics: {
      generated: generatedCount,
      prospects: prospectsCount,
      ready: readyCount,
      contacted: contactedCount,
      rejected: rejectedCount,
      runs: runsCount,
      jobs: jobsCount,
    },
    prospectOperations: {
      sentToday: sentTodayCount,
      pendingApproval: prospectsCount,
      readyToSend: readyToSendCount,
      whatsappOnly: whatsappOnlyCount,
      stalled: stalledProspectsCount,
    },
    jobOperations: {
      total: jobsCount,
      newToday: jobsTodayCount,
      paraAplicar: jobsParaAplicarCount,
      followUp: jobsFollowUpCount,
      blocked: jobsBlockedCount,
      stalled: jobsStalledCount,
      lastSearchAt: jobSettings?.lastJobsSearchAt.toISOString() || null,
    },
    crawlInProgress: Boolean(activeRun),
    activeRun: activeRun ? serializeRun(activeRun) : null,
    lastCrawl: lastRun ? serializeActivityItem(lastRun) : null,
    lastSend: lastSend ? serializeActivityItem(lastSend) : null,
    nextCrawlAt,
    generated: generated.map(serializeProspect),
    prospects: prospects.map(serializeProspect),
    ready: ready.map(serializeProspect),
    contacted: contacted.map(serializeProspect),
    runs: runs.map(serializeRun),
  };
}
