'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, Clock, Users, RefreshCw, ExternalLink, 
  ChevronRight, Trophy, Gamepad2, Timer, Zap, DoorOpen, LogIn, Filter,
  Bell, BellOff, BellRing, Settings, Check, X, Loader2, Send,
  CalendarDays, CheckCircle2, Circle, ListChecks, ChevronLeft, ChevronDown
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

// Check if push notifications are supported
function isPushSupported() {
  return typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window &&
    'Notification' in window;
}

// Convert VAPID key to Uint8Array
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

// Custom hook for push notification management
function usePushNotifications() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    loungeQueue: true,
    sqQueue: true,
    selectedSQs: [] // Array of SQ IDs to notify
  });
  const [swRegistration, setSwRegistration] = useState(null);
  
  // Initialize service worker and check subscription status
  useEffect(() => {
    if (!isPushSupported()) {
      setIsLoading(false);
      return;
    }
    
    const init = async () => {
      try {
        setPermission(Notification.permission);
        
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[Push] Service Worker registered');
        setSwRegistration(registration);
        
        // Check existing subscription
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
          
          // Get preferences from server
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
  
  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!swRegistration) {
      toast.error('Service Worker non disponible');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      // Request notification permission if needed
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          toast.error('Permission de notification refusée');
          setIsLoading(false);
          return false;
        }
      } else if (Notification.permission === 'denied') {
        toast.error('Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.');
        setIsLoading(false);
        return false;
      }
      
      // Get VAPID public key
      const vapidRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await vapidRes.json();
      
      if (!publicKey) {
        throw new Error('VAPID key not available');
      }
      
      // Subscribe to push
      const pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      // Send subscription to server
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
  
  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;
    
    setIsLoading(true);
    
    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
      
      setSubscription(null);
      setIsSubscribed(false);
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
  
  // Update preferences
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
  
  // Send test notification
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

// Push Notification Settings Component
function PushNotificationSettings({ push }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Avoid hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // During SSR and initial hydration, show a consistent placeholder
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="border-white/10 text-white">
        <Bell className="w-4 h-4 mr-2" />
        Push Notifications
      </Button>
    );
  }
  
  if (!push.isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled className="border-white/10 text-gray-500">
              <BellOff className="w-4 h-4 mr-2" />
              Non supporté
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900 border-white/10">
            <p>Les notifications push ne sont pas supportées par votre navigateur</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`border-white/10 hover:bg-white/[0.05] ${
            push.isSubscribed ? 'text-green-400' : 'text-white'
          }`}
        >
          {push.isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : push.isSubscribed ? (
            <BellRing className="w-4 h-4 mr-2" />
          ) : (
            <Bell className="w-4 h-4 mr-2" />
          )}
          Push Notifications
          {push.isSubscribed && (
            <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              Actif
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-zinc-900 border-white/10" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-400" />
              Notifications Push
            </h4>
            {push.isSubscribed && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                <Check className="w-3 h-3 mr-1" />
                Activé
              </Badge>
            )}
          </div>
          
          {push.permission === 'denied' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">
                Les notifications sont bloquées par votre navigateur. Veuillez les autoriser dans les paramètres.
              </p>
            </div>
          )}
          
          {!push.isSubscribed ? (
            <div className="space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h5 className="font-medium text-purple-400 mb-2">🔔 Recevez des alertes automatiques</h5>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• <strong>Lounge Queue</strong> : Notification à chaque heure (XX:00)</li>
                  <li>• <strong>Squad Queue</strong> : Notification 45 min avant le début</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Fonctionne même quand le navigateur est fermé!
                </p>
              </div>
              
              <Button 
                onClick={push.subscribe}
                disabled={push.isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {push.isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Activer les notifications push
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preference toggles */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-300">Préférences</h5>
                
                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">🏠 Lounge Queue</p>
                    <p className="text-xs text-gray-500">Notification à l'ouverture (chaque heure)</p>
                  </div>
                  <Switch 
                    checked={push.preferences.loungeQueue}
                    onCheckedChange={(checked) => {
                      push.updatePreferences({ ...push.preferences, loungeQueue: checked });
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">🏁 Squad Queue</p>
                    <p className="text-xs text-gray-500">Notification 45 min avant le début</p>
                  </div>
                  <Switch 
                    checked={push.preferences.sqQueue}
                    onCheckedChange={(checked) => {
                      push.updatePreferences({ ...push.preferences, sqQueue: checked });
                    }}
                  />
                </div>
              </div>
              
              <div className="pt-3 border-t border-white/10 space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={push.sendTestNotification}
                  className="w-full border-white/10 text-gray-300 hover:text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer une notification test
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={push.unsubscribe}
                  disabled={push.isLoading}
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  {push.isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <BellOff className="w-4 h-4 mr-2" />
                  )}
                  Désactiver les notifications
                </Button>
              </div>
              
              <div className="text-xs text-gray-600 text-center">
                💡 Les notifications fonctionnent même avec le navigateur fermé
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  
  // Check if queue is open (45 min before to 5 min after start)
  const now = Date.now();
  const queueOpenTime = sq.time - (45 * 60 * 1000);
  const queueCloseTime = sq.time + (55 * 60 * 1000); // After the hour:55
  const isQueueOpen = now >= queueOpenTime && now < sq.time;
  
  return (
    <Card className={`
      bg-white/[0.02] border-white/[0.06] transition-all duration-300
      ${isNext ? 'ring-2 ring-yellow-500/50 bg-yellow-500/[0.03]' : ''}
      ${isSoon ? 'ring-2 ring-green-500/50' : ''}
      ${isQueueOpen ? 'ring-2 ring-purple-500/50 bg-purple-500/[0.03]' : ''}
      ${isPast ? 'opacity-50' : 'hover:bg-white/[0.04]'}
    `}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              {isQueueOpen && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs animate-pulse">
                  <DoorOpen className="w-3 h-3 mr-1" />
                  Queue Ouverte
                </Badge>
              )}
              {isSoon && !isNext && !isQueueOpen && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  <Timer className="w-3 h-3 mr-1" />
                  Bientôt
                </Badge>
              )}
            </div>
            
            <div className="text-white font-medium mb-1">
              {formatDateTime(sq.time)}
            </div>
            
            <div className={`text-sm ${isSoon || isQueueOpen ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
              <Clock className="w-3 h-3 inline mr-1" />
              {formatRelativeTime(sq.time)}
            </div>
            
            {!isPast && (
              <div className="text-xs text-gray-600 mt-1">
                Queue: {formatTime(queueOpenTime)} - {formatTime(sq.time).replace(':', 'h').slice(0, -2)}55
              </div>
            )}
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
          Rejoignez la queue pour participer au prochain Lounge • Ouverte de {formatHour(currentHour)} à {formatHour(currentHour).replace('H', '')}:55
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
  const [formatFilter, setFormatFilter] = useState('all');
  
  // Push notification system
  const push = usePushNotifications();

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
  
  // Apply format filter
  const filteredSchedule = formatFilter === 'all' 
    ? schedule 
    : schedule.filter(sq => sq.format === formatFilter);
  
  const upcomingSQ = filteredSchedule.filter(sq => sq.time > now).sort((a, b) => a.time - b.time);
  const pastSQ = filteredSchedule.filter(sq => sq.time <= now).sort((a, b) => b.time - a.time);
  const nextSQ = upcomingSQ[0];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-purple-500" />
                MK8DX Lounge
              </h1>
              <p className="text-gray-500 mt-2">
                Hub compétitif MK8DX - Queue, Planning & Matchmaking
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Push Notification Button */}
              <PushNotificationSettings push={push} />
              
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
                  Discord
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
                  <div className="text-xs text-gray-500 mt-1">
                    Queue ouverte: {formatTime(nextSQ.time - 45 * 60 * 1000)} - {formatTime(nextSQ.time).replace(':', 'h').slice(0, -2)}55
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <TabsList className="bg-white/[0.02] border border-white/[0.06]">
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
                Tout ({filteredSchedule.length})
              </TabsTrigger>
            </TabsList>

            {/* Format Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[140px] bg-white/[0.02] border-white/[0.06] text-white">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.1]">
                  <SelectItem value="all" className="text-white hover:bg-white/[0.1]">
                    Tous les formats
                  </SelectItem>
                  <SelectItem value="2v2" className="text-green-400 hover:bg-white/[0.1]">
                    <span className="flex items-center gap-2">
                      <Users className="w-3 h-3" /> 2v2 - Duo
                    </span>
                  </SelectItem>
                  <SelectItem value="3v3" className="text-blue-400 hover:bg-white/[0.1]">
                    <span className="flex items-center gap-2">
                      <Users className="w-3 h-3" /> 3v3 - Trio
                    </span>
                  </SelectItem>
                  <SelectItem value="4v4" className="text-purple-400 hover:bg-white/[0.1]">
                    <span className="flex items-center gap-2">
                      <Users className="w-3 h-3" /> 4v4 - Squad
                    </span>
                  </SelectItem>
                  <SelectItem value="6v6" className="text-orange-400 hover:bg-white/[0.1]">
                    <span className="flex items-center gap-2">
                      <Users className="w-3 h-3" /> 6v6 - War
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formatFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormatFilter('all')}
                  className="text-gray-400 hover:text-white px-2"
                >
                  ✕
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="upcoming">
            {upcomingSQ.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">
                    {formatFilter !== 'all' 
                      ? `Aucune Squad Queue ${formatFilter.toUpperCase()} à venir`
                      : 'Aucune Squad Queue à venir'
                    }
                  </p>
                  {formatFilter !== 'all' ? (
                    <Button 
                      variant="link" 
                      onClick={() => setFormatFilter('all')} 
                      className="text-purple-400 mt-2"
                    >
                      Voir tous les formats
                    </Button>
                  ) : (
                    <p className="text-gray-600 text-sm mt-2">
                      Le planning est généralement mis à jour chaque lundi.
                    </p>
                  )}
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
                  <p className="text-gray-400">
                    {formatFilter !== 'all' 
                      ? `Aucune Squad Queue ${formatFilter.toUpperCase()} passée`
                      : 'Aucune Squad Queue passée'
                    }
                  </p>
                  {formatFilter !== 'all' && (
                    <Button 
                      variant="link" 
                      onClick={() => setFormatFilter('all')} 
                      className="text-purple-400 mt-2"
                    >
                      Voir tous les formats
                    </Button>
                  )}
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
            {filteredSchedule.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">
                    {formatFilter !== 'all' 
                      ? `Aucune Squad Queue en format ${formatFilter.toUpperCase()}`
                      : 'Aucune donnée de planning'
                    }
                  </p>
                  {formatFilter !== 'all' && (
                    <Button 
                      variant="link" 
                      onClick={() => setFormatFilter('all')} 
                      className="text-purple-400 mt-2"
                    >
                      Voir tous les formats
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...filteredSchedule].sort((a, b) => a.time - b.time).map((sq) => (
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
                <p className="mb-2">
                  <strong className="text-white">Horaires des queues:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li><strong className="text-purple-400">Lounge Queue:</strong> XX:00 à XX:55</li>
                  <li><strong className="text-yellow-400">Squad Queue:</strong> 45 min avant → XX:55</li>
                </ul>
              </div>
              <div>
                <p className="mb-2"><strong className="text-white">Formats disponibles:</strong></p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={formatColors['2v2']}>2v2 - Duo</Badge>
                  <Badge variant="outline" className={formatColors['3v3']}>3v3 - Trio</Badge>
                  <Badge variant="outline" className={formatColors['4v4']}>4v4 - Squad</Badge>
                  <Badge variant="outline" className={formatColors['6v6']}>6v6 - War</Badge>
                </div>
                <p className="mt-3 text-xs text-gray-600">
                  💡 Activez les notifications push pour être alerté automatiquement!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
