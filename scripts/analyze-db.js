const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_GD4BMTbawi1Q@ep-noisy-dust-an42qcel-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
});

async function analyze() {
  try {
    console.log('📋 ANÁLISIS SEMANAL: AionSite Leads\n');

    // 1. Latest runs
    console.log('🔍 BÚSQUEDAS RECIENTES (últimos 7 días):');
    const runsResult = await pool.query(`
      SELECT
        id,
        source,
        "searchesCount",
        "placesFound",
        "duplicatesFiltered",
        "prospectsSaved",
        status,
        "createdAt"
      FROM "Run"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    console.log(`Total runs: ${runsResult.rows.length}`);
    if (runsResult.rows.length > 0) {
      const totalSearches = runsResult.rows.reduce((sum, r) => sum + r.searchesCount, 0);
      const totalPlaces = runsResult.rows.reduce((sum, r) => sum + r.placesFound, 0);
      const totalDupes = runsResult.rows.reduce((sum, r) => sum + r.duplicatesFiltered, 0);
      const totalProspects = runsResult.rows.reduce((sum, r) => sum + r.prospectsSaved, 0);

      console.log(`  - Total searches: ${totalSearches}`);
      console.log(`  - Total places found: ${totalPlaces}`);
      console.log(`  - Total duplicates: ${totalDupes}`);
      console.log(`  - Total prospects saved: ${totalProspects}`);

      console.log('\n  Últimos 3 runs:');
      runsResult.rows.slice(0, 3).forEach(run => {
        console.log(`    [${run.createdAt.toISOString().split('T')[0]}] ${run.source}: ${run.prospectsSaved} prospects (status: ${run.status})`);
      });
    }

    // 2. Status distribution
    console.log('\n📊 DISTRIBUCIÓN POR ESTADO:');
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM "Prospect"
      GROUP BY status
      ORDER BY count DESC
    `);

    for (const row of statusResult.rows) {
      console.log(`  - ${row.status}: ${row.count}`);
    }

    // 3. Closed prospects analysis
    console.log('\n⚠️ ANÁLISIS DE PROSPECTS CERRADOS (últimos 30 días):');
    const closedByTypeResult = await pool.query(`
      SELECT
        p1."type",
        COUNT(*) as closed_count,
        (SELECT COUNT(*) FROM "Prospect" p2 WHERE p2."type" = p1."type") as total_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Prospect" p2 WHERE p2."type" = p1."type"), 1) as closure_rate
      FROM "Prospect" p1
      WHERE p1.status = 'closed'
        AND p1."lastCheckedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY p1."type"
      ORDER BY closed_count DESC
      LIMIT 15
    `);

    console.log('\n  Closed by Type (top 10):');
    for (const row of closedByTypeResult.rows) {
      if (row.closure_rate > 25) {
        console.log(`    ⚠️  ${row.type}: ${row.closed_count}/${row.total_count} closed (${row.closure_rate}% closure rate)`);
      } else {
        console.log(`    ✓ ${row.type}: ${row.closed_count}/${row.total_count} closed (${row.closure_rate}% closure rate)`);
      }
    }

    const closedByCityResult = await pool.query(`
      SELECT
        p1."city",
        COUNT(*) as closed_count,
        (SELECT COUNT(*) FROM "Prospect" p2 WHERE p2."city" = p1."city") as total_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Prospect" p2 WHERE p2."city" = p1."city"), 1) as closure_rate
      FROM "Prospect" p1
      WHERE p1.status = 'closed'
        AND p1."lastCheckedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY p1."city"
      ORDER BY closed_count DESC
      LIMIT 15
    `);

    console.log('\n  Closed by City (top 10):');
    for (const row of closedByCityResult.rows) {
      if (row.closure_rate > 25) {
        console.log(`    ⚠️  ${row.city}: ${row.closed_count}/${row.total_count} closed (${row.closure_rate}% closure rate)`);
      } else {
        console.log(`    ✓ ${row.city}: ${row.closed_count}/${row.total_count} closed (${row.closure_rate}% closure rate)`);
      }
    }

    // 4. Quality by niche
    console.log('\n⭐ CALIDAD POR NICHO (prospects generados):');
    const qualityResult = await pool.query(`
      SELECT
        "type",
        COUNT(*) as total,
        ROUND(AVG(CAST("rating" as FLOAT)), 2) as avg_rating,
        ROUND(AVG("userRatingCount"), 0) as avg_reviews,
        COUNT(CASE WHEN "hasRecentPhotos" = true THEN 1 END) as with_photos,
        COUNT(CASE WHEN "isMobileFriendly" = true THEN 1 END) as mobile_friendly,
        COUNT(CASE WHEN "businessStatus" = 'OPERATIONAL' THEN 1 END) as operational
      FROM "Prospect"
      WHERE status = 'generated'
      GROUP BY "type"
      ORDER BY total DESC
      LIMIT 15
    `);

    for (const row of qualityResult.rows) {
      const photoRate = ((row.with_photos / row.total) * 100).toFixed(0);
      const mobileRate = ((row.mobile_friendly / row.total) * 100).toFixed(0);
      console.log(`  - ${row.type}: ${row.total} total | avg rating: ${row.avg_rating} | reviews: ${row.avg_reviews} | photos: ${photoRate}% | mobile: ${mobileRate}%`);
    }

    // 5. Reply rate
    console.log('\n💬 TASA DE RESPUESTA:');
    const contactedResult = await pool.query('SELECT COUNT(*) as count FROM "Prospect" WHERE status = \'contacted\'');
    const repliedResult = await pool.query('SELECT COUNT(*) as count FROM "Prospect" WHERE status = \'replied\'');

    const contacted = parseInt(contactedResult.rows[0].count);
    const replied = parseInt(repliedResult.rows[0].count);
    const replyRate = contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : '0';

    console.log(`  - Contacted: ${contacted}`);
    console.log(`  - Replied: ${replied}`);
    console.log(`  - Reply Rate: ${replyRate}%`);

    // 6. City distribution
    console.log('\n🏙️ DISTRIBUCIÓN POR CIUDAD:');
    const cityResult = await pool.query(`
      SELECT city, COUNT(*) as count
      FROM "Prospect"
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `);

    for (const row of cityResult.rows) {
      console.log(`  - ${row.city}: ${row.count}`);
    }

    console.log('\n✅ Análisis completado');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyze();
