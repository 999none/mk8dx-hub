import axios from 'axios';

/**
 * MKCentral Tournaments API
 * 
 * Utilise la nouvelle API officielle: https://mkcentral.com/api/tournaments/list
 * 
 * Jeux supportés:
 * - mkworld = Mario Kart World
 * - mk8dx = Mario Kart 8 Deluxe
 * - mkw = Mario Kart Wii
 */
export class MkCentralTournamentsApi {
  constructor() {
    // Nouvelle API MKCentral (v2)
    this.apiUrl = 'https://mkcentral.com/api/tournaments/list';
    this.tournamentDetailsUrl = 'https://mkcentral.com/api/tournaments/details';
    this.baseUrl = 'https://mkcentral.com';
    this.imgBaseUrl = 'https://mkcentral.com';
    
    // Mapping des codes de jeu vers les noms complets
    this.gameNames = {
      'mkworld': 'Mario Kart World',
      'mk8dx': 'Mario Kart 8 Deluxe',
      'mkw': 'Mario Kart Wii',
      'mk8': 'Mario Kart 8',
      'mkt': 'Mario Kart Tour',
      'mk7': 'Mario Kart 7',
      'smk': 'Super Mario Kart'
    };
    
    // Jeux autorisés (filtre utilisateur)
    this.allowedGames = ['mkworld', 'mk8dx', 'mkw'];
    
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Récupère les tournois depuis l'API MKCentral
   * @param {Object} options - Options de filtrage
   * @param {string} options.game - Filtre par jeu (mkworld, mk8dx, mkw, all)
   * @param {number} options.page - Numéro de page
   * @param {number} options.limit - Résultats par page (ignoré côté serveur, pagination locale)
   */
  async getTournaments(options = {}) {
    const { game = 'all', page = 1, limit = 20 } = options;
    
    try {
      let allTournaments = [];
      
      // Si un jeu spécifique est demandé (et autorisé), on le fetch directement
      if (game && game !== 'all' && this.allowedGames.includes(game)) {
        const tournaments = await this.fetchTournamentsForGame(game);
        allTournaments = tournaments;
      } else {
        // Sinon, on récupère tous les tournois pour les 3 jeux autorisés
        const promises = this.allowedGames.map(g => this.fetchTournamentsForGame(g));
        const results = await Promise.all(promises);
        allTournaments = results.flat();
      }
      
      // Trier par date de début (plus récents en premier)
      allTournaments.sort((a, b) => {
        // D'abord par statut (inscriptions ouvertes en premier)
        if (a.registrationsOpen && !b.registrationsOpen) return -1;
        if (!a.registrationsOpen && b.registrationsOpen) return 1;
        
        // Puis par date de début
        const dateA = a.startTimestamp || 0;
        const dateB = b.startTimestamp || 0;
        return dateB - dateA;
      });
      
      // Pagination locale
      const total = allTournaments.length;
      const totalPages = Math.ceil(total / limit);
      const startIdx = (page - 1) * limit;
      const paginatedTournaments = allTournaments.slice(startIdx, startIdx + limit);
      
      // Calcul des statistiques
      const summary = {
        mkworld: allTournaments.filter(t => t.game === 'mkworld').length,
        mk8dx: allTournaments.filter(t => t.game === 'mk8dx').length,
        mkw: allTournaments.filter(t => t.game === 'mkw').length,
        registrationsOpen: allTournaments.filter(t => t.registrationsOpen).length,
        total: allTournaments.length
      };
      
      return {
        tournaments: paginatedTournaments,
        total,
        page,
        limit,
        totalPages,
        summary
      };
      
    } catch (error) {
      console.error('MkCentralTournamentsApi: getTournaments error:', error.message);
      throw error;
    }
  }

  /**
   * Récupère tous les tournois pour un jeu spécifique (toutes les pages)
   */
  async fetchTournamentsForGame(game) {
    try {
      // Premier appel pour connaître le nombre total de pages
      const firstPage = await this.fetchPage(game, 1);
      const pageCount = firstPage.pageCount || 1;
      const allTournaments = [...firstPage.tournaments];
      
      // Récupérer les pages suivantes si nécessaire (limité à 10 pages max)
      const maxPages = Math.min(pageCount, 10);
      if (maxPages > 1) {
        const promises = [];
        for (let p = 2; p <= maxPages; p++) {
          promises.push(this.fetchPage(game, p));
        }
        const results = await Promise.all(promises);
        for (const result of results) {
          allTournaments.push(...result.tournaments);
        }
      }
      
      return allTournaments;
    } catch (error) {
      console.warn(`MkCentralTournamentsApi: Error fetching ${game}:`, error.message);
      return [];
    }
  }

  /**
   * Récupère une page de tournois depuis l'API
   */
  async fetchPage(game, page) {
    const url = `${this.apiUrl}?page=${page}&game=${game}`;
    const { data } = await this.client.get(url);
    
    if (!data || !data.tournaments) {
      return { tournaments: [], pageCount: 0 };
    }
    
    const tournaments = data.tournaments.map(t => this.transformTournament(t));
    
    return {
      tournaments,
      pageCount: data.page_count || 1,
      totalCount: data.tournament_count || 0
    };
  }

  /**
   * Transforme les données brutes du tournoi en format cohérent
   */
  transformTournament(raw) {
    // Déterminer le statut basé sur les dates et inscriptions
    const now = Date.now() / 1000;
    const startTimestamp = raw.date_start || 0;
    const endTimestamp = raw.date_end || 0;
    
    let status = 'upcoming';
    if (raw.registrations_open) {
      status = 'registration';
    } else if (now >= startTimestamp && now <= endTimestamp) {
      status = 'live';
    } else if (now > endTimestamp) {
      status = 'completed';
    }
    
    // Construire l'URL du logo
    let logo = null;
    if (raw.logo) {
      // Le logo peut être un chemin relatif ou absolu
      logo = raw.logo.startsWith('http') 
        ? raw.logo 
        : `${this.imgBaseUrl}${raw.logo}`;
    }
    
    // Logo de la série si disponible
    let seriesLogo = null;
    if (raw.series_id && raw.use_series_logo) {
      seriesLogo = `${this.imgBaseUrl}/img/series_logos/${raw.series_id}.png`;
    }
    
    // Convertir les timestamps en dates lisibles
    const startDate = startTimestamp ? new Date(startTimestamp * 1000) : null;
    const endDate = endTimestamp ? new Date(endTimestamp * 1000) : null;
    
    return {
      id: raw.id,
      name: raw.name,
      description: raw.series_short_description || '',
      status,
      
      // Dates
      startDate: startDate?.toISOString() || null,
      startDateHuman: startDate ? this.formatDateHuman(startDate) : null,
      endDate: endDate?.toISOString() || null,
      endDateHuman: endDate ? this.formatDateHuman(endDate) : null,
      startTimestamp,
      endTimestamp,
      
      // Infos du jeu
      game: raw.game,
      gameHuman: this.gameNames[raw.game] || raw.game,
      gameMode: raw.mode,
      gameModeHuman: raw.mode?.toUpperCase() || '',
      
      // Format
      format: raw.is_squad ? 'Squad' : (raw.teams_allowed ? 'Team' : 'Solo'),
      isSquad: raw.is_squad || false,
      teamsAllowed: raw.teams_allowed || false,
      
      // Inscriptions
      registrationsOpen: raw.registrations_open || false,
      
      // Série
      series: raw.series_id ? {
        id: raw.series_id,
        name: raw.series_name,
        description: raw.series_short_description,
        url: raw.series_url,
        logo: seriesLogo
      } : null,
      
      // Media
      logo: logo || seriesLogo,
      seriesLogo,
      tournamentLogo: logo,
      
      // Liens
      link: `${this.baseUrl}/en-us/tournaments/details?id=${raw.id}`,
      organizer: raw.organizer,
      
      // Visibilité
      isViewable: raw.is_viewable || true,
      isPublic: raw.is_public || true
    };
  }

  /**
   * Formate une date en format lisible
   */
  formatDateHuman(date) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }

  /**
   * Récupère les détails d'un tournoi par ID
   */
  async getTournamentDetails(id) {
    try {
      // D'abord essayer l'API de détails si elle existe
      try {
        const { data } = await this.client.get(`${this.tournamentDetailsUrl}?id=${id}`);
        if (data) {
          return this.transformTournamentDetails(data);
        }
      } catch (e) {
        // L'API de détails n'existe peut-être pas, fallback
      }
      
      // Fallback: chercher dans la liste des tournois
      const { tournaments } = await this.getTournaments({ game: 'all', page: 1, limit: 1000 });
      const tournament = tournaments.find(t => t.id === id);
      
      if (!tournament) {
        throw new Error('Tournament not found');
      }
      
      return {
        ...tournament,
        rules: '',
        results: [],
        participants: []
      };
      
    } catch (error) {
      console.error('MkCentralTournamentsApi: getTournamentDetails error:', error.message);
      throw error;
    }
  }

  /**
   * Transforme les détails d'un tournoi
   */
  transformTournamentDetails(raw) {
    return {
      ...this.transformTournament(raw),
      rules: raw.rules || '',
      results: raw.results || [],
      participants: raw.participants || []
    };
  }

  /**
   * Récupère tous les IDs de tournois pour les jeux autorisés
   */
  async getAllTournamentIds() {
    try {
      const { tournaments } = await this.getTournaments({ game: 'all', page: 1, limit: 10000 });
      return tournaments.map(t => ({
        id: t.id,
        name: t.name,
        game: t.game,
        gameHuman: t.gameHuman
      }));
    } catch (error) {
      console.error('MkCentralTournamentsApi: getAllTournamentIds error:', error.message);
      throw error;
    }
  }
}

export default MkCentralTournamentsApi;
