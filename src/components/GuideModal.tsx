import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { Boss } from '../constants';

interface GuideModalProps {
  boss: Boss | null;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ boss, onClose }) => {
  return (
    <AnimatePresence>
      {boss && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="relative h-32 sm:h-40 bg-stone-800 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent z-10" />
              <img 
                src={boss.imageUrl} 
                alt={boss.name} 
                className="w-full h-full object-contain p-4 opacity-50"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 left-6 z-20">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-500 drop-shadow-md">
                  {boss.name}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-30 p-2 bg-black/20 hover:bg-black/40 rounded-full text-stone-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="text-amber-600 shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Как найти
                    </h3>
                    <p className="text-stone-200 leading-relaxed text-base">
                      {boss.guide}
                    </p>
                  </div>
                </div>

                {boss.loot && boss.loot.length > 0 && (
                  <div className="flex items-start gap-3">
                    <BookOpen className="text-amber-600 shrink-0 mt-1" size={20} />
                    <div>
                      <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-1">
                        Награда
                      </h3>
                      <ul className="list-disc list-inside text-stone-200 space-y-1 text-base">
                        {boss.loot.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-stone-800">
                  <a 
                    href={boss.wikiUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-500 transition-colors text-sm font-medium"
                  >
                    <span>Открыть на Wiki</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
