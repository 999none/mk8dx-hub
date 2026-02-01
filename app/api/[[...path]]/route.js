import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { LoungeApi } from '@/lib/loungeApi';
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

// GET /api/ - API Info
export async function GET(request, { params }) {
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
          
          // Create pending verification
          await db.collection('pending_verifications').insertOne({
            discordId: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            serverNickname: serverNickname,
            avatar: userData.avatar,
            createdAt: new Date(),
            status: 'pending'
          });

          // Redirect to dashboard with pending status
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=pending_verification`);
          
        } catch (err) {
          console.error('Error fetching member data:', err);
        }

        // Fallback: save basic user data
        const db = await getDatabase();
        await db.collection('pending_verifications').insertOne({
          discordId: userData.id,
          username: userData.username,
          discriminator: userData.discriminator,
          serverNickname: userData.username,
          avatar: userData.avatar,
          createdAt: new Date(),
          status: 'pending'
        });

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=pending_verification`);

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

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/* - Handle POST requests
export async function POST(request, { params }) {
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

      // Check if player is active on Lounge
      try {
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
          { $set: { status: 'approved', approvedAt: new Date() } }
        );

        return NextResponse.json({ success: true, message: 'Player verified successfully' });

      } catch (error) {
        console.error('Lounge API error:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Error checking Lounge activity' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
