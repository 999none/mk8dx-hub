'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Home, CheckCircle, XCircle, Clock, RefreshCw, Search, ExternalLink, User, Trophy, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AdminPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Lounge Search State
  const [loungeSearch, setLoungeSearch] = useState('');
  const [loungeSearchResult, setLoungeSearchResult] = useState(null);
  const [loungeSearchLoading, setLoungeSearchLoading] = useState(false);
  
  // Selected user for lounge name assignment
  const [selectedUser, setSelectedUser] = useState(null);
  const [assigningLounge, setAssigningLounge] = useState(false);

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
    fetchMkCache();
    fetchMkLogs();
  }, []);

  const [mkCache, setMkCache] = useState([]);
  const [mkCacheLoading, setMkCacheLoading] = useState(false);
  const [mkPage, setMkPage] = useState(1);
  const [mkLimit, setMkLimit] = useState(10);
  const [mkFilter, setMkFilter] = useState('');
  const [mkTotal, setMkTotal] = useState(0);

  const [mkLogs, setMkLogs] = useState([]);
  const [mkLogsLoading, setMkLogsLoading] = useState(false);
  const [mkLogsPage, setMkLogsPage] = useState(1);
  const [mkLogsLimit, setMkLogsLimit] = useState(10);
  const [mkLogsTotal, setMkLogsTotal] = useState(0);

  const fetchMkCache = async (page = mkPage, limit = mkLimit, filter = mkFilter) => {
    setMkCacheLoading(true);
    try {
      const res = await fetch(`/api/admin/mkcentral-cache?page=${page}&limit=${limit}&filter=${encodeURIComponent(filter)}`);
      const data = await res.json();
      if (data.success) {
        setMkCache(data.items);
        setMkTotal(data.total || 0);
        setMkPage(data.page || page);
        setMkLimit(data.limit || limit);
      }
    } catch (err) {
      console.error('Erreur chargement mk cache:', err);
      toast.error('Erreur chargement MKCentral cache');
    } finally {
      setMkCacheLoading(false);
    }
  };

  const fetchMkLogs = async (page = mkLogsPage, limit = mkLogsLimit) => {
    setMkLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/mkcentral-refresh-logs?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setMkLogs(data.items);
        setMkLogsTotal(data.total || 0);
        setMkLogsPage(data.page || page);
        setMkLogsLimit(data.limit || limit);
      }
    } catch (err) {
      console.error('Erreur chargement logs mk:', err);
      toast.error('Erreur chargement logs');
    } finally {
      setMkLogsLoading(false);
    }
  };

  const handleRefreshMk = async (link) => {
    try {
      const res = await fetch('/api/admin/mkcentral-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [link] })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Refresh lancé');
        fetchMkCache();
        fetchMkLogs();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (err) {
      console.error('Erreur refresh mk:', err);
      toast.error('Erreur lors du refresh');
    }
  };

  const handleRefreshAllMk = async () => {
    try {
      const confirm = window.confirm('Rafraîchir tout le cache MKCentral (peut prendre du temps) ?');
      if (!confirm) return;
      const concurrencyStr = window.prompt('Concurrency (parallel requests):', '5');
      const limitStr = window.prompt('Max entries to refresh:', '500');
      const concurrency = parseInt(concurrencyStr || '5', 10) || 5;
      const limit = parseInt(limitStr || '500', 10) || 500;

      const res = await fetch('/api/admin/mkcentral-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll: true, concurrency, limit })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Refresh lancé en arrière-plan');
        fetchMkCache();
        fetchMkLogs();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (err) {
      console.error('Erreur refresh all mk:', err);
      toast.error('Erreur lors du refresh');
    }
  };

  // Search Lounge Player
  const handleLoungeSearch = async () => {
    if (!loungeSearch.trim()) {
      toast.error('Veuillez entrer un nom Lounge');
      return;
    }
    
    setLoungeSearchLoading(true);
    setLoungeSearchResult(null);
    
    try {
      const res = await fetch(`/api/admin/lounge-search?name=${encodeURIComponent(loungeSearch.trim())}`);
      const data = await res.json();
      setLoungeSearchResult(data);
      
      if (!data.found) {
        toast.error(`Joueur "${loungeSearch}" introuvable sur le Lounge`);
      }
    } catch (err) {
      console.error('Erreur recherche Lounge:', err);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoungeSearchLoading(false);
    }
  };

  // Assign Lounge Name to User
  const handleAssignLoungeName = async (discordId) => {
    if (!loungeSearchResult || !loungeSearchResult.found) {
      toast.error('Veuillez d\'abord rechercher un joueur Lounge valide');
      return;
    }
    
    setAssigningLounge(true);
    
    try {
      const res = await fetch('/api/admin/set-lounge-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          discordId, 
          loungeName: loungeSearchResult.player.name 
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (data.autoApproved) {
          toast.success(`✅ ${data.message}`);
        } else {
          toast.info(`⏳ ${data.message}`);
        }
        setSelectedUser(null);
        setLoungeSearchResult(null);
        setLoungeSearch('');
        fetchPending();
      } else {
        toast.error(data.message || 'Erreur lors de l\'association');
      }
    } catch (err) {
      console.error('Erreur association nom Lounge:', err);
      toast.error('Erreur lors de l\'association');
    } finally {
      setAssigningLounge(false);
    }
  };

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

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'waiting_activity': return 'bg-yellow-500';
      case 'waiting_lounge_name': return 'bg-blue-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'waiting_activity': return 'Activité requise';
      case 'waiting_lounge_name': return 'Nom Lounge requis';
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      default: return status;
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
          <h1 className="text-4xl font-black mb-2">Panel Administrateur</h1>
          <p className="text-gray-400">
            Gérez les vérifications et associez les noms Lounge aux utilisateurs
          </p>
        </div>

        {/* Lounge Search Section */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Recherche Joueur Lounge
            </CardTitle>
            <CardDescription>
              Recherchez un joueur sur le Lounge pour prévisualiser ses stats et l'associer à un utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Input
                placeholder="Entrez le nom Lounge exact..."
                value={loungeSearch}
                onChange={(e) => setLoungeSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLoungeSearch()}
                className="flex-1 bg-black/30 border-white/20"
              />
              <Button 
                onClick={handleLoungeSearch}
                disabled={loungeSearchLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loungeSearchLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="ml-2">Rechercher</span>
              </Button>
            </div>

            {/* Search Results */}
            {loungeSearchResult && (
              <div className="space-y-4">
                {loungeSearchResult.found ? (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{loungeSearchResult.player.name}</h3>
                            <Badge className="bg-purple-500">{loungeSearchResult.player.rank}</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-white/5 rounded-lg text-center">
                            <div className="text-2xl font-bold text-yellow-400">
                              {loungeSearchResult.player.mmr}
                            </div>
                            <div className="text-xs text-gray-400">MMR Actuel</div>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {loungeSearchResult.player.maxMmr}
                            </div>
                            <div className="text-xs text-gray-400">MMR Max</div>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-400">
                              {loungeSearchResult.player.winRate}%
                            </div>
                            <div className="text-xs text-gray-400">Win Rate</div>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg text-center">
                            <div className="text-2xl font-bold">
                              {loungeSearchResult.player.wins + loungeSearchResult.player.losses}
                            </div>
                            <div className="text-xs text-gray-400">Matchs Total</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-400">
                            ✓ {loungeSearchResult.player.wins} victoires
                          </span>
                          <span className="text-red-400">
                            ✗ {loungeSearchResult.player.losses} défaites
                          </span>
                          <span className="text-gray-400">
                            {loungeSearchResult.player.eventsPlayed} events
                          </span>
                        </div>

                        {/* Activity Status */}
                        <div className={`mt-4 p-3 rounded-lg ${loungeSearchResult.activity.isActive ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                          <div className="flex items-center gap-2">
                            {loungeSearchResult.activity.isActive ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-400" />
                            )}
                            <span className={loungeSearchResult.activity.isActive ? 'text-green-400' : 'text-yellow-400'}>
                              {loungeSearchResult.activity.matchCount} matchs récents (30j)
                              {loungeSearchResult.activity.isActive ? ' - Éligible auto-approbation' : ' - Activité insuffisante'}
                            </span>
                          </div>
                          {loungeSearchResult.activity.lastMatchDate && (
                            <div className="text-xs text-gray-400 mt-1">
                              Dernier match: {new Date(loungeSearchResult.activity.lastMatchDate).toLocaleString('fr-FR')}
                            </div>
                          )}
                        </div>
                      </div>

                      <a 
                        href={loungeSearchResult.loungeProfileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-4"
                      >
                        <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Voir sur Lounge
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <span>Joueur "{loungeSearch}" introuvable sur le Lounge</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Vérifiez l'orthographe exacte du nom (sensible à la casse)
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">En Attente</div>
                  <div className="text-3xl font-bold">{pending.filter(p => p.status === 'pending').length}</div>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Activité Requise</div>
                  <div className="text-3xl font-bold">{pending.filter(p => p.status === 'waiting_activity').length}</div>
                </div>
                <Target className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Nom Lounge Requis</div>
                  <div className="text-3xl font-bold">{pending.filter(p => p.status === 'waiting_lounge_name').length}</div>
                </div>
                <User className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Total</div>
                  <div className="text-3xl font-bold">{pending.length}</div>
                </div>
                <Trophy className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verifications */}
        <h2 className="text-2xl font-bold mb-4">Vérifications en Attente</h2>
        
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
              <Card key={user.discordId} className={`bg-white/5 border-white/10 ${selectedUser === user.discordId ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {user.avatar ? (
                        <img 
                          src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                          alt={user.username}
                          className="w-14 h-14 rounded-full"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold">
                          {user.username?.[0] || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-lg">{user.username}</div>
                        <div className="text-sm text-gray-400">Pseudo Serveur: {user.serverNickname}</div>
                        {user.loungeName && (
                          <div className="text-sm text-green-400">Nom Lounge: {user.loungeName}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusBadgeColor(user.status)}>
                            {getStatusText(user.status)}
                          </Badge>
                          {user.matchCount !== undefined && (
                            <span className="text-xs text-gray-500">
                              {user.matchCount} matchs récents
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Demande: {new Date(user.createdAt).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Show assign button if user needs lounge name or is waiting */}
                      {(user.status === 'waiting_lounge_name' || user.status === 'waiting_activity' || user.status === 'pending') && !user.loungeName && (
                        <>
                          {selectedUser === user.discordId && loungeSearchResult?.found ? (
                            <Button
                              onClick={() => handleAssignLoungeName(user.discordId)}
                              disabled={assigningLounge}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {assigningLounge ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Associer "{loungeSearchResult.player.name}"
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setSelectedUser(selectedUser === user.discordId ? null : user.discordId)}
                              variant="outline"
                              className={selectedUser === user.discordId ? 'border-blue-500 text-blue-400' : 'border-white/20'}
                            >
                              <User className="w-4 h-4 mr-2" />
                              {selectedUser === user.discordId ? 'Sélectionné' : 'Associer Nom Lounge'}
                            </Button>
                          )}
                        </>
                      )}

                      {/* Lounge profile link if they have a lounge name */}
                      {user.loungeName && (
                        <a 
                          href={`https://www.mk8dx-lounge.com/PlayerDetails/${encodeURIComponent(user.loungeName)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" className="border-purple-500/30 text-purple-400">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Profil Lounge
                          </Button>
                        </a>
                      )}
                      
                      {user.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleVerify(user.discordId, user.loungeName || user.serverNickname, true)}
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

                      {user.mkcentralRegistryLink && (
                        <a href={user.mkcentralRegistryLink} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="text-xs">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Registry
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* MKCentral Cache Panel */}
        <Card className="bg-white/5 border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>MKCentral Cache</span>
              <div className="flex items-center gap-2">
                <input 
                  className="bg-black/20 p-2 rounded text-sm border border-white/10" 
                  placeholder="Filtrer (lien / nom équipe)" 
                  value={mkFilter} 
                  onChange={(e) => setMkFilter(e.target.value)} 
                />
                <select 
                  value={mkLimit} 
                  onChange={(e) => setMkLimit(parseInt(e.target.value, 10))} 
                  className="bg-black/20 p-2 rounded text-sm border border-white/10"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <Button onClick={() => fetchMkCache(1, mkLimit, mkFilter)} variant="ghost">Rechercher</Button>
                <Button onClick={handleRefreshAllMk} className="bg-white text-black">Rafraîchir tout</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mkCacheLoading ? (
              <div className="text-sm text-gray-400">Chargement...</div>
            ) : mkCache.length === 0 ? (
              <div className="text-sm text-gray-400">Aucune entrée en cache</div>
            ) : (
              <div className="space-y-2">
                {mkCache.map(item => (
                  <div key={item.link} className="p-3 bg-white/5 rounded flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-200 break-all">{item.link}</div>
                      <div className="text-xs text-gray-400">Dernier fetch: {item.lastFetched ? new Date(item.lastFetched).toLocaleString('fr-FR') : 'Jamais'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleRefreshMk(item.link)} variant="outline">Refresh</Button>
                      <a href={item.link} target="_blank" rel="noreferrer"><Button>Voir</Button></a>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-400">Page {mkPage} • Total {mkTotal}</div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => { if (mkPage > 1) { fetchMkCache(mkPage - 1, mkLimit, mkFilter); } }} variant="ghost" disabled={mkPage <= 1}>Préc</Button>
                    <Button onClick={() => { const maxPage = Math.ceil((mkTotal || 0) / mkLimit); if (mkPage < maxPage) { fetchMkCache(mkPage + 1, mkLimit, mkFilter); } }} variant="ghost" disabled={mkPage >= Math.ceil((mkTotal || 0) / mkLimit)}>Suiv</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MKCentral Logs */}
        <Card className="bg-white/5 border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Logs MKCentral</span>
              <div className="flex items-center gap-2">
                <Button onClick={() => fetchMkLogs(1, mkLogsLimit)} variant="ghost">Rafraîchir logs</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mkLogsLoading ? (
              <div className="text-sm text-gray-400">Chargement...</div>
            ) : mkLogs.length === 0 ? (
              <div className="text-sm text-gray-400">Aucun log récent</div>
            ) : (
              <div className="space-y-2">
                {mkLogs.map(l => (
                  <div key={l._id} className="p-3 bg-white/5 rounded">
                    <div className="text-sm">
                      {new Date(l.runAt).toLocaleString('fr-FR')} — 
                      Processed: {l.entriesProcessed} • 
                      Success: {l.successes} • 
                      Fail: {l.failures} 
                      {l.concurrency ? ` • concurrency: ${l.concurrency}` : ''} 
                      {l.action ? ` • ${l.action}` : ''}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-400">Page {mkLogsPage} • Total {mkLogsTotal}</div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => { if (mkLogsPage > 1) { fetchMkLogs(mkLogsPage - 1, mkLogsLimit); } }} variant="ghost" disabled={mkLogsPage <= 1}>Préc</Button>
                    <Button onClick={() => { const maxPage = Math.ceil((mkLogsTotal || 0) / mkLogsLimit); if (mkLogsPage < maxPage) { fetchMkLogs(mkLogsPage + 1, mkLogsLimit); } }} variant="ghost" disabled={mkLogsPage >= Math.ceil((mkLogsTotal || 0) / mkLogsLimit)}>Suiv</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
