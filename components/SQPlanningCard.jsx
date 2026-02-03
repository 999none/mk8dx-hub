'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, BellOff, Calendar, Clock, Users, 
  CalendarDays, ExternalLink, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

// Format badge colors
const formatColors = {
  '2v2': 'bg-green-500/20 text-green-400 border-green-500/30',
  '3v3': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  '4v4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  '6v6': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// Helper functions
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff < 0) return 'Passée';
  if (diff < 60 * 1000) return 'Maintenant!';
  if (diff < 60 * 60 * 1000) return `Dans ${Math.floor(diff / 60000)} min`;
  if (diff < 24 * 60 * 60 * 1000) return `Dans ${Math.floor(diff / 3600000)}h`;
  return `Dans ${Math.floor(diff / 86400000)} jours`;
}

export default function SQPlanningCard({ showManageButton = true, maxItems = 5 }) {
  const [mounted, setMounted] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    const fetchData = async () => {
      try {
        // Fetch schedule
        const scheduleRes = await fetch('/api/sq-schedule');
        const scheduleData = await scheduleRes.json();
        if (scheduleData.schedule) {
          setSchedule(scheduleData.schedule);
        }

        // Check if service worker is registered and get subscription
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            // Fetch preferences from server
            const prefRes = await fetch(`/api/push/status?endpoint=${encodeURIComponent(subscription.endpoint)}`);
            const prefData = await prefRes.json();
            if (prefData.preferences) {
              setPreferences(prefData.preferences);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching SQ planning data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Don't render on server
  if (!mounted) return null;

  // Don't show if no planning or loading
  if (loading) return null;

  // Get selected SQs from preferences
  const selectedSQIds = preferences?.selectedSQs || [];
  if (selectedSQIds.length === 0) return null;

  // Filter and sort selected SQs
  const now = Date.now();
  const selectedSQs = schedule
    .filter(sq => selectedSQIds.includes(sq.id) && sq.time > now)
    .sort((a, b) => a.time - b.time)
    .slice(0, maxItems);

  // If no upcoming selected SQs, don't show
  if (selectedSQs.length === 0) return null;

  // Count by format
  const formatCounts = selectedSQIds.reduce((acc, sqId) => {
    const sq = schedule.find(s => s.id === sqId && s.time > now);
    if (sq) {
      acc[sq.format] = (acc[sq.format] || 0) + 1;
    }
    return acc;
  }, {});

  const totalUpcoming = schedule.filter(sq => selectedSQIds.includes(sq.id) && sq.time > now).length;

  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-purple-400 flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5" />
            Mon Planning SQ
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-2">
              {totalUpcoming} à venir
            </Badge>
          </CardTitle>
          {showManageButton && (
            <Link href="/lounge">
              <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                <CalendarDays className="w-4 h-4 mr-2" />
                Gérer
              </Button>
            </Link>
          )}
        </div>
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

        {/* Selected SQs list */}
        <div className="space-y-2">
          {selectedSQs.map((sq, idx) => {
            const isNext = idx === 0;
            const timeUntil = formatRelativeTime(sq.time);
            const isSoon = sq.time - now < 2 * 60 * 60 * 1000; // Within 2 hours
            
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
                      {formatDateTime(sq.time)}
                    </div>
                    <div className={`text-xs ${isSoon ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {timeUntil}
                    </div>
                  </div>
                </div>
                {isNext && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    Prochaine
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Show more link if there are more */}
        {totalUpcoming > maxItems && (
          <div className="mt-3 text-center">
            <Link href="/lounge">
              <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                Voir les {totalUpcoming - maxItems} autres SQ
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
