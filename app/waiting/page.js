'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertCircle, CheckCircle, RefreshCw, ExternalLink, Trophy, Home } from 'lucide-react';
import Link from 'next/link';

export default function WaitingPage() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/verification/status');
      const data = await res.json();
      setStatus(data);
      
      // If verified, redirect to dashboard
      if (data.verified) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      // Get discordId from cookie
      const cookieMatch = document.cookie.match(/verification_status=([^;]+)/);
      let discordId = null;
      if (cookieMatch) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieMatch[1]));
          discordId = parsed.discordId;
        } catch (e) {}
      }

      if (!discordId) {
        alert('Impossible de récupérer votre ID Discord. Veuillez vous reconnecter.');
        return;
      }

      const res = await fetch('/api/verification/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId })
      });

      const data = await res.json();
      if (data.success) {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Error rechecking:', err);
    } finally {
      setRechecking(false);
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Clock className="w-16 h-16 text-gray-400" />;
    
    switch (status.status) {
      case 'waiting_activity':
        return <AlertCircle className="w-16 h-16 text-yellow-500" />;
      case 'waiting_lounge_name':
        return <Clock className="w-16 h-16 text-blue-500" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      default:
        return <AlertCircle className="w-16 h-16 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!status) return 'from-gray-500/20 to-gray-600/20';
    
    switch (status.status) {
      case 'waiting_activity':
        return 'from-yellow-500/20 to-orange-500/20';
      case 'waiting_lounge_name':
        return 'from-blue-500/20 to-indigo-500/20';
      case 'pending':
        return 'from-orange-500/20 to-amber-500/20';
      case 'approved':
        return 'from-green-500/20 to-emerald-500/20';
      default:
        return 'from-red-500/20 to-rose-500/20';
    }
  };

  const getStatusTitle = () => {
    if (!status) return 'Chargement...';
    
    switch (status.status) {
      case 'waiting_activity':
        return 'Activité Lounge Insuffisante';
      case 'waiting_lounge_name':
        return 'En Attente d\'Association';
      case 'pending':
        return 'Vérification en Cours';
      case 'approved':
        return 'Compte Vérifié !';
      case 'rejected':
        return 'Vérification Refusée';
      case 'not_active':
        return 'Compte Inactif';
      default:
        return 'Statut Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement de votre statut...</p>
        </div>
      </div>
    );
  }

  if (!status || status.status === 'not_logged_in' || status.status === 'not_found') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-white/5 border-white/10 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-4">Session Non Trouvée</h2>
            <p className="text-gray-400 mb-6">
              Vous devez vous connecter avec Discord pour accéder à MK8DX Hub.
            </p>
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-white/90 w-full">
                Se Connecter avec Discord
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            <span className="font-bold text-xl">MK8DX Hub</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Status Card */}
          <Card className={`bg-gradient-to-br ${getStatusColor()} border-white/20 mb-8`}>
            <CardContent className="p-8 text-center">
              {getStatusIcon()}
              <h1 className="text-3xl font-bold mt-6 mb-2">{getStatusTitle()}</h1>
              <p className="text-gray-300 text-lg">{status.message}</p>
            </CardContent>
          </Card>

          {/* Activity Progress (for waiting_activity) */}
          {status.status === 'waiting_activity' && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Progression d'Activité
                </CardTitle>
                <CardDescription>
                  Vous avez besoin d'au moins 2 matchs Lounge dans les 30 derniers jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Matchs joués (30j)</span>
                      <span className="font-bold">{status.matchCount || 0} / 2</span>
                    </div>
                    <Progress value={Math.min(((status.matchCount || 0) / 2) * 100, 100)} className="h-3" />
                  </div>
                  
                  {status.lastMatchDate && (
                    <div className="text-sm text-gray-400">
                      Dernier match : {new Date(status.lastMatchDate).toLocaleString('fr-FR')}
                    </div>
                  )}

                  <Button 
                    onClick={handleRecheck} 
                    disabled={rechecking}
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    {rechecking ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Revérifier Mon Activité
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lounge Profile Info (if found) */}
          {status.loungeData && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Profil Lounge Trouvé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{status.loungeData.mmr || 0}</div>
                    <div className="text-xs text-gray-400">MMR</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{status.loungeData.wins || 0}</div>
                    <div className="text-xs text-gray-400">Victoires</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-red-400">{status.loungeData.losses || 0}</div>
                    <div className="text-xs text-gray-400">Défaites</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">
                      {status.loungeData.wins && status.loungeData.losses 
                        ? Math.round((status.loungeData.wins / (status.loungeData.wins + status.loungeData.losses)) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <a 
                    href={`https://www.mk8dx-lounge.com/PlayerDetails/${encodeURIComponent(status.loungeName || status.serverNickname)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Voir sur MK8DX Lounge
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Info */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle>Informations de Votre Compte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Pseudo Discord (Lounge)</span>
                  <span className="font-medium">{status.serverNickname}</span>
                </div>
                {status.loungeName && status.loungeName !== status.serverNickname && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nom Lounge</span>
                    <span className="font-medium text-green-400">{status.loungeName}</span>
                  </div>
                )}
                {!status.loungeName && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nom Lounge</span>
                    <span className="font-medium text-yellow-400">Non trouvé</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Statut</span>
                  <Badge className={
                    status.status === 'approved' ? 'bg-green-500' :
                    status.status === 'pending' ? 'bg-orange-500' :
                    status.status === 'waiting_activity' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }>
                    {status.status === 'approved' ? 'Vérifié' :
                     status.status === 'pending' ? 'En attente admin' :
                     status.status === 'waiting_activity' ? 'Activité requise' :
                     status.status === 'waiting_lounge_name' ? 'Pseudo non trouvé' :
                     status.status}
                  </Badge>
                </div>
                {status.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Demande créée le</span>
                    <span className="font-medium text-sm">{new Date(status.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Que Faire Maintenant ?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {status.status === 'waiting_activity' && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <h4 className="font-bold text-yellow-400 mb-2">Jouez sur le Lounge !</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      Rejoignez le serveur Discord du Lounge MK8DX et participez à des matchs classés. 
                      Une fois que vous aurez 2+ matchs dans les 30 derniers jours, cliquez sur "Revérifier Mon Activité".
                    </p>
                    <a href="https://discord.gg/revmGkE" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="border-yellow-500/30 text-yellow-400">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Rejoindre le Discord Lounge
                      </Button>
                    </a>
                  </div>
                )}

                {(status.status === 'pending' || status.status === 'waiting_lounge_name') && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h4 className="font-bold text-blue-400 mb-2">Patience !</h4>
                    <p className="text-gray-300 text-sm">
                      Un administrateur va associer votre nom Lounge et vérifier votre compte. 
                      Cela peut prendre quelques heures. Vous serez automatiquement approuvé si vous avez suffisamment d'activité.
                    </p>
                  </div>
                )}

                <div className="text-center pt-4">
                  <Link href="/">
                    <Button variant="ghost" className="text-gray-400 hover:text-white">
                      <Home className="w-4 h-4 mr-2" />
                      Retour à l'Accueil
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
