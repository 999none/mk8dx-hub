'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserProfile from '@/components/UserProfile';
import RequireAuth from '@/components/RequireAuth';

export default function DashboardPage() {
  const { status } = useSession();

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Tableau de Bord</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Statistiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Vos statistiques de jeu seront affichées ici.</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Profil</CardTitle>
                </CardHeader>
                <CardContent>
                  <UserProfile />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}