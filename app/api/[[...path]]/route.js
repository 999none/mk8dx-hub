import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { LoungeApi } from '@/lib/loungeApi';
import { MkCentralApi } from '@/lib/mkcentral';
import { mockPlayerData, mockMMRHistory, mockMatchHistory, mockTeamMembers, mockTournaments } from '@/lib/mockData';

// Helper function to get user session (simple implementation)
async function getUserSession(request) {
  // For MVP, we'll use a simple token in header
  // In production, use NextAuth or similar
  const token = request.headers.get('authorization');
  if (!token) return null;
  
  const db = await getDatabase();
  const user = await db.collection('users').findOne({ sessionToken: token });
  return user;
}

// Helper to parse verification cookie from request
function getVerificationFromCookie(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/verification_status=([^;]+)/);
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return null;
    }
  }
  return null;
}

// GET /api/ - API Info
export async function GET(request, context) {
  const params = await context.params;
  const path = params.path ? params.path.join('/') : '';
  
  try {
    // Root API info
    if (!path) {
      return NextResponse.json({
        message: 'MK8DX Competitive Hub API',
        version: '1.0.0',
        endpoints: {
          stats: '/api/stats',
          player: '/api/player',
          tournaments: '/api/tournaments',
          leaderboard: '/api/leaderboard',
          auth: '/api/auth/*'
        }
      });
    }

    // Stats endpoint
    if (path === 'stats') {
      const db = await getDatabase();
      const usersCount = await db.collection('users').countDocuments({ verified: true });
      const racesCount = await db.collection('matches').countDocuments();
      
      return NextResponse.json({
        players: usersCount > 0 ? `${usersCount}+` : '2K+',
        races: racesCount > 0 ? `${Math.floor(racesCount / 1000)}K+` : '100K+'
      });
    }

    // Player info (current user)
    if (path === 'player') {
      // Return mock data for now
      return NextResponse.json(mockPlayerData);
    }

    // Player MMR history
    if (path === 'player/mmr-history') {
      return NextResponse.json(mockMMRHistory);
    }

    // Player match history
    if (path === 'player/match-history') {
      return NextResponse.json(mockMatchHistory);
    }

    // Player team
    if (path === 'player/team') {
      return NextResponse.json(mockTeamMembers);
    }

    // Tournaments
    if (path === 'tournaments') {
      return NextResponse.json(mockTournaments);
    }

    // Leaderboard
    if (path === 'leaderboard') {
      try {
        const db = await getDatabase();
        
        // Check if we have cached leaderboard data
        const cache = await db.collection('leaderboard_cache').findOne({ type: 'global' });
        
        if (cache && Date.now() - new Date(cache.lastUpdate).getTime() < 3600000) {
          // Cache is less than 1 hour old
          return NextResponse.json({
            players: cache.data,
            lastUpdate: cache.lastUpdate,
            cached: true
          });
        }

        // Fetch from Lounge API
        const loungeApi = new LoungeApi();
        const players = await loungeApi.getPlayers();
        
        // Sort by MMR
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

        // Cache the results
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

        return NextResponse.json({
          players: sortedPlayers,
          lastUpdate: new Date().toISOString(),
          cached: false
        });
      } catch (error) {
        console.error('Leaderboard API error:', error);
        
        // Fallback to mock data
        const mockLeaderboard = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          name: `Player${i + 1}`,
          mmr: 17000 - (i * 500),
          wins: 500 - (i * 10),
          losses: 200 + (i * 5),
          totalRaces: 700 - (i * 5),
          rank: i + 1
        }));

        return NextResponse.json({
          players: mockLeaderboard,
          lastUpdate: new Date().toISOString(),
          cached: false,
          error: 'Using mock data'
        });
      }
    }

    // Discord OAuth initiation
    if (path === 'auth/discord') {
      const clientId = process.env.DISCORD_CLIENT_ID;
      const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
      const scope = encodeURIComponent('identify guilds guilds.members.read');
      
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      
      return NextResponse.redirect(discordAuthUrl);
    }

    // Discord OAuth callback
    if (path === 'auth/discord/callback') {
      const { searchParams } = new URL(request.url);
      const code = searchParams.get('code');
      
      if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
      }

      try {
        // Exchange code for token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          throw new Error('No access token received');
        }

        // Get user info
        const userResponse = await fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        const userData = await userResponse.json();

        // Get user's guilds
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        const guilds = await guildsResponse.json();

        // Check if user is in Lounge server
        const loungeServerId = process.env.DISCORD_LOUNGE_SERVER_ID;
        const isInLoungeServer = guilds.some(g => g.id === loungeServerId);

        if (!isInLoungeServer) {
          // Redirect to error page
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=not_in_server`);
        }

        // Get server-specific nickname
        try {
          const memberResponse = await fetch(
            `https://discord.com/api/users/@me/guilds/${loungeServerId}/member`,
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            }
          );
          const memberData = await memberResponse.json();
          
          const serverNickname = memberData.nick || userData.username;

          // Save to database
          const db = await getDatabase();

          // Check recent activity on Lounge (last 30 days)
          let matchCount = 0;
          let lastMatchDate = null;
          const loungeApi = new LoungeApi();

          try {
            const matches = await loungeApi.getPlayerMatchHistory(serverNickname, { limit: 100 });

            if (Array.isArray(matches)) {
              const now = Date.now();
              const cutoff = now - (30 * 24 * 60 * 60 * 1000);
              const recent = matches
                .map(m => ({ ...m, date: new Date(m.date || m.createdAt || m.time) }))
                .filter(m => m.date && m.date.getTime() >= cutoff)
                .sort((a, b) => b.date - a.date);

              matchCount = recent.length;
              lastMatchDate = recent.length > 0 ? recent[0].date.toISOString() : null;
            }
          } catch (err) {
            // If the Lounge API doesn't provide matches, we continue gracefully
            console.warn('Could not fetch lounge matches:', err);
          }

          const status = matchCount >= 2 ? 'pending' : 'waiting_activity';

          // Create pending verification with activity metadata
          await db.collection('pending_verifications').insertOne({
            discordId: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            serverNickname: serverNickname,
            avatar: userData.avatar,
            createdAt: new Date(),
            status: status,
            matchCount,
            lastMatchDate
          });

          // Redirect to dashboard and set a client-readable cookie to show waiting UI
          const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`;
          const res = NextResponse.redirect(redirectUrl);
          // Store minimal verification state in cookie so the client can render the waiting page
          res.cookies.set('verification_status', JSON.stringify({ discordId: userData.id, status, matchCount, lastMatchDate }), { httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30 });
          return res; 
          
        } catch (err) {
          console.error('Error fetching member data:', err);
        }

        // Fallback: save basic user data and attempt to check activity
        const db = await getDatabase();
        const loungeApi = new LoungeApi();
        let matchCount = 0;
        let lastMatchDate = null;

        try {
          const matches = await loungeApi.getPlayerMatchHistory(userData.username, { limit: 100 });
          if (Array.isArray(matches)) {
            const now = Date.now();
            const cutoff = now - (30 * 24 * 60 * 60 * 1000);
            const recent = matches
              .map(m => ({ ...m, date: new Date(m.date || m.createdAt || m.time) }))
              .filter(m => m.date && m.date.getTime() >= cutoff)
              .sort((a, b) => b.date - a.date);

            matchCount = recent.length;
            lastMatchDate = recent.length > 0 ? recent[0].date.toISOString() : null;
          }
        } catch (err) {
          console.warn('Could not fetch lounge matches (fallback):', err);
        }

        const status = matchCount >= 2 ? 'pending' : 'waiting_activity';

        await db.collection('pending_verifications').insertOne({
          discordId: userData.id,
          username: userData.username,
          discriminator: userData.discriminator,
          serverNickname: userData.username,
          avatar: userData.avatar,
          createdAt: new Date(),
          status,
          matchCount,
          lastMatchDate
        });

        const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`;
        const res = NextResponse.redirect(redirectUrl);
        res.cookies.set('verification_status', JSON.stringify({ discordId: userData.id, status, matchCount, lastMatchDate }), { httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30 });
        return res; 

      } catch (error) {
        console.error('Discord OAuth error:', error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=auth_failed`);
      }
    }

    // Admin: Get pending verifications
    if (path === 'admin/pending-verifications') {
      const db = await getDatabase();
      const pending = await db.collection('pending_verifications')
        .find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json(pending);
    }

    // Lounge player search by name
    if (path.startsWith('lounge/player/')) {
      const playerName = path.replace('lounge/player/', '');
      
      try {
        const loungeApi = new LoungeApi();
        const playerDetails = await loungeApi.getPlayerDetailsByName(playerName);
        return NextResponse.json(playerDetails);
      } catch (error) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }
    }

    // MKCentral: get registry link (by player name) or fetch registry team info by link (with DB cache)
    if (path === 'mkcentral/registry') {
      try {
        const url = new URL(request.url);
        const qs = url.searchParams;
        const name = qs.get('name');
        const link = qs.get('link');

        const mk = new MkCentralApi();
        const db = await getDatabase();

        if (link) {
          // Check cache by link
          const cached = await db.collection('mkcentral_registry').findOne({ link });
          if (cached && cached.team && (Date.now() - new Date(cached.lastFetched).getTime() < 24 * 3600 * 1000)) {
            return NextResponse.json({ success: true, team: cached.team, cached: true, lastFetched: cached.lastFetched });
          }

          // Get team info from registry link and cache it
          try {
            const team = await mk.getTeamFromRegistryLink(link);
            await db.collection('mkcentral_registry').updateOne(
              { link },
              { $set: { link, team, lastFetched: new Date() } },
              { upsert: true }
            );

            return NextResponse.json({ success: true, team, cached: false });
          } catch (err) {
            console.error('Could not parse registry link:', err);
            return NextResponse.json({ success: false, message: 'Could not parse registry link' }, { status: 500 });
          }
        }

        if (name) {
          // Check cache by name
          const cachedByName = await db.collection('mkcentral_registry').findOne({ name });
          if (cachedByName && cachedByName.link && (Date.now() - new Date(cachedByName.lastFetched).getTime() < 24 * 3600 * 1000)) {
            return NextResponse.json({ success: true, registryLink: cachedByName.link, cached: true, lastFetched: cachedByName.lastFetched });
          }

          const registryLink = await mk.findRegistryLinkFromLounge(name);
          if (!registryLink) {
            return NextResponse.json({ success: false, message: 'Registry link not found' }, { status: 404 });
          }

          // Cache mapping name -> link
          await db.collection('mkcentral_registry').updateOne(
            { name },
            { $set: { name, link: registryLink, lastFetched: new Date() } },
            { upsert: true }
          );

          return NextResponse.json({ success: true, registryLink, cached: false });
        }

        return NextResponse.json({ success: false, message: 'name or link query parameter required' }, { status: 400 });
      } catch (err) {
        console.error('mkcentral/registry error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
      }
    }

    // Admin: Associate a registry link to a user and cache team info
    if (path === 'admin/set-registry-link') {
      try {
        const body = await request.json();
        const { discordId, registryLink } = body;
        if (!discordId || !registryLink) {
          return NextResponse.json({ success: false, message: 'discordId and registryLink required' }, { status: 400 });
        }

        const db = await getDatabase();

        // Update pending verification and user records
        await db.collection('pending_verifications').updateOne(
          { discordId },
          { $set: { mkcentralRegistryLink: registryLink, updatedAt: new Date() } }
        );

        await db.collection('users').updateOne(
          { discordId },
          { $set: { mkcentralRegistryLink: registryLink } },
          { upsert: false }
        );

        // Cache team info if possible
        const mk = new MkCentralApi();
        try {
          const team = await mk.getTeamFromRegistryLink(registryLink);
          await db.collection('mkcentral_registry').updateOne(
            { link: registryLink },
            { $set: { link: registryLink, team, lastFetched: new Date() } },
            { upsert: true }
          );
          // Log association
          await db.collection('mkcentral_refresh_logs').insertOne({ runAt: new Date(), action: 'associate', link: registryLink, discordId });
        } catch (err) {
          console.warn('Failed to fetch team when setting registry link', err);
        }

        return NextResponse.json({ success: true, message: 'Registry link associated' });
      } catch (err) {
        console.error('admin/set-registry-link error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/* - Handle POST requests
export async function POST(request, context) {
  const params = await context.params;
  const path = params.path ? params.path.join('/') : '';
  
  try {
    // Admin: Verify player
    if (path === 'admin/verify-player') {
      const body = await request.json();
      const { discordId, serverNickname, approved } = body;

      const db = await getDatabase();

      if (!approved) {
        // Reject verification
        await db.collection('pending_verifications').updateOne(
          { discordId },
          { $set: { status: 'rejected', rejectedAt: new Date() } }
        );
        
        return NextResponse.json({ success: true, message: 'Verification rejected' });
      }

      // Continue with existing verification logic (activity checks, etc.)
      try {
        // Check if player is active on Lounge (must have >= 2 matches in last 30 days)
        const loungeApi = new LoungeApi();
        const loungePlayer = await loungeApi.getPlayerDetailsByName(serverNickname);
        
        if (!loungePlayer || !loungePlayer.name) {
          // Player not found on Lounge
          await db.collection('pending_verifications').updateOne(
            { discordId },
            { $set: { status: 'not_active', message: 'Player not found on Lounge' } }
          );
          
          return NextResponse.json({ 
            success: false, 
            message: 'Player not found on Lounge. Please play some matches first.' 
          });
        }

        // Check match history
        let matchCount = 0;
        try {
          const matches = await loungeApi.getPlayerMatchHistory(serverNickname, { limit: 100 });
          if (Array.isArray(matches)) {
            const now = Date.now();
            const cutoff = now - (30 * 24 * 60 * 60 * 1000);
            const recent = matches
              .map(m => ({ ...m, date: new Date(m.date || m.createdAt || m.time) }))
              .filter(m => m.date && m.date.getTime() >= cutoff);

            matchCount = recent.length;
          }
        } catch (err) {
          console.warn('Could not fetch matches during admin verification:', err);
        }

        if (matchCount < 2) {
          await db.collection('pending_verifications').updateOne(
            { discordId },
            { $set: { status: 'not_active', matchCount, message: 'Not enough recent activity' } }
          );

          return NextResponse.json({ success: false, message: 'User does not have enough activity on Lounge (min 2 matches in 30 days).' });
        }

        // Player is active, create user account
        await db.collection('users').insertOne({
          discordId,
          serverNickname,
          loungeData: loungePlayer,
          mmr: loungePlayer.mmr || 0,
          verified: true,
          verifiedAt: new Date(),
          createdAt: new Date()
        });

        // Update verification status
        await db.collection('pending_verifications').updateOne(
          { discordId },
          { $set: { status: 'approved', approvedAt: new Date(), matchCount } }
        );

        // Return response and clear client-side verification cookie so dashboard updates
        const res = NextResponse.json({ success: true, message: 'Player verified successfully' });
        res.cookies.set('verification_status', '', { path: '/', maxAge: 0 });
        return res;
      } catch (error) {
        console.error('Lounge API error:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Error checking Lounge activity' 
        }, { status: 500 });
      }
    }

    // Admin: List MKCentral cache
    if (path === 'admin/mkcentral-cache') {
      try {
        const url = new URL(request.url);
        const qs = url.searchParams;
        const page = parseInt(qs.get('page') || '1', 10);
        const limit = Math.min(parseInt(qs.get('limit') || '50', 10), 200);
        const filter = qs.get('filter') || null;

        const db = await getDatabase();
        const query = {};
        if (filter) {
          query.$or = [ { link: { $regex: filter, $options: 'i' } }, { 'team.teamName': { $regex: filter, $options: 'i' } } ];
        }

        const total = await db.collection('mkcentral_registry').countDocuments(query);
        const items = await db.collection('mkcentral_registry')
          .find(query)
          .sort({ lastFetched: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        // Also return a short summary
        const summary = await db.collection('mkcentral_registry').aggregate([
          { $match: query },
          { $group: { _id: null, totalWithTeam: { $sum: { $cond: [{ $ifNull: ["$team", false] }, 1, 0] } }, totalWithoutTeam: { $sum: { $cond: [{ $ifNull: ["$team", false] }, 0, 1] } } } }
        ]).toArray();

        return NextResponse.json({ success: true, items, total, page, limit, summary: summary[0] || {} });
      } catch (err) {
        console.error('admin/mkcentral-cache error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
      }
    }

    // Admin: Force refresh MKCentral cache (POST)
    if (path === 'admin/mkcentral-refresh') {
      try {
        // Accept optional body: { links: [...], forceAll: true, concurrency, limit }
        const body = await request.json();
        const { links, forceAll, concurrency = 5, limit = 500 } = body || {};

        const db = await getDatabase();
        const mk = new MkCentralApi();

        let toRefresh = [];

        if (Array.isArray(links) && links.length > 0) {
          toRefresh = links;
        } else if (forceAll) {
          const all = await db.collection('mkcentral_registry').find({}).toArray();
          toRefresh = all.map(a => a.link).filter(Boolean).slice(0, limit);
        } else {
          // Refresh stale entries only
          const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
          const stale = await db.collection('mkcentral_registry').find({ $or: [ { team: { $exists: false } }, { lastFetched: { $lt: cutoff } } ] }).limit(limit).toArray();
          toRefresh = stale.map(s => s.link).filter(Boolean);
        }

        const results = [];
        // Process in batches to respect concurrency param
        for (let i = 0; i < toRefresh.length; i += concurrency) {
          const batch = toRefresh.slice(i, i + concurrency);
          const batchPromises = batch.map(async (link) => {
            try {
              const team = await mk.getTeamFromRegistryLink(link);
              await db.collection('mkcentral_registry').updateOne({ link }, { $set: { link, team, lastFetched: new Date() } }, { upsert: true });
              return { link, success: true };
            } catch (err) {
              console.warn('Failed to refresh link', link, err.message);
              return { link, success: false, error: err.message };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }

        // Log run
        await db.collection('mkcentral_refresh_logs').insertOne({ runAt: new Date(), entriesProcessed: results.length, successes: results.filter(r => r.success).length, failures: results.filter(r => !r.success).length });

        return NextResponse.json({ success: true, results });
      } catch (err) {
        console.error('admin/mkcentral-refresh error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
      }
    }

    // Admin: Get recent MKCentral refresh logs
    if (path === 'admin/mkcentral-refresh-logs') {
      try {
        const url = new URL(request.url);
        const qs = url.searchParams;
        const page = parseInt(qs.get('page') || '1', 10);
        const limit = Math.min(parseInt(qs.get('limit') || '20', 10), 100);

        const db = await getDatabase();
        const total = await db.collection('mkcentral_refresh_logs').countDocuments();
        const items = await db.collection('mkcentral_refresh_logs')
          .find({})
          .sort({ runAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return NextResponse.json({ success: true, items, total, page, limit });
      } catch (err) {
        console.error('admin/mkcentral-refresh-logs error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
      }
    }



    // Recheck verification activity endpoint
    if (path === 'verification/recheck') {
      try {
        const body = await request.json();
        const { discordId } = body;
        if (!discordId) {
          return NextResponse.json({ success: false, message: 'discordId is required' }, { status: 400 });
        }

        const db = await getDatabase();
        const pending = await db.collection('pending_verifications').findOne({ discordId });

        if (!pending) {
          return NextResponse.json({ success: false, message: 'Pending verification not found' }, { status: 404 });
        }

        const serverNickname = pending.serverNickname || pending.username;
        const loungeApi = new LoungeApi();

        let matchCount = 0;
        let lastMatchDate = null;

        try {
          const matches = await loungeApi.getPlayerMatchHistory(serverNickname, { limit: 100 });
          if (Array.isArray(matches)) {
            const now = Date.now();
            const cutoff = now - (30 * 24 * 60 * 60 * 1000);
            const recent = matches
              .map(m => ({ ...m, date: new Date(m.date || m.createdAt || m.time) }))
              .filter(m => m.date && m.date.getTime() >= cutoff)
              .sort((a, b) => b.date - a.date);

            matchCount = recent.length;
            lastMatchDate = recent.length > 0 ? recent[0].date.toISOString() : null;
          }
        } catch (err) {
          console.warn('Could not fetch lounge matches during recheck:', err);
        }

        const status = matchCount >= 2 ? 'pending' : 'waiting_activity';

        await db.collection('pending_verifications').updateOne(
          { discordId },
          { $set: { matchCount, lastMatchDate, status, updatedAt: new Date() } }
        );

        const res = NextResponse.json({ success: true, status, matchCount, lastMatchDate });
        res.cookies.set('verification_status', JSON.stringify({ discordId, status, matchCount, lastMatchDate }), { httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30 });
        return res;

      } catch (err) {
        console.error('verification/recheck error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
