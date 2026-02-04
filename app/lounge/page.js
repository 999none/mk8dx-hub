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
  CalendarDays, CheckCircle2, Circle, ListChecks, ChevronLeft, ChevronDown,
  HelpCircle, BookOpen, Award, AlertTriangle, Shield, Star, Info
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
      // Reset preferences to default (clear planning)
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
function PushNotificationSettings({ push, schedule = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedSQs, setSelectedSQs] = useState(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Avoid hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Sync selectedSQs with preferences from server (only after mount)
  useEffect(() => {
    if (mounted) {
      // Sync with server preferences, or reset to empty if no selectedSQs
      setSelectedSQs(new Set(push.preferences?.selectedSQs || []));
    }
  }, [mounted, push.preferences?.selectedSQs]);
  
  // During SSR and initial hydration, always show static placeholder
  // This prevents hydration mismatch - must render EXACTLY the same on server and client
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="border-white/10 text-white" disabled>
        <Bell className="w-4 h-4 mr-2" />
        Push Notifications
      </Button>
    );
  }
  
  // All code below only runs client-side after mount
  const now = Date.now();
  const upcomingSQs = schedule.filter(sq => sq.time > now).sort((a, b) => a.time - b.time);
  
  // Group SQs by date for calendar view
  const groupedByDate = upcomingSQs.reduce((acc, sq) => {
    const dateKey = new Date(sq.time).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Paris'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(sq);
    return acc;
  }, {});
  
  // Toggle SQ selection
  const toggleSQ = (sqId) => {
    const newSelected = new Set(selectedSQs);
    if (newSelected.has(sqId)) {
      newSelected.delete(sqId);
    } else {
      newSelected.add(sqId);
    }
    setSelectedSQs(newSelected);
    setHasChanges(true);
  };
  
  // Select all SQs
  const selectAll = () => {
    setSelectedSQs(new Set(upcomingSQs.map(sq => sq.id)));
    setHasChanges(true);
  };
  
  // Deselect all SQs
  const deselectAll = () => {
    setSelectedSQs(new Set());
    setHasChanges(true);
  };
  
  // Select by format
  const selectByFormat = (format) => {
    const formatSQs = upcomingSQs.filter(sq => sq.format === format).map(sq => sq.id);
    const newSelected = new Set(selectedSQs);
    formatSQs.forEach(id => newSelected.add(id));
    setSelectedSQs(newSelected);
    setHasChanges(true);
  };
  
  // Select by day of week (0 = Sunday, 6 = Saturday)
  const selectByDay = (dayNames) => {
    const newSelected = new Set(selectedSQs);
    upcomingSQs.forEach(sq => {
      const date = new Date(sq.time);
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
      if (dayNames.includes(dayName)) {
        newSelected.add(sq.id);
      }
    });
    setSelectedSQs(newSelected);
    setHasChanges(true);
  };
  
  // Apply changes
  const applyChanges = async () => {
    setIsSaving(true);
    try {
      const newPreferences = {
        ...push.preferences,
        selectedSQs: Array.from(selectedSQs),
        sqQueue: selectedSQs.size > 0 // Auto-enable sqQueue if any SQs selected
      };
      await push.updatePreferences(newPreferences);
      setHasChanges(false);
      toast.success(`✅ ${selectedSQs.size} SQ(s) sélectionnée(s) pour les notifications`);
      // Close the dialog after successful save
      setShowCalendar(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Format time helper
  const formatTimeOnly = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });
  };
  
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
    <>
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
            {push.isSubscribed && selectedSQs.size > 0 && (
              <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                {selectedSQs.size} SQ
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
                    <li>• <strong>Squad Queue</strong> : Choisissez vos SQs préférées</li>
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
                {/* Lounge Queue Toggle */}
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
                
                {/* SQ Calendar Button */}
                <div className="p-3 bg-white/[0.02] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white text-sm font-medium">🏁 Squad Queues</p>
                      <p className="text-xs text-gray-500">
                        {selectedSQs.size > 0 
                          ? `${selectedSQs.size} SQ sélectionnée${selectedSQs.size > 1 ? 's' : ''}`
                          : 'Aucune SQ sélectionnée'
                        }
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCalendar(true)}
                      className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      Planifier
                    </Button>
                  </div>
                  
                  {/* Quick preview of selected SQs */}
                  {selectedSQs.size > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {upcomingSQs.filter(sq => selectedSQs.has(sq.id)).slice(0, 4).map(sq => (
                        <Badge 
                          key={sq.id}
                          variant="outline" 
                          className={`${formatColors[sq.format] || 'bg-gray-500/20 text-gray-400'} text-xs`}
                        >
                          {sq.format} {formatTimeOnly(sq.time)}
                        </Badge>
                      ))}
                      {selectedSQs.size > 4 && (
                        <Badge variant="outline" className="bg-white/5 text-gray-400 text-xs">
                          +{selectedSQs.size - 4}
                        </Badge>
                      )}
                    </div>
                  )}
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
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* SQ Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-white/10 text-white max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CalendarDays className="w-5 h-5 text-purple-400" />
              Planning des notifications SQ
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Sélectionnez les Squad Queues pour lesquelles vous souhaitez recevoir des notifications
            </DialogDescription>
          </DialogHeader>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 py-3 border-b border-white/10">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAll}
              className="border-white/10 text-gray-300 hover:text-white"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Tout
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={deselectAll}
              className="border-white/10 text-gray-300 hover:text-white"
            >
              <Circle className="w-3 h-3 mr-1" />
              Aucun
            </Button>
            <div className="w-px h-6 bg-white/10" />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByFormat('2v2')}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              2v2
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByFormat('3v3')}
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              3v3
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByFormat('4v4')}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              4v4
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByFormat('6v6')}
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            >
              6v6
            </Button>
            <div className="w-px h-6 bg-white/10" />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByDay(['samedi', 'dimanche'])}
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            >
              Weekend
            </Button>
          </div>
          
          {/* SQ Calendar List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4 py-2">
              {Object.entries(groupedByDate).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune Squad Queue à venir</p>
                </div>
              ) : (
                Object.entries(groupedByDate).map(([date, sqs]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center justify-between sticky top-0 bg-zinc-900 py-1 z-10">
                      <h3 className="text-sm font-medium text-gray-300 capitalize flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-purple-400" />
                        {date}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {sqs.filter(sq => selectedSQs.has(sq.id)).length}/{sqs.length}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const newSelected = new Set(selectedSQs);
                            const allSelected = sqs.every(sq => selectedSQs.has(sq.id));
                            sqs.forEach(sq => {
                              if (allSelected) {
                                newSelected.delete(sq.id);
                              } else {
                                newSelected.add(sq.id);
                              }
                            });
                            setSelectedSQs(newSelected);
                            setHasChanges(true);
                          }}
                          className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                        >
                          {sqs.every(sq => selectedSQs.has(sq.id)) ? 'Désélectionner' : 'Sélectionner'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      {sqs.map(sq => {
                        const isSelected = selectedSQs.has(sq.id);
                        return (
                          <div 
                            key={sq.id}
                            onClick={() => toggleSQ(sq.id)}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                              ${isSelected 
                                ? 'bg-purple-500/20 border border-purple-500/50' 
                                : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                              }
                            `}
                          >
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleSQ(sq.id)}
                              className="border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                            />
                            
                            <Badge 
                              variant="outline" 
                              className={`${formatColors[sq.format] || 'bg-gray-500/20 text-gray-400'} min-w-[50px] justify-center`}
                            >
                              <Users className="w-3 h-3 mr-1" />
                              {sq.format}
                            </Badge>
                            
                            <div className="flex-1">
                              <div className="text-white font-medium">
                                {formatTimeOnly(sq.time)}
                              </div>
                              <div className="text-xs text-gray-500">
                                SQ #{sq.id}
                              </div>
                            </div>
                            
                            {isSelected && (
                              <Badge className="bg-purple-500/30 text-purple-300 border-purple-500/50 text-xs">
                                <Bell className="w-3 h-3 mr-1" />
                                Notifié
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          {/* Footer with summary and apply button */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            {/* Summary */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <ListChecks className="w-4 h-4" />
                <span>
                  <strong className="text-white">{selectedSQs.size}</strong> SQ{selectedSQs.size > 1 ? 's' : ''} sélectionnée{selectedSQs.size > 1 ? 's' : ''}
                </span>
              </div>
              
              {selectedSQs.size > 0 && (
                <div className="flex flex-wrap gap-1 justify-end max-w-[300px]">
                  {['2v2', '3v3', '4v4', '6v6'].map(format => {
                    const count = upcomingSQs.filter(sq => selectedSQs.has(sq.id) && sq.format === format).length;
                    if (count === 0) return null;
                    return (
                      <Badge 
                        key={format}
                        variant="outline" 
                        className={`${formatColors[format]} text-xs`}
                      >
                        {count}x {format}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowCalendar(false)}
                className="flex-1 border-white/10 text-gray-300 hover:text-white"
              >
                Annuler
              </Button>
              <Button 
                onClick={applyChanges}
                disabled={!hasChanges || isSaving}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Appliquer ({selectedSQs.size} SQ)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  
  // Check if queue is open (starts at :45 and closes at :55 for the next hour's SQ)
  const now = Date.now();
  // Queue opens 15 minutes before the hour (XX:45) and closes at XX:55
  const sqHour = new Date(sq.time);
  const queueOpenTime = new Date(sq.time);
  queueOpenTime.setMinutes(queueOpenTime.getMinutes() - 15); // XX:45 for XX:00 SQ
  const queueCloseTime = new Date(sq.time);
  queueCloseTime.setMinutes(-5); // XX:55 of previous hour
  const isQueueOpen = now >= queueOpenTime.getTime() && now < sq.time;
  
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
                Queue: {new Date(sq.time - 15 * 60 * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} - {formatTime(sq.time).replace(':00', ':55').replace(':30', ':55')}
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

// My SQ Planning Section - Shows user's selected SQs
function MySQPlanningSection({ schedule, selectedSQIds }) {
  const now = Date.now();
  
  // Filter and sort selected upcoming SQs
  const selectedSQs = schedule
    .filter(sq => selectedSQIds.includes(sq.id) && sq.time > now)
    .sort((a, b) => a.time - b.time);
  
  if (selectedSQs.length === 0) return null;
  
  // Count by format
  const formatCounts = selectedSQs.reduce((acc, sq) => {
    acc[sq.format] = (acc[sq.format] || 0) + 1;
    return acc;
  }, {});
  
  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Mon Planning SQ
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-2">
            {selectedSQs.length} notifications programmées
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Format summary */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(formatCounts).map(([format, count]) => (
            <Badge 
              key={format}
              variant="outline" 
              className={`${formatColors[format]} text-sm`}
            >
              <Users className="w-3 h-3 mr-1" />
              {count}x {format}
            </Badge>
          ))}
        </div>
        
        {/* Selected SQs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {selectedSQs.slice(0, 6).map((sq, idx) => {
            const isNext = idx === 0;
            const isSoon = sq.time - now < 2 * 60 * 60 * 1000;
            
            return (
              <div 
                key={sq.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg transition-all
                  ${isNext ? 'bg-purple-500/20 border border-purple-500/40' : 'bg-white/[0.03] border border-white/[0.05]'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={`${formatColors[sq.format]} min-w-[50px] justify-center`}
                  >
                    {sq.format}
                  </Badge>
                  <div>
                    <div className="text-white font-medium text-sm">
                      {formatShortDate(sq.time)} - {formatTime(sq.time)}
                    </div>
                    <div className={`text-xs ${isSoon ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatRelativeTime(sq.time)}
                    </div>
                  </div>
                </div>
                {isNext && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Next
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        
        {selectedSQs.length > 6 && (
          <div className="mt-3 text-center text-sm text-gray-500">
            +{selectedSQs.length - 6} autres SQ programmées
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// FAQ Data with comprehensive lounge information
const faqData = [
  {
    question: "Qu'est-ce que le Lounge ?",
    answer: `Le MK8DX Lounge est un système de matchmaking compétitif pour Mario Kart 8 Deluxe géré par MKCentral. 
    
Depuis sa création en 2018, plus de 53 000 joueurs ont participé au Lounge avec plus de 964 000 événements vérifiés ! 

Le Lounge utilise un système de classement basé sur le MMR (Matchmaking Rating) qui vous permet de jouer contre des adversaires de niveau similaire. Chaque match vous fait gagner ou perdre des points en fonction de vos performances.

C'est l'endroit idéal pour progresser dans un environnement compétitif structuré.`
  },
  {
    question: "Comment fonctionne le Lounge ?",
    answer: `Le Lounge fonctionne avec un système de queue horaire :

🏠 **Lounge Queue:**
• La queue s'ouvre à XX:00 et ferme à XX:55
• Vous êtes matché automatiquement avec d'autres joueurs
• Format à 12 joueurs
• Les équipes sont formées aléatoirement par le bot

🏁 **Squad Queue:**
• La queue s'ouvre à XX:45 et ferme à (XX+1):55
• Exemple: queue ouverte 13:45 → ferme 14:55 → match 15:00
• Vous formez votre équipe avant de rejoindre
• Formats: 2v2, 3v3, 4v4 ou 6v6 selon le planning

⚡ **Déroulement d'un match:**
1. Rejoignez la queue avant la fermeture
2. Le bot vous assigne un room et une équipe
3. Le host ouvre la room avec l'ID fourni
4. Jouez 12 courses
5. Le résultat est enregistré automatiquement`
  },
  {
    question: "Comment se préparer pour un Lounge ?",
    answer: `Voici les étapes essentielles pour bien vous préparer :

📋 **Prérequis:**
• Compte Discord lié à MKCentral
• Nintendo Switch Online actif
• Code ami à jour sur MKCentral

🎮 **Avant le match:**
• Vérifiez votre pseudo in-game (doit correspondre à votre nom Lounge)
• Assurez-vous d'une connexion internet stable
• Prévoyez 45-60 minutes pour un match complet

📸 **Pendant le match:**
• Prenez des screenshots à chaque fin de course (tous les joueurs!)
• Signalez immédiatement tout problème de connexion
• Respectez le host et les règles du Lounge

⚠️ **Important:**
• Ne quittez jamais un match en cours (pénalités sévères)
• Les problèmes personnels prévisibles ne sont pas excusés
• La tag/nom incorrect = -50 MMR + Strike à partir de la 2ème course`
  }
];

// Detailed Lounge Information Modal Content
const loungeGuideContent = {
  ranking: {
    title: "Système de Classement",
    icon: Award,
    content: `Le Lounge utilise un système de MMR (Matchmaking Rating) pour classer les joueurs :

**Rangs disponibles (du plus bas au plus haut):**
• Iron, Bronze, Silver, Gold
• Platinum, Sapphire, Diamond
• Master, Grandmaster

Chaque victoire/défaite modifie votre MMR. Plus l'écart de MMR avec vos adversaires est grand, plus le changement est important.

Nouveau joueur = placement automatique après quelques matchs.`
  },
  rules: {
    title: "Règles Essentielles",
    icon: Shield,
    content: `**Système de Strikes:**
Accumuler des pénalités mène à des strikes qui peuvent résulter en suspensions.

**Pénalités courantes:**
• Late (arrivée tardive): -50 MMR + Strike
• Drop (abandon): -100 MMR + Strike  
• Tag incorrect: -50 MMR + Strike
• Changer d'équipe: -100 MMR + Strike

**Host:**
• Le host est désigné automatiquement
• Doit poster le Room ID après la formation des équipes
• Les joueurs media-restricted ne peuvent pas host

**Règles de conduite:**
• Pas de targeting intentionnel
• Pas de throwing/trolling
• Pas de teaming en FFA
• Respect des autres joueurs`
  },
  formats: {
    title: "Formats de Jeu",
    icon: Users,
    content: `**Lounge Queue:**
• 12 joueurs, équipes de 2 formées aléatoirement
• Points basés sur votre placement individuel
• Système de points: 1er: 15pts, 2e: 12pts, 3e: 10pts, 4e: 9pts...

**Squad Queue:**
• 2v2: Duo - équipes de 2
• 3v3: Trio - équipes de 3
• 4v4: Squad - équipes de 4
• 6v6: équipes de 6

**À chaque format:**
• 12 courses au total
• Tous les circuits DLC inclus
• MMR ajusté selon vos performances`
  },
  queue: {
    title: "Système de Queue",
    icon: Clock,
    content: `**Horaires (Heure de Paris):**

🏠 **Lounge Queue:**
• Ouverture: XX:00
• Fermeture: XX:55
• Match: commence à l'heure suivante

🏁 **Squad Queue:**
• Ouverture: XX:45
• Fermeture: (XX+1):55 (heure d'après)
• Match: commence à (XX+2):00

**Exemple concret:**
Queue SQ ouverte à 13:45, ferme à 14:55, match à 15:00.

**Conseils:**
• Rejoignez tôt pour être sûr d'avoir une place
• La queue peut se remplir vite aux heures de pointe
• Activez les notifications pour ne pas rater l'ouverture`
  },
  disconnections: {
    title: "Déconnexions & Lag",
    icon: AlertTriangle,
    content: `**En cas de déconnexion:**
• Signalez immédiatement dans le chat
• Fournissez une preuve (screenshot code erreur Switch)
• Tentez de vous reconnecter rapidement

**Règles de réouverture:**
• Chaque joueur peut demander 1 réouverture par match
• Si < 10 joueurs et 2+ équipes touchées: réouverture obligatoire

**Course invalidée si:**
• 11-12 joueurs: 3 déconnexions de 2 équipes différentes
• 10 joueurs: 2 déconnexions de 2 équipes différentes

**Réduction de perte MMR:**
Si votre coéquipier manque 3+ courses:
• 3 courses: -16.7% de perte
• 4 courses: -33.3% de perte
• 5 courses: -50% de perte
• 8+ courses: 0 perte`
  },
  tips: {
    title: "Conseils Pro",
    icon: Star,
    content: `**Pour bien débuter:**
• Commencez par des Lounge Queue (FFA) pour vous habituer
• Observez les meilleurs joueurs sur le leaderboard
• Rejoignez le Discord pour poser vos questions

**Pour progresser:**
• Entraînez-vous sur les circuits difficiles
• Apprenez les shortcuts et les strats optimales
• Regardez des replays de vos matchs

**Mindset compétitif:**
• Un mauvais match arrive à tout le monde
• Le MMR se rattrape toujours avec de la régularité
• Le respect des adversaires est primordial

**Ressources utiles:**
• #player-guides sur Discord
• Le site lounge.mkcentral.com
• Cette app pour suivre vos stats!`
  }
};

// FAQ Section Component
function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState('ranking');
  
  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };
  
  return (
    <Card className="bg-white/[0.02] border-white/[0.06] mt-8">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Questions Fréquentes
        </CardTitle>
        <CardDescription className="text-gray-400">
          Tout ce que vous devez savoir pour commencer
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* FAQ Accordion */}
        <div className="space-y-3 mb-6">
          {faqData.map((faq, index) => (
            <div 
              key={index}
              className={`rounded-lg border transition-all duration-200 ${
                openFAQ === index 
                  ? 'bg-purple-500/10 border-purple-500/30' 
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-white flex items-center gap-2">
                  <span className="text-purple-400 text-lg">
                    {index === 0 ? '❓' : index === 1 ? '⚙️' : '📋'}
                  </span>
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    openFAQ === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openFAQ === index && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border-t border-white/[0.06] pt-4">
                    <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                      {faq.answer.split('**').map((part, i) => 
                        i % 2 === 1 
                          ? <strong key={i} className="text-white">{part}</strong>
                          : part
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* En Savoir Plus Button */}
        <div className="flex justify-center">
          <Dialog open={showGuide} onOpenChange={setShowGuide}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                En savoir plus sur le Lounge
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] bg-zinc-900 border-white/10 text-white overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Guide Complet du MK8DX Lounge
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Tout ce qu'il faut savoir pour maîtriser le Lounge
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                {/* Sidebar Navigation */}
                <div className="md:w-48 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                  {Object.entries(loungeGuideContent).map(([key, section]) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveGuideTab(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                          activeGuideTab === key
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden md:inline">{section.title}</span>
                        <span className="md:hidden">{section.title.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Content Area */}
                <ScrollArea className="flex-1 h-[400px] md:h-[500px] pr-4">
                  <div className="space-y-4">
                    {(() => {
                      const section = loungeGuideContent[activeGuideTab];
                      const Icon = section.icon;
                      return (
                        <div>
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.1]">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                              <Icon className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">{section.title}</h3>
                          </div>
                          
                          <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                            {section.content.split('**').map((part, i) => 
                              i % 2 === 1 
                                ? <strong key={i} className="text-white">{part}</strong>
                                : part
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Footer */}
              <div className="pt-4 border-t border-white/10 mt-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    📖 Basé sur le ruleset officiel MKCentral - Mise à jour 2025
                  </p>
                  <div className="flex gap-2">
                    <a
                      href="https://discord.gg/revmGkE"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="border-white/10 text-gray-300 hover:text-white">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Discord Lounge
                      </Button>
                    </a>
                    <a
                      href="https://lounge.mkcentral.com/mk8dx/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="border-white/10 text-gray-300 hover:text-white">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        MKCentral
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
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

// Helper function to check if a timestamp matches a day filter
function matchesDayFilter(timestamp, dayFilter) {
  const date = new Date(timestamp);
  const parisDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const dayName = parisDate.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }).toLowerCase();
  
  const today = new Date();
  const todayParis = new Date(today.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const todayStr = todayParis.toDateString();
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowParis = new Date(tomorrow.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const tomorrowStr = tomorrowParis.toDateString();
  
  switch (dayFilter) {
    case 'all':
      return true;
    case 'today':
      return new Date(parisDate.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).toDateString() === todayStr;
    case 'tomorrow':
      return new Date(parisDate.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).toDateString() === tomorrowStr;
    case 'weekend':
      return dayName === 'samedi' || dayName === 'dimanche';
    default:
      return dayName === dayFilter;
  }
}

// Helper function to check if a timestamp matches a time slot filter
function matchesTimeSlotFilter(timestamp, timeSlotFilter) {
  if (timeSlotFilter === 'all') return true;
  
  const date = new Date(timestamp);
  const hour = parseInt(date.toLocaleTimeString('fr-FR', { hour: '2-digit', hour12: false, timeZone: 'Europe/Paris' }));
  
  const slot = timeSlotOptions.find(s => s.value === timeSlotFilter);
  if (!slot) return true;
  
  // Handle night slot (0-6h) 
  if (slot.value === 'night') {
    return hour >= 0 && hour < 6;
  }
  // Handle evening slot (18h-24h)
  if (slot.value === 'evening') {
    return hour >= 18 && hour < 24;
  }
  
  return hour >= slot.start && hour < slot.end;
}

// Group SQs by day for display
function groupByDay(sqs) {
  return sqs.reduce((acc, sq) => {
    const date = new Date(sq.time);
    const dateKey = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Paris'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(sq);
    return acc;
  }, {});
}

export default function LoungePage() {
  const { data: session } = useSession();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [formatFilter, setFormatFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [timeSlotFilter, setTimeSlotFilter] = useState('all');
  const [groupByDayEnabled, setGroupByDayEnabled] = useState(true);
  
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
  
  // Apply all filters (format, day, time slot)
  const filteredSchedule = schedule.filter(sq => {
    // Format filter
    if (formatFilter !== 'all' && sq.format !== formatFilter) return false;
    // Day filter
    if (!matchesDayFilter(sq.time, dayFilter)) return false;
    // Time slot filter
    if (!matchesTimeSlotFilter(sq.time, timeSlotFilter)) return false;
    return true;
  });
  
  const upcomingSQ = filteredSchedule.filter(sq => sq.time > now).sort((a, b) => a.time - b.time);
  const pastSQ = filteredSchedule.filter(sq => sq.time <= now).sort((a, b) => b.time - a.time);
  const nextSQ = upcomingSQ[0];
  
  // Group by day for display
  const upcomingSQByDay = groupByDay(upcomingSQ);
  const pastSQByDay = groupByDay(pastSQ);
  const allSQByDay = groupByDay([...filteredSchedule].sort((a, b) => a.time - b.time));
  
  // Check if any filters are active
  const hasActiveFilters = formatFilter !== 'all' || dayFilter !== 'all' || timeSlotFilter !== 'all';
  
  // Clear all filters
  const clearAllFilters = () => {
    setFormatFilter('all');
    setDayFilter('all');
    setTimeSlotFilter('all');
  };

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
              <PushNotificationSettings push={push} schedule={schedule} />
              
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

        {/* My SQ Planning - Show selected SQs at the top */}
        {push.isSubscribed && push.preferences?.selectedSQs?.length > 0 && !loading && schedule.length > 0 && (
          <MySQPlanningSection 
            schedule={schedule} 
            selectedSQIds={push.preferences.selectedSQs} 
          />
        )}

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
                    Queue ouverte: {formatTime(nextSQ.time - 15 * 60 * 1000)} - {new Date(nextSQ.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).slice(0, -2)}55
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
          <div className="flex flex-col gap-4 mb-6">
            {/* First row: Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

              {/* Group by day toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Grouper par jour</span>
                <Switch 
                  checked={groupByDayEnabled}
                  onCheckedChange={setGroupByDayEnabled}
                />
              </div>
            </div>

            {/* Second row: Filters */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400 mr-2">Filtres:</span>
              
              {/* Day Filter */}
              <Select value={dayFilter} onValueChange={setDayFilter}>
                <SelectTrigger className="w-[160px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                  <CalendarDays className="w-3 h-3 mr-2 text-purple-400" />
                  <SelectValue placeholder="Jour" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.1]">
                  {dayFilterOptions.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className={`text-white hover:bg-white/[0.1] ${
                        option.value === 'today' ? 'text-green-400' :
                        option.value === 'tomorrow' ? 'text-blue-400' :
                        option.value === 'weekend' ? 'text-yellow-400' : ''
                      }`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time Slot Filter */}
              <Select value={timeSlotFilter} onValueChange={setTimeSlotFilter}>
                <SelectTrigger className="w-[180px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                  <Clock className="w-3 h-3 mr-2 text-blue-400" />
                  <SelectValue placeholder="Horaire" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.1]">
                  {timeSlotOptions.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="text-white hover:bg-white/[0.1]"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Format Filter */}
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[150px] bg-white/[0.02] border-white/[0.06] text-white h-9">
                  <Users className="w-3 h-3 mr-2 text-orange-400" />
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
                      <Users className="w-3 h-3" /> 6v6
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9"
                >
                  <X className="w-3 h-3 mr-1" />
                  Effacer filtres
                </Button>
              )}
            </div>

            {/* Active filters summary */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Filtres actifs:</span>
                {dayFilter !== 'all' && (
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                    <CalendarDays className="w-3 h-3 mr-1" />
                    {dayFilterOptions.find(d => d.value === dayFilter)?.label}
                  </Badge>
                )}
                {timeSlotFilter !== 'all' && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeSlotOptions.find(t => t.value === timeSlotFilter)?.label}
                  </Badge>
                )}
                {formatFilter !== 'all' && (
                  <Badge variant="outline" className={`${formatColors[formatFilter]} text-xs`}>
                    <Users className="w-3 h-3 mr-1" />
                    {formatFilter.toUpperCase()}
                  </Badge>
                )}
                <span className="text-xs text-gray-500 ml-2">
                  ({filteredSchedule.length} résultat{filteredSchedule.length > 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          <TabsContent value="upcoming">
            {upcomingSQ.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">
                    {hasActiveFilters
                      ? 'Aucune Squad Queue correspondant aux filtres'
                      : 'Aucune Squad Queue à venir'
                    }
                  </p>
                  {hasActiveFilters ? (
                    <Button 
                      variant="link" 
                      onClick={clearAllFilters} 
                      className="text-purple-400 mt-2"
                    >
                      Effacer les filtres
                    </Button>
                  ) : (
                    <p className="text-gray-600 text-sm mt-2">
                      Le planning est généralement mis à jour chaque lundi.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : groupByDayEnabled ? (
              <div className="space-y-6">
                {Object.entries(upcomingSQByDay).map(([date, sqs]) => (
                  <div key={date} className="space-y-3">
                    <div className="sticky top-0 bg-black/80 backdrop-blur-sm py-2 z-10 border-b border-white/[0.06]">
                      <h3 className="text-lg font-semibold text-white capitalize flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-purple-400" />
                        {date}
                        <Badge variant="outline" className="ml-2 bg-white/[0.05] text-gray-400 border-white/[0.1]">
                          {sqs.length} SQ
                        </Badge>
                      </h3>
                    </div>
                    <div className="space-y-3 pl-2 border-l-2 border-purple-500/30">
                      {sqs.map((sq, idx) => (
                        <SQCard key={sq.id} sq={sq} isNext={upcomingSQ[0]?.id === sq.id} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                    {hasActiveFilters
                      ? 'Aucune Squad Queue passée correspondant aux filtres'
                      : 'Aucune Squad Queue passée'
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button 
                      variant="link" 
                      onClick={clearAllFilters} 
                      className="text-purple-400 mt-2"
                    >
                      Effacer les filtres
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : groupByDayEnabled ? (
              <div className="space-y-6">
                {Object.entries(pastSQByDay).map(([date, sqs]) => (
                  <div key={date} className="space-y-3">
                    <div className="sticky top-0 bg-black/80 backdrop-blur-sm py-2 z-10 border-b border-white/[0.06]">
                      <h3 className="text-lg font-semibold text-white capitalize flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-gray-500" />
                        {date}
                        <Badge variant="outline" className="ml-2 bg-white/[0.05] text-gray-400 border-white/[0.1]">
                          {sqs.length} SQ
                        </Badge>
                      </h3>
                    </div>
                    <div className="space-y-3 pl-2 border-l-2 border-gray-600/30">
                      {sqs.map((sq) => (
                        <SQCard key={sq.id} sq={sq} isNext={false} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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

        {/* FAQ Section */}
        <FAQSection />
        
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
                  <li><strong className="text-yellow-400">Squad Queue:</strong> XX:45 → XX:55</li>
                </ul>
              </div>
              <div>
                <p className="mb-2"><strong className="text-white">Formats disponibles:</strong></p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={formatColors['2v2']}>2v2 - Duo</Badge>
                  <Badge variant="outline" className={formatColors['3v3']}>3v3 - Trio</Badge>
                  <Badge variant="outline" className={formatColors['4v4']}>4v4 - Squad</Badge>
                  <Badge variant="outline" className={formatColors['6v6']}>6v6</Badge>
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
