'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, TrendingUp, TrendingDown, Target, 
  Gamepad2, Star, Calendar, RefreshCw,
  User, Shield, Award, History, BarChart3,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import RequireAuth from '@/components/RequireAuth';
import Navbar from '@/components/Navbar';
import MatchDetailModal from '@/components/MatchDetailModal';
import TeamDetailModal from '@/components/TeamDetailModal';
import SQPlanningCard from '@/components/SQPlanningCard';
import { getCurrentRank } from '@/lib/mockData';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const AVAILABLE_SEASONS = [
  { value: '', label: 'Saison 15 (Actuelle)' },
  { value: '14', label: 'Saison 14' },
  { value: '13', label: 'Saison 13' },
  { value: '12', label: 'Saison 12' },
  { value: '11', label: 'Saison 11' },
];

// Helper to convert country code to flag emoji
const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  return countryCode.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(127397 + char.charCodeAt())
  );
};

const getMatchFormat = (numTeams, numPlayers) => {
  if (!numTeams || !numPlayers) return '-';
  if (numTeams === numPlayers) return 'FFA';
  const playersPerTeam = Math.floor(numPlayers / numTeams);
  return `${playersPerTeam}v${playersPerTeam}`;
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-xs text-gray-500">{data.date}</p>
        <p className="text-lg font-bold text-white">{data.mmr.toLocaleString('fr-FR')}</p>
        <p className={`text-sm font-medium ${data.delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {data.delta > 0 ? '+' : ''}{data.delta}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [playerStats, setPlayerStats] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [registryData, setRegistryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Animation mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const verifyRes = await fetch('/api/verification/status');
        const verifyData = await verifyRes.json();
        setVerificationData(verifyData);

        if (verifyData.verified && verifyData.user?.loungeName) {
          const loungeName = verifyData.user.loungeName;
          
          const loungeRes = await fetch(`/api/admin/lounge-search?name=${encodeURIComponent(loungeName)}${selectedSeason ? `&season=${selectedSeason}` : ''}`);
          const loungeData = await loungeRes.json();
          if (loungeData.found) setPlayerStats(loungeData);

          const detailsRes = await fetch(`/api/lounge/player-details/${encodeURIComponent(loungeName)}${selectedSeason ? `?season=${selectedSeason}` : ''}`);
          const detailsData = await detailsRes.json();
          if (detailsData && detailsData.name) {
            setPlayerDetails(detailsData);
            
            // Fetch Registry data (teams + tournaments) if mkcId is available
            const registryId = detailsData.mkcId || detailsData.registryId;
            if (registryId) {
              try {
                const registryRes = await fetch(`/api/registry/player/${registryId}`);
                const registryData = await registryRes.json();
                if (registryData && !registryData.error) {
                  setRegistryData(registryData);
                }
              } catch (err) {
                console.warn('Registry data not available:', err);
              }
            }
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
  const matchHistory = playerDetails?.matchHistory || [];
  const mmrChanges = playerDetails?.mmrChanges || [];
  
  const mmrChartData = mmrChanges
    .filter(c => c.reason === 'Table')
    .slice(0, 50)
    .reverse()
    .map((change, index) => ({
      index,
      date: new Date(change.time).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      mmr: change.newMmr,
      delta: change.mmrDelta,
    }));

  const advancedStats = (() => {
    if (!matchHistory || matchHistory.length === 0) return null;
    
    const mmrDeltas = matchHistory.filter(m => m.mmrDelta !== undefined).map(m => m.mmrDelta);
    const avgMmrChange = mmrDeltas.length > 0 ? Math.round(mmrDeltas.reduce((a, b) => a + b, 0) / mmrDeltas.length) : null;
    
    const recent10 = matchHistory.slice(0, 10);
    const wins10 = recent10.filter(m => m.mmrDelta > 0).length;
    const losses10 = recent10.filter(m => m.mmrDelta < 0).length;
    
    return { avgMmrChange, recentForm: { wins: wins10, losses: losses10 } };
  })();

  const displayedMatches = showAllMatches ? matchHistory : matchHistory.slice(0, 10);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <div className="container mx-auto px-4 py-8 pt-20">
          {/* Header with animation */}
          <div className={`mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div>
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Dashboard</h1>
              <p className="text-gray-500">Bienvenue, <span className="text-gray-300 font-medium">{user?.serverNickname || user?.name || 'Joueur'}</span></p>
            </div>
            
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/20 hover:border-white/10 transition-all duration-300 cursor-pointer"
            >
              {AVAILABLE_SEASONS.map((season) => (
                <option key={season.value} value={season.value} className="bg-black">
                  {season.label}
                </option>
              ))}
            </select>
          </div>

          {/* SQ Planning Card - Show user's selected SQs */}
          <div className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <SQPlanningCard showManageButton={true} maxItems={4} />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="spinner-trail mb-4" />
              <span className="text-gray-500">Chargement de vos données...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Profile Card */}
              <Card className={`card-premium lg:row-span-2 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    {user?.image && (
                      <div className="relative group mb-4">
                        <Image 
                          src={user.image} 
                          alt="" 
                          width={80} 
                          height={80} 
                          className="rounded-full border-2 border-white/10 transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {/* Online indicator */}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{loungeData?.name || user?.name}</h3>
                      {(playerDetails?.countryCode || loungeData?.countryCode) && (
                        <span className="text-xl transition-transform duration-300 hover:scale-125">{getCountryFlag(playerDetails?.countryCode || loungeData?.countryCode)}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-4">@{user?.username}</p>
                    
                    <div className="w-full p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg mb-4 hover:border-white/[0.08] transition-all duration-300">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Shield className={`w-4 h-4 ${user?.isInServer ? 'text-green-500' : 'text-red-500'} transition-transform duration-300 hover:scale-110`} />
                        <span className={`text-sm ${user?.isInServer ? 'text-green-500' : 'text-red-500'}`}>
                          {user?.isInServer ? 'Membre Lounge' : 'Non membre'}
                        </span>
                      </div>
                    </div>

                    {verificationData?.verified ? (
                      <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 badge-shine">
                        <Award className="w-3 h-3 mr-1" />
                        Vérifié
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 badge-pulse">
                        En attente
                      </Badge>
                    )}

                    {/* Liens externes */}
                    <div className="flex flex-col gap-2 mt-4">
                      {(playerDetails?.playerId || playerDetails?.id || loungeData?.playerId || loungeData?.id) && (
                        <a 
                          href={`https://lounge.mkcentral.com/mk8dx/PlayerDetails/${playerDetails?.playerId || playerDetails?.id || loungeData?.playerId || loungeData?.id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-all duration-300 hover:translate-x-1 group"
                        >
                          <ExternalLink className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
                          MK8DX Lounge
                        </a>
                      )}
                      <a 
                        href={playerDetails?.mkcId 
                          ? `https://mkcentral.com/fr/registry/players/profile?id=${playerDetails.mkcId}` 
                          : 'https://mkcentral.com/fr/registry/players'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-all duration-300 hover:translate-x-1 group"
                      >
                        <ExternalLink className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
                        MKCentral
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MMR Card */}
              <Card className={`card-premium transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
                <CardContent className="p-6">
                  {loungeData ? (
                    <div className="text-center">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">MMR Actuel</p>
                      <div className="text-4xl font-black text-white mb-3 transition-all duration-500 hover:scale-105">
                        {(loungeData.mmr || 0).toLocaleString('fr-FR')}
                      </div>
                      {rank && (
                        <Badge style={{ backgroundColor: rank.color }} className="text-black font-semibold badge-shine transition-transform duration-300 hover:scale-110">
                          {rank.name}
                        </Badge>
                      )}
                      {loungeData.maxMmr && (
                        <p className="text-gray-500 text-xs mt-3">
                          Peak: <span className="text-yellow-500 font-medium transition-all duration-300 hover:text-yellow-400">{loungeData.maxMmr.toLocaleString('fr-FR')}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center">Non disponible</p>
                  )}
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className={`card-premium lg:col-span-2 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '250ms' }}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Wins', value: playerDetails?.wins || loungeData?.wins || 0, color: 'text-green-500', bg: 'bg-green-500/10', statClass: 'stat-green' },
                      { label: 'Losses', value: playerDetails?.losses || loungeData?.losses || 0, color: 'text-red-500', bg: 'bg-red-500/10', statClass: 'stat-red' },
                      { label: 'Events', value: playerDetails?.eventsPlayed || loungeData?.eventsPlayed || 0, color: 'text-blue-500', bg: 'bg-blue-500/10', statClass: 'stat-blue' },
                      { label: 'Win %', value: `${(() => {
                        const w = playerDetails?.wins || loungeData?.wins || 0;
                        const l = playerDetails?.losses || loungeData?.losses || 0;
                        return w + l > 0 ? Math.round((w / (w + l)) * 100) : 0;
                      })()}%`, color: 'text-purple-500', bg: 'bg-purple-500/10', statClass: 'stat-purple' },
                    ].map((stat, i) => (
                      <div key={i} className={`stat-card ${stat.statClass} text-center p-3 ${stat.bg} rounded-lg border border-transparent cursor-default`}>
                        <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        <p className="text-[10px] text-gray-500 uppercase">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  
                  {advancedStats && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="p-3 bg-white/[0.02] rounded-lg flex justify-between items-center hover:bg-white/[0.04] transition-all duration-300 group">
                        <span className="text-gray-500 text-xs">Δ MMR moy.</span>
                        <span className={`font-bold ${advancedStats.avgMmrChange >= 0 ? 'text-green-500' : 'text-red-500'} group-hover:scale-110 transition-transform duration-300`}>
                          {advancedStats.avgMmrChange > 0 ? '+' : ''}{advancedStats.avgMmrChange}
                        </span>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-lg flex justify-between items-center hover:bg-white/[0.04] transition-all duration-300 group">
                        <span className="text-gray-500 text-xs">10 derniers</span>
                        <span className="group-hover:scale-110 transition-transform duration-300">
                          <span className="text-green-500 font-bold">{advancedStats.recentForm.wins}W</span>
                          <span className="text-gray-600 mx-1">/</span>
                          <span className="text-red-500 font-bold">{advancedStats.recentForm.losses}L</span>
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* MMR Chart */}
              <Card className={`card-premium lg:col-span-3 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-500" />
                    Évolution MMR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mmrChartData.length > 0 ? (
                    <div className="h-48 chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mmrChartData}>
                          <defs>
                            <linearGradient id="mmrGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#333" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
                          <YAxis stroke="#333" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="mmr" stroke="#22c55e" strokeWidth={2} fill="url(#mmrGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <p className="text-gray-600 text-sm">Pas de données</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Match History */}
              <Card className={`card-premium lg:col-span-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '350ms' }}>
                <CardHeader className="border-b border-white/[0.04] pb-4">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    Historique ({matchHistory.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {matchHistory.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/[0.04]">
                              <th className="text-left py-3 px-4 font-medium">#</th>
                              <th className="text-left py-3 px-4 font-medium">Date</th>
                              <th className="text-center py-3 px-4 font-medium">Tier</th>
                              <th className="text-center py-3 px-4 font-medium">Format</th>
                              <th className="text-center py-3 px-4 font-medium">Change</th>
                              <th className="text-right py-3 px-4 font-medium">MMR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {displayedMatches.map((match, index) => {
                              const isWin = match.mmrDelta > 0;
                              const isLoss = match.mmrDelta < 0;
                              
                              return (
                                <tr 
                                  key={match.id || index}
                                  className="table-row-hover cursor-pointer group"
                                  onClick={() => match.id && setSelectedMatchId(match.id)}
                                  style={{ animationDelay: `${index * 30}ms` }}
                                >
                                  <td className="py-3 px-4 text-gray-600 text-sm">{index + 1}</td>
                                  <td className="py-3 px-4 text-gray-400 text-sm">
                                    {new Date(match.time).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/[0.04] text-gray-400 text-xs group-hover:bg-white/[0.08] transition-colors duration-300">
                                      {match.tier || '?'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center text-gray-500 text-sm">
                                    {getMatchFormat(match.numTeams, match.numPlayers)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`font-bold transition-transform duration-300 group-hover:scale-110 inline-block ${isWin ? 'text-green-500' : isLoss ? 'text-red-500' : 'text-gray-500'}`}>
                                      {match.mmrDelta > 0 ? '+' : ''}{match.mmrDelta}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right text-white font-medium">
                                    {(match.newMmr || 0).toLocaleString('fr-FR')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {matchHistory.length > 10 && (
                        <div className="py-3 text-center border-t border-white/[0.04]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllMatches(!showAllMatches)}
                            className="text-gray-500 hover:text-white group"
                          >
                            {showAllMatches ? <ChevronUp className="w-4 h-4 mr-1 group-hover:-translate-y-0.5 transition-transform" /> : <ChevronDown className="w-4 h-4 mr-1 group-hover:translate-y-0.5 transition-transform" />}
                            {showAllMatches ? 'Moins' : `Tout (${matchHistory.length})`}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-gray-700 animate-bounce-subtle" />
                      <p className="text-gray-500">Aucun match</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Teams Section */}
              <Card className={`card-premium lg:col-span-2 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '400ms' }}>
                <CardHeader className="border-b border-white/[0.04] pb-4">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    Teams {registryData?.teams?.length > 0 ? `(${registryData.teams.length})` : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {registryData?.teams && registryData.teams.length > 0 ? (
                    registryData.teams.map((team, index) => (
                      <div 
                        key={index} 
                        className="p-3 mb-2 last:mb-0 bg-white/[0.02] border border-white/[0.04] rounded-lg hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 cursor-pointer group"
                        onClick={() => team.id && setSelectedTeamId(team.id)}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">{team.name}</h4>
                              {team.isCurrent && (
                                <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 text-xs badge-pulse">
                                  Actuelle
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1.5">
                              <Badge variant="outline" className="text-xs border-white/[0.08] text-gray-400 group-hover:border-white/[0.15] transition-colors duration-300">
                                {team.gameHuman || team.game}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-white/[0.08] text-gray-400 group-hover:border-white/[0.15] transition-colors duration-300">
                                {team.mode}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors duration-300">Voir roster →</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                      <p className="text-gray-500 text-sm mb-2">
                        {!verificationData?.verified ? 'Compte non vérifié' : 'Aucune équipe trouvée'}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {!verificationData?.verified ? (
                          <>Votre compte doit être vérifié pour afficher vos équipes MKCentral.</>
                        ) : !playerDetails?.mkcId ? (
                          <>Votre compte Lounge n'est pas lié à un profil MKCentral Registry.</>
                        ) : (
                          <>Vous n'êtes pas membre d'une équipe sur MKCentral.</>
                        )}
                      </p>
                      {playerDetails?.mkcId && verificationData?.verified && (
                        <a 
                          href={`https://mkcentral.com/fr/registry/players/profile?id=${playerDetails.mkcId}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-xs text-blue-500 hover:text-blue-400 transition-colors duration-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Voir mon profil MKCentral
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tournament History Section */}
              <Card className={`card-premium lg:col-span-2 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '450ms' }}>
                <CardHeader className="border-b border-white/[0.04] pb-4">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Tournament History {registryData?.tournamentHistory?.length > 0 ? `(${registryData.tournamentHistory.length})` : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {registryData?.tournamentHistory && registryData.tournamentHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/[0.04]">
                            <th className="text-left py-3 px-4 font-medium">Tournament</th>
                            <th className="text-left py-3 px-4 font-medium">Date</th>
                            <th className="text-left py-3 px-4 font-medium">Team</th>
                            <th className="text-center py-3 px-4 font-medium">Place</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {registryData.tournamentHistory.slice(0, 10).map((tournament, index) => (
                            <tr key={index} className="table-row-hover" style={{ animationDelay: `${index * 30}ms` }}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">{tournament.name}</span>
                                  {tournament.url && (
                                    <a 
                                      href={`https://mkcentral.com${tournament.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-500 hover:text-white transition-all duration-300 hover:scale-110"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-400 text-sm">
                                {tournament.dateHuman || `${tournament.startDate || '?'} - ${tournament.endDate || '?'}`}
                              </td>
                              <td className="py-3 px-4 text-gray-400 text-sm">
                                {tournament.team || '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge 
                                  className={`transition-transform duration-300 hover:scale-110 ${
                                    tournament.placement === 1 
                                      ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 badge-shine' 
                                      : tournament.placement <= 3 
                                      ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' 
                                      : 'bg-white/[0.02] text-gray-500 border border-white/[0.04]'
                                  }`}
                                >
                                  {tournament.placementText || tournament.placement || '?'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4">
                      <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                      <p className="text-gray-500 text-sm mb-2">Aucun tournoi trouvé</p>
                      <p className="text-gray-600 text-xs">
                        L'historique des tournois n'est pas encore disponible via l'API MKCentral.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className={`card-premium lg:col-span-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '500ms' }}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'text-yellow-500', bg: 'bg-yellow-500/10', hoverBg: 'hover:bg-yellow-500/20' },
                      { href: '/academy', icon: Star, label: 'Academy', color: 'text-blue-500', bg: 'bg-blue-500/10', hoverBg: 'hover:bg-blue-500/20' },
                      { href: '/tournaments', icon: Award, label: 'Tournois', color: 'text-purple-500', bg: 'bg-purple-500/10', hoverBg: 'hover:bg-purple-500/20' },
                    ].map((link, i) => (
                      <Link key={i} href={link.href}>
                        <div className={`p-4 ${link.bg} ${link.hoverBg} rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg group cursor-pointer`}>
                          <link.icon className={`w-6 h-6 mx-auto mb-2 ${link.color} group-hover:scale-110 transition-transform duration-300`} />
                          <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-300">{link.label}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {selectedMatchId && (
          <MatchDetailModal matchId={selectedMatchId} onClose={() => setSelectedMatchId(null)} />
        )}

        {selectedTeamId && (
          <TeamDetailModal teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
        )}
      </div>
    </RequireAuth>
  );
}