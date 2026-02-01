import { describe, it, expect, beforeEach } from 'vitest';
import { MkCentralApi } from '@/lib/mkcentral';

describe('MkCentralApi.refreshCache', () => {
  it('refreshes stale entries and updates the collection', async () => {
    const oldDate = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const entries = [ { link: 'https://mkcentral.com/registry/1', lastFetched: oldDate } ];

    const updated = [];

    const db = {
      collection: () => ({
        find: () => ({ limit: () => ({ toArray: async () => entries }) }),
        updateOne: async (query, update, opts) => {
          updated.push({ query, update, opts });
          return { acknowledged: true };
        }
      })
    };

    const mk = new MkCentralApi();

    // Mock getTeamFromRegistryLink
    mk.getTeamFromRegistryLink = async (link) => ({ teamName: 'Mock Team', members: ['A', 'B'] });

    const results = await mk.refreshCache(db, { staleAfterHours: 24, limit: 10 });

    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    expect(updated.length).toBe(1);
    expect(updated[0].query).toEqual({ link: 'https://mkcentral.com/registry/1' });
  });

  it('returns error info if fetching team fails', async () => {
    const oldDate = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const entries = [ { link: 'https://mkcentral.com/registry/404', lastFetched: oldDate } ];

    const updated = [];

    const db = {
      collection: () => ({
        find: () => ({ limit: () => ({ toArray: async () => entries }) }),
        updateOne: async (query, update, opts) => {
          updated.push({ query, update, opts });
          return { acknowledged: true };
        }
      })
    };

    const mk = new MkCentralApi();

    // Mock failure
    mk.getTeamFromRegistryLink = async (link) => { throw new Error('404 not found'); };

    const results = await mk.refreshCache(db, { staleAfterHours: 24, limit: 10 });

    expect(results.length).toBe(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeDefined();
    expect(updated.length).toBe(0);
  });

  it('respects limit and processes up to concurrency', async () => {
    const oldDate = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const entries = Array.from({ length: 5 }).map((_, i) => ({ link: `https://mkcentral.com/registry/${i + 1}`, lastFetched: oldDate }));

    const updated = [];
    const calls = [];

    const db = {
      collection: () => ({
        find: () => ({ limit: () => ({ toArray: async () => entries }) }),
        updateOne: async (query, update, opts) => {
          updated.push({ query, update, opts });
          return { acknowledged: true };
        }
      })
    };

    const mk = new MkCentralApi();

    mk.getTeamFromRegistryLink = async (link) => {
      calls.push(link);
      return { teamName: 'Mock Team', members: ['A'] };
    };

    const results = await mk.refreshCache(db, { staleAfterHours: 24, limit: 2, concurrency: 2 });

    expect(results.length).toBe(2);
    expect(calls.length).toBe(2);
    expect(updated.length).toBe(2);
    expect(updated[0].query).toEqual({ link: 'https://mkcentral.com/registry/1' });
  });
});
