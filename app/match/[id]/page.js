'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Calendar, Users, Trophy, Medal,
  RefreshCw, ExternalLink, Swords, Target, TrendingUp, TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

// Helper function to get country flag emoji
const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function MatchDetailsPage() {
  const params = useParams();
  const matchId = params.id;
  
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(true);

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

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" className="hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-12 h-12 animate-spin mb-4 text-white/50" />
            <p className="text-gray-400">Chargement des détails du match...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Swords className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">Match introuvable</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link href="/dashboard">
              <Button className="bg-white text-black hover:bg-white/90">
                Retour au Dashboard
              </Button>
            </Link>
          </div>
        ) : matchData ? (
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header Info */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-4">
                <Swords className="w-5 h-5" />
                <span>Table #{matchId}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                Résultat du Match
              </h1>
              
              {/* Match Info Grid */}
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-gray-400 text-sm">Tier</span>
                  <p className="font-bold text-xl">{matchData.tier || '?'}</p>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-gray-400 text-sm">Format</span>
                  <p className="font-bold text-xl">{matchData.format || `${matchData.numTeams}v${matchData.numTeams}`}</p>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-gray-400 text-sm">Joueurs</span>
                  <p className="font-bold text-xl">{matchData.numPlayers}</p>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-gray-400 text-sm">Date</span>
                  <p className="font-bold">
                    {new Date(matchData.createdOn || matchData.verifiedOn).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Official Table Image */}
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Image Officielle
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {imageLoaded ? (
                  <div className="relative bg-black">
                    <img
                      src={tableImageUrl}
                      alt={`Table ${matchId} Results`}
                      className="w-full h-auto"
                      onError={() => setImageLoaded(false)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Trophy className="w-12 h-12 mb-4 opacity-50" />
                    <p>Image non disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-yellow-500" />
                    Classement & Scores
                  </div>
                  {matchData.stats && (
                    <div className="text-sm font-normal text-gray-400">
                      Score moyen: <span className="text-white">{matchData.stats.avgScore}</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Teams */}
                <div className="divide-y divide-white/10">
                  {matchData.teams?.sort((a, b) => a.rank - b.rank).map((team, teamIndex) => (
                    <div key={teamIndex} className="p-4">
                      {/* Team Header */}
                      <div className={`flex items-center justify-between p-4 rounded-lg mb-3 ${
                        team.rank === 1 
                          ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' 
                          : team.rank === 2 
                            ? 'bg-gradient-to-r from-gray-400/20 to-transparent border border-gray-400/30'
                            : team.rank === 3
                              ? 'bg-gradient-to-r from-orange-600/20 to-transparent border border-orange-600/30'
                              : 'bg-white/5 border border-white/10'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                            team.rank === 1 
                              ? 'bg-yellow-500 text-black' 
                              : team.rank === 2 
                                ? 'bg-gray-400 text-black'
                                : team.rank === 3
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-white/20 text-white'
                          }`}>
                            {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
                          </div>
                          <div>
                            <p className="font-bold text-lg">Équipe #{team.rank}</p>
                            <p className="text-sm text-gray-400">{team.playerCount || team.scores?.length} joueur{(team.playerCount || team.scores?.length) > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black">{team.totalScore}</p>
                          <p className="text-sm text-gray-400">points</p>
                        </div>
                      </div>

                      {/* Team Players */}
                      <div className="space-y-2 ml-4">
                        {team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => (
                          <Link 
                            key={playerIndex}
                            href={`/player/${encodeURIComponent(player.playerName)}`}
                            className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500 w-6">#{playerIndex + 1}</span>
                              {player.playerCountryCode && (
                                <span className="text-lg" title={player.playerCountryCode}>
                                  {getCountryFlag(player.playerCountryCode)}
                                </span>
                              )}
                              <span className="font-medium hover:text-blue-400 transition-colors">{player.playerName}</span>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="text-center">
                                <p className="font-bold text-lg">{player.score}</p>
                                <p className="text-xs text-gray-500">pts</p>
                              </div>
                              <div className="text-right min-w-[100px]">
                                <p className={`font-bold flex items-center justify-end gap-1 ${
                                  player.delta > 0 ? 'text-green-400' : player.delta < 0 ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  {player.delta > 0 ? <TrendingUp className="w-4 h-4" /> : player.delta < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                                  {player.delta > 0 ? '+' : ''}{player.delta}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {player.prevMmr?.toLocaleString('fr-FR')} → {player.newMmr?.toLocaleString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            {matchData.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                    <p className="text-2xl font-bold">{matchData.stats.totalPlayers}</p>
                    <p className="text-sm text-gray-400">Joueurs</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <Target className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                    <p className="text-2xl font-bold">{matchData.stats.avgScore}</p>
                    <p className="text-sm text-gray-400">Score Moyen</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
                    <p className="text-2xl font-bold">{matchData.stats.highestScore}</p>
                    <p className="text-sm text-gray-400">Meilleur Score</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-400" />
                    <p className="text-2xl font-bold">{matchData.stats.lowestScore}</p>
                    <p className="text-sm text-gray-400">Score le Plus Bas</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* External Link */}
            <div className="text-center">
              <a 
                href={loungeTableUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-white text-black hover:bg-white/90">
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
