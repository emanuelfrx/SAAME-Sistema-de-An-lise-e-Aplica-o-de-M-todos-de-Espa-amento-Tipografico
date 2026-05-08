
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

interface TheoreticalTooltipProps {
  content: string;
}

export const TheoreticalTooltip: React.FC<TheoreticalTooltipProps> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-block ml-1.5 align-middle group">
      <span
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="p-0.5 text-slate-500 hover:text-blue-400 transition-colors cursor-help inline-flex"
      >
        <Info className="w-3.5 h-3.5" />
      </span>

      <AnimatePresence>
        {isVisible && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute z-[100] left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-none"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400 mb-2 block border-b border-slate-800 pb-2">Fundamento Tipográfico</span>
            <span className="text-[11px] leading-relaxed text-slate-300 font-medium block">
              {content}
            </span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-l border-t border-slate-800 rotate-45 -mb-1.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};
