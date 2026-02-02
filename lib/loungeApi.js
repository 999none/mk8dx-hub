import axios from 'axios';

export class LoungeApi {
  constructor() {
    this.baseUrl = 'https://www.mk8dx-lounge.com/api/';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000
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
   */
  async getPlayerDetailsByName(name) {
    try {
      const { data } = await this.client.get('player/details', {
        params: { name }
      });
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
}
