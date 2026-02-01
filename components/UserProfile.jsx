'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function UserProfile() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Chargement...</div>;
  }

  if (!session) {
    return null; // Or return a login prompt
  }

  const { user } = session;

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-4">
        {user.image && (
          <Image 
            src={user.image} 
            alt={user.name || 'User avatar'} 
            width={64} 
            height={64} 
            className="rounded-full"
          />
        )}
        <div>
          <h3 className="font-bold">{user.name || user.username || 'Utilisateur Discord'}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connecté via Discord
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            ID: {user.discordId}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button 
          onClick={() => signOut({ callbackUrl: '/' })}
          variant="outline"
          size="sm"
        >
          Déconnexion
        </Button>
      </div>
    </div>
  );
}