'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import PushNotificationManager from '@/components/PushNotificationManager';

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
            <Settings className="w-8 h-8 text-gray-500" />
            Paramètres
          </h1>
          <p className="text-gray-500">Gérez vos préférences et notifications</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - User Info */}
          <div className="lg:col-span-1">
            <Card className="bg-white/[0.02] border-white/[0.04]">
              <CardHeader className="border-b border-white/[0.04]">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Compte
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {user ? (
                  <div className="text-center">
                    {user.image && (
                      <img 
                        src={user.image} 
                        alt="" 
                        className="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-white/10"
                      />
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {user.serverNickname || user.name}
                    </h3>
                    <p className="text-gray-500 text-sm">@{user.username}</p>
                    <p className="text-gray-600 text-xs mt-2">
                      Discord ID: {user.discordId}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Non connecté</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Notifications */}
          <div className="lg:col-span-2 space-y-6">
            <PushNotificationManager />
            
            {/* Additional Settings Info */}
            <Card className="bg-white/[0.02] border-white/[0.04]">
              <CardHeader className="border-b border-white/[0.04]">
                <CardTitle className="text-sm font-medium text-gray-400">
                  À propos des notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 text-sm text-gray-400">
                  <p>
                    Les notifications push vous permettent d'être alerté même quand l'application n'est pas ouverte.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                      <h4 className="text-blue-400 font-medium mb-1">Lounge Queue</h4>
                      <p className="text-gray-500 text-xs">
                        Chaque heure à XX:00, vous êtes notifié de l'ouverture de la queue. 
                        La queue ferme à XX:55.
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                      <h4 className="text-purple-400 font-medium mb-1">Squad Queue</h4>
                      <p className="text-gray-500 text-xs">
                        45 minutes avant le début d'une SQ, vous êtes alerté pour pouvoir 
                        vous inscrire à temps.
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-500">
                    Les notifications sont envoyées via le serveur, assurez-vous que votre navigateur 
                    autorise les notifications pour ce site.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
