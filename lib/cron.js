import cron from 'node-cron';
import { getDatabase } from './mongodb.js';
import { LoungeApi } from './loungeApi.js';

// Refresh leaderboard every hour
export function startLeaderboardSync() {
  console.log('🚀 Starting leaderboard sync cron job...');
  
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔄 Syncing leaderboard data...');
      
      const loungeApi = new LoungeApi();
      const players = await loungeApi.getPlayers();
      
      const sortedPlayers = players
        .sort((a, b) => (b.mmr || 0) - (a.mmr || 0))
        .slice(0, 100)
        .map((p, index) => ({
          id: p.mkcId || p.id,
          name: p.name,
          mmr: p.mmr || 0,
          wins: p.wins || 0,
          losses: p.losses || 0,
          totalRaces: (p.wins || 0) + (p.losses || 0),
          rank: index + 1
        }));
      
      const db = await getDatabase();
      await db.collection('leaderboard_cache').updateOne(
        { type: 'global' },
        { 
          $set: { 
            data: sortedPlayers, 
            lastUpdate: new Date(),
            type: 'global'
          } 
        },
        { upsert: true }
      );
      
      console.log(`✅ Leaderboard synced: ${sortedPlayers.length} players`);
    } catch (error) {
      console.error('❌ Leaderboard sync error:', error);
    }
  });
  
  console.log('✅ Leaderboard sync cron job started (every hour)');
}

// Refresh MKCentral registry cache nightly at 02:00
export function startMkCentralCacheRefresh() {
  console.log('🚀 Starting MKCentral registry cache refresh cron job...');

  // At 02:00 every day
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🔄 Refreshing MKCentral registry cache...');
      const db = await getDatabase();
      const mk = new (await import('./mkcentral.js')).MkCentralApi();
      // Respect concurrency and limit environment variables if provided
      const limit = parseInt(process.env.MKC_CACHE_LIMIT || '500', 10);
      const concurrency = parseInt(process.env.MKC_CACHE_CONCURRENCY || '5', 10);
      const results = await mk.refreshCache(db, { staleAfterHours: 24, limit, concurrency });

      // Log the run
      const summary = {
        runAt: new Date(),
        entriesProcessed: results.length,
        successes: results.filter(r => r.success).length,
        failures: results.filter(r => !r.success).length,
        sampleFailure: results.find(r => !r.success) || null
      };
      await db.collection('mkcentral_refresh_logs').insertOne(summary);

      console.log(`✅ MKCentral cache refresh completed: ${results.length} entries processed`);
    } catch (error) {
      console.error('❌ MKCentral cache refresh error:', error);
    }
  });

  console.log('✅ MKCentral cache refresh cron job scheduled (daily 02:00)');
}

// Start the cron jobs automatically in production
if (process.env.NODE_ENV === 'production') {
  startLeaderboardSync();
  startMkCentralCacheRefresh();
}
