export const mockPlayerData = {
  ign: 'RacerPro',
  mmr: 9250,
  rank: 'Platinum',
  winRate: 64.5,
  totalRaces: 432,
  wins: 278,
  losses: 154,
  currentStreak: 5,
  avgPosition: 4.2,
  peakMMR: 9680
};

export const mockMMRHistory = [
  { date: '2025-05-15', mmr: 8450 },
  { date: '2025-05-17', mmr: 8620 },
  { date: '2025-05-19', mmr: 8540 },
  { date: '2025-05-21', mmr: 8780 },
  { date: '2025-05-23', mmr: 8920 },
  { date: '2025-05-25', mmr: 8850 },
  { date: '2025-05-27', mmr: 9100 },
  { date: '2025-05-29', mmr: 9050 },
  { date: '2025-05-31', mmr: 9280 },
  { date: '2025-06-02', mmr: 9150 },
  { date: '2025-06-04', mmr: 9420 },
  { date: '2025-06-06', mmr: 9380 },
  { date: '2025-06-08', mmr: 9250 },
  { date: '2025-06-10', mmr: 9450 },
  { date: '2025-06-12', mmr: 9250 }
];

export const mockMatchHistory = [
  { id: 1, track: 'rRR', position: 2, mmrChange: +42, result: 'win', date: '2025-06-12 18:30' },
  { id: 2, track: 'bYV', position: 5, mmrChange: -18, result: 'loss', date: '2025-06-12 17:45' },
  { id: 3, track: 'dHC', position: 1, mmrChange: +58, result: 'win', date: '2025-06-11 21:15' },
  { id: 4, track: 'bDS', position: 3, mmrChange: +28, result: 'win', date: '2025-06-11 20:30' },
  { id: 5, track: 'rMR', position: 7, mmrChange: -32, result: 'loss', date: '2025-06-10 19:00' },
  { id: 6, track: 'bCMa', position: 2, mmrChange: +45, result: 'win', date: '2025-06-10 18:15' },
  { id: 7, track: 'dBP', position: 4, mmrChange: +15, result: 'win', date: '2025-06-09 22:00' },
  { id: 8, track: 'rBC', position: 8, mmrChange: -25, result: 'loss', date: '2025-06-09 21:15' },
  { id: 9, track: 'bCMo', position: 1, mmrChange: +62, result: 'win', date: '2025-06-08 20:30' },
  { id: 10, track: 'dMKS', position: 3, mmrChange: +38, result: 'win', date: '2025-06-08 19:45' }
];

export const mockTeamMembers = [
  { id: 1, name: 'RacerPro', status: 'online', mmr: 9250, rank: 'Platinum' },
  { id: 2, name: 'SpeedDemon', status: 'online', mmr: 8920, rank: 'Platinum' },
  { id: 3, name: 'DriftKing', status: 'offline', mmr: 10450, rank: 'Sapphire' },
  { id: 4, name: 'ShellMaster', status: 'offline', mmr: 7850, rank: 'Gold' }
];

export const mockTournaments = [
  {
    id: 1,
    name: 'Weekly Squad Queue',
    format: '4v4',
    date: '2025-06-15',
    time: '20:00 UTC',
    status: 'upcoming',
    participants: 24
  },
  {
    id: 2,
    name: 'MKCentral Championship',
    format: '6v6',
    date: '2025-06-22',
    time: '18:00 UTC',
    status: 'registration',
    participants: 48
  },
  {
    id: 3,
    name: 'Solo Lounge Mogi',
    format: 'FFA 12',
    date: '2025-06-13',
    time: '19:00 UTC',
    status: 'live',
    participants: 12
  }
];

export const rankThresholds = [
  { name: 'Iron', mmr: 0, color: '#6B7280' },
  { name: 'Bronze', mmr: 2000, color: '#CD7F32' },
  { name: 'Silver', mmr: 4000, color: '#C0C0C0' },
  { name: 'Gold', mmr: 6000, color: '#FFD700' },
  { name: 'Platinum', mmr: 8000, color: '#E5E4E2' },
  { name: 'Sapphire', mmr: 10000, color: '#0F52BA' },
  { name: 'Ruby', mmr: 12000, color: '#E0115F' },
  { name: 'Diamond', mmr: 14000, color: '#B9F2FF' },
  { name: 'Master', mmr: 16000, color: '#9B59B6' },
  { name: 'Grandmaster', mmr: 17000, color: '#F39C12' }
];

export function getCurrentRank(mmr) {
  for (let i = rankThresholds.length - 1; i >= 0; i--) {
    if (mmr >= rankThresholds[i].mmr) {
      return rankThresholds[i];
    }
  }
  return rankThresholds[0];
}

export function getNextRank(mmr) {
  const currentIndex = rankThresholds.findIndex((r, i) => {
    const nextRank = rankThresholds[i + 1];
    return mmr >= r.mmr && (!nextRank || mmr < nextRank.mmr);
  });
  
  if (currentIndex === -1 || currentIndex === rankThresholds.length - 1) {
    return null;
  }
  
  return rankThresholds[currentIndex + 1];
}