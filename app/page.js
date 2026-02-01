'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, Users, Clock, ArrowRight, Zap, BarChart3, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            <span className="font-bold text-xl">MK8DX Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-white hover:bg-white/10">Dashboard</Button>
            </Link>
            <Link href="/academy">
              <Button variant="ghost" className="text-white hover:bg-white/10">Academy</Button>
            </Link>
            <Link href="/tournaments">
              <Button variant="ghost" className="text-white hover:bg-white/10">Tournois</Button>
            </Link>
            <Link href="/api/auth/discord">
              <Button className="bg-white text-black hover:bg-white/90">
                Se Connecter
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-4 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm">
              🏁 Hub Compétitif Officiel MK8DX
            </div>
            <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight animate-float">
              Master the Track.<br />
              <span className="text-gradient">Rule the Lounge.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Rejoignez la plus grande communauté compétitive de Mario Kart 8 Deluxe. 
              Suivez vos stats, progressez avec l'Academy, et dominez le Lounge.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/api/auth/discord">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 text-lg px-8">
                  Commencer Maintenant
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/academy">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8">
                  Explorer l'Academy
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold mb-1">{stats?.players || '2K+'}</div>
                <div className="text-sm text-gray-400">Joueurs Actifs</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold mb-1">{stats?.races || '100K+'}</div>
                <div className="text-sm text-gray-400">Courses Jouées</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold mb-1">96</div>
                <div className="text-sm text-gray-400">Circuits DLC</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold mb-1">24/7</div>
                <div className="text-sm text-gray-400">Squad Queue</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-black to-zinc-950">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Pourquoi MK8DX Hub ?</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Stats en Temps Réel</h3>
                <p className="text-gray-400">
                  Synchronisation automatique avec le Lounge MKCentral. Suivez votre MMR, win rate, 
                  et historique de matchs en direct.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">MK8DX Academy</h3>
                <p className="text-gray-400">
                  Apprenez les techniques avancées : Soft Drift, Motion Glider, Counter Hop. 
                  Guides complets et combos meta.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Tournois & Lounge</h3>
                <p className="text-gray-400">
                  Participez aux Squad Queues, Wars 6v6, et tournois officiels. 
                  Notifications en temps réel.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 animate-pulse-subtle" />
              <h2 className="text-3xl font-bold mb-4">Prêt à Dominer le Lounge ?</h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Connectez votre compte Discord et accédez instantanément à vos stats, 
                votre progression MMR, et rejoignez la communauté compétitive.
              </p>
              <Link href="/api/auth/discord">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 text-lg px-8">
                  Connecter avec Discord
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>MK8DX Competitive Hub - Communauté non officielle</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="https://lounge.mkcentral.com/mk8dx/" target="_blank" rel="noopener noreferrer" 
               className="hover:text-white transition-colors">
              MKCentral Lounge
            </a>
            <a href="https://www.mkworldbuilder.com/" target="_blank" rel="noopener noreferrer"
               className="hover:text-white transition-colors">
              MK World Builder
            </a>
            <a href="https://discord.gg/revmGkE" target="_blank" rel="noopener noreferrer"
               className="hover:text-white transition-colors">
              Discord Lounge
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}