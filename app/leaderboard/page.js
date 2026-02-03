'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [season, setSeason] = useState(null);
  
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-gray-500 text-sm">
            {season && <span>Saison {season} • </span>}
            <span className="text-green-500 font-medium">{total.toLocaleString('fr-FR')}</span> joueurs
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 mb-6">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <Input
                  placeholder="Rechercher un joueur..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 bg-black border-white/[0.06] text-white placeholder:text-gray-600 h-10"
                />
              </div>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-10 w-10"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={country} onValueChange={(v) => handleFilterChange(setCountry, v)}>
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10">
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
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10">
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
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10">
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
                <SelectTrigger className="bg-black border-white/[0.06] text-gray-400 h-10">
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

        {/* Leaderboard Table */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">Chargement...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-700" />
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

              {/* Players List */}
              <div className="divide-y divide-white/[0.03]">
                {leaderboard.map((player, index) => {
                  const rank = getCurrentRank(player.mmr || 0);
                  const globalRank = player.rank || ((page - 1) * limit + index + 1);
                  const isTop3 = globalRank <= 3;
                  
                  let rankStyle = 'bg-white/[0.04] text-gray-400';
                  let rowHighlight = '';
                  
                  if (globalRank === 1) {
                    rankStyle = 'bg-yellow-500 text-black';
                    rowHighlight = 'bg-yellow-500/[0.03]';
                  } else if (globalRank === 2) {
                    rankStyle = 'bg-gray-400 text-black';
                    rowHighlight = 'bg-gray-400/[0.03]';
                  } else if (globalRank === 3) {
                    rankStyle = 'bg-orange-600 text-white';
                    rowHighlight = 'bg-orange-600/[0.03]';
                  }
                  
                  return (
                    <Link key={player.id || index} href={`/player/${encodeURIComponent(player.name)}`}>
                      <div className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.04] transition-colors cursor-pointer ${rowHighlight}`}>
                        {/* Rank */}
                        <div className="col-span-2 sm:col-span-1">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${rankStyle}`}>
                            {globalRank}
                          </span>
                        </div>
                        
                        {/* Player Name */}
                        <div className="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0">
                          {player.countryCode && (
                            <span className="text-sm flex-shrink-0">{getCountryFlag(player.countryCode)}</span>
                          )}
                          <span className={`text-sm truncate ${isTop3 ? 'font-semibold text-white' : 'text-gray-300'}`}>
                            {player.name}
                          </span>
                        </div>
                        
                        {/* Rank Badge */}
                        <div className="hidden sm:flex sm:col-span-2 justify-center">
                          <Badge style={{ backgroundColor: rank.color }} className="text-black text-[10px] px-2 py-0 font-medium">
                            {rank.name}
                          </Badge>
                        </div>
                        
                        {/* Events */}
                        <div className="hidden sm:block sm:col-span-2 text-center">
                          <span className="text-sm text-gray-500">{player.eventsPlayed || 0}</span>
                        </div>
                        
                        {/* MMR */}
                        <div className="col-span-4 sm:col-span-2 text-right">
                          <span className="text-sm font-semibold text-white">
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
                    className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 px-3"
                  >
                    Début
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 w-8"
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
                          className={`h-8 w-8 ${page === pageNum ? 'bg-white text-black hover:bg-gray-200' : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'}`}
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
                    className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="text-gray-500 hover:text-white hover:bg-white/[0.04] h-8 px-3"
                  >
                    Fin
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {lastUpdate && (
          <p className="text-xs text-gray-600 mt-4 text-center">
            Mis à jour: {new Date(lastUpdate).toLocaleString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
}