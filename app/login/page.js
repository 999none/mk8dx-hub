'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DiscordLoginButton from '@/components/DiscordLoginButton';
import UserProfile from '@/components/UserProfile';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [verificationData, setVerificationData] = useState(null);

  useEffect(() => {
    // Si connecté via NextAuth, vérifier le statut et rediriger
    if (status === 'authenticated' && session) {
      setChecking(true);
      
      // Vérifier si l'utilisateur est membre du serveur Lounge
      if (session.user.isInServer === false) {
        // Pas membre du serveur - rester sur la page avec message d'erreur
        setChecking(false);
        return;
      }

      // Vérifier le statut de vérification
      fetch('/api/verification/status')
        .then(res => res.json())
        .then(data => {
          setVerificationData(data);
          
          if (data.verified) {
            // Utilisateur vérifié → Dashboard
            router.push('/dashboard');
          } else if (data.status && data.status !== 'not_logged_in' && data.status !== 'not_found') {
            // Utilisateur en attente de vérification → Page d'attente
            router.push('/waiting');
          } else {
            // Première connexion - créer une entrée de vérification
            setChecking(false);
          }
        })
        .catch(err => {
          console.error('Error checking verification:', err);
          setChecking(false);
        });
    }
  }, [session, status, router]);

  // Affichage pendant le chargement initial
  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Vérification de votre compte...</p>
        </div>
      </div>
    );
  }

  // Si connecté mais PAS membre du serveur Lounge
  if (session && session.user.isInServer === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
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