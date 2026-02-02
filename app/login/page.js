'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DiscordLoginButton from '@/components/DiscordLoginButton';
import UserProfile from '@/components/UserProfile';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, XCircle, Trophy } from 'lucide-react';
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
      <Card className="w-full max-w-sm bg-white/[0.02] border-white/[0.04]">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <CardTitle className="text-white">Connexion</CardTitle>
          <CardDescription className="text-gray-500">
            Connectez Discord pour accéder au hub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session ? (
            <UserProfile />
          ) : (
            <DiscordLoginButton className="w-full" buttonText="Se connecter avec Discord" />
          )}
          
          <p className="text-xs text-gray-600 text-center">
            En vous connectant, vous acceptez nos conditions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}