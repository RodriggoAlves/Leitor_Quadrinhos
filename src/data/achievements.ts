import type { ReadingStats, Achievement } from '../types';

/**
 * Centralized achievement definitions.
 * To add new achievements: just add entries here — the check logic runs automatically.
 */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;          // emoji
  check: (stats: ReadingStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-comic',
    name: 'Primeira Leitura',
    description: 'Leia 1 quadrinho completo',
    icon: '📖',
    check: (s) => s.totalReadComics >= 1,
  },
  {
    id: 'reader-5',
    name: 'Leitor Iniciante',
    description: 'Leia 5 quadrinhos',
    icon: '📚',
    check: (s) => s.totalReadComics >= 5,
  },
  {
    id: 'reader-10',
    name: 'Leitor Dedicado',
    description: 'Leia 10 quadrinhos',
    icon: '🏆',
    check: (s) => s.totalReadComics >= 10,
  },
  {
    id: 'reader-25',
    name: 'Leitor Voraz',
    description: 'Leia 25 quadrinhos',
    icon: '🔥',
    check: (s) => s.totalReadComics >= 25,
  },
  {
    id: 'reader-50',
    name: 'Mestre dos Quadrinhos',
    description: 'Leia 50 quadrinhos',
    icon: '👑',
    check: (s) => s.totalReadComics >= 50,
  },
  {
    id: 'reader-100',
    name: 'Lenda',
    description: 'Leia 100 quadrinhos',
    icon: '⭐',
    check: (s) => s.totalReadComics >= 100,
  },
  {
    id: 'pages-100',
    name: 'Centenário',
    description: 'Leia 100 páginas no total',
    icon: '📄',
    check: (s) => s.totalPagesRead >= 100,
  },
  {
    id: 'pages-500',
    name: 'Maratonista',
    description: 'Leia 500 páginas no total',
    icon: '🏅',
    check: (s) => s.totalPagesRead >= 500,
  },
  {
    id: 'pages-1000',
    name: 'Incansável',
    description: 'Leia 1000 páginas no total',
    icon: '💎',
    check: (s) => s.totalPagesRead >= 1000,
  },
];

/**
 * Check all achievements against current stats.
 * Returns the updated achievements array with newly unlocked ones.
 */
export function checkAchievements(
  stats: ReadingStats,
  current: Achievement[]
): { achievements: Achievement[]; newlyUnlocked: AchievementDef[] } {
  const existing = new Map(current.map(a => [a.id, a]));
  const newlyUnlocked: AchievementDef[] = [];

  for (const def of ACHIEVEMENTS) {
    const a = existing.get(def.id);
    if (a?.unlockedAt) continue; // already unlocked
    if (def.check(stats)) {
      existing.set(def.id, { id: def.id, unlockedAt: Date.now() });
      newlyUnlocked.push(def);
    } else if (!a) {
      existing.set(def.id, { id: def.id }); // locked placeholder
    }
  }

  return {
    achievements: Array.from(existing.values()),
    newlyUnlocked,
  };
}
