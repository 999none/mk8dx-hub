import axios from 'axios';

export class LoungeApi {
  constructor() {
    this.baseUrl = 'https://www.mk8dx-lounge.com/api/';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  async getPlayers() {
    try {
      const { data } = await this.client.get('player/list');
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

  async getPlayerMatchHistory(name, { limit = 50 } = {}) {
    try {
      // Use player/details which contains mmrChanges (match history)
      // The /player/matches endpoint doesn't exist on MK8DX Lounge API
      const { data } = await this.client.get('player/details', {
        params: { name }
      });
      
      // Extract matches from mmrChanges array
      // Each entry with reason "Table" represents a match
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
      // Re-throw so callers can fallback or handle absence of data
      throw error;
    }
  }

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

  async getTables() {
    try {
      const { data } = await this.client.get('table/list');
      return data;
    } catch (error) {
      console.error('LoungeApi: getTables error:', error);
      throw error;
    }
  }

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
}
