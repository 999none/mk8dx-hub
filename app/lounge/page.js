'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Clock, Users, RefreshCw, ExternalLink, 
  ChevronRight, Trophy, Gamepad2, Timer, Zap, DoorOpen, LogIn
} from 'lucide-react';

// Format badge colors based on format type
const formatColors = {
  '2v2': 'bg-green-500/20 text-green-400 border-green-500/30',
  '3v3': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  '4v4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  '6v6': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// Time status helpers
function getTimeStatus(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff < 0) return 'past';
  if (diff < 30 * 60 * 1000) return 'soon'; // Within 30 minutes
  if (diff < 2 * 60 * 60 * 1000) return 'upcoming'; // Within 2 hours
  return 'future';
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 60 * 1000) return 'Juste terminé';
    if (absDiff < 60 * 60 * 1000) return `Il y a ${Math.floor(absDiff / 60000)} min`;
    if (absDiff < 24 * 60 * 60 * 1000) return `Il y a ${Math.floor(absDiff / 3600000)}h`;
    return `Il y a ${Math.floor(absDiff / 86400000)} jours`;
  }
  
  if (diff < 60 * 1000) return 'Maintenant!';
  if (diff < 60 * 60 * 1000) return `Dans ${Math.floor(diff / 60000)} min`;
  if (diff < 24 * 60 * 60 * 1000) return `Dans ${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}min`;
  return `Dans ${Math.floor(diff / 86400000)} jours`;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  };
  return date.toLocaleDateString('fr-FR', options);
}

function formatShortDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris'
  });
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}

// SQ Card Component
function SQCard({ sq, isNext }) {
  const status = getTimeStatus(sq.time);
  const isPast = status === 'past';
  const isSoon = status === 'soon';
  
  return (
    <Card className={`
      bg-white/[0.02] border-white/[0.06] transition-all duration-300
      ${isNext ? 'ring-2 ring-yellow-500/50 bg-yellow-500/[0.03]' : ''}
      ${isSoon ? 'ring-2 ring-green-500/50 animate-pulse' : ''}
      ${isPast ? 'opacity-50' : 'hover:bg-white/[0.04]'}
    `}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={formatColors[sq.format] || 'bg-gray-500/20 text-gray-400'}>
                <Users className="w-3 h-3 mr-1" />
                {sq.format.toUpperCase()}
              </Badge>
              <span className="text-gray-500 text-sm">#{sq.id}</span>
              {isNext && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Prochaine
                </Badge>
              )}
              {isSoon && !isNext && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs animate-pulse">
                  <Timer className="w-3 h-3 mr-1" />
                  Bientôt
                </Badge>
              )}
            </div>
            
            <div className="text-white font-medium mb-1">
              {formatDateTime(sq.time)}
            </div>
            
            <div className={`text-sm ${isSoon ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
              <Clock className="w-3 h-3 inline mr-1" />
              {formatRelativeTime(sq.time)}
            </div>
          </div>
          
          {/* Right: Time display */}
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {formatTime(sq.time)}
            </div>
            <div className="text-xs text-gray-500">
              {formatShortDate(sq.time)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Lounge Queue Component - Shows hourly queue status
function LoungeQueue({ session }) {
  const isAuthenticated = !!session?.user;
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Get current hour and next hour in Paris timezone
  const parisTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const currentHour = parisTime.getHours();
  const currentMinutes = parisTime.getMinutes();
  const nextHour = (currentHour + 1) % 24;
  
  // Queue is open for the next hour's lounge, closes at XX:55
  const isQueueOpen = currentMinutes < 55;
  const closesIn = 55 - currentMinutes;
  
  // Format hour display
  const formatHour = (hour) => `${hour.toString().padStart(2, '0')}H`;
  
  // Discord channel URL for lounge queue
  const LOUNGE_QUEUE_CHANNEL = 'https://discord.com/channels/445404006177570829/1186158671525318719';
  
  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <DoorOpen className="w-5 h-5" />
          Lounge Queue
        </CardTitle>
        <CardDescription className="text-gray-400">
          Rejoignez la queue pour participer au prochain Lounge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Queue Status */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {isQueueOpen ? (
                <>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Queue Ouverte
                  </Badge>
                  <span className="text-gray-500 text-sm">
                    Ferme dans {closesIn} min
                  </span>
                </>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Queue Fermée
                </Badge>
              )}
            </div>
            
            <div className="text-white mb-2">
              <span className="text-2xl font-bold">Lounge {formatHour(nextHour)}</span>
              {isQueueOpen && (
                <span className="text-gray-400 text-sm ml-2">
                  (ferme à {formatHour(currentHour).replace('H', '')}:55)
                </span>
              )}
            </div>
            
            <p className="text-gray-500 text-sm">
              {isQueueOpen 
                ? `Inscrivez-vous maintenant pour le Lounge de ${formatHour(nextHour)}`
                : `La queue réouvrira à ${formatHour(nextHour)} pour le Lounge de ${formatHour((nextHour + 1) % 24)}`
              }
            </p>
          </div>
          
          {/* Action Button */}
          <div className="w-full md:w-auto">
            {isAuthenticated ? (
              <a
                href={LOUNGE_QUEUE_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  className={`w-full md:w-auto ${
                    isQueueOpen 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  disabled={!isQueueOpen}
                >
                  <DoorOpen className="w-4 h-4 mr-2" />
                  {isQueueOpen ? 'Rejoindre la Queue' : 'Queue Fermée'}
                </Button>
              </a>
            ) : (
              <a href="/login">
                <Button 
                  className="w-full md:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Se connecter avec Discord
                </Button>
              </a>
            )}
          </div>
        </div>
        
        {/* Additional Info */}
        {isQueueOpen && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>
                La queue est ouverte de {formatHour(currentHour)} à {formatHour(currentHour).replace('H', '')}:55
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Stats Summary Component
function ScheduleStats({ schedule }) {
  const now = Date.now();
  const upcoming = schedule.filter(sq => sq.time > now);
  const past = schedule.filter(sq => sq.time <= now);
  
  const formatCounts = upcoming.reduce((acc, sq) => {
    acc[sq.format] = (acc[sq.format] || 0) + 1;
    return acc;
  }, {});
  
  const nextSQ = upcoming[0];
  const timeUntilNext = nextSQ ? nextSQ.time - now : null;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-white mb-1">{upcoming.length}</div>
          <div className="text-sm text-gray-500">SQ à venir</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-green-400 mb-1">
            {timeUntilNext ? formatRelativeTime(nextSQ.time) : '-'}
          </div>
          <div className="text-sm text-gray-500">Prochaine SQ</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-1 justify-center mb-2">
            {Object.entries(formatCounts).map(([format, count]) => (
              <Badge key={format} variant="outline" className={formatColors[format] || ''}>
                {format}: {count}
              </Badge>
            ))}
          </div>
          <div className="text-sm text-gray-500 text-center">Par format</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-gray-400 mb-1">{past.length}</div>
          <div className="text-sm text-gray-500">SQ passées</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoungePage() {
  const { data: session } = useSession();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [formatFilter, setFormatFilter] = useState('all'); // Filter state

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/sq-schedule');
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSchedule(data.schedule || []);
      setLastUpdate(data.lastUpdate || new Date().toISOString());
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    
    // Refresh every minute to update relative times
    const interval = setInterval(() => {
      setSchedule(prev => [...prev]); // Force re-render
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();
  const upcomingSQ = schedule.filter(sq => sq.time > now).sort((a, b) => a.time - b.time);
  const pastSQ = schedule.filter(sq => sq.time <= now).sort((a, b) => b.time - a.time);
  const nextSQ = upcomingSQ[0];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-purple-500" />
                Squad Queue Planning
              </h1>
              <p className="text-gray-500 mt-2">
                Planning des Squad Queues MK8DX Lounge - Synchronisé automatiquement
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchedule}
                disabled={loading}
                className="border-white/10 hover:bg-white/[0.05]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              
              <a
                href="https://discord.gg/revmGkE"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/[0.05]">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Discord Lounge
                </Button>
              </a>
            </div>
          </div>
          
          {lastUpdate && (
            <div className="text-xs text-gray-600">
              Dernière mise à jour: {new Date(lastUpdate).toLocaleString('fr-FR')}
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30 mb-8">
            <CardContent className="p-4">
              <p className="text-red-400">Erreur: {error}</p>
              <p className="text-gray-500 text-sm mt-2">
                Le planning n'a pas pu être chargé. Vérifiez que le bot Discord est actif.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && schedule.length === 0 && (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        )}

        {/* Stats Summary */}
        {!loading && schedule.length > 0 && (
          <ScheduleStats schedule={schedule} />
        )}

        {/* Lounge Queue Section */}
        <LoungeQueue session={session} />

        {/* Next SQ Highlight */}
        {nextSQ && (
          <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Prochaine Squad Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className={`${formatColors[nextSQ.format]} text-lg px-3 py-1`}>
                      <Users className="w-4 h-4 mr-2" />
                      {nextSQ.format.toUpperCase()}
                    </Badge>
                    <span className="text-gray-400">SQ #{nextSQ.id}</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">
                    {formatDateTime(nextSQ.time)}
                  </div>
                  <div className="text-green-400 font-medium text-lg">
                    <Timer className="w-4 h-4 inline mr-2" />
                    {formatRelativeTime(nextSQ.time)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-white">
                    {formatTime(nextSQ.time)}
                  </div>
                  <div className="text-gray-500 mt-1">
                    Heure de Paris
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Upcoming/Past */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/[0.02] border border-white/[0.06] mb-6">
            <TabsTrigger 
              value="upcoming" 
              className="data-[state=active]:bg-white/[0.1] data-[state=active]:text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              À venir ({upcomingSQ.length})
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className="data-[state=active]:bg-white/[0.1] data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              Passées ({pastSQ.length})
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-white/[0.1] data-[state=active]:text-white"
            >
              Tout ({schedule.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingSQ.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Aucune Squad Queue à venir</p>
                  <p className="text-gray-600 text-sm mt-2">
                    Le planning est généralement mis à jour chaque lundi.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingSQ.map((sq, idx) => (
                  <SQCard key={sq.id} sq={sq} isNext={idx === 0} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastSQ.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Aucune Squad Queue passée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastSQ.map((sq) => (
                  <SQCard key={sq.id} sq={sq} isNext={false} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {schedule.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Aucune donnée de planning</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...schedule].sort((a, b) => a.time - b.time).map((sq) => (
                  <SQCard key={sq.id} sq={sq} isNext={sq.id === nextSQ?.id} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Footer */}
        <Card className="bg-white/[0.02] border-white/[0.06] mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-500" />
              À propos des Squad Queues
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
              <div>
                <p className="mb-2">
                  Les <strong className="text-white">Squad Queues</strong> sont des sessions de matchmaking 
                  compétitif organisées par le MK8DX Lounge.
                </p>
                <p>
                  Les joueurs peuvent s'inscrire sur Discord et jouer en équipe 
                  pour gagner ou perdre du MMR.
                </p>
              </div>
              <div>
                <p className="mb-2"><strong className="text-white">Formats disponibles:</strong></p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={formatColors['2v2']}>2v2 - Duo</Badge>
                  <Badge variant="outline" className={formatColors['3v3']}>3v3 - Trio</Badge>
                  <Badge variant="outline" className={formatColors['4v4']}>4v4 - Squad</Badge>
                  <Badge variant="outline" className={formatColors['6v6']}>6v6 - War</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
