import axios from 'axios';

export class MkCentralTournamentsApi {
  constructor() {
    this.apiUrl = 'https://www.mariokartcentral.com/mkc/api/events';
    this.baseUrl = 'https://mkcentral.com';
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Fetch tournaments from MKCentral API
   * @param {Object} options - Filter options
   * @param {string} options.game - Game filter (mk8dx, mkwii, mkworld, all)
   * @param {string} options.status - Status filter (upcoming, ongoing, past, all)
   * @param {number} options.page - Page number
   * @param {number} options.limit - Results per page
   */
  async getTournaments(options = {}) {
    const { game = 'all', status = 'all', page = 1, limit = 20 } = options;
    
    try {
      const { data } = await this.client.get(this.apiUrl);
      
      if (!data) {
        return { tournaments: [], total: 0, page, totalPages: 0 };
      }
      
      // Combine all tournaments
      let allTournaments = [];
      
      // Add upcoming with status
      if (data.upcoming && Array.isArray(data.upcoming)) {
        allTournaments.push(...data.upcoming.map(t => ({ ...t, status: 'upcoming' })));
      }
      
      // Add ongoing with status
      if (data.ongoing && Array.isArray(data.ongoing)) {
        allTournaments.push(...data.ongoing.map(t => ({ ...t, status: 'live' })));
      }
      
      // Add past with status
      if (data.past && Array.isArray(data.past)) {
        allTournaments.push(...data.past.map(t => ({ ...t, status: 'completed' })));
      }
      
      // Transform to consistent format
      allTournaments = allTournaments.map(t => this.transformTournament(t));
      
      // Filter by game
      if (game && game !== 'all') {
        allTournaments = allTournaments.filter(t => 
          t.game === game || 
          t.gameRaw?.toLowerCase().includes(game.toLowerCase())
        );
      }
      
      // Filter by status
      if (status && status !== 'all') {
        allTournaments = allTournaments.filter(t => t.status === status);
      }
      
      // Sort: live first, then upcoming, then completed (by date)
      allTournaments.sort((a, b) => {
        const statusOrder = { live: 0, upcoming: 1, registration: 1, completed: 2 };
        const statusDiff = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
        if (statusDiff !== 0) return statusDiff;
        
        // Sort by start date (newest first for same status)
        const dateA = new Date(a.startDate || 0);
        const dateB = new Date(b.startDate || 0);
        return dateB - dateA;
      });
      
      // Pagination
      const total = allTournaments.length;
      const totalPages = Math.ceil(total / limit);
      const startIdx = (page - 1) * limit;
      const paginatedTournaments = allTournaments.slice(startIdx, startIdx + limit);
      
      return {
        tournaments: paginatedTournaments,
        total,
        page,
        limit,
        totalPages,
        summary: {
          upcoming: data.upcoming?.length || 0,
          ongoing: data.ongoing?.length || 0,
          past: data.past?.length || 0
        }
      };
      
    } catch (error) {
      console.error('MkCentralTournamentsApi: getTournaments error:', error.message);
      throw error;
    }
  }

  /**
   * Transform raw tournament data to consistent format
   */
  transformTournament(raw) {
    const registrationsOpen = raw.registrations_open === 1;
    let status = raw.status || 'upcoming';
    
    if (status === 'upcoming' && registrationsOpen) {
      status = 'registration';
    }
    
    return {
      id: raw.event_id,
      name: raw.title,
      description: raw.description || raw.description_formatted || '',
      status,
      
      // Dates
      startDate: raw.start_date,
      startDateHuman: raw.start_date_human,
      endDate: raw.end_date,
      endDateHuman: raw.end_date_human,
      
      // Game info
      game: raw.game,
      gameHuman: raw.game_human_full || raw.game_human,
      gameMode: raw.game_mode,
      gameModeHuman: raw.game_mode_human,
      gameModeTitle: raw.game_mode_title,
      gameRaw: `${raw.game_human} ${raw.game_mode_human}`,
      
      // Format
      format: raw.event_format_human,
      formatCode: raw.event_format,
      minTeamSize: raw.minimum_team_size,
      maxTeamSize: raw.maximum_team_size,
      
      // Registration
      registrationsOpen,
      registrationCount: raw.total_registrations_override,
      
      // Series
      series: raw.series_name ? {
        id: raw.tournament_series_id,
        name: raw.series_name,
        description: raw.series_short_description,
        logo: raw.series_logo_filename ? `https://www.mariokartcentral.com/mkc/img/mkcv1_images/${raw.series_logo_filename}` : null
      } : null,
      
      // Media
      logo: raw.logo_filename ? `https://www.mariokartcentral.com/mkc/img/mkcv1_images/${raw.logo_filename}` : null,
      
      // Links
      link: `${this.baseUrl}/en-us/tournaments/details?id=${raw.event_id}`,
      organizer: raw.organizer,
      
      // Additional info
      prValue: raw.pr_value,
      verificationRequired: raw.verification_required === 1
    };
  }

  /**
   * Get tournament details by ID
   * Note: The events API doesn't provide detailed results, so we return basic info
   */
  async getTournamentDetails(id) {
    try {
      const { data } = await this.client.get(this.apiUrl);
      
      // Find tournament in all categories
      const allTournaments = [
        ...(data.upcoming || []).map(t => ({ ...t, status: 'upcoming' })),
        ...(data.ongoing || []).map(t => ({ ...t, status: 'live' })),
        ...(data.past || []).map(t => ({ ...t, status: 'completed' }))
      ];
      
      const tournament = allTournaments.find(t => t.event_id === id);
      
      if (!tournament) {
        throw new Error('Tournament not found');
      }
      
      return {
        ...this.transformTournament(tournament),
        rules: tournament.rules_formatted || tournament.rules || '',
        postRegistrationMessage: tournament.post_registration_message_formatted || '',
        // Results would need to be scraped from the website if available
        results: [],
        participants: []
      };
      
    } catch (error) {
      console.error('MkCentralTournamentsApi: getTournamentDetails error:', error.message);
      throw error;
    }
  }
}

export default MkCentralTournamentsApi;
