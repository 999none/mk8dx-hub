'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, RefreshCw, Search, 
  ChevronLeft, ChevronRight, X, Globe,
  ArrowUpDown, Users, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentRank } from '@/lib/mockData';
import Navbar from '@/components/Navbar';

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

// Function to get country flag emoji
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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-1">
            Leaderboard
          </h1>
          <p className="text-sm text-gray-500">
            {season && <span>Saison {season} • </span>}
            {total.toLocaleString('fr-FR')} joueurs
          </p>
        </div>

        {/* Filters - Style MKCentral */}
        <div className="bg-[#1a1a2e] border border-[#252540] rounded-lg p-3 sm:p-4 mb-4">
          <div className="flex flex-col gap-3">
            {/* Search Row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <Input
                  placeholder="Rechercher..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 bg-[#12122a] border-[#252540] text-gray-200 placeholder:text-gray-600 text-sm h-9"
                />
              </div>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-300 hover:bg-[#252548] h-9 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filters Row - Mobile optimized */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={country} onValueChange={(v) => handleFilterChange(setCountry, v)}>
                <SelectTrigger className="bg-[#12122a] border-[#252540] text-gray-300 text-xs h-9">
                  <Globe className="w-3 h-3 mr-1.5 text-gray-500" />
                  <SelectValue placeholder="Pays" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#252540]">
                  <SelectItem value="all">Tous pays</SelectItem>
                  {availableCountries.map(code => (
                    <SelectItem key={code} value={code}>
                      {getCountryFlag(code)} {COUNTRY_NAMES[code] || code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mmrRange} onValueChange={(v) => handleFilterChange(setMmrRange, v)}>
                <SelectTrigger className="bg-[#12122a] border-[#252540] text-gray-300 text-xs h-9">
                  <Trophy className="w-3 h-3 mr-1.5 text-gray-500" />
                  <SelectValue placeholder="MMR" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#252540]">
                  {MMR_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={eventsRange} onValueChange={(v) => handleFilterChange(setEventsRange, v)}>
                <SelectTrigger className="bg-[#12122a] border-[#252540] text-gray-300 text-xs h-9">
                  <Users className="w-3 h-3 mr-1.5 text-gray-500" />
                  <SelectValue placeholder="Events" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#252540]">
                  {EVENTS_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label} events
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
                <SelectTrigger className="bg-[#12122a] border-[#252540] text-gray-300 text-xs h-9">
                  <ArrowUpDown className="w-3 h-3 mr-1.5 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#252540]">
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      Tri: {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Leaderboard - Style MKCentral */}
        <div className="bg-[#1a1a2e] border border-[#252540] rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">Chargement...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">Aucun joueur trouvé</p>
              <Button 
                variant="ghost" 
                className="mt-3 text-gray-400 hover:text-gray-200"
                onClick={clearFilters}
              >
                Effacer les filtres
              </Button>
            </div>
          ) : (
            <>
              {/* Table Header - Desktop */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 bg-[#12122a] text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-2 text-center">Tier</div>
                <div className="col-span-2 text-center">Events</div>
                <div className="col-span-2 text-right">MMR</div>
              </div>

              {/* Players List */}
              <div className="divide-y divide-[#252540]/50">
                {leaderboard.map((player, index) => {
                  const rank = getCurrentRank(player.mmr || 0);
                  const globalRank = player.rank || ((page - 1) * limit + index + 1);
                  const isTop3 = globalRank <= 3;
                  
                  // Podium styling
                  let podiumBg = '';
                  let rankBadgeClass = 'bg-[#252548] text-gray-400';
                  
                  if (globalRank === 1) {
                    podiumBg = 'bg-yellow-500/10';
                    rankBadgeClass = 'bg-yellow-500 text-black';
                  } else if (globalRank === 2) {
                    podiumBg = 'bg-gray-400/10';
                    rankBadgeClass = 'bg-gray-400 text-black';
                  } else if (globalRank === 3) {
                    podiumBg = 'bg-orange-600/10';
                    rankBadgeClass = 'bg-orange-600 text-white';
                  }
                  
                  const rowBg = index % 2 === 0 ? 'bg-[#1e1e38]' : 'bg-[#1a1a2e]';
                  
                  return (
                    <Link 
                      key={player.id || index}
                      href={`/player/${encodeURIComponent(player.name)}`}
                    >
                      <div className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#252548] transition-colors cursor-pointer ${
                        isTop3 ? podiumBg : rowBg
                      }`}>
                        {/* Rank */}
                        <div className="col-span-2 sm:col-span-1">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${rankBadgeClass}`}>
                            {globalRank}
                          </span>
                        </div>
                        
                        {/* Player Name */}
                        <div className="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0">
                          {player.countryCode && (
                            <span className="text-sm flex-shrink-0">
                              {getCountryFlag(player.countryCode)}
                            </span>
                          )}
                          <span className={`text-sm truncate ${isTop3 ? 'font-semibold text-gray-100' : 'font-medium text-gray-300'}`}>
                            {player.name}
                          </span>
                        </div>
                        
                        {/* Rank Badge - Hidden on mobile */}
                        <div className="hidden sm:flex sm:col-span-2 justify-center">
                          <Badge 
                            style={{ backgroundColor: rank.color }} 
                            className="text-black text-[10px] px-2 py-0 font-medium"
                          >
                            {rank.name}
                          </Badge>
                        </div>
                        
                        {/* Events - Hidden on mobile */}
                        <div className="hidden sm:block sm:col-span-2 text-center">
                          <span className="text-sm text-gray-400">
                            {player.eventsPlayed || 0}
                          </span>
                        </div>
                        
                        {/* MMR */}
                        <div className="col-span-4 sm:col-span-2 text-right">
                          <span className="text-sm font-semibold text-gray-200">
                            {(player.mmr || 0).toLocaleString('fr-FR')}
                          </span>
                          {/* Show rank badge on mobile */}
                          <div className="sm:hidden mt-0.5">
                            <Badge 
                              style={{ backgroundColor: rank.color }} 
                              className="text-black text-[9px] px-1.5 py-0 font-medium"
                            >
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
                <div className="flex items-center justify-center gap-1 p-4 border-t border-[#252540] bg-[#12122a]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="text-gray-500 hover:text-gray-300 hover:bg-[#252548] h-8 px-2 text-xs"
                  >
                    Début
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-gray-500 hover:text-gray-300 hover:bg-[#252548] h-8 w-8"
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
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className={`h-8 w-8 text-xs ${
                            page === pageNum 
                              ? 'bg-gray-200 text-black hover:bg-gray-300' 
                              : 'text-gray-500 hover:text-gray-300 hover:bg-[#252548]'
                          }`}
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
                    className="text-gray-500 hover:text-gray-300 hover:bg-[#252548] h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="text-gray-500 hover:text-gray-300 hover:bg-[#252548] h-8 px-2 text-xs"
                  >
                    Fin
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <p className="text-xs text-gray-600 mt-3 text-center">
            Mis à jour : {new Date(lastUpdate).toLocaleString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
}
