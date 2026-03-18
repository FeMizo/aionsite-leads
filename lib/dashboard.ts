import { getPrismaClient } from "@/lib/db";
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
  status: string;
  source: string;
  createdAt: Date;
  lastCheckedAt: Date;
  businessStatus: string;
  lastError: string;
  lastMessageId: string;
}): DashboardProspect {
  return {
    ...prospect,
    createdAt: prospect.createdAt.toISOString(),
    lastCheckedAt: prospect.lastCheckedAt.toISOString(),
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
    contactedCount,
    failedCount,
    runsCount,
    activeRun,
    lastRun,
    lastSend,
  ] = await Promise.all([
    prisma.prospect.findMany({
      where: { status: "generated" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.prospect.findMany({
      where: { status: { in: ["prospect", "failed"] } },
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
    prisma.prospect.count({ where: { status: "generated" } }),
    prisma.prospect.count({ where: { status: "prospect" } }),
    prisma.prospect.count({
      where: { status: { in: ["contacted", "replied", "closed"] } },
    }),
    prisma.prospect.count({ where: { status: "failed" } }),
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
      contacted: contactedCount,
      failed: failedCount,
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
