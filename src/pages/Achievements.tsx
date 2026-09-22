import React, { useState, useEffect } from 'react';
import { storage } from '../services/StorageService';
import type { Achievement, ReadingStats } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import type { AchievementDef } from '../data/achievements';

export const Achievements: React.FC = () => {
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const load = async () => {
      const loadedStats = await storage.getStats();
      const loadedAchievements = await storage.getAchievements();
      setStats(loadedStats);
      setAchievements(loadedAchievements);
    };
    load();
  }, []);

  const isUnlocked = (id: string): Achievement | undefined => {
    return achievements.find((a) => a.id === id && a.unlockedAt);
  };

  return (
    <div className="pt-20 pb-24">
      {/* Stats Summary */}
      <div className="flex gap-4 px-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-xl p-4 flex-1 text-center">
          <div className="text-2xl font-black text-[#e50914]">
            {stats?.totalReadComics ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">HQs Lidas</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 flex-1 text-center">
          <div className="text-2xl font-black text-[#e50914]">
            {stats?.totalPagesRead ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Páginas Lidas</div>
        </div>
      </div>

      {/* Section Title */}
      <h2 className="text-lg font-bold mb-4 px-4">Conquistas</h2>

      {/* Achievement Cards */}
      <div className="px-4 flex flex-col gap-3">
        {ACHIEVEMENTS.map((def: AchievementDef) => {
          const unlocked = isUnlocked(def.id);

          return (
            <div
              key={def.id}
              className={`bg-[#1a1a1a] rounded-xl p-4 flex items-center gap-4${
                !unlocked ? ' opacity-60' : ''
              }`}
            >
              {/* Icon Container */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl${
                  unlocked ? ' bg-[#e50914]/20' : ' bg-gray-800 grayscale'
                }`}
              >
                {unlocked ? def.icon : '🔒'}
              </div>

              {/* Right Side */}
              <div>
                <div className="font-semibold">{def.name}</div>
                <div className="text-xs text-gray-500">{def.description}</div>
                {unlocked && unlocked.unlockedAt && (
                  <div className="text-[10px] text-[#e50914]">
                    Desbloqueada em{' '}
                    {new Date(unlocked.unlockedAt).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
