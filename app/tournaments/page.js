'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, Users, Bell, BellOff, ExternalLink, 
  RefreshCw, Trophy, Gamepad2, ChevronLeft, ChevronRight
} from 'lucide-react';
import RequireAuth from '@/components/RequireAuth';
import Navbar from '@/components/Navbar';

const GAME_FILTERS = [
  { value: 'all', label: 'Tous les jeux', icon: '🎮' },
  { value: 'mkworld', label: 'Mario Kart World', icon: '🌍' },
  { value: 'mk8dx', label: 'MK8 Deluxe', icon: '🏎️' },
  { value: 'mkw', label: 'MK Wii', icon: '🏁' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'live', label: 'En cours' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'registration', label: 'Inscriptions' },
  { value: 'completed', label: 'Terminés' },
];

const FORMAT_FILTERS = [
  { value: 'all', label: 'Tous formats', icon: '🎯' },
  { value: 'solo', label: 'Solo / FFA', icon: '👤' },
  { value: 'squad', label: 'Squad / Équipe', icon: '👥' },
];

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [summary, setSummary] = useState(null);
  const [gameFilter, setGameFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(12);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (gameFilter !== 'all') params.append('game', gameFilter);
      
      const res = await fetch(`/api/tournaments?${params}`);
      const data = await res.json();
      
      let filtered = data.tournaments || [];
      if (statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
      }
      
      // Filter by format (solo/squad)
      if (formatFilter !== 'all') {
        filtered = filtered.filter(t => {
          const format = (t.format || '').toLowerCase();
          const name = (t.name || '').toLowerCase();
          
          if (formatFilter === 'solo') {
            // Solo: FFA, 1v1, Solo tournaments
            return format.includes('ffa') || 
                   format.includes('solo') || 
                   format.includes('1v1') ||
                   name.includes('ffa') ||
                   name.includes('solo') ||
                   (!format.includes('v') && !format.includes('squad') && !format.includes('team'));
          } else if (formatFilter === 'squad') {
            // Squad: 2v2, 3v3, 4v4, 5v5, 6v6, squad, team
            return format.includes('squad') || 
                   format.includes('team') ||
                   format.includes('2v2') || 
                   format.includes('3v3') || 
                   format.includes('4v4') || 
                   format.includes('5v5') || 
                   format.includes('6v6') ||
                   name.includes('squad') ||
                   name.includes('team');
          }
          return true;
        });
      }
      
      setTournaments(filtered);
      setLastUpdate(data.lastUpdate);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setSummary(data.summary);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [page, gameFilter, statusFilter]);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'live': return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', label: '🔴 Live' };
      case 'upcoming': return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', label: '📅 À venir' };
      case 'registration': return { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: '✍️ Inscriptions' };
      case 'completed': return { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20', label: '✅ Terminé' };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20', label: status };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date inconnue';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <div className="container mx-auto px-4 py-8 pt-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Tournois</h1>
            <p className="text-gray-500 text-sm">
              Événements officiels MKCentral
            </p>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'MK World', value: summary.mkworld || 0, color: 'text-green-500', bg: 'bg-green-500/10', icon: '🌍' },
                { label: 'MK8 Deluxe', value: summary.mk8dx || 0, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: '🏎️' },
                { label: 'MK Wii', value: summary.mkw || 0, color: 'text-purple-500', bg: 'bg-purple-500/10', icon: '🏁' },
                { label: 'Inscriptions', value: summary.registrationsOpen || 0, color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: '✍️' },
              ].map((stat, i) => (
                <div key={i} className={`text-center p-4 ${stat.bg} border border-white/[0.04] rounded-xl`}>
                  <div className="text-lg mb-1">{stat.icon}</div>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <Select value={gameFilter} onValueChange={(v) => { setGameFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400">
                  <Gamepad2 className="w-4 h-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="Jeu" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                  {GAME_FILTERS.map(g => (
                    <SelectItem key={g.value} value={g.value}>
                      <span className="mr-2">{g.icon}</span>{g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400">
                  <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                  {STATUS_FILTERS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              <span className="text-white font-medium">{total}</span> tournois trouvés
            </p>
          </div>

          {/* Tournaments Grid */}
          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">Chargement...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">Aucun tournoi trouvé</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {tournaments.map((tournament) => {
                  const statusStyle = getStatusStyle(tournament.status);
                  
                  return (
                    <Card 
                      key={tournament.id} 
                      className={`bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] transition-all overflow-hidden ${
                        tournament.status === 'live' ? 'ring-1 ring-green-500/30' : ''
                      }`}
                    >
                      {/* Tournament/Series Logo */}
                      <div className="h-28 bg-gradient-to-b from-white/[0.04] to-transparent flex items-center justify-center p-4 relative">
                        {(tournament.logo || tournament.seriesLogo || tournament.tournamentLogo) ? (
                          <img 
                            src={tournament.logo || tournament.seriesLogo || tournament.tournamentLogo} 
                            alt={tournament.name}
                            className="max-h-20 max-w-full object-contain"
                            onError={(e) => {
                              // Try series logo if main logo fails
                              if (tournament.seriesLogo && e.target.src !== tournament.seriesLogo) {
                                e.target.src = tournament.seriesLogo;
                              } else if (tournament.tournamentLogo && e.target.src !== tournament.tournamentLogo) {
                                e.target.src = tournament.tournamentLogo;
                              } else {
                                // Hide image and show fallback icon
                                e.target.style.display = 'none';
                                e.target.nextElementSibling?.classList.remove('hidden');
                              }
                            }}
                          />
                        ) : null}
                        {/* Fallback icon when no logo or image fails to load */}
                        <div className={`flex flex-col items-center justify-center ${(tournament.logo || tournament.seriesLogo || tournament.tournamentLogo) ? 'hidden' : ''}`}>
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center border border-white/[0.06]">
                            {tournament.game === 'mkworld' ? (
                              <span className="text-3xl">🌍</span>
                            ) : tournament.game === 'mk8dx' ? (
                              <span className="text-3xl">🏎️</span>
                            ) : tournament.game === 'mkw' ? (
                              <span className="text-3xl">🏁</span>
                            ) : (
                              <Trophy className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                        </div>
                        {tournament.series?.name && (
                          <div className="absolute bottom-1 left-2 right-2">
                            <span className="text-[10px] text-gray-500 truncate block">{tournament.series.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} text-[10px] mb-2`}>
                              {statusStyle.label}
                            </Badge>
                            <h3 className="font-semibold text-sm line-clamp-2">{tournament.name}</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setNotifications(prev => ({ ...prev, [tournament.id]: !prev[tournament.id] }))}
                            className="h-8 w-8 hover:bg-white/[0.04] flex-shrink-0"
                          >
                            {notifications[tournament.id] ? (
                              <Bell className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <BellOff className="w-4 h-4 text-gray-600" />
                            )}
                          </Button>
                        </div>
                        
                        <div className="space-y-2 text-xs text-gray-500">
                          {tournament.gameHuman && (
                            <div className="flex items-center gap-2">
                              <Gamepad2 className="w-3 h-3" />
                              <span>{tournament.gameHuman}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            <span>{tournament.startDateHuman || formatDate(tournament.startDate)}</span>
                          </div>
                          {tournament.format && (
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              <span>{tournament.format}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-3">
                          {tournament.game && (
                            <Badge variant="outline" className="border-white/10 text-[10px] text-gray-400">
                              {tournament.game.toUpperCase()}
                            </Badge>
                          )}
                          {tournament.registrationsOpen && (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px]">
                              Inscriptions
                            </Badge>
                          )}
                        </div>
                        
                        {tournament.link && (
                          <a href={tournament.link} target="_blank" rel="noopener noreferrer" className="block mt-4">
                            <Button size="sm" className="w-full bg-white text-black hover:bg-gray-200 text-xs h-8">
                              Voir
                              <ExternalLink className="ml-2 w-3 h-3" />
                            </Button>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-500 px-4">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </RequireAuth>
  );
}