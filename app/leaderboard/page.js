'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Home, Trophy, TrendingUp, RefreshCw, Search, 
  ChevronLeft, ChevronRight, Filter, X, Globe,
  ArrowUpDown, Users
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentRank } from '@/lib/mockData';
import RequireAuth from '@/components/RequireAuth';

// Country codes to names mapping (common ones)
const COUNTRY_NAMES = {
  'FR': 'France', 'US': 'États-Unis', 'JP': 'Japon', 'DE': 'Allemagne',
  'GB': 'Royaume-Uni', 'CA': 'Canada', 'ES': 'Espagne', 'IT': 'Italie',
  'BR': 'Brésil', 'MX': 'Mexique', 'AU': 'Australie', 'NL': 'Pays-Bas',
  'BE': 'Belgique', 'CH': 'Suisse', 'AT': 'Autriche', 'SE': 'Suède',
  'NO': 'Norvège', 'DK': 'Danemark', 'FI': 'Finlande', 'PL': 'Pologne',
  'PT': 'Portugal', 'KR': 'Corée du Sud', 'CN': 'Chine', 'TW': 'Taïwan',
  'HK': 'Hong Kong', 'SG': 'Singapour', 'NZ': 'Nouvelle-Zélande',
  'AR': 'Argentine', 'CL': 'Chili', 'CO': 'Colombie', 'PE': 'Pérou',
  'IE': 'Irlande', 'CZ': 'Tchéquie', 'RU': 'Russie', 'UA': 'Ukraine'
};

const MMR_RANGES = [
  { label: 'Tous les MMR', value: 'all' },
  { label: 'Master (14000+)', value: '14000-99999', min: 14000 },
  { label: 'Grandmaster (12000-14000)', value: '12000-14000', min: 12000, max: 14000 },
  { label: 'Diamond (10000-12000)', value: '10000-12000', min: 10000, max: 12000 },
  { label: 'Platinum (8000-10000)', value: '8000-10000', min: 8000, max: 10000 },
  { label: 'Gold (6000-8000)', value: '6000-8000', min: 6000, max: 8000 },
  { label: 'Silver (4000-6000)', value: '4000-6000', min: 4000, max: 6000 },
  { label: 'Bronze (2000-4000)', value: '2000-4000', min: 2000, max: 4000 },
  { label: 'Iron (0-2000)', value: '0-2000', min: 0, max: 2000 },
];

const EVENTS_RANGES = [
  { label: 'Tous les events', value: 'all' },
  { label: '100+ events', value: '100', min: 100 },
  { label: '50+ events', value: '50', min: 50 },
  { label: '25+ events', value: '25', min: 25 },
  { label: '10+ events', value: '10', min: 10 },
  { label: '5+ events', value: '5', min: 5 },
];

const SORT_OPTIONS = [
  { label: 'MMR (décroissant)', value: 'mmr' },
  { label: 'Nom (A-Z)', value: 'name' },
  { label: 'Events joués', value: 'eventsPlayed' },
];

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [season, setSeason] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [country, setCountry] = useState('all');
  const [mmrRange, setMmrRange] = useState('all');
  const [eventsRange, setEventsRange] = useState('all');
  const [sortBy, setSortBy] = useState('mmr');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  
  // Available countries from API
  const [availableCountries, setAvailableCountries] = useState([]);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
      });
      
      if (search) params.append('search', search);
      if (country && country !== 'all') params.append('country', country);
      
      // Parse MMR range
      if (mmrRange && mmrRange !== 'all') {
        const range = MMR_RANGES.find(r => r.value === mmrRange);
        if (range) {
          if (range.min !== undefined) params.append('minMmr', range.min.toString());
          if (range.max !== undefined) params.append('maxMmr', range.max.toString());
        }
      }
      
      // Parse events range
      if (eventsRange && eventsRange !== 'all') {
        const range = EVENTS_RANGES.find(r => r.value === eventsRange);
        if (range && range.min !== undefined) {
          params.append('minEvents', range.min.toString());
        }
      }
      
      const res = await fetch(`/api/leaderboard?${params}`);
      const data = await res.json();
      
      setLeaderboard(data.players || []);
      setLastUpdate(data.lastUpdate);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setSeason(data.season);
      
      // Extract unique countries
      if (data.players && data.players.length > 0) {
        const countries = [...new Set(data.players.map(p => p.countryCode).filter(Boolean))];
        setAvailableCountries(prev => {
          const merged = [...new Set([...prev, ...countries])];
          return merged.sort();
        });
      }
    } catch (err) {
      console.error('Erreur chargement leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, country, mmrRange, eventsRange, sortBy]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setCountry('all');
    setMmrRange('all');
    setEventsRange('all');
    setSortBy('mmr');
    setPage(1);
  };

  const hasActiveFilters = search || country !== 'all' || mmrRange !== 'all' || eventsRange !== 'all' || sortBy !== 'mmr';

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
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Tournois</Button>
              </Link>
              <Link href="/leaderboard">
                <span className="font-bold text-white">Leaderboard</span>
              </Link>
            </div>
            <Button 
              onClick={fetchLeaderboard} 
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
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black mb-4 flex items-center justify-center gap-3">
              <Trophy className="w-12 h-12 text-yellow-500" />
              Leaderboard Global
            </h1>
            <p className="text-xl text-gray-400">
              Classement des meilleurs joueurs du Lounge MK8DX
              {season && <span className="ml-2 text-blue-400">• Saison {season}</span>}
            </p>
            {lastUpdate && (
              <p className="text-sm text-gray-500 mt-2">
                Dernière mise à jour : {new Date(lastUpdate).toLocaleString('fr-FR')}
              </p>
            )}
          </div>

          {/* Filters */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5" />
                Filtres & Recherche
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Effacer filtres
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un joueur..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-10 bg-white/5 border-white/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Country */}
                <Select value={country} onValueChange={(v) => handleFilterChange(setCountry, v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <Globe className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Pays" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="all">Tous les pays</SelectItem>
                    {availableCountries.map(code => (
                      <SelectItem key={code} value={code}>
                        {COUNTRY_NAMES[code] || code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* MMR Range */}
                <Select value={mmrRange} onValueChange={(v) => handleFilterChange(setMmrRange, v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <Trophy className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Range MMR" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {MMR_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Events Range */}
                <Select value={eventsRange} onValueChange={(v) => handleFilterChange(setEventsRange, v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <Users className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Events" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {EVENTS_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort & Stats */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Trier par:</span>
                  <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
                    <SelectTrigger className="w-48 bg-white/5 border-white/20">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {SORT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-gray-400">
                  <span className="font-semibold text-white">{total.toLocaleString('fr-FR')}</span> joueurs trouvés
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Classement</span>
                <span className="text-sm font-normal text-gray-400">
                  Page {page} sur {totalPages}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Chargement du leaderboard...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Aucun joueur trouvé avec ces critères</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-white/20"
                    onClick={clearFilters}
                  >
                    Effacer les filtres
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {leaderboard.map((player, index) => {
                      const rank = getCurrentRank(player.mmr || 0);
                      const globalRank = player.rank || ((page - 1) * limit + index + 1);
                      const isTop3 = globalRank <= 3;
                      
                      return (
                        <div 
                          key={player.id || index}
                          className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                            isTop3 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-12 h-12 flex items-center justify-center rounded-full ${
                              globalRank === 1 ? 'bg-yellow-500 text-black' :
                              globalRank === 2 ? 'bg-gray-300 text-black' :
                              globalRank === 3 ? 'bg-orange-600 text-white' :
                              'bg-white/10'
                            } font-bold text-lg`}>
                              {globalRank === 1 ? '🥇' : globalRank === 2 ? '🥈' : globalRank === 3 ? '🥉' : `#${globalRank}`}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{player.name}</span>
                                {player.countryCode && (
                                  <span className="text-sm" title={COUNTRY_NAMES[player.countryCode] || player.countryCode}>
                                    {player.countryCode}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge style={{ backgroundColor: rank.color }} className="text-black text-xs">
                                  {rank.name}
                                </Badge>
                                {player.eventsPlayed > 0 && (
                                  <span className="text-xs text-gray-400">
                                    {player.eventsPlayed} events
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-xs text-gray-400">MMR</div>
                              <div className="text-2xl font-bold">{(player.mmr || 0).toLocaleString('fr-FR')}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-white/10">
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
                      
                      {/* Page numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={page === pageNum 
                                ? "bg-white text-black" 
                                : "border-white/20 hover:bg-white/10"
                              }
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

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
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}
