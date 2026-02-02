import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * MKCentral Registry API
 * 
 * Scrape les données du profil Registry d'un joueur
 * URL: https://mkcentral.com/fr/registry/players/profile?id={registryId}
 */
export class MkCentralRegistryApi {
  constructor() {
    this.baseUrl = 'https://mkcentral.com';
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
  }

  /**
   * Récupère le profil Registry complet d'un joueur
   * @param {number} registryId - L'ID du joueur dans le Registry MKCentral
   */
  async getPlayerProfile(registryId) {
    try {
      const url = `${this.baseUrl}/fr/registry/players/profile?id=${registryId}`;
      const { data } = await this.client.get(url);
      const $ = cheerio.load(data);
      
      // Nom du joueur
      const nameElement = $('.name');
      const playerName = nameElement.text().trim();
      
      // Pays (extrait du flag)
      const flagImg = nameElement.find('img.flag');
      const countryCode = flagImg.attr('alt') || null;
      
      // Friend Code
      let friendCode = null;
      const fcSection = $('b:contains("Codes ami")').parent();
      const fcDiv = fcSection.next('div');
      if (fcDiv.length) {
        const fcText = fcDiv.text().trim();
        const fcMatch = fcText.match(/(\d{4}-\d{4}-\d{4})/);
        if (fcMatch) friendCode = fcMatch[1];
      }
      
      // Équipes actuelles
      const teams = this.parseTeams($);
      
      // Historique des équipes
      const teamHistory = this.parseTeamHistory($);
      
      // Historique des tournois
      const tournamentHistory = this.parseTournamentHistory($);
      
      // Date d'inscription
      let registeredDate = null;
      const registeredElement = $('div.item:contains("Enregistré")');
      if (registeredElement.length) {
        registeredDate = registeredElement.text().replace('Enregistré', '').trim();
      }
      
      return {
        registryId,
        name: playerName,
        countryCode,
        friendCode,
        teams,
        teamHistory,
        tournamentHistory,
        registeredDate,
        profileUrl: url
      };
      
    } catch (error) {
      console.error('MkCentralRegistryApi: getPlayerProfile error:', error.message);
      throw error;
    }
  }

  /**
   * Parse les équipes actuelles du joueur
   */
  parseTeams($) {
    const teams = [];
    
    // Section "Équipes:" dans le profil
    const teamsSection = $('b:contains("Équipes")').closest('.item');
    
    teamsSection.find('.teams').each((i, teamEl) => {
      const badges = $(teamEl).find('.badges .badge');
      const game = badges.first().text().trim();
      const mode = badges.last().text().trim();
      
      const teamLink = $(teamEl).find('a');
      const teamName = teamLink.text().trim();
      const teamUrl = teamLink.attr('href');
      
      // Extraire l'ID de l'équipe depuis l'URL
      let teamId = null;
      if (teamUrl) {
        const match = teamUrl.match(/id=(\d+)/);
        if (match) teamId = parseInt(match[1]);
      }
      
      if (teamName) {
        teams.push({
          id: teamId,
          name: teamName,
          game: this.normalizeGameCode(game),
          gameHuman: game,
          mode: mode,
          url: teamUrl,
          isCurrent: true
        });
      }
    });
    
    return teams;
  }

  /**
   * Parse l'historique des équipes
   */
  parseTeamHistory($) {
    const history = [];
    
    // Table des équipes (historique)
    const teamTable = $('table').filter((i, el) => {
      const headers = $(el).find('th');
      return headers.text().includes('Team') && headers.text().includes('Registration Period');
    });
    
    teamTable.find('tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      
      const teamLink = $(cols[0]).find('a');
      const teamName = teamLink.text().trim();
      const teamUrl = teamLink.attr('href');
      
      // Game et mode
      const badges = $(cols[1]).find('.badge');
      const game = badges.first().text().trim();
      const mode = badges.last().text().trim();
      
      // Période
      const period = $(cols[2]).text().trim();
      const isCurrent = period.toLowerCase().includes('present');
      
      // Parser les dates
      let startDate = null;
      let endDate = null;
      const periodMatch = period.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(.+)/);
      if (periodMatch) {
        startDate = periodMatch[1];
        endDate = periodMatch[2].toLowerCase() === 'present' ? null : periodMatch[2];
      }
      
      // ID équipe
      let teamId = null;
      if (teamUrl) {
        const match = teamUrl.match(/id=(\d+)/);
        if (match) teamId = parseInt(match[1]);
      }
      
      if (teamName) {
        history.push({
          id: teamId,
          name: teamName,
          game: this.normalizeGameCode(game),
          gameHuman: game,
          mode,
          url: teamUrl,
          startDate,
          endDate,
          isCurrent
        });
      }
    });
    
    return history;
  }

  /**
   * Parse l'historique des tournois
   */
  parseTournamentHistory($) {
    const tournaments = [];
    
    // Section "Tournois d'Équipes"
    const tournamentSection = $('h2:contains("Tournois")').closest('.wrapper');
    const tournamentTable = tournamentSection.find('table');
    
    tournamentTable.find('tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      
      // Tournoi
      const tournamentLink = $(cols[0]).find('a');
      const tournamentName = tournamentLink.text().trim();
      const tournamentUrl = tournamentLink.attr('href');
      
      // Extraire l'ID du tournoi
      let tournamentId = null;
      if (tournamentUrl) {
        const match = tournamentUrl.match(/id=(\d+)/);
        if (match) tournamentId = parseInt(match[1]);
      }
      
      // Date
      const dateText = $(cols[1]).text().trim();
      let startDate = null;
      let endDate = null;
      const dateMatch = dateText.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dateMatch) {
        startDate = dateMatch[1];
        endDate = dateMatch[2];
      }
      
      // Équipe (partenaires)
      const teamLink = $(cols[2]).find('a');
      const teamName = teamLink.text().trim();
      const teamUrl = teamLink.attr('href');
      
      // Placement
      const placement = $(cols[3]).text().trim();
      const placementNum = parseInt(placement) || null;
      
      if (tournamentName) {
        tournaments.push({
          id: tournamentId,
          name: tournamentName,
          url: tournamentUrl,
          startDate,
          endDate,
          dateHuman: dateText,
          team: teamName || null,
          teamUrl: teamUrl || null,
          placement: placementNum,
          placementText: placement
        });
      }
    });
    
    return tournaments;
  }

  /**
   * Normalise le code du jeu
   */
  normalizeGameCode(gameText) {
    const text = gameText.toLowerCase();
    if (text.includes('world') || text === 'mkworld') return 'mkworld';
    if (text.includes('8') || text === 'mk8dx') return 'mk8dx';
    if (text.includes('wii') || text === 'mkw') return 'mkw';
    if (text.includes('tour') || text === 'mkt') return 'mkt';
    return text.replace(/\s+/g, '').toLowerCase();
  }

  /**
   * Récupère les détails d'une équipe
   * @param {number} teamId - L'ID de l'équipe
   */
  async getTeamDetails(teamId) {
    try {
      const url = `${this.baseUrl}/fr/registry/teams/profile?id=${teamId}`;
      const { data } = await this.client.get(url);
      const $ = cheerio.load(data);
      
      // Nom de l'équipe
      const teamName = $('h1').first().text().trim() || $('.name').first().text().trim();
      
      // Tag
      const tagElement = $('b:contains("Tag")').parent();
      const tag = tagElement.find('span').text().trim() || null;
      
      // Logo
      const logoImg = $('.avatar img, .team-logo img').first();
      let logo = logoImg.attr('src');
      if (logo && !logo.startsWith('http')) {
        logo = `${this.baseUrl}${logo}`;
      }
      
      // Membres (roster)
      const members = [];
      $('table').filter((i, el) => {
        const headers = $(el).find('th');
        return headers.text().toLowerCase().includes('player') || headers.text().toLowerCase().includes('joueur');
      }).find('tbody tr').each((i, row) => {
        const cols = $(row).find('td');
        const playerLink = $(cols[0]).find('a');
        const playerName = playerLink.text().trim();
        const playerUrl = playerLink.attr('href');
        
        let playerId = null;
        if (playerUrl) {
          const match = playerUrl.match(/id=(\d+)/);
          if (match) playerId = parseInt(match[1]);
        }
        
        const role = $(cols[1]).text().trim() || 'Member';
        const joinDate = $(cols[2]).text().trim() || null;
        
        if (playerName) {
          members.push({
            id: playerId,
            name: playerName,
            url: playerUrl,
            role,
            joinDate
          });
        }
      });
      
      return {
        id: teamId,
        name: teamName,
        tag,
        logo,
        members,
        url
      };
      
    } catch (error) {
      console.error('MkCentralRegistryApi: getTeamDetails error:', error.message);
      throw error;
    }
  }
}

export default MkCentralRegistryApi;
