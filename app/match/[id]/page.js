'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Calendar, Users, Trophy, Medal,
  RefreshCw, ExternalLink, Swords, Target, TrendingUp, TrendingDown, Clock
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

// Helper function to get country flag emoji
const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id;
  
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!matchId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/lounge/match/${matchId}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setMatchData(data);
        }
      } catch (err) {
        console.error('Error fetching match details:', err);
        setError('Impossible de charger les détails du match');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId]);

  // Official Lounge table image URL
  const tableImageUrl = `https://lounge.mkcentral.com/TableImage/${matchId}.png`;
  const loungeTableUrl = `https://lounge.mkcentral.com/mk8dx/TableDetails/${matchId}`;

  // Format match date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date compact for mobile
  const formatDateCompact = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Back Button - Compact on mobile */}
        <div className="mb-4 sm:mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="hover:bg-white/10 h-9 px-3 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Retour
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mb-3 sm:mb-4 text-white/50" />
            <p className="text-gray-400 text-sm sm:text-base">Chargement des détails du match...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 sm:py-20 px-4">
            <Swords className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-600" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Match introuvable</h2>
            <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
            <Button 
              onClick={() => router.back()}
              className="bg-white text-black hover:bg-white/90"
            >
              Retour
            </Button>
          </div>
        ) : matchData ? (
          <div className="max-w-5xl mx-auto space-y-5 sm:space-y-8">
            
            {/* ========== HEADER INFO - Mobile Optimized ========== */}
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6">
                Table #{matchId}
              </h1>
              
              {/* Match Info Grid - 2x2 on mobile, 4 columns on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="p-3 sm:p-4 bg-white text-black rounded-lg sm:rounded-xl">
                  <Swords className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-70">Tier</p>
                  <p className="font-black text-xl sm:text-2xl">{matchData.tier || '?'}</p>
                </div>
                <div className="p-3 sm:p-4 bg-white text-black rounded-lg sm:rounded-xl">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-70">Format</p>
                  <p className="font-black text-xl sm:text-2xl">{matchData.format || `${matchData.numTeams}v${matchData.numTeams}`}</p>
                </div>
                <div className="p-3 sm:p-4 bg-white text-black rounded-lg sm:rounded-xl">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-70">Joueurs</p>
                  <p className="font-black text-xl sm:text-2xl">{matchData.numPlayers}</p>
                </div>
                <div className="p-3 sm:p-4 bg-white text-black rounded-lg sm:rounded-xl">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-70">Date</p>
                  {/* Compact date on mobile, full on desktop */}
                  <p className="font-bold text-xs sm:text-sm hidden sm:block">
                    {formatDate(matchData.createdOn || matchData.verifiedOn)}
                  </p>
                  <p className="font-bold text-sm sm:hidden">
                    {formatDateCompact(matchData.createdOn || matchData.verifiedOn)}
                  </p>
                </div>
              </div>
            </div>

            {/* ========== OFFICIAL TABLE IMAGE - Mobile Optimized ========== */}
            <Card className="bg-zinc-900 border-white/20 overflow-hidden">
              <CardHeader className="border-b border-white/10 bg-white text-black py-3 sm:py-4 px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-black text-sm sm:text-base">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                  Image Officielle
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!imageError ? (
                  <div className="relative bg-black overflow-x-auto">
                    <img
                      src={tableImageUrl}
                      alt={`Table ${matchId} Results`}
                      className="w-full h-auto min-w-[320px]"
                      onError={() => setImageError(true)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 sm:py-16 bg-zinc-900 px-4">
                    <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 text-gray-600" />
                    <p className="text-gray-400 text-sm sm:text-base">Image non disponible</p>
                    <a 
                      href={loungeTableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 sm:mt-4 text-blue-400 hover:underline flex items-center gap-2 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Voir sur MKCentral
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ========== SCORES TABLE - Mobile Optimized ========== */}
            <Card className="bg-zinc-900 border-white/20">
              <CardHeader className="border-b border-white/10 bg-white text-black py-3 sm:py-4 px-4 sm:px-6">
                <CardTitle className="flex items-center justify-between text-black text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 sm:w-5 sm:h-5" />
                    Classement & Scores
                  </div>
                  {matchData.stats && (
                    <div className="text-xs sm:text-sm font-normal">
                      Moy: <span className="font-bold">{matchData.stats.avgScore}</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Teams */}
                <div className="divide-y divide-white/10">
                  {matchData.teams?.sort((a, b) => a.rank - b.rank).map((team, teamIndex) => (
                    <div key={teamIndex} className="p-3 sm:p-6">
                      {/* Team Header - Compact on mobile */}
                      <div className={`flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl mb-3 sm:mb-4 ${
                        team.rank === 1 
                          ? 'bg-white text-black' 
                          : team.rank === 2 
                            ? 'bg-gray-300 text-black'
                            : team.rank === 3
                              ? 'bg-gray-500 text-white'
                              : 'bg-zinc-800 text-white border border-white/20'
                      }`}>
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black text-lg sm:text-2xl ${
                            team.rank === 1 
                              ? 'bg-black text-white' 
                              : team.rank === 2 
                                ? 'bg-zinc-700 text-white'
                                : team.rank === 3
                                  ? 'bg-zinc-900 text-white'
                                  : 'bg-white/20 text-white'
                          }`}>
                            {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
                          </div>
                          <div>
                            <p className="font-bold text-base sm:text-xl">Équipe #{team.rank}</p>
                            <p className="text-xs sm:text-sm opacity-70">{team.playerCount || team.scores?.length} joueur{(team.playerCount || team.scores?.length) > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl sm:text-4xl font-black">{team.totalScore}</p>
                          <p className="text-[10px] sm:text-sm opacity-70">points</p>
                        </div>
                      </div>

                      {/* Team Players Table - Horizontal scroll on mobile */}
                      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                        <table className="w-full min-w-[400px] sm:min-w-0">
                          <thead>
                            <tr className="border-b border-white/20 text-gray-400">
                              <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm">#</th>
                              <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm">Joueur</th>
                              <th className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm">Score</th>
                              <th className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm">Δ MMR</th>
                              <th className="text-right py-2 px-2 sm:px-3 text-xs sm:text-sm">Nouveau</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => (
                              <tr 
                                key={playerIndex}
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="py-2 sm:py-3 px-2 sm:px-3 text-gray-500 text-xs sm:text-sm">{playerIndex + 1}</td>
                                <td className="py-2 sm:py-3 px-2 sm:px-3">
                                  <Link 
                                    href={`/player/${encodeURIComponent(player.playerName)}`}
                                    className="flex items-center gap-1.5 sm:gap-2 hover:text-blue-400 transition-colors"
                                  >
                                    {player.playerCountryCode && (
                                      <span className="text-sm sm:text-lg" title={player.playerCountryCode}>
                                        {getCountryFlag(player.playerCountryCode)}
                                      </span>
                                    )}
                                    <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{player.playerName}</span>
                                  </Link>
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-3 text-center">
                                  <span className="font-bold text-sm sm:text-lg">{player.score}</span>
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-3 text-center">
                                  <span className={`font-bold flex items-center justify-center gap-0.5 sm:gap-1 text-xs sm:text-sm ${
                                    player.delta > 0 ? 'text-green-400' : player.delta < 0 ? 'text-red-400' : 'text-gray-400'
                                  }`}>
                                    {player.delta > 0 ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : player.delta < 0 ? <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" /> : null}
                                    {player.delta > 0 ? '+' : ''}{player.delta}
                                  </span>
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-3 text-right">
                                  <div>
                                    <span className="font-semibold text-xs sm:text-sm">{player.newMmr?.toLocaleString('fr-FR')}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-500 ml-1 sm:ml-2 hidden sm:inline">
                                      ({player.prevMmr?.toLocaleString('fr-FR')})
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ========== MATCH STATISTICS - Mobile Optimized ========== */}
            {matchData.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="p-3 sm:p-4 bg-zinc-900 border border-white/20 rounded-lg sm:rounded-xl text-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-white" />
                  <p className="text-xl sm:text-2xl font-bold">{matchData.stats.totalPlayers}</p>
                  <p className="text-[10px] sm:text-sm text-gray-400">Joueurs</p>
                </div>
                <div className="p-3 sm:p-4 bg-zinc-900 border border-white/20 rounded-lg sm:rounded-xl text-center">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-white" />
                  <p className="text-xl sm:text-2xl font-bold">{matchData.stats.avgScore}</p>
                  <p className="text-[10px] sm:text-sm text-gray-400">Score Moy.</p>
                </div>
                <div className="p-3 sm:p-4 bg-zinc-900 border border-white/20 rounded-lg sm:rounded-xl text-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-white" />
                  <p className="text-xl sm:text-2xl font-bold">{matchData.stats.highestScore}</p>
                  <p className="text-[10px] sm:text-sm text-gray-400">Max Score</p>
                </div>
                <div className="p-3 sm:p-4 bg-zinc-900 border border-white/20 rounded-lg sm:rounded-xl text-center">
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-white" />
                  <p className="text-xl sm:text-2xl font-bold">{matchData.stats.lowestScore}</p>
                  <p className="text-[10px] sm:text-sm text-gray-400">Min Score</p>
                </div>
              </div>
            )}

            {/* ========== EXTERNAL LINK - Mobile Optimized ========== */}
            <div className="text-center pb-4 sm:pb-8">
              <a 
                href={loungeTableUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-white text-black hover:bg-gray-200 font-bold px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base">
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Voir sur MK8DX Lounge
                </Button>
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
