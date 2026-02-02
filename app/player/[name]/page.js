'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Trophy, TrendingUp, TrendingDown, Calendar, 
  Users, Target, RefreshCw, ExternalLink, 
  BarChart3, History, Clock, ChevronDown, ChevronUp, Swords
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getCurrentRank } from '@/lib/mockData';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

// Country codes to names mapping
const COUNTRY_NAMES = {
  'FR': 'France', 'US': 'États-Unis', 'JP': 'Japon', 'DE': 'Allemagne',
  'GB': 'Royaume-Uni', 'CA': 'Canada', 'ES': 'Espagne', 'IT': 'Italie',
  'BR': 'Brésil', 'MX': 'Mexique', 'AU': 'Australie', 'NL': 'Pays-Bas',
  'BE': 'Belgique', 'CH': 'Suisse', 'AT': 'Autriche', 'SE': 'Suède',
  'NO': 'Norvège', 'DK': 'Danemark', 'FI': 'Finlande', 'PL': 'Pologne',
  'PT': 'Portugal', 'KR': 'Corée du Sud', 'CN': 'Chine', 'TW': 'Taïwan',
  'HK': 'Hong Kong', 'SG': 'Singapour', 'NZ': 'Nouvelle-Zélande',
  'AR': 'Argentine', 'CL': 'Chili', 'CO': 'Colombie', 'PE': 'Pérou',
  'IE': 'Irlande', 'CZ': 'Tchéquie', 'RU': 'Russie', 'UA': 'Ukraine'
};

// Function to get country flag emoji
const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  return countryCode.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(127397 + char.charCodeAt())
  );
};

// Saisons disponibles
const AVAILABLE_SEASONS = [
  { value: '', label: 'Saison 15 (Actuelle)' },
  { value: '14', label: 'Saison 14' },
  { value: '13', label: 'Saison 13' },
  { value: '12', label: 'Saison 12' },
  { value: '11', label: 'Saison 11' },
  { value: '10', label: 'Saison 10' },
  { value: '9', label: 'Saison 9' },
  { value: '8', label: 'Saison 8' },
];

// Helper function to get match format
const getMatchFormat = (numTeams, numPlayers) => {
  if (!numTeams || !numPlayers) return '-';
  if (numTeams === numPlayers) return 'FFA';
  const playersPerTeam = Math.floor(numPlayers / numTeams);
  return `${playersPerTeam}v${playersPerTeam}`;
};

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerName = decodeURIComponent(params.name);
  
  const [player, setPlayer] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch full player details from Lounge API
        const seasonParam = selectedSeason ? `?season=${selectedSeason}` : '';
        const res = await fetch(`/api/lounge/player-details/${encodeURIComponent(playerName)}${seasonParam}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            setError('Joueur non trouvé');
          } else {
            setError('Erreur lors du chargement du profil');
          }
          return;
        }
        
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setPlayer(data);
        setPlayerDetails(data);
      } catch (err) {
        console.error('Erreur chargement profil:', err);
        setError('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };

    if (playerName) {
      fetchPlayer();
    }
  }, [playerName, selectedSeason]);

  // Calculate stats
  const rank = player?.mmr ? getCurrentRank(player.mmr) : null;
  const matchHistory = playerDetails?.matchHistory || [];
  const mmrChanges = playerDetails?.mmrChanges || [];
  
  // Prepare MMR chart data
  const mmrChartData = mmrChanges
    .filter(c => c.reason === 'Table')
    .slice(0, 50)
    .reverse()
    .map((change, index) => ({
      index,
      date: new Date(change.time).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      mmr: change.newMmr,
      delta: change.mmrDelta,
      tier: change.tier
    }));

  // Calculate advanced statistics
  const calculateAdvancedStats = () => {
    if (!matchHistory || matchHistory.length === 0) return null;
    
    const scores = matchHistory.filter(m => m.score !== undefined).map(m => m.score);
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : null;
    
    // Tier distribution
    const tierCounts = {};
    matchHistory.forEach(m => {
      if (m.tier) {
        tierCounts[m.tier] = (tierCounts[m.tier] || 0) + 1;
      }
    });
    const favoriteTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0];
    
    // Win/Loss streak
    let currentStreak = 0;
    let streakType = null;
    for (const m of matchHistory) {
      if (m.mmrDelta > 0) {
        if (streakType === 'win') currentStreak++;
        else { currentStreak = 1; streakType = 'win'; }
      } else if (m.mmrDelta < 0) {
        if (streakType === 'loss') currentStreak++;
        else { currentStreak = 1; streakType = 'loss'; }
      } else break;
    }
    
    // Recent form (last 10)
    const recent10 = matchHistory.slice(0, 10);
    const wins10 = recent10.filter(m => m.mmrDelta > 0).length;
    const losses10 = recent10.filter(m => m.mmrDelta < 0).length;
    
    // Average MMR change
    const mmrDeltas = matchHistory.filter(m => m.mmrDelta !== undefined).map(m => m.mmrDelta);
    const avgMmrChange = mmrDeltas.length > 0
      ? Math.round(mmrDeltas.reduce((a, b) => a + b, 0) / mmrDeltas.length)
      : null;
    
    return {
      avgScore,
      favoriteTier: favoriteTier ? { tier: favoriteTier[0], count: favoriteTier[1] } : null,
      currentStreak: { count: currentStreak, type: streakType },
      recentForm: { wins: wins10, losses: losses10 },
      avgMmrChange,
      tierCounts
    };
  };

  const advancedStats = calculateAdvancedStats();
  const displayedMatches = showAllMatches ? matchHistory : matchHistory.slice(0, 10);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-neutral-900 border border-gray-700 p-3 rounded-lg shadow-xl">
          <p className="text-xs text-gray-500">{data.date}</p>
          <p className="text-base font-bold text-gray-200">{data.mmr.toLocaleString('fr-FR')} MMR</p>
          <p className={`text-sm ${data.delta > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
            {data.delta > 0 ? '+' : ''}{data.delta}
          </p>
          {data.tier && <p className="text-xs text-gray-600">Tier {data.tier}</p>}
        </div>
      );
    }
    return null;
  };

  // Lounge profile URL
  const loungeProfileUrl = player?.loungeProfileUrl || 
    (player?.playerId || player?.id 
      ? `https://lounge.mkcentral.com/mk8dx/PlayerDetails/${player.playerId || player.id}${selectedSeason ? `?season=${selectedSeason}` : ''}`
      : `https://lounge.mkcentral.com/mk8dx/PlayerDetails/${encodeURIComponent(playerName)}${selectedSeason ? `?season=${selectedSeason}` : ''}`
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mb-3 sm:mb-4 text-gray-600" />
            <p className="text-gray-500 text-sm sm:text-base text-center px-4">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
          <div className="text-center py-16 sm:py-20 px-4">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-700" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-300">{error}</h2>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">Le joueur &quot;{playerName}&quot; n&apos;a pas été trouvé.</p>
            <Button 
              onClick={() => router.back()}
              variant="outline" 
              className="border-gray-700 text-gray-300 hover:bg-neutral-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!player) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Header with Back + Season Selector */}
        <div className="mb-4 sm:mb-6 flex flex-row items-center justify-between gap-2 sm:gap-4">
          <Button 
            onClick={() => router.back()}
            variant="ghost" 
            className="hover:bg-neutral-900 text-gray-400 hover:text-white h-9 px-3 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
          
          {/* Sélecteur de Saison */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-neutral-900 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-gray-300 text-xs sm:text-sm focus:outline-none focus:border-gray-500 cursor-pointer"
            >
              {AVAILABLE_SEASONS.map((season) => (
                <option key={season.value} value={season.value} className="bg-neutral-900">
                  {season.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========== PLAYER HEADER ========== */}
        <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-gray-400 flex-shrink-0">
              {player.name?.charAt(0).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-100">{player.name}</h1>
                {player.countryCode && (
                  <span className="text-lg sm:text-xl">{getCountryFlag(player.countryCode)}</span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {rank && (
                  <Badge 
                    style={{ backgroundColor: rank.color }} 
                    className="text-black text-xs px-2 py-0.5 font-semibold"
                  >
                    {rank.name}
                  </Badge>
                )}
                {player.overallRank && (
                  <span className="text-xs text-gray-500">Rang #{player.overallRank}</span>
                )}
              </div>
            </div>
            
            {/* MMR Box */}
            <div className="text-center sm:text-right">
              <div className="text-xs text-gray-500 mb-1">MMR</div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-100">
                {(player.mmr || 0).toLocaleString('fr-FR')}
              </div>
              {player.maxMmr && (
                <div className="text-xs text-gray-600 mt-1">
                  Max: {player.maxMmr.toLocaleString('fr-FR')}
                </div>
              )}
            </div>
          </div>
          
          {/* External Link */}
          <div className="mt-4 pt-4 border-t border-gray-800 text-center">
            <a 
              href={loungeProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-xs sm:text-sm"
            >
              <ExternalLink className="w-3 h-3" />
              Voir sur MK8DX Lounge
            </a>
          </div>
        </div>

        {/* ========== STATS GRID ========== */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg sm:text-xl font-bold text-gray-200">{playerDetails?.wins || 0}</div>
            <div className="text-[10px] sm:text-xs text-gray-500">Victoires</div>
          </div>
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg sm:text-xl font-bold text-gray-400">{playerDetails?.losses || 0}</div>
            <div className="text-[10px] sm:text-xs text-gray-500">Défaites</div>
          </div>
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg sm:text-xl font-bold text-gray-200">{player.eventsPlayed || 0}</div>
            <div className="text-[10px] sm:text-xs text-gray-500">Events</div>
          </div>
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg sm:text-xl font-bold text-gray-200">
              {(() => {
                const wins = playerDetails?.wins || 0;
                const losses = playerDetails?.losses || 0;
                const total = wins + losses;
                return total > 0 ? Math.round((wins / total) * 100) : 0;
              })()}%
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500">Win Rate</div>
          </div>
        </div>

        {/* ========== SECOND STATS ROW ========== */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm sm:text-base font-bold text-gray-300">{player.maxMmr || '-'}</div>
            <div className="text-[10px] text-gray-600">Max</div>
          </div>
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm sm:text-base font-bold text-gray-300">
              {playerDetails?.gainLoss !== undefined ? (playerDetails.gainLoss > 0 ? '+' : '') + playerDetails.gainLoss : '-'}
            </div>
            <div className="text-[10px] text-gray-600">Gain/Perte</div>
          </div>
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm sm:text-base font-bold text-gray-300">+{playerDetails?.largestGain || '-'}</div>
            <div className="text-[10px] text-gray-600">+ Gain</div>
          </div>
          <div className="bg-neutral-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-sm sm:text-base font-bold text-gray-400">{playerDetails?.largestLoss || '-'}</div>
            <div className="text-[10px] text-gray-600">+ Perte</div>
          </div>
        </div>

        {/* ========== MAIN CONTENT GRID ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          
          {/* Advanced Stats */}
          <div className="bg-neutral-900 border border-gray-800 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-medium text-gray-300">Stats Avancées</span>
            </div>
            <div className="p-4">
              {advancedStats ? (
                <div className="space-y-2">
                  {advancedStats.avgScore !== null && (
                    <div className="flex justify-between items-center p-2 bg-neutral-800/50 rounded">
                      <span className="text-gray-500 text-xs">Score moyen</span>
                      <span className="font-semibold text-sm text-gray-200">{advancedStats.avgScore}</span>
                    </div>
                  )}
                  {advancedStats.favoriteTier && (
                    <div className="flex justify-between items-center p-2 bg-neutral-800/50 rounded">
                      <span className="text-gray-500 text-xs">Tier préféré</span>
                      <span className="text-sm text-gray-300">T{advancedStats.favoriteTier.tier}</span>
                    </div>
                  )}
                  {advancedStats.avgMmrChange !== null && (
                    <div className="flex justify-between items-center p-2 bg-neutral-800/50 rounded">
                      <span className="text-gray-500 text-xs">Δ MMR moyen</span>
                      <span className={`font-semibold text-sm ${advancedStats.avgMmrChange >= 0 ? 'text-gray-200' : 'text-gray-500'}`}>
                        {advancedStats.avgMmrChange > 0 ? '+' : ''}{advancedStats.avgMmrChange}
                      </span>
                    </div>
                  )}
                  {advancedStats.currentStreak && advancedStats.currentStreak.count > 1 && (
                    <div className="flex justify-between items-center p-2 bg-neutral-800/50 rounded">
                      <span className="text-gray-500 text-xs">Série</span>
                      <span className={`font-semibold text-sm ${advancedStats.currentStreak.type === 'win' ? 'text-gray-200' : 'text-gray-500'}`}>
                        {advancedStats.currentStreak.count} {advancedStats.currentStreak.type === 'win' ? 'V' : 'D'}
                      </span>
                    </div>
                  )}
                  {advancedStats.recentForm && (
                    <div className="flex justify-between items-center p-2 bg-neutral-800/50 rounded">
                      <span className="text-gray-500 text-xs">10 derniers</span>
                      <span className="text-sm">
                        <span className="text-gray-200">{advancedStats.recentForm.wins}V</span>
                        <span className="text-gray-600"> / </span>
                        <span className="text-gray-500">{advancedStats.recentForm.losses}D</span>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                  <p className="text-gray-600 text-xs">Pas assez de données</p>
                </div>
              )}
            </div>
          </div>

          {/* MMR Chart */}
          <div className="bg-neutral-900 border border-gray-800 rounded-lg lg:col-span-2">
            <div className="px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-medium text-gray-300">Évolution MMR</span>
            </div>
            <div className="p-2 sm:p-4">
              {mmrChartData.length > 0 ? (
                <div className="h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mmrChartData}>
                      <defs>
                        <linearGradient id="mmrGradientPlayer" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#525252" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#525252" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#525252"
                        tick={{ fontSize: 9, fill: '#525252' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#525252"
                        tick={{ fontSize: 9, fill: '#525252' }}
                        domain={['dataMin - 100', 'dataMax + 100']}
                        tickFormatter={(v) => v.toLocaleString('fr-FR')}
                        width={45}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="mmr"
                        stroke="#737373"
                        strokeWidth={2}
                        fill="url(#mmrGradientPlayer)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-10">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                  <p className="text-gray-600 text-xs">Pas assez de données</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== MATCH HISTORY ========== */}
        <div className="bg-neutral-900 border border-gray-800 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Historique des Matchs</span>
            {matchHistory.length > 0 && (
              <span className="text-xs text-gray-600">{matchHistory.length} matchs</span>
            )}
          </div>
          <div className="p-0">
            {matchHistory.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500 text-xs">
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-center py-3 px-4 font-medium">Tier</th>
                        <th className="text-center py-3 px-4 font-medium">Format</th>
                        <th className="text-center py-3 px-4 font-medium">Score</th>
                        <th className="text-center py-3 px-4 font-medium">Δ MMR</th>
                        <th className="text-right py-3 px-4 font-medium">MMR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedMatches.map((match, index) => (
                        <tr 
                          key={match.id || index} 
                          className="border-b border-gray-800/50 hover:bg-neutral-800/50 transition-colors cursor-pointer"
                          onClick={() => match.id && router.push(`/match/${match.id}`)}
                        >
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-400">
                              {new Date(match.time).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-xs text-gray-400">T{match.tier || '?'}</span>
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-gray-500">
                            {getMatchFormat(match.numTeams, match.numPlayers)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-medium text-sm text-gray-300">{match.score ?? '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-medium text-sm ${
                              match.mmrDelta > 0 ? 'text-gray-200' : 
                              match.mmrDelta < 0 ? 'text-gray-500' : 'text-gray-600'
                            }`}>
                              {match.mmrDelta > 0 ? '+' : ''}{match.mmrDelta}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm text-gray-400">{(match.newMmr || 0).toLocaleString('fr-FR')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {matchHistory.length > 10 && (
                  <div className="p-4 text-center border-t border-gray-800">
                    <Button
                      variant="ghost"
                      onClick={() => setShowAllMatches(!showAllMatches)}
                      className="text-gray-400 hover:text-gray-200 hover:bg-neutral-800 text-xs"
                    >
                      {showAllMatches ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Voir tout ({matchHistory.length})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Swords className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                <p className="text-gray-500 text-sm">Aucun match pour cette saison</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Link */}
        <div className="mt-6 text-center">
          <a 
            href={loungeProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button 
              variant="outline" 
              className="border-gray-700 text-gray-300 hover:bg-neutral-800 hover:text-white px-6"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Profil complet sur MK8DX Lounge
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
