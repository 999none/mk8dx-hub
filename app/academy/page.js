'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Home, Zap, Car, Brain, Target, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function AcademyPage() {
  const [completedGoals, setCompletedGoals] = useState([]);

  const techniques = [
    {
      id: 1,
      title: 'Soft Drift',
      difficulty: 'Intermédiaire',
      description: 'Tenir le joystick à 30° en diagonale avec micro-corrections opposées pour accélérer la sortie de turbo',
      details: 'Technique essentielle pour optimiser les virages. Maintenez le stick légèrement incliné plutôt que complètement à fond.',
      color: 'bg-yellow-500'
    },
    {
      id: 2,
      title: 'Motion Glider',
      difficulty: 'Avancé',
      description: 'Champignons + motion control diagonal en planeur pour vitesse maximale',
      details: 'Utilisez fast glider + champignon + motion control pour un angle diagonal maximal. Critique sur Big Blue et Cloudtop.',
      color: 'bg-red-500'
    },
    {
      id: 3,
      title: 'Gestion d\'Items',
      difficulty: 'Débutant',
      description: 'Maîtriser le Bagging vs Running selon la position',
      details: 'TOP: RUN avec protection. MID: DRAFT ou BAG stratégique. BOT: BAG pour Étoile/Bill/Champignon Doré.',
      color: 'bg-green-500'
    },
    {
      id: 4,
      title: 'Counter Hop',
      difficulty: 'Intermédiaire',
      description: 'Sauter dans le sens opposé au virage pour élargir la trajectoire',
      details: 'Permet de charger un mini-turbo plus rapidement en élargissant l\'angle. Utile dans les virages serrés.',
      color: 'bg-yellow-500'
    },
    {
      id: 5,
      title: 'Kusaan Slide',
      difficulty: 'Avancé',
      description: 'Petits drifts entre tricks pour maintenir le momentum',
      details: 'Enchaînez de mini-dérapages entre les zones de tricks pour ne jamais perdre de vitesse.',
      color: 'bg-red-500'
    },
    {
      id: 6,
      title: 'Fast Glider',
      difficulty: 'Avancé',
      description: 'Déraper avant le planeur puis diagonal pour vitesse accrue',
      details: 'Effectuez un dérapage juste avant la zone de planeur, relâchez le turbo, puis orientez-vous en diagonal.',
      color: 'bg-red-500'
    }
  ];

  const metaCombos = [
    {
      id: 1,
      tier: 'S',
      character: 'Yoshi / Birdo',
      vehicle: 'Quad Nounours',
      tires: 'Roller Azur',
      glider: 'Aile Nuage',
      stats: { speed: 85, accel: 90, miniTurbo: 95, handling: 80 }
    },
    {
      id: 2,
      tier: 'S',
      character: 'Peach / Daisy / Peachette',
      vehicle: 'Para-coccinelly',
      tires: 'Roller Azur',
      glider: 'Paper Glider',
      stats: { speed: 88, accel: 92, miniTurbo: 93, handling: 78 }
    },
    {
      id: 3,
      tier: 'A',
      character: 'Diddy Kong / Inkling Girl',
      vehicle: 'Scootinette',
      tires: 'Roller',
      glider: 'Aile Nuage',
      stats: { speed: 80, accel: 88, miniTurbo: 90, handling: 85 }
    }
  ];

  const discouragedBuilds = [
    'Wiggler (trop lent)',
    'Mario Tanuki (stats déséquilibrés)',
    'Inkling Boy (meilleure alternative: Inkling Girl)'
  ];

  const goals = [
    { id: 1, text: 'Maîtriser Soft Drift à 30°' },
    { id: 2, text: 'Motion Glider sur Big Blue' },
    { id: 3, text: 'Pratiquer bagging sur toutes maps' },
    { id: 4, text: 'Counter Hop virages serrés' },
    { id: 5, text: 'Atteindre 10000 MMR' },
    { id: 6, text: 'Kusaan Slide sur Cloudtop' },
    { id: 7, text: 'Utiliser Antenne pour shortcuts' },
    { id: 8, text: 'Regarder 5 replays top joueurs' }
  ];

  const toggleGoal = (goalId) => {
    setCompletedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const progressPercent = (completedGoals.length / goals.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-5 h-5" />
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Dashboard</Button>
            </Link>
            <Link href="/academy">
              <span className="font-bold text-white">Academy</span>
            </Link>
            <Link href="/tournaments">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Tournois</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Leaderboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">MK8DX Academy</h1>
          <p className="text-xl text-gray-400">
            Maîtrisez les techniques avancées et devenez un pro du Lounge
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="techniques" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
            <TabsTrigger value="techniques">Techniques</TabsTrigger>
            <TabsTrigger value="combos">Meta Combos</TabsTrigger>
            <TabsTrigger value="mindset">Mindset</TabsTrigger>
            <TabsTrigger value="goals">Goal Tracker</TabsTrigger>
          </TabsList>

          {/* Techniques Tab */}
          <TabsContent value="techniques" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {techniques.map((tech) => (
                <Card key={tech.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{tech.title}</CardTitle>
                        <Badge className={tech.color}>{tech.difficulty}</Badge>
                      </div>
                      <Zap className="w-6 h-6 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-3">{tech.description}</p>
                    <p className="text-sm text-gray-400">{tech.details}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Guide Complet */}
            <Card className="bg-white/5 border-white/10 mt-8">
              <CardHeader>
                <CardTitle>Guide Complet des Techniques</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item1">
                    <AccordionTrigger>Item Management: Bagging vs Running</AccordionTrigger>
                    <AccordionContent className="text-gray-300 space-y-2">
                      <p><strong>RUN:</strong> Rester devant le plus longtemps possible. Prendre les pièces accessibles, trajectoires propres.</p>
                      <p><strong>DRAFT:</strong> Utiliser l'aspiration pour remonter rapidement. Accumuler des pièces.</p>
                      <p><strong>BAG:</strong> Reculer stratégiquement pour obtenir Étoile, Bill, Champignon Doré. Atteindre 10 pièces avant les cuts.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item2">
                    <AccordionTrigger>Soft Drifting & Mini-Turbo</AccordionTrigger>
                    <AccordionContent className="text-gray-300 space-y-2">
                      <p>Le Soft Drift consiste à maintenir le joystick à environ 30° en diagonale plutôt que complètement à fond.</p>
                      <p>Ajoutez des micro-corrections dans le sens opposé pour accélérer la charge du mini-turbo.</p>
                      <p>Cette technique permet d'obtenir des SMT et UMT plus rapidement tout en maintenant une meilleure trajectoire.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item3">
                    <AccordionTrigger>Motion Gliding Techniques</AccordionTrigger>
                    <AccordionContent className="text-gray-300 space-y-2">
                      <p><strong>Fast Glider:</strong> Dérapage avant le planeur + déplacement diagonal = vitesse accrue.</p>
                      <p><strong>Low Glider:</strong> Saut juste avant le delta-canon (gain ~0,1s).</p>
                      <p><strong>Motion Glider:</strong> Fast glider + champignon + motion control diagonal maximal. Essentiel sur Big Blue et Cloudtop.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item4">
                    <AccordionTrigger>Essential Track Shortcuts</AccordionTrigger>
                    <AccordionContent className="text-gray-300 space-y-2">
                      <p><strong>NISC:</strong> Raccourcis sans objets (Neural Integrated Shortcut). Utilisent les planeurs et trajectoires optimales.</p>
                      <p><strong>Cut:</strong> Raccourcis nécessitant champignons ou étoiles. Critique d'avoir 10 pièces avant d'entrer.</p>
                      <p><strong>Antenne:</strong> Activer dans le cut, désactiver à la sortie pour stabiliser les shortcuts.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meta Combos Tab */}
          <TabsContent value="combos" className="space-y-6">
            <div className="space-y-6">
              {metaCombos.map((combo) => (
                <Card key={combo.id} className="bg-white/5 border-white/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className={combo.tier === 'S' ? 'bg-yellow-500' : 'bg-blue-500'} className="mb-2">
                          Tier {combo.tier}
                        </Badge>
                        <CardTitle>{combo.character}</CardTitle>
                      </div>
                      <Car className="w-8 h-8 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-400">Véhicule</div>
                        <div className="font-semibold">{combo.vehicle}</div>
                        
                        <div className="text-sm text-gray-400 mt-4">Roues</div>
                        <div className="font-semibold">{combo.tires}</div>
                        
                        <div className="text-sm text-gray-400 mt-4">Planeur</div>
                        <div className="font-semibold">{combo.glider}</div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Vitesse</span>
                            <span>{combo.stats.speed}</span>
                          </div>
                          <Progress value={combo.stats.speed} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Accélération</span>
                            <span>{combo.stats.accel}</span>
                          </div>
                          <Progress value={combo.stats.accel} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Mini-Turbo</span>
                            <span>{combo.stats.miniTurbo}</span>
                          </div>
                          <Progress value={combo.stats.miniTurbo} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Maniabilité</span>
                            <span>{combo.stats.handling}</span>
                          </div>
                          <Progress value={combo.stats.handling} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-red-950/20 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-red-400">⚠️ Builds Déconseillés</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {discouragedBuilds.map((build, index) => (
                    <li key={index} className="text-gray-300">• {build}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mindset Tab */}
          <TabsContent value="mindset" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Process vs Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Concentrez-vous sur votre jeu (trajectoires, items, décisions) plutôt que uniquement sur le MMR. 
                    Les résultats suivent naturellement un bon processus.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Learn from Loss
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Chaque défaite est une opportunité d'apprentissage. Analysez vos erreurs : 
                    mauvais items, trajectoires ratées, timing des cuts.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Manage Tilt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Après une série de défaites, faites une pause. Le tilt diminue vos performances. 
                    Revenez frais mentalement pour performer.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Practice Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Alternez entre Time Trials (techniques pures) et Lounge (stratégie items). 
                    30 min de TT puis 1h de Lounge = progression optimale.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Study Top Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Regardez World Friend, Kusaan, Starlow. Observez leurs décisions d'items, 
                    trajectoires, et timing de bagging. Imitez puis adaptez.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Goal Tracker Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="w-6 h-6" />
                    Objectifs de Progression
                  </span>
                  <span className="text-lg">
                    {completedGoals.length} / {goals.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercent} className="h-3 mb-6" />
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div 
                      key={goal.id} 
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => toggleGoal(goal.id)}
                    >
                      <Checkbox 
                        checked={completedGoals.includes(goal.id)}
                        onCheckedChange={() => toggleGoal(goal.id)}
                      />
                      <span className={`flex-1 ${completedGoals.includes(goal.id) ? 'line-through text-gray-500' : ''}`}>
                        {goal.text}
                      </span>
                      {completedGoals.includes(goal.id) && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {completedGoals.length === goals.length && (
              <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500 animate-pulse-subtle" />
                  <h3 className="text-2xl font-bold mb-2">🎉 Tous les objectifs complétés !</h3>
                  <p className="text-gray-300">
                    Vous êtes en route pour devenir un champion du Lounge !
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
