'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, ArrowRight, BarChart3, BookOpen, Zap, Users, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const [trackedPlayers, setTrackedPlayers] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fetch general stats
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
    
    // Fetch tracked players count from Lounge
    fetch('/api/lounge/player-count')
      .then(res => res.json())
      .then(data => {
        if (data.count) {
          setTrackedPlayers(data.count);
        }
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 grid-pattern"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className={`inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-full text-sm text-gray-400 ${mounted ? 'animate-fade-in-down' : 'opacity-0'}`}>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Hub Compétitif MK8DX
            </div>
            
            <h1 className={`text-5xl sm:text-6xl md:text-7xl font-black mb-6 tracking-tight leading-[1.1] ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '100ms' }}>
              Master the Track.
              <br />
              <span className="text-gradient-animated">Rule the Lounge.</span>
            </h1>
            
            <p className={`text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
              La communauté compétitive Mario Kart 8 Deluxe. Suivez vos stats, 
              progressez avec l'Academy, dominez le classement.
            </p>
            
            <div className={`flex flex-col sm:flex-row gap-4 justify-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 font-semibold px-8 h-12 group btn-hover-lift">
                  Commencer
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/10 text-white hover:bg-white/[0.03] font-medium px-8 h-12 btn-hover-lift">
                  Voir le Leaderboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto ${mounted ? 'stagger-children' : ''}`}>
            {[
              { value: trackedPlayers ? trackedPlayers.toLocaleString('fr-FR') : (stats?.players || '2K+'), label: 'Joueurs Lounge', color: 'text-green-500' },
              { value: stats?.races || '100K+', label: 'Courses', color: 'text-blue-500' },
              { value: '96', label: 'Circuits', color: 'text-yellow-500' },
              { value: '24/7', label: 'Squad Queue', color: 'text-purple-500' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 bg-white/[0.02] border border-white/[0.04] rounded-xl card-hover">
                <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Fonctionnalités</h2>
            <p className="text-gray-500">Tout ce dont vous avez besoin pour progresser</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: BarChart3,
                title: 'Stats Temps Réel',
                description: 'MMR, win rate, historique. Synchronisé avec MKCentral Lounge.',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10'
              },
              {
                icon: BookOpen,
                title: 'Academy',
                description: 'Techniques avancées, combos meta, mindset compétitif.',
                color: 'text-purple-500',
                bg: 'bg-purple-500/10'
              },
              {
                icon: Trophy,
                title: 'Tournois',
                description: 'Événements officiels, Squad Queue, Wars 6v6.',
                color: 'text-yellow-500',
                bg: 'bg-yellow-500/10'
              }
            ].map((feature, i) => (
              <Card key={i} className="bg-white/[0.02] border-white/[0.04] card-hover group">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 ${feature.bg} rounded-lg flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Prêt à jouer ?</h2>
            <p className="text-gray-500 mb-8">
              Connectez Discord et accédez à vos stats en temps réel.
            </p>
            <Link href="/login">
              <Button size="lg" className="btn-discord bg-[#5865F2] text-white hover:bg-[#4752C4] font-semibold px-8 h-12 group">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Connexion Discord
                <ChevronRight className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gray-600" />
              <span className="text-gray-500 text-sm">MK8DX Hub</span>
            </div>
            <div className="flex items-center gap-8">
              {[
                { href: 'https://lounge.mkcentral.com/mk8dx/', label: 'MKCentral' },
                { href: 'https://discord.gg/revmGkE', label: 'Discord' },
              ].map((link, i) => (
                <a 
                  key={i}
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-400 transition-colors link-underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}