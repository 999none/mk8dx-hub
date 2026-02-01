'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Calendar, Users, Bell, BellOff, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [notifications, setNotifications] = useState({});

  useEffect(() => {
    fetch('/api/tournaments')
      .then(res => res.json())
      .then(data => setTournaments(data))
      .catch(err => console.error(err));
  }, []);

  const toggleNotification = (tournamentId) => {
    setNotifications(prev => ({
      ...prev,
      [tournamentId]: !prev[tournamentId]
    }));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'live': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'registration': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'live': return 'En cours';
      case 'upcoming': return 'À venir';
      case 'registration': return 'Inscriptions ouvertes';
      default: return status;
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-5 h-5" />
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Dashboard</Button>
            </Link>
            <Link href="/academy">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Academy</Button>
            </Link>
            <Link href="/tournaments">
              <span className="font-bold text-white">Tournois</span>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Leaderboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">Tournois & Événements</h1>
          <p className="text-xl text-gray-400">
            Rejoignez les Squad Queues, Wars et compétitions officielles
          </p>
        </div>

        {/* Tournaments Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge className={getStatusColor(tournament.status)} >
                      {getStatusText(tournament.status)}
                    </Badge>
                    <CardTitle className="text-xl mt-3">{tournament.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleNotification(tournament.id)}
                    className="hover:bg-white/10"
                  >
                    {notifications[tournament.id] ? (
                      <Bell className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <BellOff className="w-5 h-5 text-gray-500" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>{tournament.date}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span>{tournament.time}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-4 h-4" />
                  <span>{tournament.participants} participants</span>
                </div>
                <div className="pt-2">
                  <Badge variant="outline" className="border-white/20">{tournament.format}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Weekly Schedule */}
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">📅 Programme Squad Queue Hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="font-bold mb-2">Lundi - Jeudi</div>
                <div className="text-sm text-gray-400">Squad Queue 4v4</div>
                <div className="text-sm text-gray-400">19:00 - 23:00 UTC</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="font-bold mb-2">Vendredi</div>
                <div className="text-sm text-gray-400">Wars 6v6</div>
                <div className="text-sm text-gray-400">20:00 - 01:00 UTC</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="font-bold mb-2">Samedi</div>
                <div className="text-sm text-gray-400">Solo Lounge Mogi FFA</div>
                <div className="text-sm text-gray-400">18:00 - 00:00 UTC</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="font-bold mb-2">Dimanche</div>
                <div className="text-sm text-gray-400">Championship Events</div>
                <div className="text-sm text-gray-400">17:00 - 22:00 UTC</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* External Links */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">MKCentral Lounge</h3>
              <p className="text-gray-400 mb-4">
                Plateforme officielle pour les matchs classés, le système MMR et les statistiques complètes.
              </p>
              <a href="https://lounge.mkcentral.com/mk8dx/" target="_blank" rel="noopener noreferrer">
                <Button className="bg-white text-black hover:bg-white/90">
                  Visiter le Lounge
                  <ExternalLink className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Discord Lounge</h3>
              <p className="text-gray-400 mb-4">
                Rejoignez la communauté officielle MK8DX 150cc pour participer aux matchs et événements.
              </p>
              <a href="https://discord.gg/revmGkE" target="_blank" rel="noopener noreferrer">
                <Button className="bg-white text-black hover:bg-white/90">
                  Rejoindre Discord
                  <ExternalLink className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}