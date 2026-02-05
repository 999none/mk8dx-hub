'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DiscordLoginButton from '@/components/DiscordLoginButton';
import UserProfile from '@/components/UserProfile';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, XCircle, Trophy, CheckCircle2, Users, Gamepad2, Shield } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'authenticated' && session) {
      setChecking(true);
      
      if (session.user.isInServer === false) {
        setChecking(false);
        return;
      }

      const processVerification = async () => {
        try {
          const statusRes = await fetch(`/api/verification/status?discordId=${session.user.discordId}`);
          const statusData = await statusRes.json();
          
          if (statusData.verified) {
            router.push('/dashboard');
            return;
          }
          
          if (statusData.status && statusData.status !== 'not_logged_in' && statusData.status !== 'not_found') {
            router.push('/waiting');
            return;
          }
          
          const createRes = await fetch('/api/verification/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              discordId: session.user.discordId,
              username: session.user.username,
              serverNickname: session.user.serverNickname,
              avatar: session.user.avatar,
              isInServer: session.user.isInServer
            })
          });
          
          const createData = await createRes.json();
          router.push(createData.verified ? '/dashboard' : '/waiting');
          
        } catch (err) {
          console.error('Error:', err);
          setError('Erreur lors de la vérification.');
          setChecking(false);
        }
      };
      
      processVerification();
    }
  }, [session, status, router]);

  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Navbar />
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-500 text-sm">Vérification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black pt-20">
        <Navbar />
        <Card className="w-full max-w-sm bg-red-500/5 border-red-500/20">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-white mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-white text-black hover:bg-gray-200">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session && session.user.isInServer === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black pt-20">
        <Navbar />
        <Card className="w-full max-w-sm bg-red-500/5 border-red-500/20">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-white">Accès Refusé</CardTitle>
            <CardDescription className="text-gray-400">
              Vous devez être membre du serveur Discord MK8DX Lounge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
              <p className="font-medium text-white">{session.user.username}</p>
            </div>
            
            <a href="https://discord.gg/revmGkE" target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4]">
                Rejoindre le Serveur
              </Button>
            </a>
            
            <p className="text-xs text-gray-600 text-center">
              Après avoir rejoint, déconnectez-vous et reconnectez-vous.
            </p>
            
            <Link href="/">
              <Button variant="ghost" className="w-full text-gray-500 hover:text-white">
                Retour
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black pt-20">
      <Navbar />
      <Card className="w-full max-w-md bg-white/[0.02] border-white/[0.04] animate-fade-in-scale">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border-2 border-[#5865F2]/30 glow-discord img-hover-zoom">
            <img 
              src="https://cdn.discordapp.com/icons/445404006177570829/a_2c092bb27de30c6d285d8fafcb69f657.webp?size=64&animated=true" 
              alt="MK8DX Lounge"
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="text-white">Connexion</CardTitle>
          <CardDescription className="text-gray-500">
            Connectez Discord pour accéder au hub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Eligibility Conditions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              Conditions d'éligibilité
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg card-hover">
                <Users className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Membre du serveur Discord Lounge</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Vous devez être membre du serveur MK8DX Lounge et avoir un <span className="text-yellow-400">pseudo sur le serveur</span> (nickname) pour être éligible.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg card-hover">
                <Gamepad2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Activité récente sur le Lounge</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Vous devez avoir joué au moins <span className="text-green-400">2 matchs</span> au cours des 30 derniers jours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Button */}
          {session ? (
            <UserProfile />
          ) : (
            <DiscordLoginButton className="w-full btn-discord" buttonText="Se connecter avec Discord" />
          )}
          
          {/* Server Link */}
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-2">
              Pas encore membre du serveur ?
            </p>
            <a 
              href="https://discord.gg/revmGkE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-[#5865F2] hover:text-[#7289da] transition-colors link-underline"
            >
              Rejoindre le serveur Discord MK8DX Lounge →
            </a>
          </div>
          
          <p className="text-xs text-gray-600 text-center">
            En vous connectant, vous acceptez nos conditions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}