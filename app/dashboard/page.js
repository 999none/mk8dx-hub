'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, Trophy, TrendingUp, TrendingDown, Target, 
  Gamepad2, Star, Calendar, RefreshCw, LogOut,
  User, Shield, Award, Zap, History, BarChart3,
  Clock, ChevronDown, ChevronUp, ExternalLink, X,
  Users, Flag, Medal, Swords
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import RequireAuth from '@/components/RequireAuth';
import { getCurrentRank } from '@/lib/mockData';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';

// Saisons disponibles (Saison 15 actuelle - Juillet 2025)
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
  
  // FFA = chaque joueur est une équipe
  if (numTeams === numPlayers) return 'FFA';
  
  // Calculer le nombre de joueurs par équipe
  const playersPerTeam = Math.floor(numPlayers / numTeams);
  
  switch (playersPerTeam) {
    case 2: return '2v2';
    case 3: return '3v3';
    case 4: return '4v4';
    case 6: return '6v6';
    default: return `${playersPerTeam}v${playersPerTeam}`;
  }
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [playerStats, setPlayerStats] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch verification status to get lounge data
        const verifyRes = await fetch('/api/verification/status');
        const verifyData = await verifyRes.json();
        setVerificationData(verifyData);

        // If user is verified and has lounge name, fetch their full stats
        if (verifyData.verified && verifyData.user?.loungeName) {
          const loungeName = verifyData.user.loungeName;
          
          // Fetch activity stats
          const loungeRes = await fetch(`/api/admin/lounge-search?name=${encodeURIComponent(loungeName)}${selectedSeason ? `&season=${selectedSeason}` : ''}`);
          const loungeData = await loungeRes.json();
          if (loungeData.found) {
            setPlayerStats(loungeData);
          }

          // Fetch full player details with MMR history
          const detailsRes = await fetch(`/api/lounge/player-details/${encodeURIComponent(loungeName)}${selectedSeason ? `?season=${selectedSeason}` : ''}`);
          const detailsData = await detailsRes.json();
          if (detailsData && detailsData.name) {
            setPlayerDetails(detailsData);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  const user = session?.user;
  const loungeData = verificationData?.user?.loungeData || playerStats?.player;
  const rank = loungeData?.mmr ? getCurrentRank(loungeData.mmr) : null;
  
  // Calculate advanced stats from match history
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

  // Function to load match details
  const loadMatchDetails = async (matchId) => {
    if (!matchId) return;
    setLoadingMatch(true);
    setSelectedMatch(matchId);
    try {
      const res = await fetch(`/api/lounge/match/${matchId}`);
      const data = await res.json();
      if (data && !data.error) {
        setMatchDetails(data);
      } else {
        setMatchDetails(null);
      }
    } catch (err) {
      console.error('Error loading match details:', err);
      setMatchDetails(null);
    } finally {
      setLoadingMatch(false);
    }
  };

  const closeMatchModal = () => {
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  // Match Detail Modal Component
  const MatchDetailModal = () => {
    if (!selectedMatch) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={closeMatchModal}>
        <div 
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/20 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gray-900/95 backdrop-blur border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Swords className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Détails du Match</h2>
                {matchDetails && (
                  <p className="text-sm text-gray-400">
                    Table #{matchDetails.id} • Tier {matchDetails.tier} • {matchDetails.format || `${matchDetails.numTeams}v${matchDetails.numTeams}`}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={closeMatchModal}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loadingMatch ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin mr-4 text-blue-400" />
                <span className="text-gray-400">Chargement des détails...</span>
              </div>
            ) : matchDetails ? (
              <div className="space-y-6">
                {/* Match Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="font-semibold">
                      {new Date(matchDetails.createdOn || matchDetails.verifiedOn).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400">Joueurs</p>
                    <p className="font-semibold text-xl">{matchDetails.numPlayers}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm text-gray-400">Format</p>
                    <p className="font-semibold">{matchDetails.format || `${matchDetails.numTeams} équipes`}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <BarChart3 className="w-5 h-5 mx-auto mb-2 text-purple-400" />
                    <p className="text-sm text-gray-400">Score Moyen</p>
                    <p className="font-semibold text-xl">{matchDetails.stats?.avgScore || '-'}</p>
                  </div>
                </div>

                {/* Teams */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Medal className="w-5 h-5 text-yellow-500" />
                    Classement des Équipes
                  </h3>
                  
                  {matchDetails.teams?.sort((a, b) => a.rank - b.rank).map((team, teamIndex) => (
                    <div 
                      key={teamIndex}
                      className={`p-4 rounded-xl border ${
                        team.rank === 1 
                          ? 'bg-yellow-500/10 border-yellow-500/30' 
                          : team.rank === 2 
                            ? 'bg-gray-400/10 border-gray-400/30'
                            : team.rank === 3
                              ? 'bg-orange-600/10 border-orange-600/30'
                              : 'bg-white/5 border-white/10'
                      }`}
                    >
                      {/* Team Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            team.rank === 1 
                              ? 'bg-yellow-500 text-black' 
                              : team.rank === 2 
                                ? 'bg-gray-400 text-black'
                                : team.rank === 3
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-white/20 text-white'
                          }`}>
                            {team.rank}
                          </div>
                          <div>
                            <p className="font-semibold">Équipe #{team.rank}</p>
                            <p className="text-sm text-gray-400">{team.playerCount} joueur{team.playerCount > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{team.totalScore}</p>
                          <p className="text-sm text-gray-400">points</p>
                        </div>
                      </div>

                      {/* Team Players */}
                      <div className="space-y-2">
                        {team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => (
                          <div 
                            key={playerIndex}
                            className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {player.playerCountryCode && (
                                <span className="text-lg" title={player.playerCountryCode}>
                                  {getCountryFlag(player.playerCountryCode)}
                                </span>
                              )}
                              <span className="font-medium">{player.playerName}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-bold text-lg">{player.score}</p>
                                <p className="text-xs text-gray-500">pts</p>
                              </div>
                              <div className="text-right min-w-[80px]">
                                <p className={`font-semibold ${player.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {player.delta > 0 ? '+' : ''}{player.delta}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {player.prevMmr} → {player.newMmr}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Link to Lounge */}
                {matchDetails.url && (
                  <div className="pt-4 border-t border-white/10">
                    <a 
                      href={matchDetails.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors text-blue-400"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Voir sur MK8DX Lounge
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Impossible de charger les détails du match</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper function to get country flag emoji
  const getCountryFlag = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-white/20 p-3 rounded-lg shadow-xl">
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

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
        {/* Navigation */}
        <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                <span className="font-bold text-xl">MK8DX Hub</span>
              </Link>
              <Link href="/dashboard">
                <span className="font-bold text-white">Dashboard</span>
              </Link>
              <Link href="/academy">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Academy</Button>
              </Link>
              <Link href="/tournaments">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Tournois</Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Leaderboard</Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.image && (
                    <Image 
                      src={user.image} 
                      alt="Avatar" 
                      width={32} 
                      height={32} 
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-300">{user.name || user.username}</span>
                </div>
              )}
              <Button 
                onClick={() => signOut({ callbackUrl: '/' })}
                variant="outline"
                size="sm"
                className="border-white/20 hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          {/* Header avec sélecteur de saison */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black mb-2">Tableau de Bord</h1>
              <p className="text-gray-400">Bienvenue, {user?.serverNickname || user?.name || 'Joueur'} !</p>
            </div>
            
            {/* Sélecteur de Saison */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {AVAILABLE_SEASONS.map((season) => (
                  <option key={season.value} value={season.value} className="bg-gray-900">
                    {season.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin mr-4" />
              <span className="text-gray-400">Chargement de vos données...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Profil Card */}
              <Card className="bg-white/5 border-white/10 lg:row-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center text-center">
                    {user?.image && (
                      <Image 
                        src={user.image} 
                        alt="Avatar" 
                        width={96} 
                        height={96} 
                        className="rounded-full mb-4 border-4 border-white/20"
                      />
                    )}
                    <h3 className="text-2xl font-bold mb-1">{loungeData?.name || user?.name || user?.username}</h3>
                    <p className="text-gray-400 text-sm mb-4">@{user?.username}</p>
                    
                    {/* Server Status */}
                    <div className="w-full p-4 bg-white/5 rounded-lg mb-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {user?.isInServer ? (
                          <Shield className="w-5 h-5 text-green-500" />
                        ) : (
                          <Shield className="w-5 h-5 text-red-500" />
                        )}
                        <span className={user?.isInServer ? 'text-green-400' : 'text-red-400'}>
                          {user?.isInServer ? 'Membre du serveur Lounge' : 'Non membre'}
                        </span>
                      </div>
                      {user?.serverNickname && (
                        <p className="text-sm">
                          <span className="text-gray-400">Nickname: </span>
                          <span className="text-blue-400 font-semibold">{user.serverNickname}</span>
                        </p>
                      )}
                    </div>

                    {/* Verification Status */}
                    {verificationData?.verified ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Award className="w-4 h-4 mr-1" />
                        Compte Vérifié
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        En attente de vérification
                      </Badge>
                    )}

                    {/* Lounge Profile Link */}
                    {(loungeData?.name || playerDetails?.playerId || playerDetails?.id) && (
                      <a 
                        href={(() => {
                          // Priorité: playerId > id > name encodé
                          const playerId = playerDetails?.playerId || playerDetails?.id || loungeData?.playerId || loungeData?.id;
                          const baseUrl = 'https://lounge.mkcentral.com/mk8dx/PlayerDetails';
                          if (playerId) {
                            return selectedSeason 
                              ? `${baseUrl}/${playerId}?season=${selectedSeason}`
                              : `${baseUrl}/${playerId}`;
                          }
                          // Fallback avec le nom encodé
                          const name = encodeURIComponent(loungeData?.name || playerDetails?.name || '');
                          return selectedSeason 
                            ? `${baseUrl}/${name}?season=${selectedSeason}`
                            : `${baseUrl}/${name}`;
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir profil Lounge
                      </a>
                    )}

                    <p className="text-xs text-gray-500 mt-4">
                      Discord ID: {user?.discordId}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* MMR Card */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    MMR & Rang
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loungeData ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-5xl font-black mb-2">{(loungeData.mmr || 0).toLocaleString('fr-FR')}</div>
                        <p className="text-gray-400 text-sm">MMR Actuel</p>
                      </div>
                      {rank && (
                        <div className="flex justify-center">
                          <Badge 
                            style={{ backgroundColor: rank.color }} 
                            className="text-black text-lg px-4 py-2"
                          >
                            {rank.name}
                          </Badge>
                        </div>
                      )}
                      {loungeData.maxMmr && (
                        <div className="text-center pt-2 border-t border-white/10">
                          <p className="text-sm text-gray-400">MMR Max: <span className="text-white font-semibold">{loungeData.maxMmr.toLocaleString('fr-FR')}</span></p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400">Données non disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Win/Loss Card - Statistiques améliorées */}
              <Card className="bg-white/5 border-white/10 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Statistiques {selectedSeason ? `(S${selectedSeason})` : '(Saison Actuelle)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loungeData || playerDetails ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-400">{playerDetails?.wins || loungeData?.wins || 0}</div>
                        <p className="text-xs text-gray-400">Victoires</p>
                      </div>
                      <div className="text-center p-3 bg-red-500/10 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-400">{playerDetails?.losses || loungeData?.losses || 0}</div>
                        <p className="text-xs text-gray-400">Défaites</p>
                      </div>
                      <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{playerDetails?.eventsPlayed || loungeData?.eventsPlayed || 0}</div>
                        <p className="text-xs text-gray-400">Events joués</p>
                      </div>
                      <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">
                          {(() => {
                            const wins = playerDetails?.wins || loungeData?.wins || 0;
                            const losses = playerDetails?.losses || loungeData?.losses || 0;
                            const total = wins + losses;
                            return total > 0 ? Math.round((wins / total) * 100) : 0;
                          })()}%
                        </div>
                        <p className="text-xs text-gray-400">Taux victoire</p>
                      </div>
                      
                      {/* Ligne 2: Stats supplémentaires */}
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xl font-bold text-yellow-400">{playerDetails?.maxMmr || loungeData?.maxMmr || '-'}</div>
                        <p className="text-xs text-gray-400">MMR Max</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xl font-bold text-cyan-400">
                          {playerDetails?.gainLoss !== undefined ? (playerDetails.gainLoss > 0 ? '+' : '') + playerDetails.gainLoss : '-'}
                        </div>
                        <p className="text-xs text-gray-400">Gain/Perte</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xl font-bold text-orange-400">{playerDetails?.largestGain || '-'}</div>
                        <p className="text-xs text-gray-400">+ Grand Gain</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xl font-bold text-pink-400">{playerDetails?.largestLoss ? `-${Math.abs(playerDetails.largestLoss)}` : '-'}</div>
                        <p className="text-xs text-gray-400">+ Grande Perte</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400">Données non disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Advanced Stats Card */}
              <Card className="bg-white/5 border-white/10 lg:row-span-1">
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
                        <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                          <span className="text-gray-400 text-sm">Score moyen</span>
                          <span className="font-bold text-lg">{advancedStats.avgScore}</span>
                        </div>
                      )}
                      {advancedStats.favoriteTier && (
                        <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                          <span className="text-gray-400 text-sm">Tier préféré</span>
                          <Badge variant="outline" className="border-white/30">
                            Tier {advancedStats.favoriteTier.tier}
                          </Badge>
                        </div>
                      )}
                      {advancedStats.avgMmrChange !== null && (
                        <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                          <span className="text-gray-400 text-sm">Δ MMR moyen</span>
                          <span className={`font-bold ${advancedStats.avgMmrChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {advancedStats.avgMmrChange > 0 ? '+' : ''}{advancedStats.avgMmrChange}
                          </span>
                        </div>
                      )}
                      {advancedStats.currentStreak && advancedStats.currentStreak.count > 1 && (
                        <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                          <span className="text-gray-400 text-sm">Série actuelle</span>
                          <span className={`font-bold ${advancedStats.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                            {advancedStats.currentStreak.count} {advancedStats.currentStreak.type === 'win' ? 'V' : 'D'}
                          </span>
                        </div>
                      )}
                      {advancedStats.recentForm && (
                        <div className="flex justify-between items-center p-2 bg-white/5 rounded">
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
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">Jouez des matchs pour voir vos stats avancées</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* MMR Evolution Chart - Même ligne que Stats Avancées */}
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

              {/* Match History */}
              <Card className="bg-white/5 border-white/10 lg:col-span-4">
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
                                onClick={() => loadMatchDetails(match.id)}
                                title="Cliquez pour voir les détails du match"
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
                    <div className="text-center py-8">
                      <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-400">Aucun match récent</p>
                      <p className="text-xs text-gray-500 mt-2">Jouez des matchs sur le Lounge pour voir votre historique</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="bg-white/5 border-white/10 lg:col-span-4">
                <CardHeader>
                  <CardTitle>Accès Rapide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link href="/leaderboard" className="block">
                      <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-center">
                        <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                        <p className="font-semibold">Leaderboard</p>
                        <p className="text-xs text-gray-400">Voir le classement</p>
                      </div>
                    </Link>
                    <Link href="/academy" className="block">
                      <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-center">
                        <Star className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="font-semibold">Academy</p>
                        <p className="text-xs text-gray-400">Améliorer vos skills</p>
                      </div>
                    </Link>
                    <Link href="/tournaments" className="block">
                      <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-center">
                        <Award className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                        <p className="font-semibold">Tournois</p>
                        <p className="text-xs text-gray-400">Compétitions</p>
                      </div>
                    </Link>
                    <a 
                      href={(() => {
                        // Priorité: playerId > id > fallback générique
                        const playerId = playerDetails?.playerId || playerDetails?.id || loungeData?.playerId || loungeData?.id;
                        const baseUrl = 'https://lounge.mkcentral.com/mk8dx/PlayerDetails';
                        if (playerId) {
                          return selectedSeason 
                            ? `${baseUrl}/${playerId}?season=${selectedSeason}`
                            : `${baseUrl}/${playerId}`;
                        }
                        // Fallback générique
                        return 'https://lounge.mkcentral.com/mk8dx';
                      })()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-center">
                        <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="font-semibold">Profil Lounge</p>
                        <p className="text-xs text-gray-400">Voir sur MKCentral</p>
                      </div>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Match Detail Modal */}
        <MatchDetailModal />
      </div>
    </RequireAuth>
  );
}
