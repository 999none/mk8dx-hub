'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Trophy, TrendingUp, TrendingDown, Calendar, 
  Users, Target, Award, RefreshCw, ExternalLink, 
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
        <div className="bg-zinc-900 border border-white/20 p-3 rounded-lg shadow-xl">
          <p className="text-sm text-gray-400">{data.date}</p>
          <p className="text-lg font-bold">{data.mmr.toLocaleString('fr-FR')} MMR</p>
          <p className={`text-sm ${data.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.delta > 0 ? '+' : ''}{data.delta}
          </p>
          {data.tier && <p className="text-xs text-gray-500">Tier {data.tier}</p>}
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
            <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mb-3 sm:mb-4 text-white/50" />
            <p className="text-gray-400 text-sm sm:text-base text-center px-4">Chargement du profil de {playerName}...</p>
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
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-600" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2">{error}</h2>
            <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">Le joueur &quot;{playerName}&quot; n&apos;a pas été trouvé sur le Lounge.</p>
            <Button 
              onClick={() => router.back()}
              variant="outline" 
              className="border-white/20"
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
        {/* Header with Back + Season Selector - Mobile Optimized */}
        <div className="mb-4 sm:mb-6 flex flex-row items-center justify-between gap-2 sm:gap-4">
          <Button 
            onClick={() => router.back()}
            variant="ghost" 
            className="hover:bg-white/10 h-9 px-3 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
          
          {/* Sélecteur de Saison - Compact on mobile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[140px] sm:max-w-none"
            >
              {AVAILABLE_SEASONS.map((season) => (
                <option key={season.value} value={season.value} className="bg-gray-900">
                  {season.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========== PLAYER HEADER - Mobile Optimized ========== */}
        <Card className="bg-white/5 border-white/10 mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              {/* Avatar + Name + Country - Stack vertically on mobile */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl sm:text-4xl font-bold shadow-xl flex-shrink-0">
                  {player.name?.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-2">
                    <h1 className="text-2xl sm:text-4xl font-black">{player.name}</h1>
                    {player.countryCode && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xl sm:text-3xl">{getCountryFlag(player.countryCode)}</span>
                        <span className="text-sm sm:text-lg text-gray-400">
                          {COUNTRY_NAMES[player.countryCode] || player.countryCode}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4">
                    {rank && (
                      <Badge 
                        style={{ backgroundColor: rank.color }} 
                        className="text-black text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 font-bold"
                      >
                        {rank.name}
                      </Badge>
                    )}
                    {player.overallRank && (
                      <div className="flex items-center gap-1 sm:gap-2 text-yellow-500">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="font-semibold text-sm sm:text-base">#{player.overallRank}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* MMR Box - Full width on mobile */}
              <div className="w-full sm:w-auto text-center bg-white/5 rounded-xl p-4 sm:p-0 sm:bg-transparent">
                <div className="text-xs sm:text-sm text-gray-400 mb-1">MMR</div>
                <div className="text-4xl sm:text-5xl font-black text-blue-400">
                  {(player.mmr || 0).toLocaleString('fr-FR')}
                </div>
                {player.maxMmr && (
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                    Max: {player.maxMmr.toLocaleString('fr-FR')}
                  </div>
                )}
              </div>
            </div>
            
            {/* External Link */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10 text-center">
              <a 
                href={loungeProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm sm:text-base"
              >
                <ExternalLink className="w-4 h-4" />
                Voir sur MK8DX Lounge
              </a>
            </div>
          </CardContent>
        </Card>

        {/* ========== STATS GRID ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold text-green-400">{playerDetails?.wins || 0}</div>
              <div className="text-sm text-gray-400">Victoires</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <div className="text-2xl font-bold text-red-400">{playerDetails?.losses || 0}</div>
              <div className="text-sm text-gray-400">Défaites</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold text-blue-400">{player.eventsPlayed || 0}</div>
              <div className="text-sm text-gray-400">Events joués</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-purple-400">
                {(() => {
                  const wins = playerDetails?.wins || 0;
                  const losses = playerDetails?.losses || 0;
                  const total = wins + losses;
                  return total > 0 ? Math.round((wins / total) * 100) : 0;
                })()}%
              </div>
              <div className="text-sm text-gray-400">Taux victoire</div>
            </CardContent>
          </Card>
        </div>

        {/* ========== SECOND STATS ROW ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-yellow-400">{player.maxMmr || '-'}</div>
              <div className="text-xs text-gray-400">MMR Max</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-cyan-400">
                {playerDetails?.gainLoss !== undefined ? (playerDetails.gainLoss > 0 ? '+' : '') + playerDetails.gainLoss : '-'}
              </div>
              <div className="text-xs text-gray-400">Gain/Perte</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-orange-400">+{playerDetails?.largestGain || '-'}</div>
              <div className="text-xs text-gray-400">+ Grand Gain</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-pink-400">{playerDetails?.largestLoss ? playerDetails.largestLoss : '-'}</div>
              <div className="text-xs text-gray-400">+ Grande Perte</div>
            </CardContent>
          </Card>
        </div>

        {/* ========== MAIN CONTENT GRID ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Advanced Stats */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Stats Avancées
              </CardTitle>
            </CardHeader>
            <CardContent>
              {advancedStats ? (
                <div className="space-y-4">
                  {advancedStats.avgScore !== null && (
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Score moyen</span>
                      <span className="font-bold text-lg">{advancedStats.avgScore}</span>
                    </div>
                  )}
                  {advancedStats.favoriteTier && (
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Tier préféré</span>
                      <Badge variant="outline" className="border-white/30">
                        Tier {advancedStats.favoriteTier.tier}
                      </Badge>
                    </div>
                  )}
                  {advancedStats.avgMmrChange !== null && (
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Δ MMR moyen</span>
                      <span className={`font-bold ${advancedStats.avgMmrChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {advancedStats.avgMmrChange > 0 ? '+' : ''}{advancedStats.avgMmrChange}
                      </span>
                    </div>
                  )}
                  {advancedStats.currentStreak && advancedStats.currentStreak.count > 1 && (
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Série actuelle</span>
                      <span className={`font-bold ${advancedStats.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                        {advancedStats.currentStreak.count} {advancedStats.currentStreak.type === 'win' ? 'V' : 'D'}
                      </span>
                    </div>
                  )}
                  {advancedStats.recentForm && (
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Forme (10 derniers)</span>
                      <span className="font-bold">
                        <span className="text-green-400">{advancedStats.recentForm.wins}V</span>
                        {' / '}
                        <span className="text-red-400">{advancedStats.recentForm.losses}D</span>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-sm">Pas assez de données</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MMR Chart */}
          <Card className="bg-white/5 border-white/10 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Évolution du MMR
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mmrChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mmrChartData}>
                      <defs>
                        <linearGradient id="mmrGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#666"
                        tick={{ fontSize: 11 }}
                        domain={['dataMin - 100', 'dataMax + 100']}
                        tickFormatter={(v) => v.toLocaleString('fr-FR')}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="mmr"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#mmrGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Pas assez de données pour afficher le graphique</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ========== MATCH HISTORY ========== */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                Historique des Matchs
              </div>
              {matchHistory.length > 0 && (
                <span className="text-sm font-normal text-gray-400">
                  {matchHistory.length} matchs récents
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matchHistory.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Tier</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Format</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Score</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Δ MMR</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Nouveau MMR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedMatches.map((match, index) => (
                        <tr 
                          key={match.id || index} 
                          className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={() => match.id && router.push(`/match/${match.id}`)}
                          title={match.id ? "Cliquez pour voir les détails du match" : ""}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">
                                {new Date(match.time).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className="border-white/20">
                              T{match.tier || '?'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-400">
                            {getMatchFormat(match.numTeams, match.numPlayers)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-semibold">{match.score ?? '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${
                              match.mmrDelta > 0 ? 'text-green-400' : 
                              match.mmrDelta < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {match.mmrDelta > 0 ? '+' : ''}{match.mmrDelta}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {(match.newMmr || 0).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {matchHistory.length > 10 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllMatches(!showAllMatches)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      {showAllMatches ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Voir tout ({matchHistory.length} matchs)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Swords className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Aucun match récent pour cette saison</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-6 text-center">
          <a 
            href={loungeProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-3">
              <ExternalLink className="w-5 h-5 mr-2" />
              Voir le profil complet sur MK8DX Lounge
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
