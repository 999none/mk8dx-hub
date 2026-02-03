import axios from 'axios';

/**
 * MKCentral Registry API
 * 
 * Utilise l'API JSON de MKCentral pour récupérer les données du profil Registry
 * API Endpoint: https://mkcentral.com/api/registry/players/{registryId}
 */
export class MkCentralRegistryApi {
  constructor() {
    this.baseUrl = 'https://mkcentral.com';
    this.apiUrl = 'https://mkcentral.com/api/registry/players';
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MK8DX-Hub/1.0'
      }
    });
  }

  /**
   * Récupère le profil Registry complet d'un joueur via l'API JSON
   * @param {number} registryId - L'ID du joueur dans le Registry MKCentral
   */
  async getPlayerProfile(registryId) {
    try {
      const url = `${this.apiUrl}/${registryId}`;
      const { data } = await this.client.get(url);
      
      if (!data || !data.id) {
        throw new Error('Player not found');
      }
      
      // Transformer les rosters en équipes avec le format attendu par le frontend
      const teams = (data.rosters || []).map(roster => ({
        id: roster.team_id,
        name: roster.team_name || roster.roster_name,
        tag: roster.team_tag || roster.roster_tag,
        game: roster.game,
        gameHuman: this.formatGameName(roster.game),
        mode: roster.mode,
        url: `/fr/registry/teams/profile?id=${roster.team_id}`,
        rosterId: roster.roster_id,
        joinDate: roster.join_date ? new Date(roster.join_date * 1000).toISOString() : null,
        isCurrent: true
      }));

      // Friend codes
      const friendCodes = (data.friend_codes || [])
        .filter(fc => fc.is_active)
        .map(fc => ({
          code: fc.fc,
          type: fc.type,
          isPrimary: fc.is_primary
        }));

      const primaryFC = friendCodes.find(fc => fc.isPrimary)?.code || 
                       (friendCodes.length > 0 ? friendCodes[0].code : null);
      
      return {
        registryId: data.id,
        name: data.name,
        countryCode: data.country_code,
        friendCode: primaryFC,
        friendCodes: friendCodes,
        teams: teams,
        teamHistory: [], // L'API ne fournit pas l'historique des équipes
        tournamentHistory: [], // L'API ne fournit pas l'historique des tournois
        registeredDate: data.join_date ? new Date(data.join_date * 1000).toISOString() : null,
        profileUrl: `${this.baseUrl}/fr/registry/players/profile?id=${registryId}`,
        discord: data.discord ? {
          id: data.discord.discord_id,
          username: data.discord.username,
          globalName: data.discord.global_name,
          avatar: data.discord.avatar
        } : null,
        isBanned: data.is_banned || false,
        isHidden: data.is_hidden || false
      };
      
    } catch (error) {
      console.error('MkCentralRegistryApi: getPlayerProfile error:', error.message);
      throw error;
    }
  }

  /**
   * Format le nom du jeu pour l'affichage
   */
  formatGameName(gameCode) {
    const games = {
      'mk8dx': 'MK8DX',
      'mkw': 'MK Wii',
      'mkworld': 'MK World',
      'mkt': 'MK Tour',
      'mk8': 'MK8',
      'mk7': 'MK7'
    };
    return games[gameCode] || gameCode?.toUpperCase() || 'Unknown';
  }

  /**
   * Normalise le code du jeu
   */
  normalizeGameCode(gameText) {
    const text = (gameText || '').toLowerCase();
    if (text.includes('world') || text === 'mkworld') return 'mkworld';
    if (text.includes('8') && text.includes('dx')) return 'mk8dx';
    if (text.includes('wii') || text === 'mkw') return 'mkw';
    if (text.includes('tour') || text === 'mkt') return 'mkt';
    return text.replace(/\s+/g, '').toLowerCase();
  }

  /**
   * Récupère les détails d'une équipe via l'API
   * @param {number} teamId - L'ID de l'équipe
   */
  async getTeamDetails(teamId) {
    try {
      const url = `${this.baseUrl}/api/registry/teams/${teamId}`;
      const { data } = await this.client.get(url);
      
      if (!data || !data.id) {
        throw new Error('Team not found');
      }
      
      // Format rosters with players
      const rosters = (data.rosters || []).map(roster => ({
        id: roster.id,
        name: roster.name || data.name,
        tag: roster.tag || data.tag,
        game: roster.game,
        gameHuman: this.formatGameName(roster.game),
        mode: roster.mode,
        isActive: roster.is_active !== 0,
        isRecruiting: roster.is_recruiting === 1,
        creationDate: roster.creation_date,
        players: (roster.players || []).map(player => ({
          playerId: player.player_id,
          name: player.name,
          countryCode: player.country_code,
          isBanned: player.is_banned || false,
          isLeader: player.is_leader || false,
          isManager: player.is_manager || false,
          joinDate: player.join_date,
          discord: player.discord ? {
            discordId: player.discord.discord_id,
            username: player.discord.username,
            globalName: player.discord.global_name,
            avatar: player.discord.avatar
          } : null,
          friendCodes: (player.friend_codes || []).map(fc => ({
            id: fc.id,
            code: fc.fc,
            type: fc.type,
            isPrimary: fc.is_primary || false,
            isActive: fc.is_active || false
          }))
        }))
      }));

      // Format managers
      const managers = (data.managers || []).map(manager => ({
        playerId: manager.player_id,
        name: manager.name,
        countryCode: manager.country_code,
        discord: manager.discord ? {
          discordId: manager.discord.discord_id,
          username: manager.discord.username,
          globalName: manager.discord.global_name,
          avatar: manager.discord.avatar
        } : null
      }));
      
      return {
        id: data.id,
        name: data.name,
        tag: data.tag,
        description: data.description || null,
        color: data.color,
        logo: data.logo || null,
        language: data.language || null,
        creationDate: data.creation_date ? new Date(data.creation_date * 1000).toISOString() : null,
        isHistorical: data.is_historical === 1,
        approvalStatus: data.approval_status,
        rosters: rosters,
        managers: managers,
        url: `${this.baseUrl}/fr/registry/teams/profile?id=${teamId}`
      };
      
    } catch (error) {
      console.error('MkCentralRegistryApi: getTeamDetails error:', error.message);
      throw error;
    }
  }

  /**
   * Recherche un joueur par nom dans le Registry
   * @param {string} name - Le nom du joueur à rechercher
   */
  async searchPlayer(name) {
    try {
      const url = `${this.baseUrl}/api/registry/players`;
      const { data } = await this.client.get(url, {
        params: {
          filter: name
        }
      });
      
      if (!data || !data.player_list) {
        return [];
      }

      // Chercher une correspondance exacte ou partielle
      const exactMatch = data.player_list.find(p => 
        p.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exactMatch) {
        return [exactMatch];
      }
      
      // Retourner les résultats partiels
      return data.player_list.filter(p => 
        p.name.toLowerCase().includes(name.toLowerCase())
      ).slice(0, 10);
      
    } catch (error) {
      console.error('MkCentralRegistryApi: searchPlayer error:', error.message);
      return [];
    }
  }
}

export default MkCentralRegistryApi;
