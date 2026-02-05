'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, BellOff, BellRing, RefreshCw, Clock, Users, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

/**
 * PushNotificationManager Component
 * Handles Web Push Notification subscription, preferences, and testing
 */
export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [pushServiceAvailable, setPushServiceAvailable] = useState(true);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [preferences, setPreferences] = useState({
    loungeQueue: true,
    sqQueue: true
  });
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const subscribeAttempted = useRef(false);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check if push service has failed before in this session
        const pushFailed = sessionStorage.getItem('push_service_unavailable');
        if (pushFailed === 'true') {
          setPushServiceAvailable(false);
          setLoading(false);
          return;
        }
        
        // Fetch VAPID public key
        try {
          const res = await fetch('/api/push/vapid-public-key');
          const data = await res.json();
          if (data.publicKey) {
            setVapidPublicKey(data.publicKey);
          }
        } catch (err) {
          console.error('Failed to fetch VAPID key:', err);
        }
        
        // Register service worker and check subscription
        await registerServiceWorker();
      }
      
      setLoading(false);
    };
    
    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = async () => {
    try {
      // Unregister old service workers first to ensure clean state
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.scope !== window.location.origin + '/') {
          console.log('[Push] Unregistering old SW:', registration.scope);
          await registration.unregister();
        }
      }
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[Push] Service Worker registered:', registration.scope);
      
      // Wait for SW to be ready with timeout
      const swReady = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SW ready timeout')), 10000)
        )
      ]);
      
      console.log('[Push] Service Worker is ready');
      
      // Check existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('[Push] Found existing subscription');
        setSubscription(existingSubscription);
        
        // Verify with server
        try {
          const statusRes = await fetch(`/api/push/status?endpoint=${encodeURIComponent(existingSubscription.endpoint)}`);
          const statusData = await statusRes.json();
          
          setIsSubscribed(statusData.subscribed);
          if (statusData.preferences) {
            setPreferences(statusData.preferences);
          }
        } catch (statusErr) {
          console.warn('[Push] Failed to check status:', statusErr);
          setIsSubscribed(true); // Assume subscribed if we have a subscription
        }
      }
      
      return registration;
    } catch (err) {
      console.error('[Push] Service Worker registration failed:', err);
      return null;
    }
  };

  // Convert VAPID key
  const urlBase64ToUint8Array = (base64String) => {
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
  };

  // Subscribe to push notifications
  const subscribe = async () => {
    // Prevent multiple automatic attempts
    if (subscribeAttempted.current) {
      console.log('[Push] Subscribe already attempted this session');
    }
    subscribeAttempted.current = true;
    
    if (!vapidPublicKey) {
      toast.error('Configuration push non disponible');
      return;
    }
    
    // Detect browsers with built-in ad blocking (Brave, etc.)
    const isBrave = navigator.brave !== undefined;
    if (isBrave) {
      console.warn('[Push] Brave browser detected - push may be blocked by Shields');
    }
    
    setSubscribing(true);
    setLastError(null);
    setErrorDismissed(false);
    
    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        toast.error('Permission de notification refusée');
        setSubscribing(false);
        return;
      }
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready:', registration.scope);
      
      // Check if already subscribed
      let existingSubscription = await registration.pushManager.getSubscription();
      
      // If there's an existing subscription, unsubscribe first to avoid conflicts
      if (existingSubscription) {
        console.log('[Push] Unsubscribing from existing subscription');
        try {
          await existingSubscription.unsubscribe();
        } catch (unsubErr) {
          console.warn('[Push] Failed to unsubscribe existing:', unsubErr);
        }
      }
      
      // Prepare application server key
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log('[Push] Application server key length:', applicationServerKey.length);
      
      // Subscribe to push with retry logic and timeout
      let pushSubscription = null;
      let retryCount = 0;
      const maxRetries = 2; // Reduced from 3 to 2 for faster feedback
      
      while (!pushSubscription && retryCount < maxRetries) {
        try {
          // Create a promise that will timeout
          const subscriptionPromise = registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });
          
          // Add a 10 second timeout (reduced from 15)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Push subscription timeout')), 10000)
          );
          
          pushSubscription = await Promise.race([subscriptionPromise, timeoutPromise]);
          console.log('[Push] Subscription successful:', pushSubscription.endpoint?.substring(0, 50) + '...');
        } catch (subscribeErr) {
          retryCount++;
          // Use console.warn for expected browser-level blocks (not a code error)
          if (subscribeErr.name === 'AbortError') {
            console.warn(`[Push] Subscribe attempt ${retryCount} blocked by browser:`, subscribeErr.message);
          } else {
            console.error(`[Push] Subscribe attempt ${retryCount} failed:`, subscribeErr.name, subscribeErr.message);
          }
          
          // If it's an AbortError or timeout, wait and retry (but less time)
          if ((subscribeErr.name === 'AbortError' || subscribeErr.message === 'Push subscription timeout') && retryCount < maxRetries) {
            console.log('[Push] Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1500 * retryCount));
          } else if (retryCount >= maxRetries) {
            // Mark push service as unavailable for this session
            sessionStorage.setItem('push_service_unavailable', 'true');
            setPushServiceAvailable(false);
            
            // After max retries, show a helpful error
            let errorMessage = '';
            if (subscribeErr.name === 'AbortError') {
              errorMessage = 'Le service de notifications push du navigateur n\'est pas disponible. Cela peut être causé par un bloqueur de publicités, le mode navigation privée, ou des paramètres de confidentialité.';
            } else if (subscribeErr.message === 'Push subscription timeout') {
              errorMessage = 'La connexion au service push a expiré. Vérifiez votre connexion internet.';
            } else {
              errorMessage = `Erreur: ${subscribeErr.message}`;
            }
            setLastError(errorMessage);
            // Don't show toast for AbortError as it's a known browser limitation
            if (subscribeErr.name !== 'AbortError') {
              toast.error('Échec de l\'activation des notifications');
            }
            throw subscribeErr;
          }
        }
      }
      
      if (!pushSubscription) {
        throw new Error('Failed to create subscription after retries');
      }
      
      // Send to server
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
        // Clear any previous failure flag
        sessionStorage.removeItem('push_service_unavailable');
        setPushServiceAvailable(true);
        toast.success('Notifications activées!');
      } else {
        throw new Error(data.message || 'Failed to subscribe');
      }
      
    } catch (err) {
      // Use console.warn for expected browser blocks (AbortError is not a code bug)
      if (err.name === 'AbortError') {
        console.warn('[Push] Subscription blocked by browser:', err.message);
      } else {
        console.error('[Push] Subscribe error:', err.name, err.message);
      }
      // Only set error if we haven't already set one
      if (!lastError && !errorDismissed) {
        setLastError(err.name === 'AbortError' 
          ? 'Le service push est indisponible dans votre navigateur. Cette fonctionnalité peut ne pas être supportée dans ce contexte.'
          : `Erreur: ${err.message}`
        );
      }
    } finally {
      setSubscribing(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    setSubscribing(true);
    
    try {
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }
      
      setSubscription(null);
      setIsSubscribed(false);
      toast.success('Notifications désactivées');
      
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      toast.error('Erreur lors de la désactivation');
    } finally {
      setSubscribing(false);
    }
  };

  // Update preferences
  const updatePreference = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    if (isSubscribed && subscription) {
      try {
        await fetch('/api/push/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            preferences: newPreferences
          })
        });
        toast.success('Préférences mises à jour');
      } catch (err) {
        console.error('[Push] Update preferences error:', err);
        toast.error('Erreur lors de la mise à jour');
      }
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!subscription) {
      toast.error('Pas d\'abonnement actif');
      return;
    }
    
    setTestingNotification(true);
    
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
        toast.success('Notification test envoyée!');
      } else {
        throw new Error(data.message || 'Failed to send');
      }
      
    } catch (err) {
      console.error('[Push] Test notification error:', err);
      toast.error('Erreur lors de l\'envoi test');
    } finally {
      setTestingNotification(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/[0.02] border-white/[0.04]">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="bg-white/[0.02] border-white/[0.04]">
        <CardContent className="p-6">
          <div className="text-center">
            <BellOff className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Non supporté</h3>
            <p className="text-gray-500 text-sm">
              Les notifications push ne sont pas supportées par votre navigateur.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show a simplified card when push service is unavailable
  if (!pushServiceAvailable && !isSubscribed) {
    return (
      <Card className="bg-white/[0.02] border-white/[0.04]">
        <CardHeader className="border-b border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-500" />
                Notifications Push
              </CardTitle>
              <CardDescription className="text-gray-500 mt-1">
                Service temporairement indisponible
              </CardDescription>
            </div>
            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 border">
              <AlertTriangle className="w-3 h-3 mr-1" /> Limité
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg space-y-3">
            <p className="text-orange-300 text-sm font-medium">
              Les notifications push ne sont pas disponibles dans ce navigateur.
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Causes possibles :</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                <li>Bloqueur de publicités actif (uBlock, AdBlock...)</li>
                <li>Mode navigation privée</li>
                <li>Paramètres de confidentialité du navigateur</li>
                <li>Navigateur non compatible</li>
              </ul>
            </div>
            <Button
              onClick={() => {
                sessionStorage.removeItem('push_service_unavailable');
                setPushServiceAvailable(true);
                setLastError(null);
                subscribeAttempted.current = false;
              }}
              variant="outline"
              size="sm"
              className="border-orange-500/20 text-orange-300 hover:bg-orange-500/10"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.02] border-white/[0.04]">
      <CardHeader className="border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Notifications Push
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Recevez des alertes pour les queues Lounge et SQ
            </CardDescription>
          </div>
          <Badge 
            className={`${
              isSubscribed 
                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            } border`}
          >
            {isSubscribed ? (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Actif</>
            ) : (
              <><XCircle className="w-3 h-3 mr-1" /> Inactif</>
            )}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Permission Status */}
        {permission === 'denied' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">
              <strong>Permission refusée.</strong> Vous devez autoriser les notifications dans les paramètres de votre navigateur.
            </p>
          </div>
        )}
        
        {/* Error Status - Dismissible */}
        {lastError && !isSubscribed && !errorDismissed && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <p className="text-orange-400 text-sm flex-1">
                <strong>Note:</strong> {lastError}
              </p>
              <button 
                onClick={() => setErrorDismissed(true)} 
                className="text-gray-400 hover:text-gray-300 ml-2 text-xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Subscribe/Unsubscribe Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isSubscribed ? (
            <>
              <Button
                onClick={unsubscribe}
                disabled={subscribing}
                variant="outline"
                className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                {subscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                Désactiver les notifications
              </Button>
              
              <Button
                onClick={sendTestNotification}
                disabled={testingNotification}
                variant="outline"
                className="border-white/[0.08] text-gray-300 hover:bg-white/[0.05]"
              >
                {testingNotification ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <BellRing className="w-4 h-4 mr-2" />
                )}
                Tester
              </Button>
            </>
          ) : (
            <Button
              onClick={subscribe}
              disabled={subscribing || permission === 'denied'}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {subscribing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Activer les notifications
            </Button>
          )}
        </div>
        
        {/* Notification Preferences */}
        {isSubscribed && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Préférences
            </h4>
            
            {/* Lounge Queue Notifications */}
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Lounge Queue</p>
                  <p className="text-gray-500 text-sm">Notification à chaque heure (ouverture queue)</p>
                </div>
              </div>
              <Switch
                checked={preferences.loungeQueue}
                onCheckedChange={(checked) => updatePreference('loungeQueue', checked)}
              />
            </div>
            
            {/* SQ Queue Notifications */}
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Squad Queue</p>
                  <p className="text-gray-500 text-sm">Notification 45 min avant chaque SQ</p>
                </div>
              </div>
              <Switch
                checked={preferences.sqQueue}
                onCheckedChange={(checked) => updatePreference('sqQueue', checked)}
              />
            </div>
          </div>
        )}
        
        {/* Info Box */}
        <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
          <h5 className="text-sm font-medium text-gray-300 mb-2">Comment ça marche ?</h5>
          <ul className="text-gray-500 text-sm space-y-1">
            <li>• <strong className="text-gray-400">Lounge Queue</strong> : Notifié à chaque heure quand la queue ouvre (XX:00 → XX:55)</li>
            <li>• <strong className="text-gray-400">Squad Queue</strong> : Notifié 45 minutes avant le début de chaque SQ programmée</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
