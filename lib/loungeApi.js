import axios from 'axios';

export class LoungeApi {
  constructor() {
    this.baseUrl = 'https://www.mk8dx-lounge.com/api/';
    // New MKCentral Lounge API with better leaderboard support
    this.mkcentralBaseUrl = 'https://lounge.mkcentral.com/api/';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000
    });
    this.mkcentralClient = axios.create({
      baseURL: this.mkcentralBaseUrl,
      timeout: 30000
    });
  }

  /**
   * Get full player list with optional filters
   * @param {Object} options - Filter options
   * @param {number} options.minMmr - Minimum MMR
   * @param {number} options.maxMmr - Maximum MMR
   * @param {number} options.minEvents - Minimum events played
   * @param {number} options.maxEvents - Maximum events played
   * @param {string} options.country - Country code filter
   * @param {string} options.name - Name search filter
   */
  async getPlayers(options = {}) {
    try {
      const params = {};
      if (options.minMmr) params.minMmr = options.minMmr;
      if (options.maxMmr) params.maxMmr = options.maxMmr;
      if (options.minEvents) params.minLr = options.minEvents;
      if (options.maxEvents) params.maxLr = options.maxEvents;
      if (options.country) params.country = options.country;
      if (options.name) params.name = options.name;
      
      const { data } = await this.client.get('player/list', { params });
      return data;
    } catch (error) {
      console.error('LoungeApi: getPlayers error:', error);
      throw error;
    }
  }

  async getPlayersByRange(minMmr, maxMmr) {
    try {
      const { data } = await this.client.get('player/list', {
        params: { minMmr, maxMmr }
      });
      return data;
    } catch (error) {
      console.error('LoungeApi: getPlayersByRange error:', error);
      throw error;
    }
  }

  async getPlayerById(mkcId) {
    try {
      const { data } = await this.client.get('player', {
        params: { mkcId }
      });
      return data;
    } catch (error) {
      console.error('LoungeApi: getPlayerById error:', error);
      throw error;
    }
  }

  /**
   * Get player by MKCentral Registry ID (mkcId)
   * @param {number} mkcId - MKCentral Registry ID
   */
  async getPlayerByMkcId(mkcId) {
    try {
      const { data } = await this.client.get('player', {
        params: { mkcId }
      });
      return data;
    } catch (error) {
      // Player might not have a Lounge account
      if (error.response?.status === 404) {
        return null;
      }
      console.error('LoungeApi: getPlayerByMkcId error:', error);
      return null;
    }
  }

  async getPlayerByName(name) {
    try {
      const { data } = await this.client.get('player', {
        params: { name }
      });
      return data;
    } catch (error) {
      console.error('LoungeApi: getPlayerByName error:', error);
      throw error;
    }
  }

  /**
   * Get detailed player information including MMR history, rank changes, etc.
   * @param {string} name - Player name
   * @param {string} season - Season number (optional)
   */
  async getPlayerDetailsByName(name, season = '') {
    try {
      const params = { name };
      if (season) params.season = season;
      
      const { data } = await this.client.get('player/details', { params });
      return data;
    } catch (error) {
      console.error('LoungeApi: getPlayerDetailsByName error:', error);
      throw error;
    }
  }

  /**
   * Get player details by player ID
   * @param {number} id - Player ID
   */
  async getPlayerDetailsById(id) {
    try {
      const { data } = await this.client.get('player/details', {
        params: { id }
      });
      return data;
    } catch (error) {
      console.error('LoungeApi: getPlayerDetailsById error:', error);
      throw error;
    }
  }

  /**
   * Extract match history from player details
   * @param {string} name - Player name
   * @param {Object} options - Options
   * @param {number} options.limit - Maximum number of matches to return
   */
  async getPlayerMatchHistory(name, { limit = 50 } = {}) {
    try {
      const { data } = await this.client.get('player/details', {
        params: { name }
      });
      
      if (data && data.mmrChanges && Array.isArray(data.mmrChanges)) {
        const matches = data.mmrChanges
          .filter(change => change.reason === 'Table')
          .slice(0, limit)
          .map(change => ({
            id: change.changeId,
            date: change.time,
            createdAt: change.time,
            time: change.time,
            mmrDelta: change.mmrDelta,
            newMmr: change.newMmr,
            score: change.score,
            tier: change.tier,
            rank: change.rank,
            numTeams: change.numTeams,
            numPlayers: change.numPlayers
          }));
        
        return matches;
      }
      
      return [];
    } catch (error) {
      console.error('LoungeApi: getPlayerMatchHistory error:', error);
      throw error;
    }
  }

  /**
   * Get table details by ID
   * @param {number} tableId - Table ID
   */
  async getTableById(tableId) {
    try {
      const { data } = await this.client.get('table', {
        params: { tableId }
      });
      return data;
    } catch (error) {
      console.error('LoungeApi: getTableById error:', error);
      throw error;
    }
  }

  /**
   * Get recent tables list
   */
  async getTables() {
    try {
      const { data } = await this.client.get('table/list');
      return data;
    } catch (error) {
      console.error('LoungeApi: getTables error:', error);
      throw error;
    }
  }

  /**
   * Get penalties for a player
   * @param {string} name - Player name
   */
  async getPenaltiesByName(name) {
    try {
      const { data } = await this.client.get('penalty/list', {
        params: { name }
      });
      return data;
    } catch (error) {
      console.error('LoungeApi: getPenaltiesByName error:', error);
      throw error;
    }
  }

  /**
   * Get list of all countries from players
   */
  async getCountries() {
    try {
      const data = await this.getPlayers();
      const countries = new Set();
      
      if (data && data.players) {
        data.players.forEach(p => {
          if (p.countryCode) countries.add(p.countryCode);
        });
      }
      
      return Array.from(countries).sort();
    } catch (error) {
      console.error('LoungeApi: getCountries error:', error);
      return [];
    }
  }

  /**
   * Get leaderboard with full data including countryCode and overallRank
   * Uses MKCentral Lounge API which provides better leaderboard data
   * @param {Object} options - Filter options
   * @param {string} options.game - Game (mk8dx, mkw, mkworld)
   * @param {number} options.season - Season number
   * @param {number} options.skip - Number of players to skip (for pagination)
   * @param {number} options.pageSize - Number of players per page
   * @param {string} options.search - Player name search
   * @param {string} options.country - Country code filter (e.g., 'FR', 'JP')
   * @param {number} options.minMmr - Minimum MMR filter
   * @param {number} options.maxMmr - Maximum MMR filter
   * @param {number} options.minEventsPlayed - Minimum events played
   * @param {number} options.maxEventsPlayed - Maximum events played
   * @param {string} options.sortBy - Sort field (Mmr, Name, EventsPlayed, PeakMmr)
   */
  async getLeaderboard(options = {}) {
    try {
      const params = {
        game: options.game || 'mk8dx',
        season: options.season || 15
      };
      
      if (options.skip) params.skip = options.skip;
      if (options.pageSize) params.pageSize = options.pageSize;
      if (options.search) params.search = options.search;
      if (options.country) params.country = options.country;
      if (options.minMmr) params.minMmr = options.minMmr;
      if (options.maxMmr) params.maxMmr = options.maxMmr;
      if (options.minEventsPlayed) params.minEventsPlayed = options.minEventsPlayed;
      if (options.maxEventsPlayed) params.maxEventsPlayed = options.maxEventsPlayed;
      if (options.sortBy && options.sortBy !== 'Mmr') params.sortBy = options.sortBy;
      
      const { data } = await this.mkcentralClient.get('player/leaderboard', { params });
      
      // Transform data to our format
      return {
        players: (data.data || []).map(p => ({
          id: p.id,
          mkcId: p.mkcId,
          name: p.name,
          mmr: p.mmr || 0,
          maxMmr: p.maxMmr || p.peakMmr || 0,
          eventsPlayed: p.eventsPlayed || 0,
          countryCode: p.countryCode || null,
          countryName: p.countryName || null,
          discordId: p.discordId,
          // overallRank is the global rank preserved even with filters!
          globalRank: p.overallRank || null,
          rank: p.overallRank || null
        })),
        // MKCentral API uses 'totalPlayers' for the total count
        totalCount: data.totalPlayers || data.totalCount || 0,
        season: data.season || options.season || 15
      };
    } catch (error) {
      console.error('LoungeApi: getLeaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get all available countries from leaderboard
   * Uses the leaderboard API with a large page size to collect all countries
   */
  async getAvailableCountries() {
    try {
      // Fetch a large sample to get most countries
      const { data } = await this.mkcentralClient.get('player/leaderboard', {
        params: { game: 'mk8dx', pageSize: 5000 }
      });
      
      const countries = new Map();
      (data.data || []).forEach(p => {
        if (p.countryCode && !countries.has(p.countryCode)) {
          countries.set(p.countryCode, p.countryName || p.countryCode);
        }
      });
      
      return Array.from(countries.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('LoungeApi: getAvailableCountries error:', error);
      return [];
    }
  }
}
