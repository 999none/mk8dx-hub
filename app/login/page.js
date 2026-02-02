'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DiscordLoginButton from '@/components/DiscordLoginButton';
import UserProfile from '@/components/UserProfile';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    // Si connecté via NextAuth
    if (status === 'authenticated' && session) {
      setChecking(true);
      
      // Vérifier si l'utilisateur est membre du serveur Lounge
      if (session.user.isInServer === false) {
        setChecking(false);
        return;
      }

      // Créer ou vérifier l'inscription
      const processVerification = async () => {
        try {
          // D'abord vérifier le statut actuel
          const statusRes = await fetch(`/api/verification/status?discordId=${session.user.discordId}`);
          const statusData = await statusRes.json();
          
          if (statusData.verified) {
            // Déjà vérifié → Dashboard
            router.push('/dashboard');
            return;
          }
          
          if (statusData.status && statusData.status !== 'not_logged_in' && statusData.status !== 'not_found') {
            // En attente de vérification → Page d'attente
            router.push('/waiting');
            return;
          }
          
          // Première connexion - créer l'inscription avec le nom Lounge (serverNickname)
          const createRes = await fetch('/api/verification/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              discordId: session.user.discordId,
              username: session.user.username,
              serverNickname: session.user.serverNickname, // Nom sur le serveur Lounge
              avatar: session.user.avatar,
              isInServer: session.user.isInServer
            })
          });
          
          const createData = await createRes.json();
          
          if (createData.verified) {
            router.push('/dashboard');
          } else {
            router.push('/waiting');
          }
          
        } catch (err) {
          console.error('Error processing verification:', err);
          setError('Erreur lors de la vérification. Veuillez réessayer.');
          setChecking(false);
        }
      };
      
      processVerification();
    }
  }, [session, status, router]);

  // Chargement
  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Navbar />
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Vérification de votre compte...</p>
          {checking && session?.user?.serverNickname && (
            <p className="text-sm text-gray-500 mt-2">
              Recherche de "{session.user.serverNickname}" sur le Lounge...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black pt-20">
        <Navbar />
        <Card className="w-full max-w-md bg-red-500/10 border-red-500/30">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <p className="text-white mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // NON membre du serveur Lounge
  if (session && session.user.isInServer === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black pt-20">
        <Navbar />
        <Card className="w-full max-w-md bg-red-500/10 border-red-500/30">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-white">Accès Refusé</CardTitle>
            <CardDescription className="text-gray-300">
              Vous devez être membre du serveur Discord MK8DX Lounge pour accéder à cette application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Connecté en tant que:</p>
              <p className="font-bold text-white">{session.user.username}</p>
            </div>
            
            <a 
              href="https://discord.gg/revmGkE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4]">
                Rejoindre le Serveur Lounge
              </Button>
            </a>
            
            <p className="text-xs text-gray-500 text-center">
              Après avoir rejoint le serveur, déconnectez-vous et reconnectez-vous.
            </p>
            
            <Link href="/">
              <Button variant="ghost" className="w-full text-gray-400">
                Retour à l'accueil
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Page de connexion normale
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black pt-20">
      <Navbar />
      <Card className="w-full max-w-md bg-white/5 border-white/10">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Connexion à MK8DX Hub</CardTitle>
          <CardDescription className="text-gray-400">
            Connectez-vous avec votre compte Discord pour accéder au hub compétitif
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session ? (
            <UserProfile />
          ) : (
            <DiscordLoginButton 
              className="w-full"
              buttonText="Se connecter avec Discord"
            />
          )}
          
          <div className="mt-4 text-center text-sm text-gray-500">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </div>
        </CardContent>
      </Card>
    </div>
  );
}