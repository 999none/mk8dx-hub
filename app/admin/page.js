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

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">MKCentral Cache</div>
                  <div className="text-3xl font-bold" id="mkcache-count">—</div>
                </div>
                <RefreshCw className="w-8 h-8 text-gray-400" />
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
                        {user.matchCount !== undefined && (
                          <div className="text-sm text-gray-400">Matchs récents (30j): {user.matchCount}</div>
                        )}
                        {user.lastMatchDate && (
                          <div className="text-sm text-gray-400">Dernier match: {new Date(user.lastMatchDate).toLocaleString('fr-FR')}</div>
                        )}
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
                          <Button
                            onClick={async () => {
                              const link = window.prompt('Collez le lien Registry MKCentral (ex: https://mkcentral.com/registry/...)');
                              if (!link) return;
                              try {
                                const res = await fetch('/api/admin/set-registry-link', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ discordId: user.discordId, registryLink: link })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  toast.success(data.message);
                                  fetchPending();
                                } else {
                                  toast.error(data.message || 'Erreur');
                                }
                              } catch (err) {
                                console.error('Erreur association registry:', err);
                                toast.error('Erreur lors de l\'association');
                              }
                            }}
                            variant="outline"
                          >Associer Registry</Button>
                        </>
                      )}
                      {user.mkcentralRegistryLink && (
                        <div className="text-xs text-gray-400 mt-2">Registry: <a href={user.mkcentralRegistryLink} target="_blank" rel="noreferrer" className="underline">{user.mkcentralRegistryLink}</a></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* MKCentral Cache Panel */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>MKCentral Cache</span>
                  <div className="flex items-center gap-2">
                    <input className="bg-black/20 p-2 rounded text-sm" placeholder="Filtrer (lien / nom équipe)" value={mkFilter} onChange={(e) => setMkFilter(e.target.value)} />
                    <select value={mkLimit} onChange={(e) => setMkLimit(parseInt(e.target.value, 10))} className="bg-black/20 p-2 rounded text-sm">
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

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">Page {mkPage} • Total {mkTotal}</div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => { if (mkPage > 1) { fetchMkCache(mkPage - 1, mkLimit, mkFilter); } }} variant="ghost">Préc</Button>
                        <Button onClick={() => { const maxPage = Math.ceil((mkTotal || 0) / mkLimit); if (mkPage < maxPage) { fetchMkCache(mkPage + 1, mkLimit, mkFilter); } }} variant="ghost">Suiv</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MKCentral Logs */}
            <Card className="bg-white/5 border-white/10">
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
                        <div className="text-sm">{new Date(l.runAt).toLocaleString('fr-FR')} — Processed: {l.entriesProcessed} • Success: {l.successes} • Fail: {l.failures} {l.concurrency ? `• concurrency: ${l.concurrency}` : ''} {l.action ? `• ${l.action}` : ''}</div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">Page {mkLogsPage} • Total {mkLogsTotal}</div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => { if (mkLogsPage > 1) { fetchMkLogs(mkLogsPage - 1, mkLogsLimit); } }} variant="ghost">Préc</Button>
                        <Button onClick={() => { const maxPage = Math.ceil((mkLogsTotal || 0) / mkLogsLimit); if (mkLogsPage < maxPage) { fetchMkLogs(mkLogsPage + 1, mkLogsLimit); } }} variant="ghost">Suiv</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}