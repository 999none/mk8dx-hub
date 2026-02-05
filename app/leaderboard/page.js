'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, RefreshCw, Search, 
  ChevronLeft, ChevronRight, X, Globe,
  ArrowUpDown, Users, Filter, Star, Award, BookOpen,
  ChevronDown, ChevronUp, TrendingUp, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentRank } from '@/lib/mockData';
import Navbar from '@/components/Navbar';

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

const getCountryFlag = (countryCode) => {
  if (!countryCode) return '';
  return countryCode.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(127397 + char.charCodeAt())
  );
};

const MMR_RANGES = [
  { label: 'Tous MMR', value: 'all' },
  { label: 'Master (14000+)', value: '14000-99999', min: 14000 },
  { label: 'Grandmaster', value: '12000-14000', min: 12000, max: 14000 },
  { label: 'Diamond', value: '10000-12000', min: 10000, max: 12000 },
  { label: 'Platinum', value: '8000-10000', min: 8000, max: 10000 },
  { label: 'Gold', value: '6000-8000', min: 6000, max: 8000 },
  { label: 'Silver', value: '4000-6000', min: 4000, max: 6000 },
  { label: 'Bronze', value: '2000-4000', min: 2000, max: 4000 },
  { label: 'Iron', value: '0-2000', min: 0, max: 2000 },
];

const EVENTS_RANGES = [
  { label: 'Tous', value: 'all' },
  { label: '100+', value: '100', min: 100 },
  { label: '50+', value: '50', min: 50 },
  { label: '25+', value: '25', min: 25 },
  { label: '10+', value: '10', min: 10 },
];

const SORT_OPTIONS = [
  { label: 'MMR', value: 'mmr' },
  { label: 'Nom', value: 'name' },
  { label: 'Events', value: 'eventsPlayed' },
];

const AVAILABLE_SEASONS = [
  { value: '', label: 'Saison 15 (Actuelle)' },
  { value: '14', label: 'Saison 14' },
  { value: '13', label: 'Saison 13' },
  { value: '12', label: 'Saison 12' },
  { value: '11', label: 'Saison 11' },
];

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [season, setSeason] = useState(null);
  const [currentUserLoungeName, setCurrentUserLoungeName] = useState(null);
  const [trackedPlayers, setTrackedPlayers] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('');
  
  // Animation mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [country, setCountry] = useState('all');
  const [mmrRange, setMmrRange] = useState('all');
  const [eventsRange, setEventsRange] = useState('all');
  const [sortBy, setSortBy] = useState('mmr');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  
  const [availableCountries, setAvailableCountries] = useState([]);

  // Fetch current user's lounge name and tracked players
  useEffect(() => {
    async function fetchUserData() {
      if (session?.user) {
        try {
          const verifyRes = await fetch('/api/verification/status');
          const verifyData = await verifyRes.json();
          if (verifyData.verified && verifyData.user?.loungeName) {
            setCurrentUserLoungeName(verifyData.user.loungeName);
          }
          // Fetch tracked players
          const trackedRes = await fetch('/api/tracked-players');
          const trackedData = await trackedRes.json();
          if (trackedData.players) {
            setTrackedPlayers(trackedData.players.map(p => p.loungeName?.toLowerCase()));
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }
    }
    fetchUserData();
  }, [session]);

  // Fetch available countries on mount
  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch('/api/leaderboard/countries');
        const data = await res.json();
        if (data.countries && Array.isArray(data.countries)) {
          setAvailableCountries(data.countries);
        }
      } catch (err) {
        console.error('Error loading countries:', err);
      }
    }
    fetchCountries();
  }, []);

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
      if (selectedSeason) params.append('season', selectedSeason);
      
      if (mmrRange && mmrRange !== 'all') {
        const range = MMR_RANGES.find(r => r.value === mmrRange);
        if (range) {
          if (range.min !== undefined) params.append('minMmr', range.min.toString());
          if (range.max !== undefined) params.append('maxMmr', range.max.toString());
        }
      }
      
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
    } catch (err) {
      console.error('Erreur chargement leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, country, mmrRange, eventsRange, sortBy, selectedSeason]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

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

  // Calculate stats
  const countryCounts = leaderboard.reduce((acc, p) => {
    if (p.countryCode) {
      acc[p.countryCode] = (acc[p.countryCode] || 0) + 1;
    }
    return acc;
  }, {});
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const avgMmr = leaderboard.length > 0 ? Math.round(leaderboard.reduce((a, p) => a + (p.mmr || 0), 0) / leaderboard.length) : 0;

  const displayedPlayers = showAllPlayers ? leaderboard : leaderboard.slice(0, 20);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header with animation */}
        <div className={`mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Leaderboard</h1>
            <p className="text-gray-500">
              {season && <span>Saison {season} • </span>}
              <span className="text-green-500 font-medium">{total.toLocaleString('fr-FR')}</span> joueurs — MK8DX Lounge
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={loading}
            className="border-white/[0.06] hover:bg-white/[0.04] text-gray-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {loading && leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner-trail mb-4" />
            <span className="text-gray-500">Chargement du classement...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Filters Card */}
            <Card className={`card-premium lg:col-span-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  {/* Search Row */}
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-white transition-colors" />
                      <Input
                        placeholder="Rechercher un joueur..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10 bg-black border-white/[0.06] text-white placeholder:text-gray-600 h-10 focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all"
                      />
                    </div>
                    {hasActiveFilters && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={clearFilters}
                        className="text-gray-500 hover:text-white h-10"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Effacer
                      </Button>
                    )}
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    
                    <Select value={country} onValueChange={(v) => handleFilterChange(setCountry, v)}>
                      <SelectTrigger className="w-[140px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                        <Globe className="w-3 h-3 mr-2 text-blue-400" />
                        <SelectValue placeholder="Pays" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/[0.1] max-h-80">
                        <SelectItem value="all" className="text-white hover:bg-white/[0.1]">Tous pays</SelectItem>
                        {availableCountries.map(c => (
                          <SelectItem key={c.code} value={c.code} className="text-white hover:bg-white/[0.1]">
                            {getCountryFlag(c.code)} {c.name || COUNTRY_NAMES[c.code] || c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={mmrRange} onValueChange={(v) => handleFilterChange(setMmrRange, v)}>
                      <SelectTrigger className="w-[160px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                        <Trophy className="w-3 h-3 mr-2 text-yellow-400" />
                        <SelectValue placeholder="MMR" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/[0.1]">
                        {MMR_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value} className="text-white hover:bg-white/[0.1]">{range.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={eventsRange} onValueChange={(v) => handleFilterChange(setEventsRange, v)}>
                      <SelectTrigger className="w-[130px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                        <Users className="w-3 h-3 mr-2 text-purple-400" />
                        <SelectValue placeholder="Events" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/[0.1]">
                        {EVENTS_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value} className="text-white hover:bg-white/[0.1]">{range.label} events</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
                      <SelectTrigger className="w-[120px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                        <ArrowUpDown className="w-3 h-3 mr-2 text-green-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/[0.1]">
                        {SORT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/[0.1]">Tri: {opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Active Filters Summary */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                      <span className="text-xs text-gray-500">{total} résultat(s)</span>
                      {country !== 'all' && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                          {getCountryFlag(country)} {COUNTRY_NAMES[country] || country}
                        </Badge>
                      )}
                      {mmrRange !== 'all' && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          {MMR_RANGES.find(r => r.value === mmrRange)?.label}
                        </Badge>
                      )}
                      {eventsRange !== 'all' && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {eventsRange}+ events
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard Table */}
            <Card className={`card-premium lg:col-span-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
              <CardHeader className="border-b border-white/[0.04] pb-4">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Classement ({leaderboard.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-700 animate-bounce-subtle" />
                    <p className="text-gray-500">Aucun joueur trouvé</p>
                    {hasActiveFilters && (
                      <Button variant="ghost" className="mt-4 text-gray-400 hover:text-white" onClick={clearFilters}>
                        Effacer les filtres
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/[0.04]">
                            <th className="text-left py-3 px-4 font-medium w-16">#</th>
                            <th className="text-left py-3 px-4 font-medium">Joueur</th>
                            <th className="text-center py-3 px-4 font-medium">Tier</th>
                            <th className="text-center py-3 px-4 font-medium">Events</th>
                            <th className="text-right py-3 px-4 font-medium">MMR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {displayedPlayers.map((player, index) => {
                            const rank = getCurrentRank(player.mmr || 0);
                            const globalRank = player.rank || ((page - 1) * limit + index + 1);
                            const isTop3 = globalRank <= 3;
                            const isCurrentUser = currentUserLoungeName && player.name?.toLowerCase() === currentUserLoungeName?.toLowerCase();
                            const isTracked = trackedPlayers.includes(player.name?.toLowerCase());
                            
                            let rankStyle = 'bg-white/[0.04] text-gray-400';
                            let rowHighlight = '';
                            
                            if (globalRank === 1) {
                              rankStyle = 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black shadow-lg shadow-yellow-500/20';
                              rowHighlight = 'bg-yellow-500/[0.03]';
                            } else if (globalRank === 2) {
                              rankStyle = 'bg-gradient-to-r from-gray-400 to-gray-300 text-black';
                              rowHighlight = 'bg-gray-400/[0.03]';
                            } else if (globalRank === 3) {
                              rankStyle = 'bg-gradient-to-r from-orange-600 to-amber-600 text-white';
                              rowHighlight = 'bg-orange-600/[0.03]';
                            }
                            
                            // Override highlight for tracked players and current user
                            if (isCurrentUser) {
                              rowHighlight = 'bg-green-500/[0.08] border-l-2 border-green-500';
                            } else if (isTracked) {
                              rowHighlight = 'bg-green-500/[0.04] border-l-2 border-green-500/50';
                            }
                            
                            // Determine link destination
                            const linkHref = isCurrentUser ? '/dashboard' : `/player/${encodeURIComponent(player.name)}`;
                            
                            return (
                              <tr 
                                key={player.id || index}
                                className={`table-row-hover cursor-pointer group ${rowHighlight}`}
                                onClick={() => router.push(linkHref)}
                                style={{ animationDelay: `${index * 30}ms` }}
                              >
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold transition-transform duration-300 group-hover:scale-110 ${rankStyle}`}>
                                    {globalRank}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    {player.countryCode && (
                                      <span className="text-sm flex-shrink-0 transition-transform duration-300 group-hover:scale-110">{getCountryFlag(player.countryCode)}</span>
                                    )}
                                    <span className={`text-sm truncate transition-colors duration-300 ${isCurrentUser ? 'font-semibold text-green-400' : isTracked ? 'text-green-300' : isTop3 ? 'font-semibold text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                      {player.name}
                                    </span>
                                    {isCurrentUser && (
                                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] px-1.5 py-0 badge-pulse">
                                        Moi
                                      </Badge>
                                    )}
                                    {isTracked && !isCurrentUser && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse" title="Joueur suivi" />
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge 
                                    style={{ backgroundColor: rank.color }} 
                                    className="text-black text-[10px] px-2 py-0 font-medium transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
                                  >
                                    {rank.name}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">{player.eventsPlayed || 0}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-sm font-semibold text-white tabular-nums transition-transform duration-300 group-hover:scale-110 inline-block">
                                    {(player.mmr || 0).toLocaleString('fr-FR')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Show More / Less Button */}
                    {leaderboard.length > 20 && (
                      <div className="py-3 text-center border-t border-white/[0.04]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllPlayers(!showAllPlayers)}
                          className="text-gray-500 hover:text-white group"
                        >
                          {showAllPlayers ? <ChevronUp className="w-4 h-4 mr-1 group-hover:-translate-y-0.5 transition-transform" /> : <ChevronDown className="w-4 h-4 mr-1 group-hover:translate-y-0.5 transition-transform" />}
                          {showAllPlayers ? 'Moins' : `Tout afficher (${leaderboard.length})`}
                        </Button>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-1 p-4 border-t border-white/[0.04]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 px-3 transition-all"
                        >
                          Début
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 w-8 transition-all hover:-translate-x-0.5"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (page <= 3) pageNum = i + 1;
                            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = page - 2 + i;
                            
                            return (
                              <Button
                                key={pageNum}
                                variant="ghost"
                                size="sm"
                                onClick={() => setPage(pageNum)}
                                className={`h-8 w-8 transition-all duration-300 ${page === pageNum ? 'bg-white text-black hover:bg-gray-200 scale-110' : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'}`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 w-8 transition-all hover:translate-x-0.5"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(totalPages)}
                          disabled={page === totalPages}
                          className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 px-3 transition-all"
                        >
                          Fin
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className={`card-premium lg:col-span-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '350ms' }}>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { href: '/lounge', icon: Star, label: 'Lounge', color: 'text-purple-500', bg: 'bg-purple-500/10', hoverBg: 'hover:bg-purple-500/20' },
                    { href: '/academy', icon: BookOpen, label: 'Academy', color: 'text-blue-500', bg: 'bg-blue-500/10', hoverBg: 'hover:bg-blue-500/20' },
                    { href: '/tournaments', icon: Award, label: 'Tournois', color: 'text-yellow-500', bg: 'bg-yellow-500/10', hoverBg: 'hover:bg-yellow-500/20' },
                  ].map((link, i) => (
                    <Link key={i} href={link.href}>
                      <div className={`p-4 ${link.bg} ${link.hoverBg} rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg group cursor-pointer`}>
                        <link.icon className={`w-6 h-6 mx-auto mb-2 ${link.color} group-hover:scale-110 transition-transform duration-300`} />
                        <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-300">{link.label}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Last Update */}
            {lastUpdate && (
              <div className={`lg:col-span-4 text-center transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '400ms' }}>
                <p className="text-xs text-gray-600">
                  Mis à jour: {new Date(lastUpdate).toLocaleString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
