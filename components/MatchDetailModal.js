'use client';

import { useState, useEffect } from 'react';
import { 
  X, Calendar, Users, Trophy, RefreshCw, 
  ExternalLink, Swords
} from 'lucide-react';

// Helper function to get country flag emoji
const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  return countryCode.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(127397 + char.charCodeAt())
  );
};

// Helper function to get match format
const getMatchFormat = (numTeams, numPlayers) => {
  if (!numTeams || !numPlayers) return '-';
  if (numTeams === numPlayers) return 'FFA';
  const playersPerTeam = Math.floor(numPlayers / numTeams);
  return `${playersPerTeam}v${playersPerTeam}`;
};

export default function MatchDetailModal({ matchId, onClose }) {
  const [matchDetails, setMatchDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    
    const fetchMatchDetails = async () => {
      setLoading(true);
      setImageError(false);
      try {
        const res = await fetch(`/api/lounge/match/${matchId}`);
        const data = await res.json();
        if (data && !data.error) {
          setMatchDetails(data);
        } else {
          setMatchDetails(null);
        }
      } catch (err) {
        console.error('Error loading match details:', err);
        setMatchDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId]);

  if (!matchId) return null;

  const tableImageUrl = `https://lounge.mkcentral.com/TableImage/${matchId}.png`;
  const loungeMatchUrl = `https://lounge.mkcentral.com/mk8dx/TableDetails/${matchId}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[95vh] overflow-y-auto bg-[#1a1a2e] border border-[#252540] rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#16162a] border-b border-[#252540]">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-gray-400" />
            <div>
              <h2 className="text-base font-semibold text-gray-100">Match #{matchId}</h2>
              {matchDetails && (
                <p className="text-xs text-gray-500">
                  Tier {matchDetails.tier} • {getMatchFormat(matchDetails.numTeams, matchDetails.numPlayers)}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#252548] rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-600 mb-3" />
              <span className="text-gray-500 text-sm">Chargement...</span>
            </div>
          ) : matchDetails ? (
            <div className="space-y-4">
              
              {/* === INFOS === */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#12122a] border border-[#252540] rounded-lg p-3 text-center">
                  <Calendar className="w-4 h-4 mx-auto mb-1.5 text-gray-500" />
                  <p className="text-xs text-gray-400">
                    {new Date(matchDetails.createdOn || matchDetails.verifiedOn).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-[#12122a] border border-[#252540] rounded-lg p-3 text-center">
                  <Trophy className="w-4 h-4 mx-auto mb-1.5 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-200">Tier {matchDetails.tier}</p>
                </div>
                <div className="bg-[#12122a] border border-[#252540] rounded-lg p-3 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1.5 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-200">{matchDetails.numPlayers}</p>
                </div>
                <div className="bg-[#12122a] border border-[#252540] rounded-lg p-3 text-center">
                  <Swords className="w-4 h-4 mx-auto mb-1.5 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-200">
                    {getMatchFormat(matchDetails.numTeams, matchDetails.numPlayers)}
                  </p>
                </div>
              </div>

              {/* === IMAGE === */}
              <div className="bg-[#12122a] border border-[#252540] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#252540]">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Résultat</span>
                </div>
                <div className="p-2">
                  {!imageError ? (
                    <img 
                      src={tableImageUrl}
                      alt={`Table ${matchId}`}
                      className="w-full rounded-lg"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-600 text-sm">
                      Image non disponible
                    </div>
                  )}
                </div>
              </div>

              {/* === TABLEAU DES JOUEURS - Style MKCentral === */}
              <div className="bg-[#12122a] border border-[#252540] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#252540]">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Classement</span>
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#0e0e1a] text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Joueur</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">Change</div>
                  <div className="col-span-2 text-right">New MMR</div>
                </div>

                {/* Players Rows */}
                <div className="divide-y divide-[#252540]/50">
                  {matchDetails.teams?.sort((a, b) => a.rank - b.rank).flatMap((team, teamIndex) => 
                    team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => {
                      // Global rank calculation
                      let globalRank = 0;
                      for (let i = 0; i < teamIndex; i++) {
                        globalRank += matchDetails.teams[i].scores?.length || 0;
                      }
                      globalRank += playerIndex + 1;
                      
                      // Determine if player is on podium (top 3 positions)
                      const isPodium = team.rank <= 3;
                      const isFirstInTeam = playerIndex === 0;
                      
                      // Row styling
                      const rowIndex = globalRank - 1;
                      const baseBg = rowIndex % 2 === 0 ? 'bg-[#1e1e38]' : 'bg-[#1a1a2e]';
                      
                      // Podium colors for first player of each team
                      let podiumBg = '';
                      let rankBadgeClass = 'bg-[#252548] text-gray-400';
                      
                      if (isPodium && isFirstInTeam) {
                        if (team.rank === 1) {
                          podiumBg = 'bg-yellow-500/10';
                          rankBadgeClass = 'bg-yellow-500 text-black';
                        } else if (team.rank === 2) {
                          podiumBg = 'bg-gray-400/10';
                          rankBadgeClass = 'bg-gray-400 text-black';
                        } else if (team.rank === 3) {
                          podiumBg = 'bg-orange-600/10';
                          rankBadgeClass = 'bg-orange-600 text-white';
                        }
                      }

                      const isWin = player.delta > 0;
                      const isLoss = player.delta < 0;
                      
                      return (
                        <div 
                          key={`${teamIndex}-${playerIndex}`}
                          className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors hover:bg-[#252548] ${isPodium && isFirstInTeam ? podiumBg : baseBg} ${
                            isWin ? 'border-l-2 border-l-green-500/50' : isLoss ? 'border-l-2 border-l-red-500/50' : ''
                          }`}
                        >
                          {/* Rank */}
                          <div className="col-span-1">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${rankBadgeClass}`}>
                              {team.rank}
                            </span>
                          </div>
                          
                          {/* Player */}
                          <div className="col-span-5 flex items-center gap-2 min-w-0">
                            {player.playerCountryCode && (
                              <span className="text-sm flex-shrink-0">
                                {getCountryFlag(player.playerCountryCode)}
                              </span>
                            )}
                            <span className={`text-sm truncate ${isPodium && isFirstInTeam ? 'text-gray-100 font-medium' : 'text-gray-300'}`}>
                              {player.playerName}
                            </span>
                          </div>
                          
                          {/* Score */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm font-semibold text-gray-200">{player.score}</span>
                          </div>
                          
                          {/* Change */}
                          <div className="col-span-2 text-center">
                            <span className={`text-sm font-bold ${
                              isWin ? 'text-green-400' : 
                              isLoss ? 'text-red-400' : 
                              'text-gray-500'
                            }`}>
                              {player.delta > 0 ? '+' : ''}{player.delta}
                            </span>
                          </div>
                          
                          {/* New MMR */}
                          <div className="col-span-2 text-right">
                            <span className="text-sm font-semibold text-gray-200">
                              {player.newMmr ? player.newMmr.toLocaleString('fr-FR') : '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* === LIEN EXTERNE === */}
              <div className="pt-2">
                <a 
                  href={loungeMatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 bg-[#12122a] border border-[#252540] hover:border-[#353560] rounded-lg transition-colors text-gray-400 hover:text-gray-200 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir sur MK8DX Lounge
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Swords className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">Impossible de charger les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
