'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import MatchDetailModal from '@/components/MatchDetailModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, Clock, Users, RefreshCw, ExternalLink, 
  ChevronRight, Trophy, Gamepad2, Timer, Zap, DoorOpen, LogIn, Filter,
  Bell, BellOff, BellRing, Settings, Check, X, Loader2, Send,
  CalendarDays, CheckCircle2, Circle, ListChecks, ChevronLeft, ChevronDown, ChevronUp,
  HelpCircle, BookOpen, Award, AlertTriangle, Shield, Star, Info, BarChart3, History
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// =====================================================
// PUSH NOTIFICATION SYSTEM
// =====================================================

function isPushSupported() {
  return typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window &&
    'Notification' in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function usePushNotifications() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    loungeQueue: true,
    sqQueue: true,
    selectedSQs: []
  });
  const [swRegistration, setSwRegistration] = useState(null);
  
  useEffect(() => {
    if (!isPushSupported()) {
      setIsLoading(false);
      return;
    }
    
    const init = async () => {
      try {
        setPermission(Notification.permission);
        
        const registration = await navigator.serviceWorker.register('/sw.js');
        setSwRegistration(registration);
        
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
          
          try {
            const res = await fetch(`/api/push/status?endpoint=${encodeURIComponent(existingSubscription.endpoint)}`);
            const data = await res.json();
            if (data.preferences) {
              setPreferences(data.preferences);
            }
          } catch (err) {
            console.warn('[Push] Could not fetch preferences:', err);
          }
        }
      } catch (error) {
        console.error('[Push] Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);
  
  const subscribe = useCallback(async () => {
    if (!swRegistration) {
      toast.error('Service Worker non disponible');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          toast.error('Permission de notification refusée');
          setIsLoading(false);
          return false;
        }
      } else if (Notification.permission === 'denied') {
        toast.error('Les notifications sont bloquées.');
        setIsLoading(false);
        return false;
      }
      
      const vapidRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await vapidRes.json();
      
      if (!publicKey) {
        throw new Error('VAPID key not available');
      }
      
      const pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
          preferences
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSubscription(pushSubscription);
        setIsSubscribed(true);
        if (data.preferences) {
          setPreferences(data.preferences);
        }
        toast.success('🔔 Notifications push activées!');
        return true;
      } else {
        throw new Error(data.message || 'Subscription failed');
      }
      
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      toast.error('Erreur lors de l\'activation des notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, preferences]);
  
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;
    
    setIsLoading(true);
    
    try {
      await subscription.unsubscribe();
      
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
      
      setSubscription(null);
      setIsSubscribed(false);
      setPreferences({
        loungeQueue: true,
        sqQueue: true,
        selectedSQs: []
      });
      toast.success('Notifications push désactivées');
      return true;
      
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      toast.error('Erreur lors de la désactivation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);
  
  const updatePreferences = useCallback(async (newPreferences) => {
    if (!subscription) return false;
    
    try {
      const res = await fetch('/api/push/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          preferences: newPreferences
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setPreferences(newPreferences);
        toast.success('Préférences mises à jour');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Push] Update preferences error:', error);
      return false;
    }
  }, [subscription]);
  
  const sendTestNotification = useCallback(async () => {
    if (!subscription) {
      toast.error('Veuillez d\'abord activer les notifications');
      return;
    }
    
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Notification de test envoyée!');
      } else {
        toast.error('Échec de l\'envoi de la notification');
      }
    } catch (error) {
      console.error('[Push] Test notification error:', error);
      toast.error('Erreur lors de l\'envoi');
    }
  }, [subscription]);
  
  return {
    isSupported: isPushSupported(),
    permission,
    isSubscribed,
    isLoading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification
  };
}

// =====================================================
// DISCORD APP LINK HANDLER
// =====================================================

function openDiscordLinkWithFallback(webUrl) {
  const urlPath = webUrl.replace('https://discord.com', '');
  const appUrl = `discord://${urlPath}`;
  
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  let appOpened = false;
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  iframe.contentWindow.location.href = appUrl;
  
  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.body.removeChild(iframe);
    
    if (!appOpened) {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  }, 1000);
}

// Format badge colors based on format type
const formatColors = {
  '2v2': 'bg-green-500/10 text-green-500 border-green-500/20',
  '3v3': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  '4v4': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  '6v6': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

// Time status helpers
function getTimeStatus(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff < 0) return 'past';
  if (diff < 30 * 60 * 1000) return 'soon';
  if (diff < 2 * 60 * 60 * 1000) return 'upcoming';
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

// Day filter options
const dayFilterOptions = [
  { value: 'all', label: 'Tous les jours' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'tomorrow', label: 'Demain' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'lundi', label: 'Lundi' },
  { value: 'mardi', label: 'Mardi' },
  { value: 'mercredi', label: 'Mercredi' },
  { value: 'jeudi', label: 'Jeudi' },
  { value: 'vendredi', label: 'Vendredi' },
  { value: 'samedi', label: 'Samedi' },
  { value: 'dimanche', label: 'Dimanche' },
];

// Time slot filter options
const timeSlotOptions = [
  { value: 'all', label: 'Tous les horaires' },
  { value: 'morning', label: 'Matin (6h-12h)', start: 6, end: 12 },
  { value: 'afternoon', label: 'Après-midi (12h-18h)', start: 12, end: 18 },
  { value: 'evening', label: 'Soir (18h-00h)', start: 18, end: 24 },
  { value: 'night', label: 'Nuit (00h-6h)', start: 0, end: 6 },
];

export default function LoungePage() {
  const { data: session } = useSession();
  const push = usePushNotifications();
  const [mounted, setMounted] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [formatFilter, setFormatFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [timeSlotFilter, setTimeSlotFilter] = useState('all');
  const [participationHistory, setParticipationHistory] = useState({});
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [showAllSQ, setShowAllSQ] = useState(false);

  // Animation mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/sq-schedule');
      const data = await res.json();
      
      if (data.schedule) {
        setSchedule(data.schedule);
        setLastUpdate(Date.now());
        setError(null);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      setError('Impossible de charger le planning');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  // Apply filters
  const filteredSchedule = schedule.filter(sq => {
    if (formatFilter !== 'all' && sq.format !== formatFilter) return false;
    
    if (dayFilter !== 'all') {
      const sqDate = new Date(sq.time);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (dayFilter === 'today') {
        if (sqDate.toDateString() !== today.toDateString()) return false;
      } else if (dayFilter === 'tomorrow') {
        if (sqDate.toDateString() !== tomorrow.toDateString()) return false;
      } else if (dayFilter === 'weekend') {
        const dayOfWeek = sqDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;
      } else {
        const dayName = sqDate.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }).toLowerCase();
        if (dayName !== dayFilter) return false;
      }
    }
    
    if (timeSlotFilter !== 'all') {
      const slot = timeSlotOptions.find(s => s.value === timeSlotFilter);
      if (slot) {
        const sqHour = new Date(sq.time).toLocaleString('fr-FR', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' });
        const hour = parseInt(sqHour);
        if (hour < slot.start || hour >= slot.end) return false;
      }
    }
    
    return true;
  });

  const now = Date.now();
  const upcomingSQ = filteredSchedule.filter(sq => sq.time > now).sort((a, b) => a.time - b.time);
  const pastSQ = filteredSchedule.filter(sq => sq.time <= now).sort((a, b) => b.time - a.time);
  const nextSQ = upcomingSQ[0];

  // Calculate stats
  const formatCounts = upcomingSQ.reduce((acc, sq) => {
    acc[sq.format] = (acc[sq.format] || 0) + 1;
    return acc;
  }, {});

  const displayedSQ = activeTab === 'upcoming' ? upcomingSQ : activeTab === 'past' ? pastSQ : filteredSchedule;
  const visibleSQ = showAllSQ ? displayedSQ : displayedSQ.slice(0, 10);

  // Get current lounge queue status
  const currentTime = new Date();
  const parisTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const currentHour = parisTime.getHours();
  const currentMinutes = parisTime.getMinutes();
  const nextHour = (currentHour + 1) % 24;
  const isQueueOpen = currentMinutes < 55;
  const closesIn = 55 - currentMinutes;

  const formatHour = (hour) => `${hour.toString().padStart(2, '0')}H`;

  const hasActiveFilters = formatFilter !== 'all' || dayFilter !== 'all' || timeSlotFilter !== 'all';

  const clearFilters = () => {
    setFormatFilter('all');
    setDayFilter('all');
    setTimeSlotFilter('all');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className={`mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Lounge</h1>
            <p className="text-gray-500">Planning des Squad Queues et Lounge Queue</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSchedule}
              disabled={loading}
              className="border-white/[0.06] hover:bg-white/[0.04] text-gray-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            <a
              href="https://discord.gg/revmGkE"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="border-white/[0.06] hover:bg-white/[0.04] text-gray-300 hover:text-white">
                <ExternalLink className="w-4 h-4 mr-2" />
                Discord
              </Button>
            </a>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner-trail mb-4" />
            <span className="text-gray-500">Chargement du planning...</span>
          </div>
        ) : error ? (
          <Card className="card-premium">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-500" />
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lounge Queue Card - Gradient Purple/Blue */}
            <Card className={`bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-400 flex items-center gap-2">
                  <DoorOpen className="w-5 h-5" />
                  Lounge Queue
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Rejoignez la queue pour participer au prochain Lounge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {isQueueOpen ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                          Queue Ouverte
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Queue Fermée
                        </Badge>
                      )}
                      {isQueueOpen && (
                        <span className="text-xs text-gray-500">Ferme dans {closesIn} min</span>
                      )}
                    </div>
                    <p className="text-white text-xl font-bold">Lounge {formatHour(nextHour)}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isQueueOpen 
                        ? `Inscrivez-vous maintenant pour le Lounge de ${formatHour(nextHour)}`
                        : `La queue réouvrira à ${formatHour(nextHour)}`
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white mb-2">{formatHour(nextHour)}</div>
                    {session?.user ? (
                      <Button 
                        className={isQueueOpen 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }
                        disabled={!isQueueOpen}
                        onClick={() => isQueueOpen && openDiscordLinkWithFallback('https://discord.com/channels/445404006177570829/1186158671525318719')}
                      >
                        <DoorOpen className="w-4 h-4 mr-2" />
                        {isQueueOpen ? 'Rejoindre la Queue' : 'Queue Fermée'}
                      </Button>
                    ) : (
                      <a href="/login">
                        <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
                          <LogIn className="w-4 h-4 mr-2" />
                          Se connecter
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next SQ Card - Gradient Yellow/Orange */}
            <Card className={`bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Prochaine Squad Queue
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Formez votre équipe et rejoignez la queue
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nextSQ ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`${formatColors[nextSQ.format]} text-lg px-3 py-1`}>
                          <Users className="w-4 h-4 mr-2" />
                          {nextSQ.format.toUpperCase()}
                        </Badge>
                        <span className="text-gray-400">#{nextSQ.id}</span>
                      </div>
                      <p className="text-white text-xl font-bold">{formatDateTime(nextSQ.time)}</p>
                      <p className={`text-sm mt-1 ${getTimeStatus(nextSQ.time) === 'soon' ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
                        <Timer className="w-4 h-4 inline mr-1" />
                        {formatRelativeTime(nextSQ.time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-white mb-2">{formatTime(nextSQ.time)}</div>
                      {session?.user ? (
                        <Button 
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={() => openDiscordLinkWithFallback('https://discord.com/channels/445404006177570829/772517883107475516')}
                        >
                          <DoorOpen className="w-4 h-4 mr-2" />
                          Rejoindre la Queue
                        </Button>
                      ) : (
                        <a href="/login">
                          <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
                            <LogIn className="w-4 h-4 mr-2" />
                            Se connecter
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                    <p className="text-gray-500 text-sm">Aucune SQ à venir</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards - Under Squad Queue (full width) */}
            <div className={`lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
              <Card className="card-premium">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-black text-white mb-1 transition-all duration-500 hover:scale-105">
                    {upcomingSQ.length}
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">SQ à venir</p>
                </CardContent>
              </Card>

              <Card className="card-premium">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-black text-green-500 mb-1 transition-all duration-500 hover:scale-105">
                    {nextSQ ? formatRelativeTime(nextSQ.time).split(' ')[1] || '-' : '-'}
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Prochaine SQ</p>
                </CardContent>
              </Card>

              <Card className="card-premium md:col-span-2">
                <CardContent className="p-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Par format</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['2v2', '3v3', '4v4', '6v6'].map((format) => (
                      <div key={format} className={`stat-card text-center p-2 rounded-lg ${
                        format === '2v2' ? 'bg-green-500/10 stat-green' :
                        format === '3v3' ? 'bg-blue-500/10 stat-blue' :
                        format === '4v4' ? 'bg-purple-500/10 stat-purple' :
                        'bg-orange-500/10 stat-yellow'
                      }`}>
                        <div className={`text-lg font-bold ${
                          format === '2v2' ? 'text-green-500' :
                          format === '3v3' ? 'text-blue-500' :
                          format === '4v4' ? 'text-purple-500' :
                          'text-orange-500'
                        }`}>{formatCounts[format] || 0}</div>
                        <p className="text-[10px] text-gray-500">{format}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters & Tab Selection */}
            <Card className={`card-premium lg:col-span-2 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '350ms' }}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                    <TabsList className="bg-white/[0.02] border border-white/[0.04]">
                      <TabsTrigger value="upcoming" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        À venir ({upcomingSQ.length})
                      </TabsTrigger>
                      <TabsTrigger value="past" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-gray-400">
                        <History className="w-4 h-4 mr-2" />
                        Passées ({pastSQ.length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    
                    <Select value={formatFilter} onValueChange={setFormatFilter}>
                      <SelectTrigger className="w-[100px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/[0.1]">
                        <SelectItem value="all" className="text-white hover:bg-white/[0.1]">Tous</SelectItem>
                        <SelectItem value="2v2" className="text-green-400 hover:bg-white/[0.1]">2v2</SelectItem>
                        <SelectItem value="3v3" className="text-blue-400 hover:bg-white/[0.1]">3v3</SelectItem>
                        <SelectItem value="4v4" className="text-purple-400 hover:bg-white/[0.1]">4v4</SelectItem>
                        <SelectItem value="6v6" className="text-orange-400 hover:bg-white/[0.1]">6v6</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={dayFilter} onValueChange={setDayFilter}>
                      <SelectTrigger className="w-[140px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                        <CalendarDays className="w-3 h-3 mr-2 text-purple-400" />
                        <SelectValue placeholder="Jour" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/[0.1]">
                        {dayFilterOptions.map(option => (
                          <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/[0.1]">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={timeSlotFilter} onValueChange={setTimeSlotFilter}>
                      <SelectTrigger className="w-[160px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                        <Clock className="w-3 h-3 mr-2 text-blue-400" />
                        <SelectValue placeholder="Horaire" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/[0.1]">
                        {timeSlotOptions.map(option => (
                          <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/[0.1]">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-gray-400 hover:text-white h-9"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Effacer
                      </Button>
                    )}
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                    <span className="text-xs text-gray-500">{filteredSchedule.length} résultat(s)</span>
                    {formatFilter !== 'all' && (
                      <Badge variant="outline" className={formatColors[formatFilter]}>
                        {formatFilter}
                      </Badge>
                    )}
                    {dayFilter !== 'all' && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {dayFilterOptions.find(d => d.value === dayFilter)?.label}
                      </Badge>
                    )}
                    {timeSlotFilter !== 'all' && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {timeSlotOptions.find(t => t.value === timeSlotFilter)?.label}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SQ Table */}
            <Card className={`card-premium lg:col-span-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '400ms' }}>
              <CardHeader className="border-b border-white/[0.04] pb-4">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-blue-500" />
                  Planning des Squad Queues ({displayedSQ.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {displayedSQ.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/[0.04]">
                            <th className="text-left py-3 px-4 font-medium">#</th>
                            <th className="text-left py-3 px-4 font-medium">Date</th>
                            <th className="text-left py-3 px-4 font-medium">Heure</th>
                            <th className="text-center py-3 px-4 font-medium">Format</th>
                            <th className="text-center py-3 px-4 font-medium">Status</th>
                            <th className="text-right py-3 px-4 font-medium">Temps</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {visibleSQ.map((sq, index) => {
                            const status = getTimeStatus(sq.time);
                            const isNext = sq.id === nextSQ?.id;
                            const isPast = status === 'past';
                            const isSoon = status === 'soon';
                            
                            return (
                              <tr 
                                key={sq.id}
                                className={`table-row-hover cursor-pointer group ${isPast ? 'opacity-50' : ''}`}
                                style={{ animationDelay: `${index * 30}ms` }}
                              >
                                <td className="py-3 px-4 text-gray-600 text-sm">
                                  {sq.id}
                                </td>
                                <td className="py-3 px-4 text-gray-400 text-sm">
                                  {formatShortDate(sq.time)}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-white font-medium">{formatTime(sq.time)}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge variant="outline" className={`${formatColors[sq.format]} transition-transform duration-300 group-hover:scale-110`}>
                                    <Users className="w-3 h-3 mr-1" />
                                    {sq.format}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isNext && (
                                    <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 badge-shine">
                                      <Zap className="w-3 h-3 mr-1" />
                                      Prochaine
                                    </Badge>
                                  )}
                                  {isSoon && !isNext && (
                                    <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 badge-pulse">
                                      <Timer className="w-3 h-3 mr-1" />
                                      Bientôt
                                    </Badge>
                                  )}
                                  {isPast && (
                                    <Badge className="bg-gray-500/10 text-gray-500 border border-gray-500/20">
                                      Terminée
                                    </Badge>
                                  )}
                                  {!isNext && !isSoon && !isPast && (
                                    <span className="text-gray-600 text-sm">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={`text-sm font-medium transition-transform duration-300 group-hover:scale-110 inline-block ${
                                    isSoon ? 'text-green-500' : isPast ? 'text-gray-600' : 'text-gray-400'
                                  }`}>
                                    {formatRelativeTime(sq.time)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {displayedSQ.length > 10 && (
                      <div className="py-3 text-center border-t border-white/[0.04]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllSQ(!showAllSQ)}
                          className="text-gray-500 hover:text-white group"
                        >
                          {showAllSQ ? <ChevronUp className="w-4 h-4 mr-1 group-hover:-translate-y-0.5 transition-transform" /> : <ChevronDown className="w-4 h-4 mr-1 group-hover:translate-y-0.5 transition-transform" />}
                          {showAllSQ ? 'Moins' : `Tout afficher (${displayedSQ.length})`}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-700 animate-bounce-subtle" />
                    <p className="text-gray-500">Aucune SQ trouvée avec ces filtres</p>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-3 text-gray-400 hover:text-white"
                      >
                        Effacer les filtres
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className={`card-premium lg:col-span-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '450ms' }}>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'text-yellow-500', bg: 'bg-yellow-500/10', hoverBg: 'hover:bg-yellow-500/20' },
                    { href: '/academy', icon: BookOpen, label: 'Academy', color: 'text-blue-500', bg: 'bg-blue-500/10', hoverBg: 'hover:bg-blue-500/20' },
                    { href: '/tournaments', icon: Award, label: 'Tournois', color: 'text-purple-500', bg: 'bg-purple-500/10', hoverBg: 'hover:bg-purple-500/20' },
                  ].map((link, i) => (
                    <a key={i} href={link.href}>
                      <div className={`p-4 ${link.bg} ${link.hoverBg} rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg group cursor-pointer`}>
                        <link.icon className={`w-6 h-6 mx-auto mb-2 ${link.color} group-hover:scale-110 transition-transform duration-300`} />
                        <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-300">{link.label}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Last Update */}
            {lastUpdate && (
              <div className={`lg:col-span-4 text-center transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '500ms' }}>
                <p className="text-xs text-gray-600">
                  Dernière mise à jour: {new Date(lastUpdate).toLocaleString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMatchId && (
        <MatchDetailModal matchId={selectedMatchId} onClose={() => setSelectedMatchId(null)} />
      )}
    </div>
  );
}
