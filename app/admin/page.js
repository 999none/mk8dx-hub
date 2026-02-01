'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AdminPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pending-verifications');
      const data = await res.json();
      setPending(data);
    } catch (err) {
      console.error('Erreur chargement verifications:', err);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (discordId, serverNickname, approved) => {
    try {
      const res = await fetch('/api/admin/verify-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, serverNickname, approved })
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        fetchPending();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error('Erreur verification:', err);
      toast.error('Erreur lors de la vérification');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-5 h-5" />
            </Link>
            <span className="font-bold text-white">Admin Panel</span>
          </div>
          <Button 
            onClick={fetchPending} 
            disabled={loading}
            variant="outline"
            className="border-white/20 hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Vérifications en Attente</h1>
          <p className="text-gray-400">
            Validez les nouveaux joueurs après vérification de leur activité sur le Lounge
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">En Attente</div>
                  <div className="text-3xl font-bold">{pending.filter(p => p.status === 'pending').length}</div>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verifications */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Chargement...</p>
          </div>
        ) : pending.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-gray-400">Aucune vérification en attente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map((user) => (
              <Card key={user.discordId} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {user.avatar ? (
                        <img 
                          src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                          alt={user.username}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                          {user.username[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-lg">{user.username}</div>
                        <div className="text-sm text-gray-400">Pseudo Serveur: {user.serverNickname}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Demande reçue: {new Date(user.createdAt).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={user.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'}>
                        {user.status}
                      </Badge>
                      
                      {user.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleVerify(user.discordId, user.serverNickname, true)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approuver
                          </Button>
                          <Button
                            onClick={() => handleVerify(user.discordId, user.serverNickname, false)}
                            variant="destructive"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rejeter
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}