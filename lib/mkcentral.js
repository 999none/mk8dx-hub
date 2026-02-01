import axios from 'axios';
import cheerio from 'cheerio';

export class MkCentralApi {
  constructor(client = axios) {
    this.loungeBase = 'https://lounge.mkcentral.com/mk8dx';
    this.mkcBase = 'https://mkcentral.com';
    // Accept an injected axios instance for testability (MockAdapter) and default to global axios
    this.client = client || axios;
    // Ensure a reasonable timeout is set if not present
    if (!this.client.defaults) this.client.defaults = {};
    if (!this.client.defaults.timeout) this.client.defaults.timeout = 10000;
  }

  async findRegistryLinkFromLounge(name) {
    try {
      // Try the public lounge player page
      const url = `${this.loungeBase}/player?name=${encodeURIComponent(name)}`;
      const { data } = await this.client.get(url);
      const $ = cheerio.load(data);

      // Look for links that point to mkcentral or registry
      const links = $('a')
        .map((i, el) => $(el).attr('href'))
        .get()
        .filter(Boolean);

      const candidate = links.find(l => l.includes('mkcentral') || l.includes('/player/') || l.includes('registry'));
      if (candidate) {
        // Normalize relative links
        if (candidate.startsWith('/')) return new URL(candidate, this.loungeBase).toString();
        return candidate;
      }

      // Try to find a text node with 'Registry' or 'MKCentral' and extract following link
      const registryLink = $('a:contains("Registry")').attr('href') || $('a:contains("MKCentral")').attr('href');
      if (registryLink) {
        if (registryLink.startsWith('/')) return new URL(registryLink, this.loungeBase).toString();
        return registryLink;
      }

      return null;
    } catch (err) {
      console.warn('MkCentralApi: findRegistryLinkFromLounge error', err.message);
      return null;
    }
  }

  async getTeamFromRegistryLink(link) {
    try {
      const { data } = await this.client.get(link);
      const $ = cheerio.load(data);

      // Attempt to find a team name and members
      const teamName = $('h1.team-name').text().trim() || $('h1').first().text().trim();

      // Look for members list (common patterns)
      const members = [];
      $('ul.team-members li, .team-members li, .members li').each((i, el) => {
        const text = $(el).text().trim();
        if (text) members.push(text);
      });

      // Fallback: look for links to player pages inside the page
      if (members.length === 0) {
        $('a').each((i, el) => {
          const href = $(el).attr('href') || '';
          const txt = $(el).text().trim();
          if (href.includes('/player/') && txt) members.push(txt);
        });
      }

      // Try to parse some team stats (wins/losses/points) if present
      const stats = {};
      $('.team-stats .stat, .stats .stat, .team-info .stat').each((i, el) => {
        const key = $(el).find('.label').text().trim() || $(el).find('b').text().trim();
        const value = $(el).find('.value').text().trim() || $(el).text().replace(key, '').trim();
        if (key && value) stats[key] = value;
      });

      // fallback for tables
      $('table.team-stats tr').each((i, el) => {
        const cols = $(el).find('td');
        if (cols.length >= 2) {
          const key = $(cols[0]).text().trim();
          const value = $(cols[1]).text().trim();
          if (key && value) stats[key] = value;
        }
      });

      // Find admin/contact info if available
      let adminContact = null;
      const admin = $('.team-admin a, .team-contact a, .admin a').first();
      if (admin && admin.length) {
        adminContact = admin.attr('href') || admin.text().trim();
      } else {
        const adminText = $('.team-admin, .team-contact, .admin').first().text().trim();
        if (adminText) adminContact = adminText;
      }

      const result = {
        teamName: teamName || null,
        members: members.slice(0, 50),
        stats: Object.keys(stats).length ? stats : null,
        adminContact: adminContact || null
      };

      return result;
    } catch (err) {
      console.warn('MkCentralApi: getTeamFromRegistryLink error', err.message);
      throw err;
    }
  }

  // Refresh cached entries: accepts a MongoDB db instance and options
  async refreshCache(db, { staleAfterHours = 24, limit = 100, concurrency = 5 } = {}) {
    const collection = db.collection('mkcentral_registry');
    const cutoff = new Date(Date.now() - staleAfterHours * 3600 * 1000);

    // Find entries without team or older than cutoff
    let entries = await collection.find({ $or: [ { team: { $exists: false } }, { lastFetched: { $lt: cutoff } } ] }).limit(limit).toArray();

    if (!Array.isArray(entries)) entries = [];
    // Enforce the limit on the returned array in case the DB mock ignores it
    entries = entries.slice(0, limit);

    const results = [];

    // Process in batches of `concurrency`
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency);
      const promises = batch.map(async (e) => {
        try {
          const link = e.link;
          if (!link) return { link: null, success: false, error: 'no link' };
          const team = await this.getTeamFromRegistryLink(link);
          await collection.updateOne({ link }, { $set: { link, team, lastFetched: new Date() } }, { upsert: true });
          return { link, success: true };
        } catch (err) {
          console.warn('MkCentralApi.refreshCache failed for', e.link, err.message);
          return { link: e.link, success: false, error: err.message };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return results;
  }
}

export default MkCentralApi;