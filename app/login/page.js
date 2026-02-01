'use client';

import { useSession } from 'next-auth/react';
import DiscordLoginButton from '@/components/DiscordLoginButton';
import UserProfile from '@/components/UserProfile';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Connexion à MK8DX Hub</CardTitle>
          <CardDescription>
            Connectez-vous avec votre compte Discord pour accéder au hub compétitif
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' ? (
            <div className="text-center">Chargement...</div>
          ) : session ? (
            <UserProfile />
          ) : (
            <DiscordLoginButton 
              className="w-full"
              buttonText="Se connecter avec Discord"
            />
          )}
          
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </div>
        </CardContent>
      </Card>
    </div>
  );
}