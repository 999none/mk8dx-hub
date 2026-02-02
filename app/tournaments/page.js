'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Home, Calendar, Users, Bell, BellOff, ExternalLink, Clock, 
  RefreshCw, Trophy, Gamepad2, Filter, Globe, ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import Navbar from '@/components/Navbar';

const GAME_FILTERS = [
  { value: 'all', label: 'Tous les jeux', icon: '🎮' },
  { value: 'mk8dx', label: 'Mario Kart 8 DX', icon: '🏎️' },
  { value: 'mkwii', label: 'Mario Kart Wii', icon: '🎯' },
  { value: 'mkt', label: 'Mario Kart Tour', icon: '📱' },
  { value: 'mk7', label: 'Mario Kart 7', icon: '🎲' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'live', label: 'En cours' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'registration', label: 'Inscriptions ouvertes' },
  { value: 'completed', label: 'Terminés' },
];

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [summary, setSummary] = useState(null);
  
  // Filters
  const [gameFilter, setGameFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(12);

  const fetchTournaments = async (refresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (gameFilter !== 'all') params.append('game', gameFilter);
      if (refresh) params.append('refresh', 'true');
      
      const res = await fetch(`/api/tournaments?${params}`);
      const data = await res.json();
      
      let filteredTournaments = data.tournaments || [];
      
      // Client-side status filter (API returns all)
      if (statusFilter !== 'all') {
        filteredTournaments = filteredTournaments.filter(t => t.status === statusFilter);
      }
      
      setTournaments(filteredTournaments);
      setLastUpdate(data.lastUpdate);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setSummary(data.summary);
    } catch (err) {
      console.error('Erreur chargement tournois:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [page, gameFilter, statusFilter]);

  const toggleNotification = (tournamentId) => {
    setNotifications(prev => ({
      ...prev,
      [tournamentId]: !prev[tournamentId]
    }));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'live': return 'bg-green-500 text-white';
      case 'upcoming': return 'bg-blue-500 text-white';
      case 'registration': return 'bg-yellow-500 text-black';
      case 'completed': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'live': return '🔴 En cours';
      case 'upcoming': return '📅 À venir';
      case 'registration': return '✍️ Inscriptions';
      case 'completed': return '✅ Terminé';
      default: return status;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date inconnue';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
        {/* Navigation */}
        <Navbar />

        <div className="container mx-auto px-4 py-8 pt-24">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black mb-4 flex items-center justify-center gap-3">
              <Trophy className="w-12 h-12 text-yellow-500" />
              Tournois & Événements
            </h1>
            <p className="text-xl text-gray-400">
              Compétitions officielles depuis MKCentral
            </p>
            {lastUpdate && (
              <p className="text-sm text-gray-500 mt-2">
                Dernière mise à jour : {formatDate(lastUpdate)}
              </p>
            )}
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">{summary.ongoing || 0}</div>
                  <p className="text-sm text-gray-400">En cours</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{summary.upcoming || 0}</div>
                  <p className="text-sm text-gray-400">À venir</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-500/10 border-gray-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-gray-400">{summary.past || 0}</div>
                  <p className="text-sm text-gray-400">Terminés</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Game Filter */}
                <Select value={gameFilter} onValueChange={(v) => handleFilterChange(setGameFilter, v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrer par jeu" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {GAME_FILTERS.map(game => (
                      <SelectItem key={game.value} value={game.value}>
                        <span className="mr-2">{game.icon}</span>
                        {game.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <Globe className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {STATUS_FILTERS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-400">
                <span className="font-semibold text-white">{total}</span> tournois trouvés
              </div>
            </CardContent>
          </Card>

          {/* Tournaments Grid */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Chargement des tournois...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">Aucun tournoi trouvé avec ces critères</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {tournaments.map((tournament) => (
                  <Card 
                    key={tournament.id} 
                    className={`bg-white/5 border-white/10 hover:bg-white/10 transition-all overflow-hidden ${
                      tournament.status === 'live' ? 'ring-2 ring-green-500/50' : ''
                    }`}
                  >
                    {/* Tournament Logo */}
                    {tournament.logo && (
                      <div className="relative h-32 bg-gradient-to-b from-white/10 to-transparent">
                        <img 
                          src={tournament.logo} 
                          alt={tournament.name}
                          className="w-full h-full object-contain p-4"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                    
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge className={`${getStatusColor(tournament.status)} mb-2`}>
                            {getStatusText(tournament.status)}
                          </Badge>
                          <CardTitle className="text-lg line-clamp-2">{tournament.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleNotification(tournament.id)}
                          className="hover:bg-white/10 shrink-0"
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
                      {/* Game Info */}
                      {tournament.gameHuman && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Gamepad2 className="w-4 h-4" />
                          <span className="text-sm">{tournament.gameHuman}</span>
                        </div>
                      )}
                      
                      {/* Date */}
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{tournament.startDateHuman || formatDate(tournament.startDate)}</span>
                      </div>
                      
                      {/* Format */}
                      {tournament.format && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">{tournament.format}</span>
                          {tournament.minTeamSize && tournament.maxTeamSize && (
                            <span className="text-xs text-gray-500">
                              ({tournament.minTeamSize}-{tournament.maxTeamSize} joueurs)
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Game Mode */}
                      {tournament.gameModeHuman && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm">{tournament.gameModeHuman}</span>
                        </div>
                      )}
                      
                      {/* Series */}
                      {tournament.series && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-xs text-gray-500">Série: </span>
                          <span className="text-xs text-blue-400">{tournament.series.name}</span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {tournament.game && (
                          <Badge variant="outline" className="border-white/20 text-xs">
                            {tournament.game.toUpperCase()}
                          </Badge>
                        )}
                        {tournament.registrationsOpen && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            Inscriptions ouvertes
                          </Badge>
                        )}
                        {tournament.prValue > 0 && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                            PR: {tournament.prValue}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Link */}
                      {tournament.link && (
                        <a 
                          href={tournament.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block mt-4"
                        >
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            Voir sur MKCentral
                            <ExternalLink className="ml-2 w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="border-white/20 hover:bg-white/10"
                  >
                    Début
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-white/20 hover:bg-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="px-4 text-sm text-gray-400">
                    Page {page} sur {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="border-white/20 hover:bg-white/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="border-white/20 hover:bg-white/10"
                  >
                    Fin
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Weekly Schedule */}
          <Card className="bg-white/5 border-white/10 mt-8 mb-8">
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
      </div>
    </RequireAuth>
  );
}
