import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const playerName = decodeURIComponent(params.name);
    
    // Search for the player in the leaderboard data
    const leaderboardUrl = new URL('/api/leaderboard', request.url);
    leaderboardUrl.searchParams.set('search', playerName);
    leaderboardUrl.searchParams.set('limit', '1');
    
    const leaderboardResponse = await fetch(leaderboardUrl.toString());
    
    if (!leaderboardResponse.ok) {
      throw new Error('Failed to fetch leaderboard data');
    }
    
    const leaderboardData = await leaderboardResponse.json();
    
    // Find exact match (case insensitive)
    const player = leaderboardData.players?.find(p => 
      p.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    // Add some mock additional data that might not be in leaderboard
    const enrichedPlayer = {
      ...player,
      winRate: Math.floor(Math.random() * 30) + 60, // Mock win rate 60-90%
      peakMmr: player.mmr + Math.floor(Math.random() * 500), // Mock peak MMR
      wins: Math.floor((player.eventsPlayed || 0) * 0.7), // Mock wins
      losses: Math.floor((player.eventsPlayed || 0) * 0.3), // Mock losses
      lastActive: new Date().toISOString()
    };
    
    return NextResponse.json(enrichedPlayer);
    
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}