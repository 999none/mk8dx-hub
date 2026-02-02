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

// Get format info with details
const getFormatInfo = (numTeams, numPlayers) => {
  if (!numTeams || !numPlayers) return { format: '-', isTeamFormat: false, playersPerTeam: 1 };
  if (numTeams === numPlayers) return { format: 'FFA', isTeamFormat: false, playersPerTeam: 1 };
  const playersPerTeam = Math.floor(numPlayers / numTeams);
  return { 
    format: `${playersPerTeam}v${playersPerTeam}`, 
    isTeamFormat: playersPerTeam >= 2, 
    playersPerTeam,
    numTeams 
  };
};

// Team colors for different ranks
const TEAM_COLORS = [
  { bg: 'bg-gray-100', text: 'text-black', rankBg: 'bg-black', rankText: 'text-white' },     // 1st
  { bg: 'bg-gray-400', text: 'text-black', rankBg: 'bg-gray-700', rankText: 'text-white' },  // 2nd  
  { bg: 'bg-gray-600', text: 'text-white', rankBg: 'bg-gray-900', rankText: 'text-white' },  // 3rd
  { bg: 'bg-blue-900', text: 'text-white', rankBg: 'bg-blue-600', rankText: 'text-white' },  // 4th
  { bg: 'bg-purple-900', text: 'text-white', rankBg: 'bg-purple-600', rankText: 'text-white' }, // 5th
  { bg: 'bg-pink-900', text: 'text-white', rankBg: 'bg-pink-600', rankText: 'text-white' },  // 6th
];

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id;
  
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="hover:bg-neutral-900 text-gray-400 hover:text-white h-9 px-3 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Retour
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mb-3 sm:mb-4 text-gray-600" />
            <p className="text-gray-500 text-sm sm:text-base">Chargement...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 sm:py-20 px-4">
            <Swords className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-700" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-300">Match introuvable</h2>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
            <Button 
              onClick={() => router.back()}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-neutral-900"
            >
              Retour
            </Button>
          </div>
        ) : matchData ? (
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            
            {/* ========== HEADER INFO ========== */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-100">
                Table #{matchId}
              </h1>
              
              {/* Match Info Grid - Minimal style */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-xl mx-auto">
                <div className="p-2 sm:p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Tier</p>
                  <p className="font-bold text-lg sm:text-xl text-gray-100">{matchData.tier || '?'}</p>
                </div>
                <div className="p-2 sm:p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Format</p>
                  <p className="font-bold text-lg sm:text-xl text-gray-100">
                    {getFormatInfo(matchData.numTeams, matchData.numPlayers).format}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Joueurs</p>
                  <p className="font-bold text-lg sm:text-xl text-gray-100">{matchData.numPlayers}</p>
                </div>
                <div className="p-2 sm:p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Date</p>
                  <p className="font-medium text-xs sm:text-sm text-gray-300">
                    {formatDateCompact(matchData.createdOn || matchData.verifiedOn)}
                  </p>
                </div>
              </div>
            </div>

            {/* ========== OFFICIAL TABLE IMAGE ========== */}
            <div className="bg-neutral-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Image Officielle</span>
                <a 
                  href={loungeTableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  MKCentral
                </a>
              </div>
              {!imageError ? (
                <div className="bg-black overflow-x-auto">
                  <img
                    src={tableImageUrl}
                    alt={`Table ${matchId} Results`}
                    className="w-full h-auto min-w-[320px]"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Trophy className="w-10 h-10 mb-3 text-gray-700" />
                  <p className="text-gray-500 text-sm">Image non disponible</p>
                </div>
              )}
            </div>

            {/* ========== SCORES TABLE ========== */}
            <div className="bg-neutral-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Classement</span>
                {matchData.stats && (
                  <span className="text-xs text-gray-500">
                    Moy: <span className="text-gray-400">{matchData.stats.avgScore}</span>
                  </span>
                )}
              </div>
              
              {/* Teams */}
              <div className="divide-y divide-gray-800">
                {matchData.teams?.sort((a, b) => a.rank - b.rank).map((team, teamIndex) => (
                  <div key={teamIndex} className="p-3 sm:p-4">
                    {/* Team Header */}
                    <div className={`flex items-center justify-between p-3 rounded-lg mb-3 ${
                      team.rank === 1 
                        ? 'bg-gray-100 text-black' 
                        : team.rank === 2 
                          ? 'bg-gray-400 text-black'
                          : team.rank === 3
                            ? 'bg-gray-600 text-white'
                            : 'bg-neutral-800 text-gray-300 border border-gray-700'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg ${
                          team.rank === 1 
                            ? 'bg-black text-white' 
                            : team.rank === 2 
                              ? 'bg-gray-700 text-white'
                              : team.rank === 3
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-700 text-gray-300'
                        }`}>
                          {team.rank === 1 ? '1' : team.rank === 2 ? '2' : team.rank === 3 ? '3' : team.rank}
                        </div>
                        <div>
                          <p className="font-semibold text-sm sm:text-base">Équipe {team.rank}</p>
                          <p className="text-[10px] sm:text-xs opacity-60">{team.playerCount || team.scores?.length} joueur{(team.playerCount || team.scores?.length) > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl sm:text-2xl font-bold">{team.totalScore}</p>
                      </div>
                    </div>

                    {/* Team Players */}
                    <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                      <table className="w-full min-w-[360px] sm:min-w-0">
                        <thead>
                          <tr className="text-gray-500 text-xs">
                            <th className="text-left py-2 px-2 font-medium">#</th>
                            <th className="text-left py-2 px-2 font-medium">Joueur</th>
                            <th className="text-center py-2 px-2 font-medium">Score</th>
                            <th className="text-center py-2 px-2 font-medium">Δ MMR</th>
                            <th className="text-right py-2 px-2 font-medium">MMR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => (
                            <tr 
                              key={playerIndex}
                              className="border-t border-gray-800/50 hover:bg-neutral-800/50 transition-colors"
                            >
                              <td className="py-2 px-2 text-gray-600 text-xs">{playerIndex + 1}</td>
                              <td className="py-2 px-2">
                                <Link 
                                  href={`/player/${encodeURIComponent(player.playerName)}`}
                                  className="flex items-center gap-1.5 hover:text-gray-100 transition-colors text-gray-300"
                                >
                                  {player.playerCountryCode && (
                                    <span className="text-sm">{getCountryFlag(player.playerCountryCode)}</span>
                                  )}
                                  <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{player.playerName}</span>
                                </Link>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className="font-semibold text-sm text-gray-200">{player.score}</span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`font-medium text-xs sm:text-sm ${
                                  player.delta > 0 ? 'text-gray-200' : player.delta < 0 ? 'text-gray-500' : 'text-gray-600'
                                }`}>
                                  {player.delta > 0 ? '+' : ''}{player.delta}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right">
                                <span className="text-xs sm:text-sm text-gray-400">{player.newMmr?.toLocaleString('fr-FR')}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ========== MATCH STATISTICS ========== */}
            {matchData.stats && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <div className="p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-lg sm:text-xl font-bold text-gray-200">{matchData.stats.totalPlayers}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Joueurs</p>
                </div>
                <div className="p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-lg sm:text-xl font-bold text-gray-200">{matchData.stats.avgScore}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Moyenne</p>
                </div>
                <div className="p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-lg sm:text-xl font-bold text-gray-200">{matchData.stats.highestScore}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Max</p>
                </div>
                <div className="p-3 bg-neutral-900 border border-gray-800 rounded-lg text-center">
                  <p className="text-lg sm:text-xl font-bold text-gray-200">{matchData.stats.lowestScore}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Min</p>
                </div>
              </div>
            )}

            {/* ========== EXTERNAL LINK ========== */}
            <div className="text-center pb-4 sm:pb-8">
              <a 
                href={loungeTableUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline" 
                  className="border-gray-700 text-gray-300 hover:bg-neutral-800 hover:text-white px-6"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
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
