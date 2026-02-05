'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Users, Trophy, RefreshCw, ExternalLink, Swords, Shield } from 'lucide-react';
import Link from 'next/link';

const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
};

const getMatchFormat = (numTeams, numPlayers) => {
  if (!numTeams || !numPlayers) return '-';
  if (numTeams === numPlayers) return 'FFA';
  const playersPerTeam = Math.floor(numPlayers / numTeams);
  return `${playersPerTeam}v${playersPerTeam}`;
};

// Get format info with details
const getFormatInfo = (numTeams, numPlayers) => {
  if (!numTeams || !numPlayers) return { format: '-', isTeamFormat: false, playersPerTeam: 1 };
  if (numTeams === numPlayers) return { format: 'FFA', isTeamFormat: false, playersPerTeam: 1 };
  const playersPerTeam = Math.floor(numPlayers / numTeams);
  return { 
    format: `${playersPerTeam}v${playersPerTeam}`, 
    isTeamFormat: playersPerTeam >= 2, 
    playersPerTeam,
    numTeams 
  };
};

// Team colors for different ranks
const TEAM_COLORS = [
  { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-500/30', light: 'bg-yellow-500/10' }, // 1st
  { bg: 'bg-gray-400', text: 'text-black', border: 'border-gray-400/30', light: 'bg-gray-400/10' },      // 2nd
  { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-600/30', light: 'bg-orange-600/10' }, // 3rd
  { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-600/30', light: 'bg-blue-600/10' },      // 4th
  { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600/30', light: 'bg-purple-600/10' }, // 5th
  { bg: 'bg-pink-600', text: 'text-white', border: 'border-pink-600/30', light: 'bg-pink-600/10' },      // 6th
];

export default function MatchDetailModal({ matchId, onClose }) {
  const [matchDetails, setMatchDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    
    const fetchMatchDetails = async () => {
      setLoading(true);
      setImageError(false);
      try {
        const res = await fetch(`/api/lounge/match/${matchId}`);
        const data = await res.json();
        setMatchDetails(data && !data.error ? data : null);
      } catch (err) {
        setMatchDetails(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMatchDetails();
  }, [matchId]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  if (!matchId) return null;

  const tableImageUrl = `https://lounge.mkcentral.com/TableImage/${matchId}.png`;
  const loungeMatchUrl = `https://lounge.mkcentral.com/mk8dx/TableDetails/${matchId}`;
  
  // Get format info
  const formatInfo = matchDetails ? getFormatInfo(matchDetails.numTeams, matchDetails.numPlayers) : null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 transition-all duration-300 ${isClosing ? 'opacity-0' : 'modal-backdrop'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
      onClick={handleClose}
    >
      <div 
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'modal-content'}`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-black/95 backdrop-blur-sm border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-xl flex items-center justify-center border border-white/[0.08] shadow-lg shadow-blue-500/10">
              <Swords className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Match #{matchId}</h2>
              {matchDetails && (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500">Tier {matchDetails.tier}</p>
                  {formatInfo && (
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium transition-all duration-300 ${formatInfo.isTeamFormat ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                      {formatInfo.format}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="p-2.5 hover:bg-white/[0.06] rounded-xl transition-all duration-300 text-gray-500 hover:text-white hover:rotate-90 hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="spinner-trail mb-4" />
              <span className="text-gray-500 text-sm">Chargement...</span>
            </div>
          ) : matchDetails ? (
            <div className="space-y-4">
              
              {/* Info Cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Calendar, label: new Date(matchDetails.createdOn || matchDetails.verifiedOn).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), color: 'text-gray-400', bgColor: 'bg-white/[0.03]', borderColor: 'border-white/[0.06]' },
                  { icon: Trophy, label: `Tier ${matchDetails.tier}`, color: 'text-yellow-500', bgColor: 'bg-yellow-500/[0.08]', borderColor: 'border-yellow-500/20' },
                  { icon: Users, label: `${matchDetails.numPlayers}`, color: 'text-blue-500', bgColor: 'bg-blue-500/[0.08]', borderColor: 'border-blue-500/20' },
                  { icon: Swords, label: getMatchFormat(matchDetails.numTeams, matchDetails.numPlayers), color: 'text-purple-500', bgColor: 'bg-purple-500/[0.08]', borderColor: 'border-purple-500/20' },
                ].map((item, i) => (
                  <div key={i} className={`${item.bgColor} border ${item.borderColor} rounded-xl p-4 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg group cursor-default`} style={{ animationDelay: `${i * 50}ms` }}>
                    <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color} group-hover:scale-110 transition-transform duration-300`} />
                    <p className={`text-sm font-semibold ${item.color}`}>{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Image */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-300">Résultat</span>
                </div>
                <div className="p-3">
                  {!imageError ? (
                    <img src={tableImageUrl} alt={`Table ${matchId}`} className="w-full rounded-lg transition-all duration-300 hover:scale-[1.01]" onError={() => setImageError(true)} />
                  ) : (
                    <div className="text-center py-8 text-gray-600 text-sm">Image non disponible</div>
                  )}
                </div>
              </div>

              {/* Players Table - Team Format */}
              {formatInfo?.isTeamFormat ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-300">Classement par équipes</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-white/[0.03] px-2 py-1 rounded-lg">{formatInfo.numTeams} équipes • {formatInfo.format}</span>
                  </div>
                  
                  {/* Calculate individual rankings based on score */}
                  {(() => {
                    // Get all players with their scores and calculate individual rank
                    const allPlayersWithScores = matchDetails.teams?.flatMap(team => 
                      (team.scores || []).map(player => ({
                        ...player,
                        teamRank: team.rank
                      }))
                    ) || [];
                    
                    // Sort by score descending to get individual rankings
                    const sortedByScore = [...allPlayersWithScores].sort((a, b) => b.score - a.score);
                    
                    // Create a map of playerName -> individualRank
                    const playerRankMap = {};
                    sortedByScore.forEach((player, index) => {
                      playerRankMap[player.playerName] = index + 1;
                    });
                    
                    return (
                      <div className="divide-y divide-white/[0.04]">
                        {matchDetails.teams?.sort((a, b) => a.rank - b.rank).map((team, teamIndex) => {
                          const teamColor = TEAM_COLORS[Math.min(teamIndex, TEAM_COLORS.length - 1)];
                          const teamTotal = team.scores?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
                          const teamAvgDelta = team.scores?.length > 0 
                            ? Math.round(team.scores.reduce((sum, p) => sum + (p.delta || 0), 0) / team.scores.length)
                            : 0;
                          
                          return (
                            <div key={teamIndex} className={`${teamColor.light}`}>
                              {/* Team Header */}
                              <div className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.04]`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 ${teamColor.bg} ${teamColor.text} rounded-lg flex items-center justify-center font-bold text-sm`}>
                                    {team.rank}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-white">Équipe {team.rank}</p>
                                    <p className="text-[10px] text-gray-500">{team.scores?.length || 0} joueur{(team.scores?.length || 0) > 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-white">{teamTotal} pts</p>
                                  <p className={`text-xs font-medium ${teamAvgDelta > 0 ? 'text-green-500' : teamAvgDelta < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    Δ moy: {teamAvgDelta > 0 ? '+' : ''}{teamAvgDelta}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Team Players */}
                              <div className="divide-y divide-white/[0.02]">
                                {team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => {
                                  const isWin = player.delta > 0;
                                  const isLoss = player.delta < 0;
                                  const individualRank = playerRankMap[player.playerName] || '-';
                                  
                                  // Style for podium positions
                                  let rankStyle = 'bg-white/[0.04] text-gray-400';
                                  if (individualRank === 1) rankStyle = 'bg-yellow-500 text-black';
                                  else if (individualRank === 2) rankStyle = 'bg-gray-400 text-black';
                                  else if (individualRank === 3) rankStyle = 'bg-orange-600 text-white';
                                  
                                  return (
                                    <div key={playerIndex} className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-white/[0.02]">
                                      <div className="col-span-1">
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${rankStyle}`}>
                                          {individualRank}
                                        </span>
                                      </div>
                                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                                        {player.playerCountryCode && <span className="text-sm flex-shrink-0">{getCountryFlag(player.playerCountryCode)}</span>}
                                        <Link 
                                          href={`/player/${encodeURIComponent(player.playerName)}`}
                                          className="text-sm text-gray-300 truncate hover:text-white hover:underline transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {player.playerName}
                                        </Link>
                                      </div>
                                      <div className="col-span-2 text-center">
                                        <span className="text-sm font-semibold text-white">{player.score}</span>
                                      </div>
                                      <div className="col-span-2 text-center">
                                        <span className={`text-sm font-bold ${isWin ? 'text-green-500' : isLoss ? 'text-red-500' : 'text-gray-500'}`}>
                                          {player.delta > 0 ? '+' : ''}{player.delta}
                                        </span>
                                      </div>
                                      <div className="col-span-2 text-right">
                                        <span className="text-sm text-gray-400">{player.newMmr ? player.newMmr.toLocaleString('fr-FR') : '-'}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* FFA Format - Classic Table */
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-300">Classement</span>
                  </div>
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-white/[0.02] text-gray-500 text-[10px] uppercase tracking-wider font-medium border-b border-white/[0.04]">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Joueur</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">Change</div>
                  <div className="col-span-2 text-right">MMR</div>
                </div>

                {/* Players */}
                <div className="divide-y divide-white/[0.03]">
                  {matchDetails.teams?.sort((a, b) => a.rank - b.rank).flatMap((team, teamIndex) => 
                    team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => {
                      const isPodium = team.rank <= 3;
                      const isFirstInTeam = playerIndex === 0;
                      const isWin = player.delta > 0;
                      const isLoss = player.delta < 0;
                      
                      let rankStyle = 'bg-white/[0.04] text-gray-500';
                      let rowBg = '';
                      
                      if (isPodium && isFirstInTeam) {
                        if (team.rank === 1) { rankStyle = 'bg-yellow-500 text-black'; rowBg = 'bg-yellow-500/[0.03]'; }
                        else if (team.rank === 2) { rankStyle = 'bg-gray-400 text-black'; rowBg = 'bg-gray-400/[0.03]'; }
                        else if (team.rank === 3) { rankStyle = 'bg-orange-600 text-white'; rowBg = 'bg-orange-600/[0.03]'; }
                      }
                      
                      return (
                        <div 
                          key={`${teamIndex}-${playerIndex}`}
                          className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-white/[0.02] transition-colors ${rowBg}`}
                        >
                          {/* Rank */}
                          <div className="col-span-1">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${rankStyle}`}>
                              {team.rank}
                            </span>
                          </div>
                          
                          {/* Player */}
                          <div className="col-span-5 flex items-center gap-2 min-w-0">
                            {player.playerCountryCode && <span className="text-sm flex-shrink-0">{getCountryFlag(player.playerCountryCode)}</span>}
                            <Link 
                              href={`/player/${encodeURIComponent(player.playerName)}`}
                              className={`text-sm truncate hover:text-white hover:underline transition-colors ${isPodium && isFirstInTeam ? 'text-white font-medium' : 'text-gray-400'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {player.playerName}
                            </Link>
                          </div>
                          
                          {/* Score */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm font-semibold text-white">{player.score}</span>
                          </div>
                          
                          {/* Change */}
                          <div className="col-span-2 text-center">
                            <span className={`text-sm font-bold ${isWin ? 'text-green-500' : isLoss ? 'text-red-500' : 'text-gray-500'}`}>
                              {player.delta > 0 ? '+' : ''}{player.delta}
                            </span>
                          </div>
                          
                          {/* MMR */}
                          <div className="col-span-2 text-right">
                            <span className="text-sm text-gray-400">{player.newMmr ? player.newMmr.toLocaleString('fr-FR') : '-'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              )}

              {/* External Link */}
              <a 
                href={loungeMatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all duration-300 text-gray-300 hover:text-white text-sm font-medium hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10"
              >
                <ExternalLink className="w-4 h-4" />
                Voir sur MK8DX Lounge
              </a>
            </div>
          ) : (
            <div className="text-center py-16">
              <Swords className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">Impossible de charger</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}