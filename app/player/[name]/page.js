'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Trophy, TrendingUp, Calendar, 
  Globe, Users, Target, Award
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentRank } from '@/lib/mockData';
import RequireAuth from '@/components/RequireAuth';
import Navbar from '@/components/Navbar';

// Country codes to names mapping (common ones)
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
  if (!countryCode) return '';
  return countryCode.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(127397 + char.charCodeAt())
  );
};

export default function PlayerProfilePage() {
  const params = useParams();
  const playerName = decodeURIComponent(params.name);
  
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/player/${encodeURIComponent(playerName)}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            setError('Joueur non trouvé');
          } else {
            setError('Erreur lors du chargement du profil');
          }
          return;
        }
        
        const data = await res.json();
        setPlayer(data);
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
  }, [playerName]);

  if (loading) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-black text-white">
          <Navbar />
          <div className="container mx-auto px-4 py-8 pt-24">
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Chargement du profil...</p>
            </div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (error) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-black text-white">
          <Navbar />
          <div className="container mx-auto px-4 py-8 pt-24">
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold mb-2">{error}</h2>
              <p className="text-gray-400 mb-6">Le joueur &quot;{playerName}&quot; n&apos;a pas été trouvé.</p>
              <Link href="/leaderboard">
                <Button variant="outline" className="border-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour au leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (!player) {
    return null;
  }

  const rank = getCurrentRank(player.mmr || 0);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 pt-24">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/leaderboard">
              <Button variant="ghost" className="hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au leaderboard
              </Button>
            </Link>
          </div>

          {/* Player Header */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">{player.name}</h1>
                    {player.countryCode && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCountryFlag(player.countryCode)}</span>
                        <span className="text-lg text-gray-400">
                          {COUNTRY_NAMES[player.countryCode] || player.countryCode}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge 
                      style={{ backgroundColor: rank.color }} 
                      className="text-black text-sm px-3 py-1"
                    >
                      {rank.name}
                    </Badge>
                    {player.rank && (
                      <div className="flex items-center gap-2 text-yellow-500">
                        <Trophy className="w-5 h-5" />
                        <span className="font-semibold">#{player.rank}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">MMR</div>
                  <div className="text-4xl font-bold text-blue-400">
                    {(player.mmr || 0).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                <div className="text-2xl font-bold mb-1">{player.eventsPlayed || 0}</div>
                <div className="text-sm text-gray-400">Events joués</div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <Target className="w-8 h-8 mx-auto mb-3 text-green-400" />
                <div className="text-2xl font-bold mb-1">{player.winRate ? `${player.winRate}%` : 'N/A'}</div>
                <div className="text-sm text-gray-400">Taux de victoire</div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                <div className="text-2xl font-bold mb-1">{player.peakMmr ? player.peakMmr.toLocaleString('fr-FR') : 'N/A'}</div>
                <div className="text-sm text-gray-400">MMR max</div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <Award className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                <div className="text-2xl font-bold mb-1">{player.wins || 0}</div>
                <div className="text-sm text-gray-400">Victoires</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Matches */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Matchs récents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Historique des matchs bientôt disponible</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}