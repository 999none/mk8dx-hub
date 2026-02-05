'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, RefreshCw, Search, 
  ChevronLeft, ChevronRight, X, Globe,
  ArrowUpDown, Users
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
  }, [page, limit, search, country, mmrRange, eventsRange, sortBy]);

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

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header with animation */}
        <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Leaderboard</h1>
          <p className="text-gray-500 text-sm">
            {season && <span>Saison {season} • </span>}
            <span className="text-green-500 font-medium">{total.toLocaleString('fr-FR')}</span> joueurs enregistrés
            <span className="text-gray-600 ml-2">— MK8DX Lounge</span>
          </p>
        </div>

        {/* Filters with animation */}
        <div className={`bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col gap-3">
            {/* Search */}
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
                  size="icon"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-10 w-10 hover:rotate-90 transition-all duration-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={country} onValueChange={(v) => handleFilterChange(setCountry, v)}>
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10 hover:border-white/20 transition-colors">
                  <Globe className="w-4 h-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="Pays" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.06] max-h-80">
                  <SelectItem value="all">Tous pays</SelectItem>
                  {availableCountries.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {getCountryFlag(c.code)} {c.name || COUNTRY_NAMES[c.code] || c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mmrRange} onValueChange={(v) => handleFilterChange(setMmrRange, v)}>
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10 hover:border-white/20 transition-colors">
                  <Trophy className="w-4 h-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="MMR" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                  {MMR_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={eventsRange} onValueChange={(v) => handleFilterChange(setEventsRange, v)}>
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10 hover:border-white/20 transition-colors">
                  <Users className="w-4 h-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="Events" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                  {EVENTS_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>{range.label} events</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10 hover:border-white/20 transition-colors">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-gray-600" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>Tri: {opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Leaderboard Table with animation */}
        <div className={`bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">Chargement...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-700 animate-bounce-subtle" />
              <p className="text-gray-500">Aucun joueur trouvé</p>
              <Button variant="ghost" className="mt-4 text-gray-400 hover:text-white" onClick={clearFilters}>
                Effacer les filtres
              </Button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 bg-white/[0.02] text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-white/[0.04]">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Joueur</div>
                <div className="col-span-2 text-center">Tier</div>
                <div className="col-span-2 text-center">Events</div>
                <div className="col-span-2 text-right">MMR</div>
              </div>

              {/* Players List with staggered animation */}
              <div className="divide-y divide-white/[0.03]">
                {leaderboard.map((player, index) => {
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
                    <Link key={player.id || index} href={linkHref}>
                      <div 
                        className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.04] transition-all duration-300 cursor-pointer group ${rowHighlight}`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        {/* Rank */}
                        <div className="col-span-2 sm:col-span-1">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold transition-transform duration-300 group-hover:scale-110 ${rankStyle}`}>
                            {globalRank}
                          </span>
                        </div>
                        
                        {/* Player Name */}
                        <div className="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0">
                          {player.countryCode && (
                            <span className="text-sm flex-shrink-0 transition-transform duration-300 group-hover:scale-110">{getCountryFlag(player.countryCode)}</span>
                          )}
                          <span className={`text-sm truncate transition-colors duration-300 ${isCurrentUser ? 'font-semibold text-green-400' : isTracked ? 'text-green-300' : isTop3 ? 'font-semibold text-white' : 'text-gray-300 group-hover:text-white'}`}>
                            {player.name}
                          </span>
                          {isCurrentUser && (
                            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] px-1.5 py-0 animate-pulse-subtle">
                              Moi
                            </Badge>
                          )}
                          {isTracked && !isCurrentUser && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse" title="Joueur suivi" />
                          )}
                        </div>
                        
                        {/* Rank Badge */}
                        <div className="hidden sm:flex sm:col-span-2 justify-center">
                          <Badge 
                            style={{ backgroundColor: rank.color }} 
                            className="text-black text-[10px] px-2 py-0 font-medium transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
                          >
                            {rank.name}
                          </Badge>
                        </div>
                        
                        {/* Events */}
                        <div className="hidden sm:block sm:col-span-2 text-center">
                          <span className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">{player.eventsPlayed || 0}</span>
                        </div>
                        
                        {/* MMR */}
                        <div className="col-span-4 sm:col-span-2 text-right">
                          <span className="text-sm font-semibold text-white tabular-nums">
                            {(player.mmr || 0).toLocaleString('fr-FR')}
                          </span>
                          <div className="sm:hidden mt-0.5">
                            <Badge style={{ backgroundColor: rank.color }} className="text-black text-[9px] px-1.5 py-0 font-medium">
                              {rank.name}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

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
        </div>

        {lastUpdate && (
          <p className={`text-xs text-gray-600 mt-4 text-center transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Mis à jour: {new Date(lastUpdate).toLocaleString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
}