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
        className="relative w-full max-w-3xl max-h-[95vh] overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-neutral-400" />
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Match #{matchId}</h2>
              {matchDetails && (
                <p className="text-xs text-neutral-500">
                  Tier {matchDetails.tier} • {getMatchFormat(matchDetails.numTeams, matchDetails.numPlayers)}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-neutral-600 mb-3" />
              <span className="text-neutral-500 text-sm">Chargement...</span>
            </div>
          ) : matchDetails ? (
            <div className="space-y-4">
              
              {/* === INFOS === */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <Calendar className="w-4 h-4 mx-auto mb-1.5 text-neutral-500" />
                  <p className="text-xs text-neutral-400">
                    {new Date(matchDetails.createdOn || matchDetails.verifiedOn).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <Trophy className="w-4 h-4 mx-auto mb-1.5 text-neutral-500" />
                  <p className="text-sm font-semibold text-neutral-200">Tier {matchDetails.tier}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1.5 text-neutral-500" />
                  <p className="text-sm font-semibold text-neutral-200">{matchDetails.numPlayers}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <Swords className="w-4 h-4 mx-auto mb-1.5 text-neutral-500" />
                  <p className="text-sm font-semibold text-neutral-200">
                    {getMatchFormat(matchDetails.numTeams, matchDetails.numPlayers)}
                  </p>
                </div>
              </div>

              {/* === IMAGE === */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-neutral-800">
                  <span className="text-xs font-medium text-neutral-400">Résultat</span>
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
                    <div className="text-center py-8 text-neutral-600 text-sm">
                      Image non disponible
                    </div>
                  )}
                </div>
              </div>

              {/* === TABLEAU DES ÉQUIPES === */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-neutral-800">
                  <span className="text-xs font-medium text-neutral-400">Classement</span>
                </div>
                <div className="divide-y divide-neutral-800/50">
                  {matchDetails.teams?.sort((a, b) => a.rank - b.rank).map((team, teamIndex) => {
                    // Couleurs podium uniquement
                    const isPodium = team.rank <= 3;
                    const podiumColors = {
                      1: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', badge: 'bg-yellow-500 text-black' },
                      2: { bg: 'bg-neutral-400/10', border: 'border-neutral-400/30', badge: 'bg-neutral-400 text-black' },
                      3: { bg: 'bg-orange-700/10', border: 'border-orange-700/30', badge: 'bg-orange-700 text-white' },
                    };
                    const colors = podiumColors[team.rank] || { bg: '', border: 'border-neutral-800', badge: 'bg-neutral-700 text-neutral-300' };

                    return (
                      <div key={teamIndex} className={`p-3 ${isPodium ? colors.bg : ''}`}>
                        {/* Team Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${colors.badge}`}>
                              {team.rank}
                            </div>
                            <span className="text-xs text-neutral-500">
                              {team.playerCount} joueur{team.playerCount > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-neutral-100">{team.totalScore}</span>
                            <span className="text-xs text-neutral-600 ml-1">pts</span>
                          </div>
                        </div>

                        {/* Team Players */}
                        <div className="space-y-1">
                          {team.scores?.sort((a, b) => b.score - a.score).map((player, playerIndex) => (
                            <div 
                              key={playerIndex}
                              className="flex items-center justify-between py-1.5 px-2 bg-black/30 rounded text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {player.playerCountryCode && (
                                  <span className="text-sm flex-shrink-0">
                                    {getCountryFlag(player.playerCountryCode)}
                                  </span>
                                )}
                                <span className="text-neutral-300 truncate">{player.playerName}</span>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <span className="font-semibold text-neutral-200 w-8 text-right">{player.score}</span>
                                <div className="text-right w-16">
                                  <span className={`text-xs font-medium ${
                                    player.delta > 0 ? 'text-green-400' : 
                                    player.delta < 0 ? 'text-red-400' : 
                                    'text-neutral-500'
                                  }`}>
                                    {player.delta > 0 ? '+' : ''}{player.delta}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* === LIEN EXTERNE === */}
              <div className="pt-2">
                <a 
                  href={loungeMatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir sur MK8DX Lounge
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Swords className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
              <p className="text-neutral-500 text-sm">Impossible de charger les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
