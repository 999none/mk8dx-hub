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

// Start the cron job automatically in production
if (process.env.NODE_ENV === 'production') {
  startLeaderboardSync();
}
