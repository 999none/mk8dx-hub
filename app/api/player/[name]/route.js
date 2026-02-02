import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const playerName = decodeURIComponent(params.name);
    
    // For now, we'll use mock data since we don't have a real database
    // In a real implementation, you would query your database here
    
    // Mock player data - in reality this would come from your database
    const mockPlayers = [
      {
        id: 1,
        name: 'Player1',
        mmr: 12500,
        rank: 1,
        countryCode: 'FR',
        eventsPlayed: 45,
        winRate: 75,
        peakMmr: 13200,
        wins: 34,
        losses: 11,
        lastActive: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Player2',
        mmr: 11800,
        rank: 2,
        countryCode: 'US',
        eventsPlayed: 38,
        winRate: 68,
        peakMmr: 12100,
        wins: 26,
        losses: 12,
        lastActive: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Player3',
        mmr: 11200,
        rank: 3,
        countryCode: 'JP',
        eventsPlayed: 52,
        winRate: 71,
        peakMmr: 11800,
        wins: 37,
        losses: 15,
        lastActive: new Date().toISOString()
      }
    ];
    
    // Find player by name (case insensitive)
    const player = mockPlayers.find(p => 
      p.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(player);
    
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}