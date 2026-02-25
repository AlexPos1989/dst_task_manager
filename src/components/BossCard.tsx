import React, { useState } from 'react';
import { Boss, CROSS_OUT_ANIMATION_DURATION } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Info, BookOpen } from 'lucide-react';
import { playSlashSound } from '../utils/sound';

interface BossCardProps {
  boss: Boss;
  isKilled: boolean;
  onToggle: (id: string) => void;
  onShowGuide: (boss: Boss) => void;
}

export const BossCard: React.FC<BossCardProps> = ({ boss, isKilled, onToggle, onShowGuide }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showGrayscale, setShowGrayscale] = useState(isKilled);

  React.useEffect(() => {
    if (isKilled) {
      // Total animation duration = duration + delay of second line
      // First line: duration
      // Second line: starts at 0.5 * duration, lasts duration.
      // Total time until full cross is drawn = 1.5 * duration.
      // Let's wait a bit longer to be safe or exactly that.
      const totalDurationMs = CROSS_OUT_ANIMATION_DURATION * 1.5 * 1000;
      const timer = setTimeout(() => {
        setShowGrayscale(true);
      }, totalDurationMs);
      return () => clearTimeout(timer);
    } else {
      setShowGrayscale(false);
    }
  }, [isKilled]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onShowGuide(boss);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => {
        if (!isKilled) {
          setShowTooltip(true);
        }
      }}
      onHoverEnd={() => setShowTooltip(false)}
      onClick={() => {
        if (!isKilled) {
          playSlashSound();
        }
        setShowTooltip(false);
        onToggle(boss.id);
      }}
      onContextMenu={handleContextMenu}
      className={`relative cursor-pointer rounded-xl overflow-hidden shadow-lg transition-all duration-500 bg-stone-800 border-2 group ${
        showGrayscale ? 'border-red-900/50 grayscale' : 'border-stone-600 hover:border-amber-500'
      }`}
    >
      <div className="aspect-square w-full relative p-4 flex items-center justify-center bg-stone-900/50">
        <img
          src={boss.imageUrl}
          alt={boss.name}
          className={`object-contain w-full h-full transition-opacity duration-500 ${
            showGrayscale ? 'opacity-50' : 'opacity-100'
          }`}
          referrerPolicy="no-referrer"
        />
        
        <AnimatePresence>
          {isKilled && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full p-4 drop-shadow-lg overflow-visible">
                <motion.line 
                  x1="10" y1="10" x2="90" y2="90" 
                  stroke="#ef4444" 
                  strokeWidth="8" 
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: CROSS_OUT_ANIMATION_DURATION, ease: "easeOut" }}
                />
                <motion.line 
                  x1="90" y1="10" x2="10" y2="90" 
                  stroke="#ef4444" 
                  strokeWidth="8" 
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: CROSS_OUT_ANIMATION_DURATION, ease: "easeOut", delay: CROSS_OUT_ANIMATION_DURATION * 0.5 }}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 bg-stone-900/40 p-4 flex flex-col items-center justify-center text-center backdrop-blur-sm"
            >
              <p className="text-stone-200 text-sm font-medium leading-relaxed drop-shadow-md">
                {boss.description}
              </p>
              <div className="mt-2 text-amber-500 text-xs flex flex-col gap-1 opacity-90 drop-shadow-md">
                <div className="flex items-center justify-center gap-1">
                  <Info size={12} />
                  <span>ЛКМ: Отметить</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <BookOpen size={12} />
                  <span>ПКМ: Гайд</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className={`p-3 text-center font-serif tracking-wide h-16 flex items-center justify-center transition-colors duration-500 ${showGrayscale ? 'bg-red-900/20 text-stone-500 line-through' : 'bg-stone-800 text-stone-200'}`}>
        <h3 className="text-sm sm:text-base font-bold leading-tight line-clamp-2">{boss.name}</h3>
      </div>
    </motion.div>
  );
};
