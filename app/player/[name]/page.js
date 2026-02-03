'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Trophy, RefreshCw, ExternalLink, 
  BarChart3, ChevronDown, ChevronUp, Swords, Shield, Users
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MatchDetailModal from '@/components/MatchDetailModal';
import TeamDetailModal from '@/components/TeamDetailModal';
import { getCurrentRank } from '@/lib/mockData';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COUNTRY_NAMES = {
  'FR': 'France', 'US': 'États-Unis', 'JP': 'Japon', 'DE': 'Allemagne',
  'GB': 'Royaume-Uni', 'CA': 'Canada', 'ES': 'Espagne', 'IT': 'Italie',
  'BR': 'Brésil', 'MX': 'Mexique', 'AU': 'Australie', 'NL': 'Pays-Bas'
};

const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  return countryCode.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(127397 + char.charCodeAt())
  );
};

const AVAILABLE_SEASONS = [
  { value: '', label: 'Saison 15' },
  { value: '14', label: 'Saison 14' },
  { value: '13', label: 'Saison 13' },
  { value: '12', label: 'Saison 12' },
];

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

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerName = decodeURIComponent(params.name);
  
  const [player, setPlayer] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [registryData, setRegistryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  useEffect(() => {
    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const seasonParam = selectedSeason ? `?season=${selectedSeason}` : '';
        const res = await fetch(`/api/lounge/player-details/${encodeURIComponent(playerName)}${seasonParam}`);
        
        if (!res.ok) {
          setError(res.status === 404 ? 'Joueur non trouvé' : 'Erreur');
          return;
        }
        
        const data = await res.json();
        if (data.error) { setError(data.error); return; }
        
        setPlayer(data);
        setPlayerDetails(data);
        
        // Fetch Registry data if mkcId available
        const registryId = data.mkcId || data.registryId;
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
      } catch (err) {
        setError('Erreur');
      } finally {
        setLoading(false);
      }
    };
    if (playerName) fetchPlayer();
  }, [playerName, selectedSeason]);

  const rank = player?.mmr ? getCurrentRank(player.mmr) : null;
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
    if (!matchHistory.length) return null;
    const mmrDeltas = matchHistory.filter(m => m.mmrDelta !== undefined).map(m => m.mmrDelta);
    const avgMmrChange = mmrDeltas.length ? Math.round(mmrDeltas.reduce((a, b) => a + b, 0) / mmrDeltas.length) : null;
    const recent10 = matchHistory.slice(0, 10);
    return {
      avgMmrChange,
      recentForm: { wins: recent10.filter(m => m.mmrDelta > 0).length, losses: recent10.filter(m => m.mmrDelta < 0).length }
    };
  })();

  const displayedMatches = showAllMatches ? matchHistory : matchHistory.slice(0, 10);
  const loungeProfileUrl = player?.playerId || player?.id 
    ? `https://lounge.mkcentral.com/mk8dx/PlayerDetails/${player.playerId || player.id}${selectedSeason ? `?season=${selectedSeason}` : ''}`
    : `https://lounge.mkcentral.com/mk8dx/PlayerDetails/${encodeURIComponent(playerName)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-20">
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin mb-3 text-gray-600" />
            <p className="text-gray-500 text-sm">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-20">
          <div className="text-center py-20">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <h2 className="text-xl font-bold mb-2">{error || 'Joueur non trouvé'}</h2>
            <p className="text-gray-500 mb-6 text-sm">"{playerName}"</p>
            <Button onClick={() => router.back()} variant="outline" className="border-white/10 text-gray-400 hover:bg-white/[0.04]">
              <ArrowLeft className="w-4 h-4 mr-2" />Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button onClick={() => router.back()} variant="ghost" className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-9 px-3">
            <ArrowLeft className="w-4 h-4 mr-2" />Retour
          </Button>
          
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-gray-400 focus:outline-none"
          >
            {AVAILABLE_SEASONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-black">{s.label}</option>
            ))}
          </select>
        </div>

        {/* Player Header */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-6 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white/[0.04] rounded-full flex items-center justify-center text-3xl font-bold text-gray-500">
              {player.name?.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl font-bold">{player.name}</h1>
                {player.countryCode && <span className="text-xl">{getCountryFlag(player.countryCode)}</span>}
              </div>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {rank && (
                  <Badge style={{ backgroundColor: rank.color }} className="text-black text-xs px-2 font-semibold">
                    {rank.name}
                  </Badge>
                )}
                {player.overallRank && <span className="text-xs text-gray-500">#{player.overallRank}</span>}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">MMR</p>
              <div className="text-4xl font-black">{(player.mmr || 0).toLocaleString('fr-FR')}</div>
              {player.maxMmr && <p className="text-xs text-yellow-500 mt-1">Peak: {player.maxMmr.toLocaleString('fr-FR')}</p>}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/[0.04] text-center">
            <a href={loungeProfileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm">
              <ExternalLink className="w-3 h-3" />MK8DX Lounge
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Wins', value: playerDetails?.wins || 0, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Losses', value: playerDetails?.losses || 0, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Events', value: player.eventsPlayed || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Win %', value: `${(() => {
              const w = playerDetails?.wins || 0, l = playerDetails?.losses || 0;
              return w + l > 0 ? Math.round((w / (w + l)) * 100) : 0;
            })()}%`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border border-white/[0.04] rounded-lg p-3 text-center`}>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Second Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Max MMR', value: player.maxMmr || '-' },
            { label: 'Gain/Perte', value: playerDetails?.gainLoss !== undefined ? (playerDetails.gainLoss > 0 ? '+' : '') + playerDetails.gainLoss : '-', color: playerDetails?.gainLoss > 0 ? 'text-green-500' : playerDetails?.gainLoss < 0 ? 'text-red-500' : '' },
            { label: '+ Grand Gain', value: playerDetails?.largestGain ? `+${playerDetails.largestGain}` : '-', color: 'text-green-500' },
            { label: '+ Grande Perte', value: playerDetails?.largestLoss || '-', color: 'text-red-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-center">
              <div className={`text-sm font-bold ${s.color || 'text-gray-300'}`}>{s.value}</div>
              <p className="text-[10px] text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Advanced Stats */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <div className="px-4 py-3 border-b border-white/[0.04]">
              <span className="text-sm font-medium text-gray-400">Stats Avancées</span>
            </div>
            <div className="p-4">
              {advancedStats ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-white/[0.02] rounded">
                    <span className="text-gray-500 text-xs">Δ MMR moy.</span>
                    <span className={`font-bold ${advancedStats.avgMmrChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {advancedStats.avgMmrChange > 0 ? '+' : ''}{advancedStats.avgMmrChange}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/[0.02] rounded">
                    <span className="text-gray-500 text-xs">10 derniers</span>
                    <span>
                      <span className="text-green-500 font-bold">{advancedStats.recentForm.wins}W</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-red-500 font-bold">{advancedStats.recentForm.losses}L</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                  <p className="text-gray-600 text-xs">Pas de données</p>
                </div>
              )}
            </div>
          </div>

          {/* MMR Chart */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl lg:col-span-2">
            <div className="px-4 py-3 border-b border-white/[0.04]">
              <span className="text-sm font-medium text-gray-400">Évolution MMR</span>
            </div>
            <div className="p-4">
              {mmrChartData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mmrChartData}>
                      <defs>
                        <linearGradient id="mmrGradPlayer" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#333" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#333" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} width={45} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="mmr" stroke="#22c55e" strokeWidth={2} fill="url(#mmrGradPlayer)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-gray-600 text-sm">Pas de données</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Historique ({matchHistory.length})</span>
          </div>
          
          {matchHistory.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase border-b border-white/[0.04]">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-center py-3 px-4 font-medium">Tier</th>
                      <th className="text-center py-3 px-4 font-medium">Format</th>
                      <th className="text-center py-3 px-4 font-medium">Score</th>
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
                          className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => match.id && setSelectedMatchId(match.id)}
                        >
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {new Date(match.time).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/[0.04] text-gray-400 text-xs">
                              {match.tier || '?'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-500 text-sm">
                            {getMatchFormat(match.numTeams, match.numPlayers)}
                          </td>
                          <td className="py-3 px-4 text-center text-white font-medium">{match.score ?? '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${isWin ? 'text-green-500' : isLoss ? 'text-red-500' : 'text-gray-500'}`}>
                              {match.mmrDelta > 0 ? '+' : ''}{match.mmrDelta}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300 font-medium">
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
                  <Button variant="ghost" size="sm" onClick={() => setShowAllMatches(!showAllMatches)} className="text-gray-500 hover:text-white">
                    {showAllMatches ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                    {showAllMatches ? 'Moins' : `Tout (${matchHistory.length})`}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Swords className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">Aucun match</p>
            </div>
          )}
        </div>

        {/* Teams & Tournament History Grid */}
        {registryData && (registryData.teams?.length > 0 || registryData.tournamentHistory?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Teams Section */}
            {registryData.teams && registryData.teams.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <div className="px-4 py-3 border-b border-white/[0.04]">
                  <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Teams ({registryData.teams.length})
                  </span>
                </div>
                <div className="p-4">
                  {registryData.teams.map((team, index) => (
                    <div key={index} className="p-3 mb-2 last:mb-0 bg-white/[0.02] border border-white/[0.04] rounded-lg hover:border-white/[0.08] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white">{team.name}</h4>
                            {team.isCurrent && (
                              <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 text-xs">
                                Actuelle
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs border-white/[0.08] text-gray-400">
                              {team.gameHuman || team.game}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-white/[0.08] text-gray-400">
                              {team.mode}
                            </Badge>
                          </div>
                        </div>
                        {team.url && (
                          <a 
                            href={`https://mkcentral.com${team.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tournament History Section */}
            {registryData.tournamentHistory && registryData.tournamentHistory.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <div className="px-4 py-3 border-b border-white/[0.04]">
                  <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Tournament History ({registryData.tournamentHistory.length})
                  </span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {registryData.tournamentHistory.slice(0, 10).map((tournament, index) => (
                    <div key={index} className="p-3 mb-2 last:mb-0 bg-white/[0.02] border border-white/[0.04] rounded-lg hover:border-white/[0.08] transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white text-sm">{tournament.name}</h4>
                            {tournament.url && (
                              <a 
                                href={`https://mkcentral.com${tournament.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-white transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        <Badge 
                          className={`${
                            tournament.placement === 1 
                              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                              : tournament.placement <= 3 
                              ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' 
                              : 'bg-white/[0.02] text-gray-500 border border-white/[0.04]'
                          }`}
                        >
                          {tournament.placementText || tournament.placement || '?'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{tournament.dateHuman || `${tournament.startDate || '?'} - ${tournament.endDate || '?'}`}</span>
                        {tournament.team && <span className="text-gray-400">{tournament.team}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMatchId && (
        <MatchDetailModal matchId={selectedMatchId} onClose={() => setSelectedMatchId(null)} />
      )}
    </div>
  );
}