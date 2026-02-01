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
