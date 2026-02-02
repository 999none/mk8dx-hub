'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Zap, Car, Brain, Target, CheckCircle2, Trophy } from 'lucide-react';
import RequireAuth from '@/components/RequireAuth';
import Navbar from '@/components/Navbar';

export default function AcademyPage() {
  const [completedGoals, setCompletedGoals] = useState([]);

  const techniques = [
    { id: 1, title: 'Soft Drift', difficulty: 'Intermédiaire', description: 'Tenir le joystick à 30° avec micro-corrections pour turbo accéléré', color: 'yellow' },
    { id: 2, title: 'Motion Glider', difficulty: 'Avancé', description: 'Champignons + motion control diagonal en planeur', color: 'red' },
    { id: 3, title: 'Item Management', difficulty: 'Débutant', description: 'Maîtriser Bagging vs Running selon la position', color: 'green' },
    { id: 4, title: 'Counter Hop', difficulty: 'Intermédiaire', description: 'Sauter opposé au virage pour élargir la trajectoire', color: 'yellow' },
    { id: 5, title: 'Kusaan Slide', difficulty: 'Avancé', description: 'Mini-dérapages entre tricks pour maintenir le momentum', color: 'red' },
    { id: 6, title: 'Fast Glider', difficulty: 'Avancé', description: 'Déraper avant planeur + diagonal pour vitesse accrue', color: 'red' },
  ];

  const metaCombos = [
    { tier: 'S', character: 'Yoshi / Birdo', vehicle: 'Quad Nounours', tires: 'Roller Azur', glider: 'Aile Nuage', stats: { speed: 85, accel: 90, turbo: 95, handling: 80 } },
    { tier: 'S', character: 'Peach / Daisy', vehicle: 'Para-coccinelly', tires: 'Roller Azur', glider: 'Paper Glider', stats: { speed: 88, accel: 92, turbo: 93, handling: 78 } },
    { tier: 'A', character: 'Diddy Kong', vehicle: 'Scootinette', tires: 'Roller', glider: 'Aile Nuage', stats: { speed: 80, accel: 88, turbo: 90, handling: 85 } },
  ];

  const goals = [
    { id: 1, text: 'Maîtriser Soft Drift à 30°' },
    { id: 2, text: 'Motion Glider sur Big Blue' },
    { id: 3, text: 'Pratiquer bagging sur toutes maps' },
    { id: 4, text: 'Counter Hop virages serrés' },
    { id: 5, text: 'Atteindre 10000 MMR' },
    { id: 6, text: 'Regarder 5 replays top joueurs' },
  ];

  const toggleGoal = (id) => setCompletedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  const progressPercent = (completedGoals.length / goals.length) * 100;

  const getDifficultyColor = (d) => {
    if (d === 'Débutant') return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' };
    if (d === 'Intermédiaire') return { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' };
    return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' };
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <div className="container mx-auto px-4 py-8 pt-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Academy</h1>
            <p className="text-gray-500 text-sm">Techniques avancées & mindset compétitif</p>
          </div>

          <Tabs defaultValue="techniques" className="space-y-6">
            <TabsList className="bg-white/[0.02] border border-white/[0.04] p-1">
              <TabsTrigger value="techniques" className="data-[state=active]:bg-white data-[state=active]:text-black">Techniques</TabsTrigger>
              <TabsTrigger value="combos" className="data-[state=active]:bg-white data-[state=active]:text-black">Meta</TabsTrigger>
              <TabsTrigger value="mindset" className="data-[state=active]:bg-white data-[state=active]:text-black">Mindset</TabsTrigger>
              <TabsTrigger value="goals" className="data-[state=active]:bg-white data-[state=active]:text-black">Objectifs</TabsTrigger>
            </TabsList>

            {/* Techniques */}
            <TabsContent value="techniques" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {techniques.map((tech) => {
                  const dc = getDifficultyColor(tech.difficulty);
                  return (
                    <Card key={tech.id} className="bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Badge className={`${dc.bg} ${dc.text} border ${dc.border} text-[10px] mb-2`}>{tech.difficulty}</Badge>
                            <h3 className="font-semibold">{tech.title}</h3>
                          </div>
                          <Zap className="w-5 h-5 text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-500">{tech.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-white/[0.02] border-white/[0.04]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Guide Complet</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {[
                      { title: 'Bagging vs Running', content: 'RUN: Rester devant, pices accessibles. DRAFT: Aspiration pour remonter. BAG: Reculer pour Étoile/Bill/Champignon Doré.' },
                      { title: 'Soft Drifting', content: 'Maintenir joystick à 30° avec micro-corrections opposées pour SMT/UMT plus rapides.' },
                      { title: 'Motion Gliding', content: 'Fast Glider + champignon + motion control diagonal maximal. Essentiel sur Big Blue.' },
                      { title: 'Track Shortcuts', content: 'NISC: Sans objets. CUT: Avec champignons. Toujours 10 pièces avant d\'entrer.' },
                    ].map((item, i) => (
                      <AccordionItem key={i} value={`item-${i}`} className="border-white/[0.04]">
                        <AccordionTrigger className="text-sm text-gray-300 hover:text-white">{item.title}</AccordionTrigger>
                        <AccordionContent className="text-sm text-gray-500">{item.content}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Meta Combos */}
            <TabsContent value="combos" className="space-y-4">
              {metaCombos.map((combo, i) => (
                <Card key={i} className="bg-white/[0.02] border-white/[0.04]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Badge className={`${combo.tier === 'S' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'} border text-xs mb-2`}>
                          Tier {combo.tier}
                        </Badge>
                        <h3 className="font-semibold">{combo.character}</h3>
                      </div>
                      <Car className="w-6 h-6 text-gray-600" />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Véhicule:</span> <span className="text-gray-300">{combo.vehicle}</span></p>
                        <p><span className="text-gray-500">Roues:</span> <span className="text-gray-300">{combo.tires}</span></p>
                        <p><span className="text-gray-500">Planeur:</span> <span className="text-gray-300">{combo.glider}</span></p>
                      </div>
                      
                      <div className="space-y-2">
                        {[
                          { label: 'Vitesse', value: combo.stats.speed, color: 'bg-blue-500' },
                          { label: 'Accélération', value: combo.stats.accel, color: 'bg-green-500' },
                          { label: 'Mini-Turbo', value: combo.stats.turbo, color: 'bg-yellow-500' },
                          { label: 'Maniabilité', value: combo.stats.handling, color: 'bg-purple-500' },
                        ].map((stat, j) => (
                          <div key={j}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">{stat.label}</span>
                              <span className="text-gray-400">{stat.value}</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                              <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${stat.value}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-5">
                  <h3 className="text-red-500 font-semibold mb-3">⚠️ Builds Déconseillés</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Wiggler (trop lent)</li>
                    <li>• Mario Tanuki (stats déséquilibrés)</li>
                    <li>• Inkling Boy (préférer Inkling Girl)</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mindset */}
            <TabsContent value="mindset">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: 'Process vs Results', desc: 'Focalisez-vous sur trajectoires, items, décisions. Les résultats suivront.' },
                  { title: 'Learn from Loss', desc: 'Chaque défaite = apprentissage. Analysez vos erreurs.' },
                  { title: 'Manage Tilt', desc: 'Après plusieurs défaites, faites une pause. Revenez frais.' },
                  { title: 'Practice Schedule', desc: '30 min Time Trials + 1h Lounge = progression optimale.' },
                  { title: 'Study Top Players', desc: 'Observez World Friend, Kusaan, Starlow. Imitez puis adaptez.' },
                ].map((item, i) => (
                  <Card key={i} className="bg-white/[0.02] border-white/[0.04]">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Goals */}
            <TabsContent value="goals">
              <Card className="bg-white/[0.02] border-white/[0.04]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Objectifs de Progression
                    </CardTitle>
                    <span className="text-sm text-gray-500">{completedGoals.length}/{goals.length}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                  
                  <div className="space-y-2">
                    {goals.map((goal) => (
                      <div 
                        key={goal.id}
                        onClick={() => toggleGoal(goal.id)}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer"
                      >
                        <Checkbox checked={completedGoals.includes(goal.id)} className="border-white/20" />
                        <span className={`flex-1 text-sm ${completedGoals.includes(goal.id) ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                          {goal.text}
                        </span>
                        {completedGoals.includes(goal.id) && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {completedGoals.length === goals.length && (
                <Card className="bg-yellow-500/5 border-yellow-500/20 mt-4">
                  <CardContent className="p-8 text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-xl font-bold mb-2">🎉 Tous les objectifs complétés !</h3>
                    <p className="text-gray-500">Vous êtes en route pour devenir champion du Lounge !</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RequireAuth>
  );
}