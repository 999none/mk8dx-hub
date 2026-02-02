'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Trophy, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getCurrentRank } from '@/lib/mockData';
import RequireAuth from '@/components/RequireAuth';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data.players || []);
      setLastUpdate(data.lastUpdate);
    } catch (err) {
      console.error('Erreur chargement leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-5 h-5" />
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Dashboard</Button>
            </Link>
            <Link href="/academy">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Academy</Button>
            </Link>
            <Link href="/tournaments">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Tournois</Button>
            </Link>
            <Link href="/leaderboard">
              <span className="font-bold text-white">Leaderboard</span>
            </Link>
          </div>
          <Button 
            onClick={fetchLeaderboard} 
            disabled={loading}
            variant="outline"
            className="border-white/20 hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-12 h-12 text-yellow-500" />
            Leaderboard Global
          </h1>
          <p className="text-xl text-gray-400">
            Classement des meilleurs joueurs du Lounge MK8DX
          </p>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-2">
              Dernière mise à jour : {new Date(lastUpdate).toLocaleString('fr-FR')}
            </p>
          )}
        </div>

        {/* Leaderboard */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Top 100 Joueurs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Chargement du leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 100).map((player, index) => {
                  const rank = getCurrentRank(player.mmr || 0);
                  const isTop3 = index < 3;
                  
                  return (
                    <div 
                      key={player.id || index}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        isTop3 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-300 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-white/10'
                        } font-bold`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-bold text-lg">{player.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge style={{ backgroundColor: rank.color }} className="text-black text-xs">
                              {rank.name}
                            </Badge>
                            {player.wins && player.totalRaces && (
                              <span className="text-xs text-gray-400">
                                {Math.round((player.wins / player.totalRaces) * 100)}% WR
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {player.totalRaces && (
                          <div className="text-right hidden md:block">
                            <div className="text-xs text-gray-400">Courses</div>
                            <div className="font-semibold">{player.totalRaces}</div>
                          </div>
                        )}
                        
                        <div className="text-right">
                          <div className="text-xs text-gray-400">MMR</div>
                          <div className="text-2xl font-bold">{player.mmr || 0}</div>
                        </div>
                        
                        {player.mmrChange && player.mmrChange !== 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`w-4 h-4 ${
                              player.mmrChange > 0 ? 'text-green-500' : 'text-red-500 rotate-180'
                            }`} />
                            <span className={`text-sm font-semibold ${
                              player.mmrChange > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {player.mmrChange > 0 ? '+' : ''}{player.mmrChange}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </RequireAuth>
  );
}