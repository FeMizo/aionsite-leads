import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeWeekly() {
  console.log("📋 Análisis Semanal: AionSite Leads\n");

  // Get latest runs from this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentRuns = await prisma.run.findMany({
    where: {
      createdAt: {
        gte: weekAgo,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log("🔍 BÚSQUEDAS RECIENTES (últimos 7 días):");
  console.log(`Total de runs: ${recentRuns.length}`);

  if (recentRuns.length > 0) {
    const totalSearches = recentRuns.reduce((sum, r) => sum + r.searchesCount, 0);
    const totalPlacesFound = recentRuns.reduce((sum, r) => sum + r.placesFound, 0);
    const totalDuplicates = recentRuns.reduce((sum, r) => sum + r.duplicatesFiltered, 0);
    const totalProspects = recentRuns.reduce((sum, r) => sum + r.prospectsSaved, 0);

    console.log(`  - Total searches: ${totalSearches}`);
    console.log(`  - Total places found: ${totalPlacesFound}`);
    console.log(`  - Total duplicates filtered: ${totalDuplicates}`);
    console.log(`  - Total prospects saved: ${totalProspects}`);

    console.log("\nÚltimos 3 runs:");
    recentRuns.slice(0, 3).forEach((run) => {
      console.log(`  [${run.createdAt.toISOString()}] ${run.source}: ${run.prospectsSaved} prospects saved`);
    });
  }

  // Analyze status distribution
  console.log("\n📊 DISTRIBUCIÓN POR ESTADO:");
  const statusCounts = await prisma.prospect.groupBy({
    by: ["status"],
    _count: true,
  });

  for (const status of statusCounts) {
    console.log(`  - ${status.status}: ${status._count}`);
  }

  // Analyze by city
  console.log("\n🏙️ DISTRIBUCIÓN POR CIUDAD:");
  const cityCounts = await prisma.prospect.groupBy({
    by: ["city"],
    _count: true,
    orderBy: {
      _count: {
        _all: "desc",
      },
    },
  });

  cityCounts.slice(0, 10).forEach((city) => {
    console.log(`  - ${city.city}: ${city._count}`);
  });

  // Analyze by type
  console.log("\n💼 DISTRIBUCIÓN POR NICHO (top 10):");
  const typeCounts = await prisma.prospect.groupBy({
    by: ["type"],
    _count: true,
    orderBy: {
      _count: {
        _all: "desc",
      },
    },
  });

  typeCounts.slice(0, 10).forEach((type) => {
    console.log(`  - ${type.type}: ${type._count}`);
  });

  // Analyze closed prospects by city and type
  console.log("\n⚠️ ANÁLISIS DE PROSPECTS CERRADOS (últimos 30 días):");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const closedProspects = await prisma.prospect.findMany({
    where: {
      status: "closed",
      lastCheckedAt: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      type,
      city,
      createdAt: true,
    },
  });

  console.log(`Total closed: ${closedProspects.length} prospects`);

  // Analyze by type
  const closedByType: Record<string, number> = {};
  const closedByCity: Record<string, number> = {};

  for (const prospect of closedProspects) {
    closedByType[prospect.type] = (closedByType[prospect.type] || 0) + 1;
    closedByCity[prospect.city] = (closedByCity[prospect.city] || 0) + 1;
  }

  console.log("\n  Closed by Type:");
  const sortedTypes = Object.entries(closedByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  for (const [type, count] of sortedTypes) {
    // Total of that type
    const totalOfType = typeCounts.find((t) => t.type === type)?._count || 0;
    const closureRate = ((count / totalOfType) * 100).toFixed(1);
    console.log(`    - ${type}: ${count} closed (${closureRate}% closure rate)`);
  }

  console.log("\n  Closed by City:");
  const sortedCities = Object.entries(closedByCity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  for (const [city, count] of sortedCities) {
    const totalOfCity = cityCounts.find((c) => c.city === city)?._count || 0;
    const closureRate = ((count / totalOfCity) * 100).toFixed(1);
    console.log(`    - ${city}: ${count} closed (${closureRate}% closure rate)`);
  }

  // Analyze reply rate
  console.log("\n💬 TASA DE RESPUESTA:");
  const contacted = await prisma.prospect.count({
    where: {
      status: "contacted",
    },
  });

  const replied = await prisma.prospect.count({
    where: {
      status: "replied",
    },
  });

  const replyRate = contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : "0";
  console.log(`  - Contacted: ${contacted}`);
  console.log(`  - Replied: ${replied}`);
  console.log(`  - Reply Rate: ${replyRate}%`);

  // Check for high-quality signals
  console.log("\n⭐ SEÑALES DE CALIDAD:");
  const highScoreProspects = await prisma.prospect.findMany({
    where: {
      status: "generated",
    },
    select: {
      id: true,
      name: true,
      rating: true,
      hasRecentPhotos: true,
      businessStatus: true,
      isMobileFriendly: true,
    },
    take: 100,
  });

  let recentPhotosCount = 0;
  let operationalCount = 0;
  let mobileFriendlyCount = 0;
  let highRatingCount = 0;

  for (const prospect of highScoreProspects) {
    if (prospect.hasRecentPhotos) recentPhotosCount++;
    if (prospect.businessStatus === "OPERATIONAL") operationalCount++;
    if (prospect.isMobileFriendly) mobileFriendlyCount++;
    if (prospect.rating && parseFloat(prospect.rating) >= 4.5) highRatingCount++;
  }

  console.log(`  - Prospects with recent photos: ${recentPhotosCount}/${highScoreProspects.length}`);
  console.log(`  - Operational businesses: ${operationalCount}/${highScoreProspects.length}`);
  console.log(`  - Mobile-friendly: ${mobileFriendlyCount}/${highScoreProspects.length}`);
  console.log(`  - High rating (4.5+): ${highRatingCount}/${highScoreProspects.length}`);

  await prisma.$disconnect();
}

analyzeWeekly().catch(console.error);
