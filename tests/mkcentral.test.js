import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { MkCentralApi } from '@/lib/mkcentral';

let mock;

beforeEach(() => {
  mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
});

describe('MkCentralApi', () => {
  it('findRegistryLinkFromLounge returns link when found', async () => {
    const html = `
      <html>
        <body>
          <a href="https://mkcentral.com/registry/123">Registry</a>
        </body>
      </html>
    `;

    mock.onGet('https://lounge.mkcentral.com/mk8dx/player?name=RacerPro').reply(200, html);

    const mk = new MkCentralApi();
    const link = await mk.findRegistryLinkFromLounge('RacerPro');

    expect(link).toBe('https://mkcentral.com/registry/123');
  });

  it('getTeamFromRegistryLink parses team data, members, stats and admin', async () => {
    const html = `
      <html>
        <body>
          <h1 class="team-name">Team Fast</h1>
          <div class="team-stats">
            <div class="stat"><span class="label">Wins</span><span class="value">12</span></div>
            <div class="stat"><span class="label">Losses</span><span class="value">3</span></div>
          </div>

          <ul class="team-members">
            <li>RacerOne</li>
            <li>SpeedTwo</li>
          </ul>

          <div class="team-admin"><a href="mailto:admin@team.com">Contact</a></div>
        </body>
      </html>
    `;

    mock.onGet('https://mkcentral.com/registry/123').reply(200, html);

    const mk = new MkCentralApi();
    const team = await mk.getTeamFromRegistryLink('https://mkcentral.com/registry/123');

    expect(team.teamName).toBe('Team Fast');
    expect(team.members).toEqual(['RacerOne', 'SpeedTwo']);
    expect(team.stats).toBeTruthy();
    expect(team.stats.Wins).toBe('12');
    expect(team.adminContact).toBe('mailto:admin@team.com');
  });

  it('getTeamFromRegistryLink fallback to anchor player links', async () => {
    const html = `
      <html>
        <body>
          <h1>Some Team Page</h1>
          <a href="/player/abc">RacerX</a>
        </body>
      </html>
    `;

    mock.onGet('https://mkcentral.com/registry/456').reply(200, html);

    const mk = new MkCentralApi();
    const team = await mk.getTeamFromRegistryLink('https://mkcentral.com/registry/456');

    expect(team.members).toContain('RacerX');
  });

  it('findRegistryLinkFromLounge returns null when not found', async () => {
    const html = `<html><body>No links here</body></html>`;
    mock.onGet('https://lounge.mkcentral.com/mk8dx/player?name=Nope').reply(200, html);

    const mk = new MkCentralApi();
    const link = await mk.findRegistryLinkFromLounge('Nope');
    expect(link).toBeNull();
  });

  it('getTeamFromRegistryLink throws on 404', async () => {
    mock.onGet('https://mkcentral.com/registry/404').reply(404);

    const mk = new MkCentralApi();
    await expect(mk.getTeamFromRegistryLink('https://mkcentral.com/registry/404')).rejects.toThrow();
  });
});
