import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { LoungeApi } from '@/lib/loungeApi';
import { MkCentralApi } from '@/lib/mkcentral';
import { MkCentralTournamentsApi } from '@/lib/mkcentralTournaments';
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

// Helper to get user-friendly status message
function getStatusMessage(status, matchCount = 0) {
  switch (status) {
    case 'waiting_activity':
      return `Votre compte nécessite au moins 2 matchs Lounge dans les 30 derniers jours pour être vérifié. Actuellement: ${matchCount} match(s).`;
    case 'waiting_lounge_name':
      return "En attente de l'association de votre nom Lounge par un administrateur. Patience, cela peut prendre quelques heures.";
    case 'pending':
      return "Votre compte est en cours de vérification par un administrateur.";
    case 'approved':
      return "Votre compte est vérifié ! Bienvenue sur MK8DX Hub.";
    case 'rejected':
      return "Votre demande de vérification a été rejetée. Contactez un administrateur pour plus d'informations.";
    case 'not_active':
      return "Votre compte n'a pas suffisamment d'activité récente sur le Lounge.";
    default:
      return "Statut inconnu. Veuillez contacter un administrateur.";
  }
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

    // Tournaments - Scrape from MKCentral with 24h cache
    if (path === 'tournaments') {
      try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const game = searchParams.get('game') || 'all'; // mk8dx, mkwii, mkworld, all
        const forceRefresh = searchParams.get('refresh') === 'true';
        
        const db = await getDatabase();
        
        // Check cache (24 hours)
        const cacheKey = `tournaments_${game}`;
        const cache = await db.collection('tournaments_cache').findOne({ key: cacheKey });
        
        const cacheAge = cache ? Date.now() - new Date(cache.lastUpdate).getTime() : Infinity;
        const cacheValid = cacheAge < 24 * 60 * 60 * 1000; // 24 hours
        
        if (cache && cacheValid && !forceRefresh) {
          // Apply pagination to cached data
          const tournaments = cache.data || [];
          const filteredTournaments = game === 'all' 
            ? tournaments 
            : tournaments.filter(t => t.game === game || t.badges?.some(b => b.toLowerCase().includes(game)));
          
          const total = filteredTournaments.length;
          const totalPages = Math.ceil(total / limit);
          const startIdx = (page - 1) * limit;
          const paginatedTournaments = filteredTournaments.slice(startIdx, startIdx + limit);
          
          return NextResponse.json({
            tournaments: paginatedTournaments,
            total,
            page,
            limit,
            totalPages,
            lastUpdate: cache.lastUpdate,
            cached: true,
            nextRefresh: new Date(new Date(cache.lastUpdate).getTime() + 24 * 60 * 60 * 1000).toISOString()
          });
        }
        
        // Scrape from MKCentral
        const tournamentsApi = new MkCentralTournamentsApi();
        const result = await tournamentsApi.getTournaments({ game: 'all', page: 1, limit: 100 });
        
        // Store in cache
        await db.collection('tournaments_cache').updateOne(
          { key: cacheKey },
          { 
            $set: { 
              key: cacheKey,
              data: result.tournaments, 
              lastUpdate: new Date()
            } 
          },
          { upsert: true }
        );
        
        // Filter and paginate
        const tournaments = result.tournaments || [];
        const filteredTournaments = game === 'all' 
          ? tournaments 
          : tournaments.filter(t => t.game === game || t.badges?.some(b => b.toLowerCase().includes(game)));
        
        const total = filteredTournaments.length;
        const totalPages = Math.ceil(total / limit);
        const startIdx = (page - 1) * limit;
        const paginatedTournaments = filteredTournaments.slice(startIdx, startIdx + limit);
        
        return NextResponse.json({
          tournaments: paginatedTournaments,
          total,
          page,
          limit,
          totalPages,
          lastUpdate: new Date().toISOString(),
          cached: false,
          nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
        
      } catch (error) {
        console.error('Tournaments API error:', error);
        
        // Fallback to mock data
        return NextResponse.json({
          tournaments: mockTournaments,
          total: mockTournaments.length,
          page: 1,
          limit: 20,
          totalPages: 1,
          lastUpdate: new Date().toISOString(),
          cached: false,
          error: 'Using fallback data - MKCentral scraping failed'
        });
      }
    }
    
    // Tournament details with results
    if (path.startsWith('tournaments/')) {
      const tournamentId = parseInt(path.replace('tournaments/', ''), 10);
      
      if (isNaN(tournamentId)) {
        return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
      }
      
      try {
        const db = await getDatabase();
        
        // Check cache for tournament details (24h)
        const cacheKey = `tournament_${tournamentId}`;
        const cache = await db.collection('tournament_details_cache').findOne({ key: cacheKey });
        
        const cacheAge = cache ? Date.now() - new Date(cache.lastUpdate).getTime() : Infinity;
        // Live tournaments refresh every hour, others every 24h
        const cacheValidDuration = cache?.data?.status === 'live' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        
        if (cache && cacheAge < cacheValidDuration) {
          return NextResponse.json({
            ...cache.data,
            cached: true,
            lastUpdate: cache.lastUpdate
          });
        }
        
        // Scrape tournament details
        const tournamentsApi = new MkCentralTournamentsApi();
        const details = await tournamentsApi.getTournamentDetails(tournamentId);
        
        // Cache results
        await db.collection('tournament_details_cache').updateOne(
          { key: cacheKey },
          { 
            $set: { 
              key: cacheKey,
              data: details, 
              lastUpdate: new Date()
            } 
          },
          { upsert: true }
        );
        
        return NextResponse.json({
          ...details,
          cached: false,
          lastUpdate: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Tournament details API error:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch tournament details',
          message: error.message 
        }, { status: 500 });
      }
    }

    // Leaderboard with pagination and filters
    if (path === 'leaderboard') {
      try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const country = searchParams.get('country') || null;
        const minMmr = searchParams.get('minMmr') ? parseInt(searchParams.get('minMmr'), 10) : null;
        const maxMmr = searchParams.get('maxMmr') ? parseInt(searchParams.get('maxMmr'), 10) : null;
        const minEvents = searchParams.get('minEvents') ? parseInt(searchParams.get('minEvents'), 10) : null;
        const maxEvents = searchParams.get('maxEvents') ? parseInt(searchParams.get('maxEvents'), 10) : null;
        const sortBy = searchParams.get('sortBy') || 'mmr'; // mmr, name, peakMmr, eventsPlayed
        const search = searchParams.get('search') || null;
        
        const db = await getDatabase();
        
        // Create a cache key based on filters
        const cacheKey = `leaderboard_${country || 'all'}_${minMmr || 0}_${maxMmr || 99999}_${minEvents || 0}_${maxEvents || 99999}_${sortBy}`;
        
        // Check cache (1 hour)
        const cache = await db.collection('leaderboard_cache').findOne({ key: cacheKey });
        let allPlayers = [];
        let lastUpdate = new Date();
        let cached = false;
        let season = 15;
        
        if (cache && Date.now() - new Date(cache.lastUpdate).getTime() < 3600000) {
          allPlayers = cache.data;
          lastUpdate = cache.lastUpdate;
          cached = true;
          season = cache.season || 15;
        } else {
          // Fetch from Lounge API
          const loungeApi = new LoungeApi();
          const response = await loungeApi.getPlayers();
          
          if (response && response.players) {
            season = response.season || 15;
            allPlayers = response.players.map((p, index) => ({
              id: p.id,
              mkcId: p.mkcId,
              name: p.name,
              mmr: p.mmr || 0,
              eventsPlayed: p.eventsPlayed || 0,
              discordId: p.discordId,
              countryCode: p.countryCode || null
            }));
            
            // Cache full results
            await db.collection('leaderboard_cache').updateOne(
              { key: cacheKey },
              { 
                $set: { 
                  key: cacheKey,
                  data: allPlayers, 
                  lastUpdate: new Date(),
                  season
                } 
              },
              { upsert: true }
            );
            lastUpdate = new Date();
          }
        }
        
        // Apply filters
        let filteredPlayers = [...allPlayers];
        
        if (country) {
          filteredPlayers = filteredPlayers.filter(p => p.countryCode === country);
        }
        if (minMmr !== null) {
          filteredPlayers = filteredPlayers.filter(p => p.mmr >= minMmr);
        }
        if (maxMmr !== null) {
          filteredPlayers = filteredPlayers.filter(p => p.mmr <= maxMmr);
        }
        if (minEvents !== null) {
          filteredPlayers = filteredPlayers.filter(p => p.eventsPlayed >= minEvents);
        }
        if (maxEvents !== null) {
          filteredPlayers = filteredPlayers.filter(p => p.eventsPlayed <= maxEvents);
        }
        if (search) {
          const searchLower = search.toLowerCase();
          filteredPlayers = filteredPlayers.filter(p => p.name.toLowerCase().includes(searchLower));
        }
        
        // Sort
        switch (sortBy) {
          case 'name':
            filteredPlayers.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'eventsPlayed':
            filteredPlayers.sort((a, b) => b.eventsPlayed - a.eventsPlayed);
            break;
          case 'mmr':
          default:
            filteredPlayers.sort((a, b) => b.mmr - a.mmr);
        }
        
        // Add rank after sorting
        filteredPlayers = filteredPlayers.map((p, index) => ({ ...p, rank: index + 1 }));
        
        // Pagination
        const total = filteredPlayers.length;
        const totalPages = Math.ceil(total / limit);
        const startIdx = (page - 1) * limit;
        const paginatedPlayers = filteredPlayers.slice(startIdx, startIdx + limit);
        
        return NextResponse.json({
          players: paginatedPlayers,
          season,
          total,
          page,
          limit,
          totalPages,
          lastUpdate: lastUpdate.toISOString ? lastUpdate.toISOString() : lastUpdate,
          cached,
          filters: { country, minMmr, maxMmr, minEvents, maxEvents, sortBy, search }
        });
        
      } catch (error) {
        console.error('Leaderboard API error:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch leaderboard',
          message: error.message 
        }, { status: 500 });
      }
    }
    
    // Get player full details from Lounge
    if (path.startsWith('lounge/player-details/')) {
      const playerName = decodeURIComponent(path.replace('lounge/player-details/', ''));
      const { searchParams } = new URL(request.url);
      const season = searchParams.get('season') || '';
      
      try {
        const loungeApi = new LoungeApi();
        const playerDetails = await loungeApi.getPlayerDetailsByName(playerName, season);
        
        if (!playerDetails || !playerDetails.name) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }
        
        // Extract match history from mmrChanges
        const matchHistory = (playerDetails.mmrChanges || [])
          .filter(change => change.reason === 'Table')
          .slice(0, 50)
          .map(change => ({
            id: change.changeId,
            time: change.time,
            mmrDelta: change.mmrDelta,
            newMmr: change.newMmr,
            tier: change.tier,
            score: change.score,
            numTeams: change.numTeams,
            numPlayers: change.numPlayers
          }));
        
        // Calculate wins/losses from all mmrChanges
        const allTableMatches = (playerDetails.mmrChanges || []).filter(c => c.reason === 'Table');
        const wins = allTableMatches.filter(m => m.mmrDelta > 0).length;
        const losses = allTableMatches.filter(m => m.mmrDelta < 0).length;
        
        // Calculate gainLoss (total MMR change from all matches this season)
        const gainLoss = allTableMatches.reduce((sum, m) => sum + (m.mmrDelta || 0), 0);
        
        // Use largestGain from API if available, otherwise calculate
        const apiLargestGain = playerDetails.largestGain;
        const calculatedGains = allTableMatches.filter(m => m.mmrDelta > 0).map(m => m.mmrDelta);
        const largestGain = apiLargestGain || (calculatedGains.length > 0 ? Math.max(...calculatedGains) : null);
        
        // Calculate largestLoss (API doesn't provide this)
        const lossesValues = allTableMatches.filter(m => m.mmrDelta < 0).map(m => m.mmrDelta);
        const largestLoss = lossesValues.length > 0 ? Math.min(...lossesValues) : null;
        
        // Build the correct MKCentral URL
        const playerId = playerDetails.playerId || playerDetails.id;
        const loungeProfileUrl = season 
          ? `https://lounge.mkcentral.com/mk8dx/PlayerDetails/${playerId}?season=${season}`
          : `https://lounge.mkcentral.com/mk8dx/PlayerDetails/${playerId}`;
        
        return NextResponse.json({
          ...playerDetails,
          wins,
          losses,
          gainLoss,
          largestGain,
          largestLoss,
          matchHistory,
          recentStats: {
            last30: {
              wins: matchHistory.slice(0, 30).filter(m => m.mmrDelta > 0).length,
              losses: matchHistory.slice(0, 30).filter(m => m.mmrDelta < 0).length,
              total: Math.min(matchHistory.length, 30)
            }
          },
          loungeProfileUrl
        });
        
      } catch (error) {
        console.error('Player details error:', error);
        return NextResponse.json({ error: 'Failed to fetch player details' }, { status: 500 });
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

    // Admin: Get pending verifications (all statuses for admin view)
    if (path === 'admin/pending-verifications') {
      const db = await getDatabase();
      // Get both pending and waiting_activity users for admin
      const pending = await db.collection('pending_verifications')
        .find({ status: { $in: ['pending', 'waiting_activity', 'waiting_lounge_name'] } })
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json(pending);
    }

    // Get current user verification status
    if (path === 'verification/status') {
      const verification = getVerificationFromCookie(request);
      const { searchParams } = new URL(request.url);
      
      // Support both cookie and query params (for NextAuth sessions)
      const discordId = verification?.discordId || searchParams.get('discordId');
      
      if (!discordId) {
        return NextResponse.json({ verified: false, status: 'not_logged_in' });
      }
      
      const db = await getDatabase();
      
      // Check if user is already verified
      const user = await db.collection('users').findOne({ discordId: discordId, verified: true });
      if (user) {
        return NextResponse.json({ 
          verified: true, 
          status: 'approved',
          user: {
            discordId: user.discordId,
            serverNickname: user.serverNickname,
            loungeName: user.loungeName,
            mmr: user.mmr,
            loungeData: user.loungeData
          }
        });
      }
      
      // Check pending verification
      const pending = await db.collection('pending_verifications').findOne({ discordId: discordId });
      if (!pending) {
        return NextResponse.json({ verified: false, status: 'not_found' });
      }
      
      return NextResponse.json({
        verified: false,
        status: pending.status,
        matchCount: pending.matchCount || 0,
        lastMatchDate: pending.lastMatchDate || null,
        loungeName: pending.loungeName || null,
        serverNickname: pending.serverNickname || pending.username,
        createdAt: pending.createdAt,
        message: getStatusMessage(pending.status, pending.matchCount)
      });
    }

    // Admin: Search Lounge player with full stats
    if (path === 'admin/lounge-search') {
      const { searchParams } = new URL(request.url);
      const name = searchParams.get('name');
      
      if (!name) {
        return NextResponse.json({ error: 'name parameter required' }, { status: 400 });
      }
      
      try {
        const loungeApi = new LoungeApi();
        const playerDetails = await loungeApi.getPlayerDetailsByName(name);
        
        if (!playerDetails || !playerDetails.name) {
          return NextResponse.json({ found: false, error: 'Player not found on Lounge' });
        }
        
        // Fetch match history for activity check
        let matchCount = 0;
        let lastMatchDate = null;
        try {
          const matches = await loungeApi.getPlayerMatchHistory(name, { limit: 100 });
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
          console.warn('Could not fetch lounge matches:', err);
        }
        
        return NextResponse.json({
          found: true,
          player: {
            name: playerDetails.name,
            mmr: playerDetails.mmr || 0,
            maxMmr: playerDetails.maxMmr || 0,
            wins: playerDetails.wins || 0,
            losses: playerDetails.losses || 0,
            winRate: playerDetails.wins && playerDetails.losses 
              ? Math.round((playerDetails.wins / (playerDetails.wins + playerDetails.losses)) * 100) 
              : 0,
            rank: playerDetails.rank || playerDetails.division || 'N/A',
            eventsPlayed: playerDetails.eventsPlayed || 0,
            partnerId: playerDetails.partnerId || null,
            mkcId: playerDetails.mkcId || null
          },
          activity: {
            matchCount,
            lastMatchDate,
            isActive: matchCount >= 2
          },
          loungeProfileUrl: `https://www.mk8dx-lounge.com/PlayerDetails/${encodeURIComponent(name)}`
        });
      } catch (error) {
        console.error('Lounge search error:', error);
        return NextResponse.json({ found: false, error: 'Error searching Lounge' });
      }
    }

    // Lounge player search by name (existing)
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

    // Create verification for NextAuth session (first login) - AUTO-VERIFY if possible
    if (path === 'verification/create') {
      try {
        const body = await request.json();
        const { discordId, username, serverNickname, avatar, isInServer } = body;
        
        if (!discordId || !username) {
          return NextResponse.json({ success: false, message: 'discordId and username are required' }, { status: 400 });
        }

        // User must be in the Lounge server
        if (!isInServer) {
          return NextResponse.json({ success: false, message: 'User is not in the Lounge server', status: 'not_in_server' });
        }

        const db = await getDatabase();

        // Check if already verified
        const existingUser = await db.collection('users').findOne({ discordId, verified: true });
        if (existingUser) {
          return NextResponse.json({ success: true, status: 'approved', verified: true, user: existingUser });
        }

        // Check if pending verification already exists
        const existingPending = await db.collection('pending_verifications').findOne({ discordId });
        if (existingPending && existingPending.status === 'approved') {
          return NextResponse.json({ 
            success: true, 
            status: 'approved', 
            verified: true
          });
        }

        // ============================================
        // AUTO-VERIFICATION: Recherche directe sur le Lounge
        // ============================================
        const loungeApi = new LoungeApi();
        const loungeName = serverNickname || username;
        
        let loungePlayer = null;
        let matchCount = 0;
        let lastMatchDate = null;

        // 1. Chercher le joueur sur le Lounge avec le nickname Discord
        try {
          loungePlayer = await loungeApi.getPlayerDetailsByName(loungeName);
          console.log(`[Verification] Found Lounge player: ${loungePlayer?.name || 'not found'}`);
        } catch (err) {
          console.warn(`[Verification] Player "${loungeName}" not found on Lounge:`, err.message);
        }

        // 2. Si trouvé, vérifier l'activité (matchs récents)
        if (loungePlayer && loungePlayer.name) {
          try {
            const matches = await loungeApi.getPlayerMatchHistory(loungePlayer.name, { limit: 100 });
            if (Array.isArray(matches)) {
              const now = Date.now();
              const cutoff = now - (30 * 24 * 60 * 60 * 1000); // 30 jours
              const recent = matches
                .map(m => ({ ...m, date: new Date(m.date || m.createdAt || m.time) }))
                .filter(m => m.date && m.date.getTime() >= cutoff)
                .sort((a, b) => b.date - a.date);

              matchCount = recent.length;
              lastMatchDate = recent.length > 0 ? recent[0].date.toISOString() : null;
            }
          } catch (err) {
            console.warn('[Verification] Could not fetch match history:', err.message);
          }

          // 3. AUTO-APPROVE si le joueur a assez d'activité
          if (matchCount >= 2) {
            // Créer l'utilisateur vérifié directement !
            await db.collection('users').insertOne({
              discordId,
              username,
              serverNickname: loungeName,
              loungeName: loungePlayer.name,
              loungeData: loungePlayer,
              mmr: loungePlayer.mmr || 0,
              maxMmr: loungePlayer.maxMmr || 0,
              wins: loungePlayer.wins || 0,
              losses: loungePlayer.losses || 0,
              avatar,
              verified: true,
              verifiedAt: new Date(),
              autoVerified: true,
              createdAt: new Date()
            });

            // Créer/mettre à jour l'entrée pending pour historique
            await db.collection('pending_verifications').updateOne(
              { discordId },
              { 
                $set: { 
                  discordId,
                  username,
                  serverNickname: loungeName,
                  loungeName: loungePlayer.name,
                  loungeData: loungePlayer,
                  avatar,
                  status: 'approved',
                  autoApproved: true,
                  matchCount,
                  lastMatchDate,
                  approvedAt: new Date(),
                  updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true }
            );

            console.log(`[Verification] AUTO-APPROVED: ${loungeName} (${matchCount} matchs)`);

            const res = NextResponse.json({ 
              success: true, 
              status: 'approved', 
              verified: true,
              autoVerified: true,
              loungeName: loungePlayer.name,
              mmr: loungePlayer.mmr,
              matchCount,
              message: `Bienvenue ${loungePlayer.name} ! Votre compte a été vérifié automatiquement.`
            });
            res.cookies.set('verification_status', JSON.stringify({ discordId, status: 'approved', verified: true }), { httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30 });
            return res;
          }
        }

        // 4. Si pas trouvé ou pas assez d'activité → créer pending verification
        const status = loungePlayer ? 'waiting_activity' : 'waiting_lounge_name';
        
        await db.collection('pending_verifications').updateOne(
          { discordId },
          { 
            $set: { 
              discordId,
              username,
              serverNickname: loungeName,
              loungeName: loungePlayer?.name || null,
              loungeData: loungePlayer || null,
              avatar,
              status,
              matchCount,
              lastMatchDate,
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );

        const message = loungePlayer 
          ? `Joueur "${loungePlayer.name}" trouvé mais activité insuffisante (${matchCount}/2 matchs en 30 jours).`
          : `Joueur "${loungeName}" non trouvé sur le Lounge. Vérifiez que votre pseudo Discord correspond à votre nom Lounge.`;

        const res = NextResponse.json({ 
          success: true, 
          status, 
          verified: false,
          loungeName: loungePlayer?.name || null,
          loungeFound: !!loungePlayer,
          matchCount,
          lastMatchDate,
          message
        });
        res.cookies.set('verification_status', JSON.stringify({ discordId, status, matchCount, lastMatchDate }), { httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30 });
        return res;

      } catch (err) {
        console.error('verification/create error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
      }
    }

    // Admin: Set Lounge name and auto-approve if conditions met
    if (path === 'admin/set-lounge-name') {
      try {
        const body = await request.json();
        const { discordId, loungeName } = body;
        
        if (!discordId || !loungeName) {
          return NextResponse.json({ success: false, message: 'discordId et loungeName requis' }, { status: 400 });
        }

        const db = await getDatabase();
        const loungeApi = new LoungeApi();

        // Verify the Lounge player exists
        let loungePlayer = null;
        try {
          loungePlayer = await loungeApi.getPlayerDetailsByName(loungeName);
        } catch (err) {
          console.warn('Lounge player lookup failed:', err);
        }

        if (!loungePlayer || !loungePlayer.name) {
          return NextResponse.json({ 
            success: false, 
            message: `Joueur "${loungeName}" introuvable sur le Lounge. Vérifiez l'orthographe exacte.`
          });
        }

        // Check match activity
        let matchCount = 0;
        let lastMatchDate = null;
        try {
          const matches = await loungeApi.getPlayerMatchHistory(loungeName, { limit: 100 });
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
          console.warn('Could not fetch lounge matches:', err);
        }

        // Check if user has enough activity for auto-approval
        const canAutoApprove = matchCount >= 2;

        if (canAutoApprove) {
          // Auto-approve: Create verified user
          const existingUser = await db.collection('users').findOne({ discordId });
          
          if (existingUser) {
            // Update existing user
            await db.collection('users').updateOne(
              { discordId },
              { 
                $set: { 
                  loungeName,
                  loungeData: loungePlayer,
                  mmr: loungePlayer.mmr || 0,
                  verified: true,
                  verifiedAt: new Date(),
                  updatedAt: new Date()
                } 
              }
            );
          } else {
            // Get pending verification data for user info
            const pending = await db.collection('pending_verifications').findOne({ discordId });
            
            await db.collection('users').insertOne({
              discordId,
              serverNickname: pending?.serverNickname || pending?.username || loungeName,
              loungeName,
              loungeData: loungePlayer,
              mmr: loungePlayer.mmr || 0,
              verified: true,
              verifiedAt: new Date(),
              createdAt: new Date(),
              avatar: pending?.avatar || null,
              username: pending?.username || null
            });
          }

          // Update pending verification to approved
          await db.collection('pending_verifications').updateOne(
            { discordId },
            { 
              $set: { 
                status: 'approved', 
                loungeName,
                loungeData: loungePlayer,
                matchCount,
                lastMatchDate,
                approvedAt: new Date(),
                autoApproved: true,
                updatedAt: new Date()
              } 
            }
          );

          return NextResponse.json({ 
            success: true, 
            autoApproved: true,
            message: `Joueur "${loungeName}" vérifié automatiquement (${matchCount} matchs récents).`,
            player: loungePlayer
          });
        } else {
          // Not enough activity - update pending with Lounge name but keep as waiting_activity
          await db.collection('pending_verifications').updateOne(
            { discordId },
            { 
              $set: { 
                loungeName,
                loungeData: loungePlayer,
                matchCount,
                lastMatchDate,
                status: 'waiting_activity',
                updatedAt: new Date()
              } 
            }
          );

          return NextResponse.json({ 
            success: true, 
            autoApproved: false,
            message: `Nom Lounge "${loungeName}" associé. Activité insuffisante (${matchCount}/2 matchs). L'utilisateur doit jouer plus de matchs.`,
            player: loungePlayer,
            matchCount,
            lastMatchDate
          });
        }

      } catch (err) {
        console.error('admin/set-lounge-name error:', err);
        return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
