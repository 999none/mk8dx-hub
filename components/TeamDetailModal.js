'use client';

import { useState, useEffect } from 'react';
import { X, Users, RefreshCw, ExternalLink, Shield, Gamepad2, Crown, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';
  return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
};

const GAME_NAMES = {
  'mk8dx': 'MK8DX',
  'mkw': 'MK Wii',
  'mkworld': 'MK World',
  'mkt': 'MK Tour',
  'mk8': 'MK8',
  'mk7': 'MK7'
};

const GAME_COLORS = {
  'mk8dx': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  'mkw': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'mkworld': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'mkt': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  'mk8': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'mk7': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
};

// Get team color from hex value (MKCentral uses color values 0-127)
const getTeamColorStyle = (colorValue) => {
  if (!colorValue && colorValue !== 0) return '#6366f1'; // Default indigo
  // MKCentral uses a limited palette, we'll map common ones
  const colorMap = {
    0: '#FF0000', 1: '#FF4400', 2: '#FF8800', 3: '#FFBB00', 4: '#FFFF00',
    5: '#BBFF00', 6: '#88FF00', 7: '#44FF00', 8: '#00FF00', 9: '#00FF44',
    10: '#00FF88', 11: '#00FFBB', 12: '#00FFFF', 13: '#00BBFF', 14: '#0088FF',
    15: '#0044FF', 16: '#0000FF', 17: '#4400FF', 18: '#8800FF', 19: '#BB00FF',
    20: '#FF00FF', 21: '#FF00BB', 22: '#FF0088', 23: '#FF0044', 24: '#FFFFFF',
    25: '#CCCCCC', 26: '#999999', 27: '#666666', 28: '#333333', 29: '#000000',
  };
  return colorMap[colorValue] || '#6366f1';
};

export default function TeamDetailModal({ teamId, onClose }) {
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    
    const fetchTeamDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/registry/team/${teamId}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          setTeamDetails(null);
        } else {
          setTeamDetails(data);
        }
      } catch (err) {
        setError('Erreur de chargement');
        setTeamDetails(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamDetails();
  }, [teamId]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  if (!teamId) return null;

  const mkcentralTeamUrl = `https://mkcentral.com/fr/registry/teams/profile?id=${teamId}`;
  const teamColor = teamDetails?.color ? getTeamColorStyle(teamDetails.color) : '#6366f1';

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
            {/* Team Logo or Icon */}
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.08] transition-transform duration-300 hover:scale-110 shadow-lg"
              style={{ backgroundColor: `${teamColor}20`, boxShadow: `0 4px 20px ${teamColor}20` }}
            >
              {teamDetails?.logo ? (
                <img 
                  src={`https://mkcentral.com${teamDetails.logo}`} 
                  alt={teamDetails.name} 
                  className="w-9 h-9 object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Shield className="w-6 h-6" style={{ color: teamColor }} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
                {loading ? 'Chargement...' : teamDetails?.name || 'Équipe'}
                {teamDetails?.tag && (
                  <span className="text-sm px-2 py-0.5 rounded-lg bg-white/[0.06] text-gray-400 font-normal">
                    [{teamDetails.tag}]
                  </span>
                )}
              </h2>
              {teamDetails && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {teamDetails.rosters?.length || 0} roster{(teamDetails.rosters?.length || 0) > 1 ? 's' : ''}
                </p>
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
              <span className="text-gray-500 text-sm">Chargement des détails...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <Shield className="w-10 h-10 mx-auto mb-3 text-gray-700 animate-pulse" />
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : teamDetails ? (
            <div className="space-y-4">
              
              {/* Team Info Card */}
              <div 
                className="p-4 rounded-xl border border-white/[0.06] transition-all duration-300 hover:border-white/[0.12]"
                style={{ background: `linear-gradient(135deg, ${teamColor}10, transparent)` }}
              >
                <div className="flex items-start gap-4">
                  {/* Large Logo */}
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center border border-white/[0.08] flex-shrink-0"
                    style={{ backgroundColor: `${teamColor}15` }}
                  >
                    {teamDetails.logo ? (
                      <img 
                        src={`https://mkcentral.com${teamDetails.logo}`} 
                        alt={teamDetails.name} 
                        className="w-14 h-14 object-contain"
                        onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-8 h-8"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>'; }}
                      />
                    ) : (
                      <Shield className="w-8 h-8" style={{ color: teamColor }} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white mb-1">{teamDetails.name}</h3>
                    {teamDetails.tag && (
                      <Badge 
                        className="mb-2 text-xs"
                        style={{ backgroundColor: `${teamColor}20`, color: teamColor, borderColor: `${teamColor}40` }}
                      >
                        Tag: {teamDetails.tag}
                      </Badge>
                    )}
                    {teamDetails.description && (
                      <p className="text-gray-400 text-sm mt-2 line-clamp-2">{teamDetails.description}</p>
                    )}
                    {teamDetails.creationDate && (
                      <p className="text-gray-600 text-xs mt-2">
                        Créée le {new Date(teamDetails.creationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rosters */}
              {teamDetails.rosters && teamDetails.rosters.length > 0 && (
                <div className="space-y-3">
                  {teamDetails.rosters.map((roster, rosterIndex) => {
                    const gameColors = GAME_COLORS[roster.game] || GAME_COLORS['mk8dx'];
                    const gameName = GAME_NAMES[roster.game] || roster.game?.toUpperCase();
                    const isActive = roster.isActive !== false;
                    
                    return (
                      <div 
                        key={rosterIndex} 
                        className={`bg-white/[0.02] border rounded-xl overflow-hidden ${isActive ? 'border-white/[0.06]' : 'border-white/[0.04] opacity-70'}`}
                      >
                        {/* Roster Header */}
                        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gamepad2 className={`w-4 h-4 ${gameColors.text}`} />
                            <span className="text-sm font-medium text-white">
                              {roster.name || teamDetails.name}
                            </span>
                            <div className="flex gap-1.5">
                              <Badge className={`text-[10px] ${gameColors.bg} ${gameColors.text} border ${gameColors.border}`}>
                                {gameName}
                              </Badge>
                              {roster.mode && (
                                <Badge variant="outline" className="text-[10px] border-white/[0.08] text-gray-400">
                                  {roster.mode}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {roster.isRecruiting && (
                              <Badge className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                                Recrutement
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {roster.players?.length || 0} joueur{(roster.players?.length || 0) > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {/* Roster Players */}
                        {roster.players && roster.players.length > 0 ? (
                          <div className="divide-y divide-white/[0.03]">
                            {roster.players.map((player, playerIndex) => (
                              <div 
                                key={playerIndex}
                                className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Player Avatar or Icon */}
                                  <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {player.discord?.avatar ? (
                                      <img 
                                        src={`https://cdn.discordapp.com/avatars/${player.discord.discord_id}/${player.discord.avatar}.png?size=32`}
                                        alt={player.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                      />
                                    ) : null}
                                    <UserCircle className="w-5 h-5 text-gray-500" style={player.discord?.avatar ? { display: 'none' } : {}} />
                                  </div>
                                  
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {player.countryCode && (
                                        <span className="text-sm flex-shrink-0">{getCountryFlag(player.countryCode)}</span>
                                      )}
                                      {/* Use loungeName if available, otherwise show MKCentral name without link */}
                                      {player.loungeName ? (
                                        <Link 
                                          href={`/player/${encodeURIComponent(player.loungeName)}`}
                                          className="text-sm text-gray-300 hover:text-white hover:underline truncate transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {player.loungeName}
                                          {player.loungeName !== player.name && (
                                            <span className="text-gray-600 text-xs ml-1">({player.name})</span>
                                          )}
                                        </Link>
                                      ) : (
                                        <span className="text-sm text-gray-500 truncate" title="Pas de compte Lounge">
                                          {player.name}
                                        </span>
                                      )}
                                      {player.isLeader && (
                                        <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" title="Leader" />
                                      )}
                                      {player.isManager && (
                                        <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" title="Manager" />
                                      )}
                                    </div>
                                    {player.discord?.username && (
                                      <p className="text-[10px] text-gray-600 truncate">
                                        @{player.discord.username}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {/* Lounge MMR if available */}
                                  {player.loungeMmr && (
                                    <span className="text-xs text-gray-400 font-medium">
                                      {player.loungeMmr.toLocaleString('fr-FR')} MMR
                                    </span>
                                  )}
                                  
                                  {/* Primary Friend Code */}
                                  {player.friendCodes?.find(fc => fc.isPrimary)?.code && (
                                    <span className="text-[10px] text-gray-500 font-mono bg-white/[0.03] px-2 py-1 rounded">
                                      {player.friendCodes.find(fc => fc.isPrimary).code}
                                    </span>
                                  )}
                                  
                                  {/* Join Date */}
                                  {player.joinDate && (
                                    <span className="text-[10px] text-gray-600">
                                      {new Date(player.joinDate * 1000).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <Users className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                            <p className="text-gray-600 text-xs">Aucun joueur dans ce roster</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Managers Section */}
              {teamDetails.managers && teamDetails.managers.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/[0.04]">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Crown className="w-3 h-3" />
                      Managers
                    </span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {teamDetails.managers.map((manager, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-lg">
                        <span className="text-sm text-gray-300">{manager.name || manager}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Link */}
              <a 
                href={mkcentralTeamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] rounded-lg transition-colors text-gray-400 hover:text-white text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Voir sur MKCentral
              </a>
            </div>
          ) : (
            <div className="text-center py-16">
              <Shield className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">Équipe non trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
