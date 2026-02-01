'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Target, Users, ArrowRight, Home, Award, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getCurrentRank, getNextRank } from '@/lib/mockData';

export default function DashboardPage() {
  const [playerData, setPlayerData] = useState(null);
  const [mmrHistory, setMMRHistory] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [mkRegistryLink, setMkRegistryLink] = useState(null);
  const [mkTeam, setMkTeam] = useState(null);
  const [mkLoading, setMkLoading] = useState(false);
  const [mkMessage, setMkMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState(null);

  useEffect(() => {
    // If the verification cookie is present, show the waiting UI until user is verified
    const cookieMatch = (typeof document !== 'undefined') && document.cookie.match(/(?:^|; )verification_status=([^;]+)/);

    if (cookieMatch) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookieMatch[1]));
        if (parsed && parsed.status) {
          setVerificationStatus(parsed);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Invalid verification_status cookie', e);
      }
    }

    const fetchData = async () => {
      try {
        const [playerRes, mmrRes, matchRes, teamRes] = await Promise.all([
          fetch('/api/player'),
          fetch('/api/player/mmr-history'),
          fetch('/api/player/match-history'),
          fetch('/api/player/team')
        ]);

        const player = await playerRes.json();
        const mmr = await mmrRes.json();
        const matches = await matchRes.json();
        const team = await teamRes.json();

        setPlayerData(player);
        setMMRHistory(mmr);
        setMatchHistory(matches);
        setTeamMembers(team);

        // Auto-fetch MKCentral registry/team for connected player
        try {
          if (player && player.ign) {
            setMkLoading(true);
            setMkMessage('Recherche équipe MKCentral...');
            const r = await fetch('/api/mkcentral/registry?name=' + encodeURIComponent(player.ign));
            const j = await r.json();
            if (j.success && j.registryLink) {
              setMkRegistryLink(j.registryLink);
              const tRes = await fetch('/api/mkcentral/registry?link=' + encodeURIComponent(j.registryLink));
              const t = await tRes.json();
              if (t.success && t.team) {
                setMkTeam(t.team);
                setMkMessage(null);
              } else {
                setMkTeam(null);
                setMkMessage(t.message || 'Aucun résultat');
              }
            } else {
              setMkRegistryLink(null);
              setMkTeam(null);
              setMkMessage(null);
            }
          }
        } catch (err) {
          console.warn('MKCentral auto-search error', err);
          setMkMessage(null);
        } finally {
          setMkLoading(false);
        }

      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">Chargement...</div>
      </div>
    );
  }

  // If the user has a pending verification cookie, show the waiting/explanatory page
  if (verificationStatus && verificationStatus.status && verificationStatus.status !== 'approved' && verificationStatus.status !== 'verified') {
    const { status, matchCount, lastMatchDate } = verificationStatus;

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 max-w-lg">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-xl font-bold mb-2">Vérification en cours</h2>
            {status === 'pending' ? (
              <p className="text-gray-400 mb-4">Votre demande de vérification a été reçue et attend la validation d'un administrateur. Cela peut prendre jusqu'à 48 heures. Vous serez notifié sur Discord.</p>
            ) : (
              <>
                <p className="text-gray-400 mb-4">Nous n'avons pas trouvé suffisamment d'activité récente sur le Lounge pour valider automatiquement votre compte.</p>
                <p className="text-sm text-gray-500 mb-2">Matchs récents (30j): <strong>{matchCount ?? 0}</strong></p>
                {lastMatchDate && <p className="text-sm text-gray-500">Dernier match: {new Date(lastMatchDate).toLocaleString('fr-FR')}</p>}
                <p className="text-gray-400 mt-4">Veuillez jouer au moins <strong>2 matchs</strong> sur le Lounge dans les 30 derniers jours, puis cliquez sur <strong>Se connecter</strong> pour relancer la vérification.</p>
              </>
            )}

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={async () => {
                  try {
                    // Trigger a recheck without re-OAuth
                    if (!verificationStatus || !verificationStatus.discordId) {
                      toast.error('Identifiant utilisateur introuvable');
                      return;
                    }

                    const re = await fetch('/api/verification/recheck', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ discordId: verificationStatus.discordId })
                    });

                    const data = await re.json();
                    if (data.success) {
                      setVerificationStatus(prev => ({ ...prev, status: data.status, matchCount: data.matchCount, lastMatchDate: data.lastMatchDate }));
                      toast.success('Vérification relancée');
                    } else {
                      toast.error(data.message || 'Erreur lors de la vérification');
                    }

                  } catch (err) {
                    console.error('Recheck error:', err);
                    toast.error('Erreur lors de la vérification');
                  }
                }}
                className="bg-white text-black hover:bg-white/90 px-4 py-2 rounded"
              >
                Réessayer
              </button>

              <Link href="/api/auth/discord">
                <Button variant="outline">Se Connecter / Ré-auth</Button>
              </Link>

              <Link href="https://discord.gg/revmGkE">
                <Button variant="outline">Contacter un administrateur</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 max-w-md">
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Profil Non Trouvé</h2>
            <p className="text-gray-400 mb-4">Connectez-vous avec Discord pour accéder à votre dashboard.</p>
            <Link href="/api/auth/discord">
              <Button className="bg-white text-black hover:bg-white/90">Se Connecter</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentRank = getCurrentRank(playerData.mmr);
  const nextRank = getNextRank(playerData.mmr);
  const mmrToNext = nextRank ? nextRank.mmr - playerData.mmr : 0;
  const progressPercent = nextRank 
    ? ((playerData.mmr - currentRank.mmr) / (nextRank.mmr - currentRank.mmr)) * 100 
    : 100;

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
              <span className="font-bold text-white">Dashboard</span>
            </Link>
            <Link href="/academy">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Academy</Button>
            </Link>
            <Link href="/tournaments">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Tournois</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">Leaderboard</Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{playerData.ign}</span>
            <Badge style={{ backgroundColor: currentRank.color }} className="text-black">
              {currentRank.name}
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Player Card */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 mb-8">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Joueur</div>
                <div className="text-3xl font-bold">{playerData.ign}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">MMR</div>
                <div className="text-3xl font-bold">{playerData.mmr}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Rang</div>
                <div className="flex items-center gap-2">
                  <Badge style={{ backgroundColor: currentRank.color }} className="text-black text-lg px-3 py-1">
                    {currentRank.name}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                <div className="text-3xl font-bold">{playerData.winRate}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* MMR Graph */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Progression MMR (30 jours)</span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mmrHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#000', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mmr" 
                      stroke="#fff" 
                      fill="rgba(255,255,255,0.2)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Match History */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Historique des Matchs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {matchHistory.map((match) => (
                    <div 
                      key={match.id} 
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Badge 
                          variant={match.result === 'win' ? 'default' : 'destructive'}
                          className={match.result === 'win' ? 'bg-green-600' : 'bg-red-600'}
                        >
                          {match.result === 'win' ? 'W' : 'L'}
                        </Badge>
                        <div>
                          <div className="font-semibold">{match.track}</div>
                          <div className="text-sm text-gray-400">{match.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Position</div>
                          <div className="font-bold text-lg">#{match.position}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {match.mmrChange > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span 
                            className={`font-bold ${match.mmrChange > 0 ? 'text-green-500' : 'text-red-500'}`}
                          >
                            {match.mmrChange > 0 ? '+' : ''}{match.mmrChange}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* MKCentral Team Lookup */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Equipes MKCentral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Recherchez la page Registry / équipe via le pseudo Lounge.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Pseudo Lounge (ex: RacerPro)"
                      className="w-full bg-black/20 p-2 rounded"
                      value={'' /* controlled manually via search */}
                      onChange={() => {}}
                      id="mkcentral-manual-input"
                    />
                    <button
                      id="mkcentral-search-btn"
                      className="bg-white text-black px-3 py-2 rounded"
                      onClick={async () => {
                        const el = document.getElementById('mkcentral-manual-input');
                        const name = el?.value?.trim();
                        if (!name) return;
                        setMkLoading(true);
                        setMkMessage('Recherche en cours...');
                        try {
                          const r = await fetch('/api/mkcentral/registry?name=' + encodeURIComponent(name));
                          const j = await r.json();
                          if (j.success && j.registryLink) {
                            setMkRegistryLink(j.registryLink);
                            // fetch team
                            const tRes = await fetch('/api/mkcentral/registry?link=' + encodeURIComponent(j.registryLink));
                            const t = await tRes.json();
                            if (t.success && t.team) {
                              setMkTeam(t.team);
                              setMkMessage(null);
                            } else {
                              setMkTeam(null);
                              setMkMessage(t.message || 'Aucun résultat');
                            }
                          } else {
                            setMkRegistryLink(null);
                            setMkTeam(null);
                            setMkMessage(j.message || 'Non trouvé');
                          }
                        } catch (err) {
                          setMkMessage('Erreur lors de la recherche');
                        } finally {
                          setMkLoading(false);
                        }
                      }}
                    >Rechercher</button>
                  </div>

                  {mkLoading && <div className="text-sm text-gray-400">Recherche en cours...</div>}
                  {mkMessage && <div className="text-sm text-gray-400">{mkMessage}</div>}

                  {mkRegistryLink && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-400">Registry trouvé: <a href={mkRegistryLink} target="_blank" rel="noreferrer" className="underline">{mkRegistryLink}</a></div>
                      {mkTeam ? (
                        <div className="mt-2">
                          {mkTeam.teamName && <div className="font-bold mb-2">{mkTeam.teamName}</div>}
                          {mkTeam.stats && (
                            <div className="text-sm text-gray-400 mb-2">
                              {Object.entries(mkTeam.stats).map(([k,v]) => (<div key={k}><strong>{k}:</strong> {v}</div>))}
                            </div>
                          )}
                          {mkTeam.members && mkTeam.members.length ? (
                            <ul className="list-disc pl-6 text-sm">
                              {mkTeam.members.map(m => (<li key={m}>{m}</li>))}
                            </ul>
                          ) : (
                            <div className="text-sm text-gray-400">Aucun membre trouvé</div>
                          )}
                          {mkTeam.adminContact && <div className="text-sm text-gray-400 mt-2">Contact admin: {mkTeam.adminContact}</div>}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Next Rank Calculator */}
            {nextRank && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Prochain Rang
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge style={{ backgroundColor: currentRank.color }} className="text-black">
                      {currentRank.name}
                    </Badge>
                    <ArrowRight className="w-4 h-4" />
                    <Badge style={{ backgroundColor: nextRank.color }} className="text-black">
                      {nextRank.name}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progression</span>
                      <span className="text-gray-400">{mmrToNext} MMR restants</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                  <div className="text-center pt-2">
                    <div className="text-2xl font-bold">{playerData.mmr} MMR</div>
                    <div className="text-sm text-gray-400">/ {nextRank.mmr} requis</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Stats */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Courses Totales</span>
                  <span className="font-bold text-lg">{playerData.totalRaces}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Victoires</span>
                  <span className="font-bold text-lg text-green-500">{playerData.wins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Défaites</span>
                  <span className="font-bold text-lg text-red-500">{playerData.losses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Série Actuelle</span>
                  <span className="font-bold text-lg">{playerData.currentStreak}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Position Moyenne</span>
                  <span className="font-bold text-lg">{playerData.avgPosition}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">MMR Maximum</span>
                  <span className="font-bold text-lg">{playerData.peakMMR}</span>
                </div>
              </CardContent>
            </Card>

            {/* Team Roster */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Équipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          member.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      />
                      <span className="font-medium">{member.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{member.mmr}</div>
                      <div className="text-xs text-gray-400">{member.rank}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}