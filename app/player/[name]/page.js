'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Trophy, TrendingUp, TrendingDown, Target,
  Gamepad2, Calendar, RefreshCw, User, Award, History,
  BarChart3, Clock, ChevronDown, ChevronUp, ExternalLink,
  Users, Medal, Globe
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getCurrentRank } from '@/lib/mockData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

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
  switch (playersPerTeam) {
    case 2: return '2v2';
    case 3: return '3v3';
    case 4: return '4v4';
    case 6: return '6v6';
    default: return `${playersPerTeam}v${playersPerTeam}`;
  }
};

// Helper function to get country flag emoji
const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return null;
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function PlayerProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const playerName = decodeURIComponent(params.name || '');
  const initialSeason = searchParams.get('season') || '';

  const [playerDetails, setPlayerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const fetchPlayerData = useCallback(async () => {
    if (!playerName) return;

    setLoading(true);
    setError(null);

    try {
      const seasonParam = selectedSeason ? `?season=${selectedSeason}` : '';
      const res = await fetch(`/api/lounge/player-details/${encodeURIComponent(playerName)}${seasonParam}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data && data.name) {
        setPlayerDetails(data);
      } else {
        setError('Joueur introuvable');
      }
    } catch (err) {
      console.error('Error fetching player data:', err);
      setError('Impossible de charger les données du joueur');
    } finally {
      setLoading(false);
    }
  }, [playerName, selectedSeason]);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  const rank = playerDetails?.mmr ? getCurrentRank(playerDetails.mmr) : null;
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
        <div className="bg-gray-900 border border-white/20 p-3 rounded-lg shadow-xl">
          <p className="text-sm text-gray-400">{data.date}</p>
          <p className="text-lg font-bold">{data.mmr?.toLocaleString('fr-FR')} MMR</p>
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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Back Button & Season Selector */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <Link href="/leaderboard">
            <Button variant="ghost" className="hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au Leaderboard
            </Button>
          </Link>

          {/* Season Selector */}
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
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-12 h-12 animate-spin mb-4 text-white/50" />
            <p className="text-gray-400">Chargement du profil...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">Joueur introuvable</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link href="/leaderboard">
              <Button className="bg-white text-black hover:bg-white/90">
                Retour au Leaderboard
              </Button>
            </Link>
          </div>
        ) : playerDetails ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Profile Card */}
            <Card className="bg-white/5 border-white/10 lg:row-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center">
                  {/* Player Avatar/Icon */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 border-4 border-white/20">
                    <span className="text-4xl font-black text-white">
                      {playerDetails.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    {playerDetails.countryCode && (
                      <span className="text-xl">{getCountryFlag(playerDetails.countryCode)}</span>
                    )}
                    {playerDetails.name}
                  </h3>

                  {/* Rank Badge */}
                  {rank && (
                    <Badge
                      style={{ backgroundColor: rank.color }}
                      className="text-black text-lg px-4 py-2 mt-4"
                    >
                      {rank.name}
                    </Badge>
                  )}

                  {/* MMR Display */}
                  <div className="mt-6 p-4 bg-white/5 rounded-lg w-full">
                    <p className="text-sm text-gray-400">MMR Actuel</p>
                    <p className="text-4xl font-black">{(playerDetails.mmr || 0).toLocaleString('fr-FR')}</p>
                  </div>

                  {playerDetails.maxMmr && (
                    <div className="mt-4 w-full">
                      <p className="text-sm text-gray-400">
                        MMR Max: <span className="text-white font-semibold">{playerDetails.maxMmr.toLocaleString('fr-FR')}</span>
                      </p>
                    </div>
                  )}

                  {/* Lounge Profile Link */}
                  <a
                    href={playerDetails.loungeProfileUrl || `https://lounge.mkcentral.com/mk8dx/PlayerDetails/${playerDetails.playerId || playerDetails.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir profil Lounge
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Card */}
            <Card className="bg-white/5 border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Statistiques {selectedSeason ? `(S${selectedSeason})` : '(Saison Actuelle)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <div className="text-2xl font-bold text-green-400">{playerDetails.wins || 0}</div>
                    <p className="text-xs text-gray-400">Victoires</p>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-lg">
                    <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
                    <div className="text-2xl font-bold text-red-400">{playerDetails.losses || 0}</div>
                    <p className="text-xs text-gray-400">Défaites</p>
                  </div>
                  <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{playerDetails.eventsPlayed || 0}</div>
                    <p className="text-xs text-gray-400">Events joués</p>
                  </div>
                  <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">
                      {(() => {
                        const wins = playerDetails.wins || 0;
                        const losses = playerDetails.losses || 0;
                        const total = wins + losses;
                        return total > 0 ? Math.round((wins / total) * 100) : 0;
                      })()}%
                    </div>
                    <p className="text-xs text-gray-400">Taux victoire</p>
                  </div>

                  {/* Row 2 */}
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-yellow-400">{playerDetails.maxMmr || '-'}</div>
                    <p className="text-xs text-gray-400">MMR Max</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-cyan-400">
                      {playerDetails.gainLoss !== undefined ? (playerDetails.gainLoss > 0 ? '+' : '') + playerDetails.gainLoss : '-'}
                    </div>
                    <p className="text-xs text-gray-400">Gain/Perte</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-orange-400">{playerDetails.largestGain || '-'}</div>
                    <p className="text-xs text-gray-400">+ Grand Gain</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-pink-400">
                      {playerDetails.largestLoss ? `-${Math.abs(playerDetails.largestLoss)}` : '-'}
                    </div>
                    <p className="text-xs text-gray-400">+ Grande Perte</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <div className="space-y-3">
                    {advancedStats.avgScore !== null && (
                      <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                        <span className="text-gray-400 text-sm">Score moyen</span>
                        <span className="font-bold">{advancedStats.avgScore}</span>
                      </div>
                    )}
                    {advancedStats.favoriteTier && (
                      <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                        <span className="text-gray-400 text-sm">Tier préféré</span>
                        <Badge variant="outline" className="border-white/30">T{advancedStats.favoriteTier.tier}</Badge>
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
                        <span className="text-gray-400 text-sm">Série</span>
                        <span className={`font-bold ${advancedStats.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                          {advancedStats.currentStreak.count} {advancedStats.currentStreak.type === 'win' ? 'V' : 'D'}
                        </span>
                      </div>
                    )}
                    {advancedStats.recentForm && (
                      <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                        <span className="text-gray-400 text-sm">Forme (10)</span>
                        <span>
                          <span className="text-green-400 font-bold">{advancedStats.recentForm.wins}V</span>
                          {' / '}
                          <span className="text-red-400 font-bold">{advancedStats.recentForm.losses}D</span>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">Pas assez de données</p>
                )}
              </CardContent>
            </Card>

            {/* MMR Chart */}
            <Card className="bg-white/5 border-white/10 lg:col-span-3">
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
                          <linearGradient id="mmrGradientPlayer" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                          fill="url(#mmrGradientPlayer)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">Pas assez de données pour le graphique</p>
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
                      {matchHistory.length} matchs
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
                              onClick={() => window.location.href = `/match/${match.id}`}
                              title="Cliquez pour voir les détails"
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
                                <Badge variant="outline" className="border-white/20">T{match.tier || '?'}</Badge>
                              </td>
                              <td className="py-3 px-4 text-center text-sm text-gray-400">
                                {getMatchFormat(match.numTeams, match.numPlayers)}
                              </td>
                              <td className="py-3 px-4 text-center font-semibold">{match.score ?? '-'}</td>
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
                            <><ChevronUp className="w-4 h-4 mr-2" />Voir moins</>
                          ) : (
                            <><ChevronDown className="w-4 h-4 mr-2" />Voir tout ({matchHistory.length} matchs)</>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">Aucun match récent</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
