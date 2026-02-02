'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, Trophy, TrendingUp, TrendingDown, Target, 
  Gamepad2, Star, Calendar, RefreshCw, LogOut,
  User, Shield, Award, Zap
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import RequireAuth from '@/components/RequireAuth';
import { getCurrentRank } from '@/lib/mockData';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch verification status to get lounge data
        const verifyRes = await fetch('/api/verification/status');
        const verifyData = await verifyRes.json();
        setVerificationData(verifyData);

        // If user is verified and has lounge name, fetch their stats
        if (verifyData.verified && verifyData.user?.loungeName) {
          const loungeRes = await fetch(`/api/admin/lounge-search?name=${encodeURIComponent(verifyData.user.loungeName)}`);
          const loungeData = await loungeRes.json();
          if (loungeData.found) {
            setPlayerStats(loungeData);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const user = session?.user;
  const loungeData = verificationData?.user?.loungeData || playerStats?.player;
  const rank = loungeData?.mmr ? getCurrentRank(loungeData.mmr) : null;

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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">Tableau de Bord</h1>
            <p className="text-gray-400">Bienvenue, {user?.serverNickname || user?.name || 'Joueur'} !</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin mr-4" />
              <span className="text-gray-400">Chargement de vos données...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <h3 className="text-2xl font-bold mb-1">{user?.name || user?.username}</h3>
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
                        <div className="text-5xl font-black mb-2">{loungeData.mmr || 0}</div>
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
                          <p className="text-sm text-gray-400">MMR Max: <span className="text-white font-semibold">{loungeData.maxMmr}</span></p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400">Données non disponibles</p>
                      <p className="text-xs text-gray-500 mt-2">Connectez votre compte Lounge pour voir vos stats</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Win/Loss Card */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Statistiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loungeData ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-400">{loungeData.wins || 0}</div>
                        <p className="text-xs text-gray-400">Victoires</p>
                      </div>
                      <div className="text-center p-3 bg-red-500/10 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-400">{loungeData.losses || 0}</div>
                        <p className="text-xs text-gray-400">Défaites</p>
                      </div>
                      {loungeData.winRate !== undefined && (
                        <div className="col-span-2 text-center p-3 bg-white/5 rounded-lg">
                          <div className="text-2xl font-bold">{Math.round(loungeData.winRate * 100) || loungeData.winRate}%</div>
                          <p className="text-xs text-gray-400">Taux de victoire</p>
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

              {/* Activity Card */}
              <Card className="bg-white/5 border-white/10 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-purple-500" />
                    Activité Récente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {playerStats?.activity ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                        <div className="text-3xl font-bold">{playerStats.activity.matchCount}</div>
                        <p className="text-sm text-gray-400">Matchs (30j)</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <div className="text-lg font-semibold">
                          {playerStats.activity.lastMatchDate 
                            ? new Date(playerStats.activity.lastMatchDate).toLocaleDateString('fr-FR')
                            : 'N/A'
                          }
                        </div>
                        <p className="text-sm text-gray-400">Dernier match</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <Star className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <div className={`text-2xl font-bold ${playerStats.activity.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {playerStats.activity.isActive ? 'Actif' : 'Inactif'}
                        </div>
                        <p className="text-sm text-gray-400">Statut</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-400">Aucune activité récente</p>
                      <p className="text-xs text-gray-500 mt-2">Jouez des matchs sur le Lounge pour voir vos statistiques</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="bg-white/5 border-white/10 lg:col-span-3">
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
                      href={loungeData?.name ? `https://www.mk8dx-lounge.com/PlayerDetails/${encodeURIComponent(loungeData.name)}` : 'https://www.mk8dx-lounge.com'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-center">
                        <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="font-semibold">Profil Lounge</p>
                        <p className="text-xs text-gray-400">Voir sur MK8DX Lounge</p>
                      </div>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
