import { getPrismaClient } from "@/lib/db";
import { getProspectScoreCard } from "@/lib/prospect-scoring";
import type {
  DashboardActivityItem,
  DashboardData,
  DashboardProspect,
  DashboardRun,
} from "@/lib/types";

function serializeProspect(prospect: {
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
  scheduledSendAt: Date | null;
  lastContactedAt: Date | null;
  followupCount: number;
  followupStage: number;
  status: string;
  source: string;
  createdAt: Date;
  lastCheckedAt: Date;
  businessStatus: string;
  lastError: string;
  lastMessageId: string;
}): DashboardProspect {
  const scoring = getProspectScoreCard(prospect);

  return {
    ...prospect,
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

export async function getDashboardData(): Promise<DashboardData> {
  const prisma = getPrismaClient();
  const [
    generated,
    prospects,
    contacted,
    runs,
    generatedCount,
    prospectsCount,
    readyCount,
    contactedCount,
    rejectedCount,
    runsCount,
    activeRun,
    lastRun,
    lastSend,
  ] = await Promise.all([
    prisma.prospect.findMany({
      where: { status: { in: ["generated", "analyzed"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.prospect.findMany({
      where: { status: { in: ["approved", "ready"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.prospect.findMany({
      where: { status: { in: ["contacted", "replied", "closed"] } },
      orderBy: { lastCheckedAt: "desc" },
      take: 20,
    }),
    prisma.run.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.prospect.count({ where: { status: { in: ["generated", "analyzed"] } } }),
    prisma.prospect.count({ where: { status: { in: ["approved", "ready"] } } }),
    prisma.prospect.count({ where: { status: "ready" } }),
    prisma.prospect.count({
      where: { status: { in: ["contacted", "replied", "closed"] } },
    }),
    prisma.prospect.count({ where: { status: "rejected" } }),
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
  ]);

  return {
    metrics: {
      generated: generatedCount,
      prospects: prospectsCount,
      ready: readyCount,
      contacted: contactedCount,
      rejected: rejectedCount,
      runs: runsCount,
    },
    crawlInProgress: Boolean(activeRun),
    activeRun: activeRun ? serializeRun(activeRun) : null,
    lastCrawl: lastRun ? serializeActivityItem(lastRun) : null,
    lastSend: lastSend ? serializeActivityItem(lastSend) : null,
    generated: generated.map(serializeProspect),
    prospects: prospects.map(serializeProspect),
    contacted: contacted.map(serializeProspect),
    runs: runs.map(serializeRun),
  };
}
