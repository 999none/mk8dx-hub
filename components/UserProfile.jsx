'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { CheckCircle, XCircle } from 'lucide-react';

export default function UserProfile() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Chargement...</div>;
  }

  if (!session) {
    return null;
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

      {/* Server membership info */}
      <div className="mt-4 p-3 bg-gray-200 dark:bg-gray-700 rounded-md">
        <div className="flex items-center gap-2 mb-2">
          {user.isInServer ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="text-sm font-medium">
            {user.isInServer ? 'Membre du serveur Lounge' : 'Non membre du serveur Lounge'}
          </span>
        </div>
        
        {user.isInServer && user.serverNickname && (
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Nickname serveur: </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{user.serverNickname}</span>
          </div>
        )}
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