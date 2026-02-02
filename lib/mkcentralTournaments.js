import axios from 'axios';
import * as cheerio from 'cheerio';

export class MkCentralTournamentsApi {
  constructor() {
    this.baseUrl = 'https://mkcentral.com';
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  /**
   * Scrape tournaments from MKCentral
   * @param {Object} options - Filter options
   * @param {string} options.game - Game filter (mk8dx, mkwii, mkworld, etc.)
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Results per page
   */
  async getTournaments(options = {}) {
    const { game = 'mk8dx', page = 1, limit = 20 } = options;
    
    try {
      // Build URL with filters
      let url = `${this.baseUrl}/en-us/tournaments`;
      const params = new URLSearchParams();
      
      // MKCentral uses game filter in URL
      if (game && game !== 'all') {
        params.append('game', game);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const { data } = await this.client.get(url);
      const $ = cheerio.load(data);
      
      const tournaments = [];
      
      // Parse tournament cards
      $('div.tournament-card, article, .card').each((i, el) => {
        const $el = $(el);
        
        // Try to extract tournament data from various possible structures
        const nameEl = $el.find('h3 a, h2 a, .tournament-name a, .card-title a').first();
        const name = nameEl.text().trim();
        const link = nameEl.attr('href');
        
        if (!name || !link) return;
        
        // Extract ID from link
        const idMatch = link.match(/id=(\d+)/);
        const id = idMatch ? parseInt(idMatch[1]) : null;
        
        // Extract dates
        const dateText = $el.find('.date, .tournament-date, time').text().trim();
        const dates = this.parseDates(dateText);
        
        // Extract game/mode badges
        const badges = [];
        $el.find('.badge, .tag, span[class*="badge"]').each((j, badge) => {
          badges.push($(badge).text().trim());
        });
        
        // Extract series info
        const seriesEl = $el.find('a[href*="series"]');
        const series = seriesEl.length ? {
          name: seriesEl.text().trim(),
          link: seriesEl.attr('href')
        } : null;
        
        // Extract image
        const imageEl = $el.find('img').first();
        const image = imageEl.attr('src');
        
        // Extract description
        const description = $el.find('p, .description').first().text().trim();
        
        // Determine status from badges or text
        let status = 'upcoming';
        const lowerText = $el.text().toLowerCase();
        if (lowerText.includes('register now') || lowerText.includes('registration')) {
          status = 'registration';
        } else if (lowerText.includes('view tournament') || lowerText.includes('completed')) {
          status = 'completed';
        } else if (lowerText.includes('in progress') || lowerText.includes('ongoing')) {
          status = 'live';
        }
        
        tournaments.push({
          id,
          name,
          link: link.startsWith('/') ? `${this.baseUrl}${link}` : link,
          dates,
          badges,
          series,
          image: image && image.startsWith('/') ? `${this.baseUrl}${image}` : image,
          description,
          status,
          game: this.detectGame(badges)
        });
      });
      
      // Apply pagination locally
      const startIdx = (page - 1) * limit;
      const paginatedTournaments = tournaments.slice(startIdx, startIdx + limit);
      
      return {
        tournaments: paginatedTournaments,
        total: tournaments.length,
        page,
        totalPages: Math.ceil(tournaments.length / limit)
      };
      
    } catch (error) {
      console.error('MkCentralTournamentsApi: getTournaments error:', error.message);
      throw error;
    }
  }

  /**
   * Get tournament details including results
   * @param {number} id - Tournament ID
   */
  async getTournamentDetails(id) {
    try {
      const url = `${this.baseUrl}/en-us/tournaments/details?id=${id}`;
      const { data } = await this.client.get(url);
      const $ = cheerio.load(data);
      
      // Extract basic info
      const name = $('h1').first().text().trim();
      const description = $('.description, .tournament-description, p').first().text().trim();
      
      // Extract dates
      const dateText = $('.date, .tournament-date, time').text().trim();
      const dates = this.parseDates(dateText);
      
      // Extract participants/teams
      const participants = [];
      $('table.standings tr, .participants tr, .teams tr').each((i, el) => {
        if (i === 0) return; // Skip header
        const $row = $(el);
        const cols = $row.find('td');
        if (cols.length >= 2) {
          participants.push({
            rank: $(cols[0]).text().trim(),
            name: $(cols[1]).text().trim(),
            score: cols.length > 2 ? $(cols[2]).text().trim() : null
          });
        }
      });
      
      // Extract results/standings
      const results = [];
      $('table.results tr, .results tr, .standings tr').each((i, el) => {
        if (i === 0) return;
        const $row = $(el);
        const cols = $row.find('td');
        if (cols.length >= 2) {
          results.push({
            position: $(cols[0]).text().trim(),
            team: $(cols[1]).text().trim(),
            score: cols.length > 2 ? $(cols[2]).text().trim() : null,
            prize: cols.length > 3 ? $(cols[3]).text().trim() : null
          });
        }
      });
      
      // Extract brackets/rounds if available
      const rounds = [];
      $('.round, .bracket-round').each((i, el) => {
        const $round = $(el);
        const roundName = $round.find('.round-name, h3, h4').text().trim();
        const matches = [];
        
        $round.find('.match, .bracket-match').each((j, match) => {
          const $match = $(match);
          matches.push({
            team1: $match.find('.team1, .home').text().trim(),
            team2: $match.find('.team2, .away').text().trim(),
            score1: $match.find('.score1, .home-score').text().trim(),
            score2: $match.find('.score2, .away-score').text().trim()
          });
        });
        
        if (roundName || matches.length) {
          rounds.push({ name: roundName, matches });
        }
      });
      
      // Determine status
      let status = 'upcoming';
      const pageText = $('body').text().toLowerCase();
      if (pageText.includes('completed') || pageText.includes('finished') || results.length > 0) {
        status = 'completed';
      } else if (pageText.includes('in progress') || pageText.includes('ongoing') || pageText.includes('live')) {
        status = 'live';
      } else if (pageText.includes('registration') || pageText.includes('register now')) {
        status = 'registration';
      }
      
      return {
        id,
        name,
        description,
        dates,
        status,
        participants,
        results,
        rounds,
        url
      };
      
    } catch (error) {
      console.error('MkCentralTournamentsApi: getTournamentDetails error:', error.message);
      throw error;
    }
  }

  /**
   * Parse date strings into structured format
   */
  parseDates(dateText) {
    if (!dateText) return { start: null, end: null };
    
    // Try to extract dates from various formats
    // "Feb 28, 2026 – Apr 11, 2026" or "Jan 31, 2026"
    const datePattern = /(\w{3}\s+\d{1,2},\s+\d{4})/g;
    const matches = dateText.match(datePattern) || [];
    
    return {
      start: matches[0] || null,
      end: matches[1] || matches[0] || null,
      raw: dateText
    };
  }

  /**
   * Detect game from badges
   */
  detectGame(badges) {
    const badgeStr = badges.join(' ').toLowerCase();
    if (badgeStr.includes('mk8dx') || badgeStr.includes('mario kart 8 deluxe')) return 'mk8dx';
    if (badgeStr.includes('mkwii') || badgeStr.includes('mario kart wii')) return 'mkwii';
    if (badgeStr.includes('mkworld') || badgeStr.includes('mario kart world')) return 'mkworld';
    if (badgeStr.includes('mktour') || badgeStr.includes('mario kart tour')) return 'mktour';
    if (badgeStr.includes('mk7') || badgeStr.includes('mario kart 7')) return 'mk7';
    return 'unknown';
  }
}

export default MkCentralTournamentsApi;
