/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BOSSES, Boss, BOSS_GROUPS, BOSS_VISIBILITY, BossGroup, BOSS_GROUP_ORDER } from './constants';
import { BossCard } from './components/BossCard';
import { GuideModal } from './components/GuideModal';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [killedBosses, setKilledBosses] = useState<Set<string>>(new Set());

  const [selectedGuideBoss, setSelectedGuideBoss] = useState<Boss | null>(null);

  useEffect(() => {
    fetch('/api/bosses')
      .then(res => res.json())
      .then(data => setKilledBosses(new Set(data)))
      .catch(err => console.error('Failed to fetch bosses:', err));

    // WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'BOSS_TOGGLE') {
          setKilledBosses((prev) => {
            const newSet = new Set(prev);
            if (data.killed) {
              newSet.add(data.id);
            } else {
              newSet.delete(data.id);
            }
            return newSet;
          });
        } else if (data.type === 'BOSS_RESET') {
          setKilledBosses(new Set());
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      socket.close();
    };
  }, []);

  const toggleBoss = (id: string) => {
    // Optimistic update
    setKilledBosses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });

    fetch('/api/bosses/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    .then(res => res.json())
    .then(data => {
      // Re-sync if needed, or trust optimistic update
      // For now, optimistic is fine.
    })
    .catch(err => {
      console.error('Failed to toggle boss:', err);
      // Revert optimistic update on error
      setKilledBosses((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    });
  };

  const handleShowGuide = (boss: Boss) => {
    setSelectedGuideBoss(boss);
  };

  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isResetting) {
      const timer = setTimeout(() => setIsResetting(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isResetting]);

  const handleResetClick = () => {
    if (isResetting) {
      // Optimistic update
      setKilledBosses(new Set());
      setIsResetting(false);

      fetch('/api/bosses/reset', { method: 'POST' })
        .catch(err => {
          console.error('Failed to reset bosses:', err);
          // Re-fetch on error to restore state
          fetch('/api/bosses')
            .then(res => res.json())
            .then(data => setKilledBosses(new Set(data)));
        });
    } else {
      setIsResetting(true);
    }
  };

  // Filter visible bosses and group them
  const visibleBosses = useMemo(() => {
    return BOSSES.filter(boss => BOSS_VISIBILITY[boss.group]);
  }, []);

  const groupedBosses = useMemo(() => {
    const groups: Partial<Record<BossGroup, Boss[]>> = {};
    visibleBosses.forEach(boss => {
      if (!groups[boss.group]) {
        groups[boss.group] = [];
      }
      groups[boss.group]!.push(boss);
    });
    return groups;
  }, [visibleBosses]);

  // Calculate progress based on visible bosses only
  const killedVisibleCount = useMemo(() => {
    return visibleBosses.filter(boss => killedBosses.has(boss.id)).length;
  }, [visibleBosses, killedBosses]);

  const totalVisibleCount = visibleBosses.length;
  const progress = totalVisibleCount > 0 ? Math.round((killedVisibleCount / totalVisibleCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-amber-900 selection:text-white pb-20">
      <header className="sticky top-0 z-50 bg-stone-900/80 backdrop-blur-md border-b border-stone-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center shadow-inner">
              <span className="font-serif font-bold text-xl text-stone-950">D</span>
            </div>
            <h1 className="text-xl font-serif font-bold tracking-wider text-amber-500 hidden sm:block">
              Don't Starve Together <span className="text-stone-400 font-normal">Трекер Боссов</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-bold">Прогресс</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-bold text-amber-500">{killedVisibleCount}</span>
                <span className="text-sm text-stone-600">/</span>
                <span className="text-sm text-stone-500">{totalVisibleCount}</span>
              </div>
            </div>
            
            <button
              onClick={handleResetClick}
              className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                isResetting 
                  ? 'bg-red-600 text-white hover:bg-red-700 px-3' 
                  : 'text-stone-400 hover:text-red-400 hover:bg-red-900/20'
              }`}
              title={isResetting ? "Нажмите еще раз для подтверждения" : "Сбросить прогресс"}
            >
              <RotateCcw size={20} className={isResetting ? "animate-spin" : ""} />
              {isResetting && <span className="text-xs font-bold">Подтвердить</span>}
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-stone-800 w-full">
          <motion.div 
            className="h-full bg-gradient-to-r from-amber-700 to-red-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "circOut" }}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-100">
            Отслеживайте свои победы
          </h2>
          <p className="text-stone-400 max-w-2xl mx-auto">
            Нажмите на портрет босса, чтобы отметить его как побежденного. Константа беспощадна, но вы настойчивы.
          </p>
        </div>

        <div className="space-y-12">
          {BOSS_GROUP_ORDER.map((groupKey) => {
            const bossesInGroup = groupedBosses[groupKey];
            if (!bossesInGroup || bossesInGroup.length === 0) return null;

            return (
              <section key={groupKey} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-serif font-bold text-amber-500/90 uppercase tracking-widest pl-2 border-l-4 border-amber-700">
                    {BOSS_GROUPS[groupKey]}
                  </h3>
                  <div className="h-px flex-grow bg-gradient-to-r from-stone-800 to-transparent" />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  <AnimatePresence>
                    {bossesInGroup.map((boss) => (
                      <BossCard
                        key={boss.id}
                        boss={boss}
                        isKilled={killedBosses.has(boss.id)}
                        onToggle={toggleBoss}
                        onShowGuide={handleShowGuide}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>

        {totalVisibleCount > 0 && killedVisibleCount === totalVisibleCount && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 z-50"
          >
            <CheckCircle2 size={24} />
            <span>Все боссы повержены! Вы — повелитель Константы!</span>
          </motion.div>
        )}
      </main>
      
      <footer className="text-center py-8 text-stone-600 text-sm border-t border-stone-900 mt-12">
        <p>Изображения и данные взяты с <a href="https://dontstarve.fandom.com/wiki/Category:Boss_Monsters" target="_blank" rel="noreferrer" className="text-amber-700 hover:underline">Don't Starve Wiki</a>.</p>
        <p className="mt-2">Не связано с Klei Entertainment.</p>
      </footer>

      <GuideModal 
        boss={selectedGuideBoss} 
        onClose={() => setSelectedGuideBoss(null)} 
      />
    </div>
  );
}

