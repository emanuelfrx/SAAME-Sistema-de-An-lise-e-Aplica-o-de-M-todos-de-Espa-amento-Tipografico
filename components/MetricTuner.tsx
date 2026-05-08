
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TracySettings, FontState } from '../types';
import { Settings2, RotateCcw, Sparkles } from 'lucide-react';
import { GlyphVisualizer } from './GlyphVisualizer';
import { calculateHarmonicSpacing, getCharMetrics } from '../services/fontService';
import { TheoreticalTooltip } from './TheoreticalTooltip';

// --- NEW COMPONENT: LiveTestWord ---
// Renders text that updates metrics visually via CSS margins instantly, 
// compensating for the delay in font file regeneration.
interface LiveTestWordProps {
  word: string;
  fontFamily: string;
  font: FontState | null;
  settings: TracySettings;
}

const LiveTestWord: React.FC<LiveTestWordProps> = React.memo(({ word, fontFamily, font, settings }) => {
    const chars = word.split('');
    const upm = font?.metrics.unitsPerEm || 1000;
    
    // Scale factor to convert font units to CSS 'em'
    // 1em in CSS = fontSize. The metrics are in UPM.
    // So shift in em = value / UPM.
    
    return (
        <div 
            className="text-2xl md:text-3xl text-center mb-1 tracking-normal text-white break-all whitespace-nowrap" 
            style={{ fontFamily: `'${fontFamily}'` }}
        >
            {chars.map((char, i) => {
                // 1. Get the CURRENT metric being rendered by the font file (Base Truth)
                const baseMetrics = (font && font.fontObj) ? getCharMetrics(font.fontObj, char) : { lsb: 0, rsb: 0 };
                
                // 2. Get the TARGET metric from local sliders (Live Truth)
                let targetLsb = baseMetrics.lsb;
                let targetRsb = baseMetrics.rsb;

                // Resolve Target: Check Overrides first, then Masters
                if (settings.overrides[char]) {
                    if (settings.overrides[char].lsb !== null) targetLsb = settings.overrides[char].lsb!;
                    if (settings.overrides[char].rsb !== null) targetRsb = settings.overrides[char].rsb!;
                } else if (['H', 'O', 'n', 'o'].includes(char)) {
                    // If it's a master char, use the master setting
                    const master = settings[char as keyof Pick<TracySettings, 'H'|'O'|'n'|'o'>];
                    targetLsb = master.lsb;
                    targetRsb = master.rsb;
                }
                
                // 3. Calculate Delta (The difference between what user wants and what font currently shows)
                const deltaL = targetLsb - baseMetrics.lsb;
                const deltaR = targetRsb - baseMetrics.rsb;

                // 4. Apply CSS Compensation
                // We use margin to simulate the sidebearing change
                const style = {
                    marginLeft: `${deltaL / upm}em`,
                    marginRight: `${deltaR / upm}em`,
                    display: 'inline-block' // Required for margins to work on span
                };

                return <span key={i} style={style}>{char}</span>
            })}
        </div>
    );
});

interface TunerBlockProps {
  char: keyof TracySettings;
  title: string;
  testWords: string[];
  settings: TracySettings;
  onUpdate: (char: keyof TracySettings, side: 'lsb' | 'rsb' | 'both', val: number) => void;
  font: FontState | null;
  fontFamily: string;
  onAuto?: (char: string) => void;
  symmetrical?: boolean;
}

const TunerBlock: React.FC<TunerBlockProps> = React.memo(({ char, title, testWords, settings, onUpdate, font, fontFamily, onAuto, symmetrical = false }) => {
  // Explicitly access LSB and RSB from the settings object to ensure inputs reflect state
  const currentLsb = (settings[char] as any).lsb;
  const currentRsb = (settings[char] as any).rsb;

  return (
      <section className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-blue-400 text-xs uppercase tracking-[0.2em]">{title}</h3>
                         {onAuto && (
                             <button 
                                onClick={() => onAuto(char as string)} 
                                className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-blue-500/20 transition-all"
                                title="Harmonizar com base no peso e forma"
                             >
                                 <Sparkles className="w-3 h-3" /> Auto
                             </button>
                         )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6 order-2 lg:order-1">
                    <div className="space-y-4">
                        {symmetrical ? (
                            /* Symmetrical Control (Standard H) */
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-gray-400">
                                        Espaçamento Símétrico (x/2)
                                        <TheoreticalTooltip content="Walter Tracy recomenda que os masters 'H' e 'O' tenham espaçamentos iguais em ambos os lados para garantir o ritmo." />
                                    </label>
                                    <input 
                                        type="number"
                                        value={currentLsb}
                                        onChange={(e) => onUpdate(char, 'both', Number(e.target.value))}
                                        className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-right text-xs text-blue-300 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={currentLsb} 
                                    onChange={(e) => onUpdate(char, 'both', Number(e.target.value))}
                                    className="w-full accent-blue-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <p className="text-[9px] text-slate-500 mt-2 italic">Ajusta LSB e RSB simultaneamente para equilíbrio absoluto.</p>
                            </div>
                        ) : (
                            <>
                                {/* LSB Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs text-gray-400">
                                            Distância à Esquerda
                                            <TheoreticalTooltip content="Espaço lateral esquerdo (LSB). Controla a distância em relação ao caractere anterior." />
                                        </label>
                                        <input 
                                            type="number"
                                            value={currentLsb}
                                            onChange={(e) => onUpdate(char, 'lsb', Number(e.target.value))}
                                            className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-right text-xs text-blue-300 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <input 
                                        type="range" min="-50" max="300" value={currentLsb} 
                                        onChange={(e) => onUpdate(char, 'lsb', Number(e.target.value))}
                                        className="w-full accent-blue-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                {/* RSB Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs text-gray-400">
                                            Distância à Direita
                                            <TheoreticalTooltip content={char === 'n' ? "Lado do arco: Tracy recomenda que seja ligeiramente menor que o lado da haste." : "Espaço lateral direito (RSB)."} />
                                        </label>
                                        <input 
                                            type="number"
                                            value={currentRsb}
                                            onChange={(e) => onUpdate(char, 'rsb', Number(e.target.value))}
                                            className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-right text-xs text-green-300 focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <input 
                                        type="range" min="-50" max="300" value={currentRsb} 
                                        onChange={(e) => onUpdate(char, 'rsb', Number(e.target.value))}
                                        className="w-full accent-green-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                
                {/* Text Preview (Live) */}
                <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800">
                    {testWords.map(w => (
                        <LiveTestWord key={w} word={w} fontFamily={fontFamily} font={font} settings={settings} />
                    ))}
                </div>
            </div>

            {/* Visualizer */}
            <div className="h-48 md:h-64 lg:h-auto order-1 lg:order-2 min-h-[250px]">
                <GlyphVisualizer 
                    char={char as string} 
                    font={font} 
                    lsb={currentLsb} 
                    rsb={currentRsb} 
                />
            </div>
          </div>
      </section>
  );
});

interface MetricTunerProps {
  settings: TracySettings;
  onSettingsChange: (newSettings: TracySettings) => void;
  fontFamily: string;
  font: FontState | null;
}

export const MetricTuner: React.FC<MetricTunerProps> = ({ settings, onSettingsChange, fontFamily, font }) => {
  const [localSettings, setLocalSettings] = useState<TracySettings>(settings);
  const [overrideChar, setOverrideChar] = useState<string>('B');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (char: keyof TracySettings, side: 'lsb' | 'rsb' | 'both', val: number) => {
    const newSettings = {
      ...localSettings,
      [char]: side === 'both' ? { lsb: val, rsb: val } : {
        ...localSettings[char],
        [side]: val
      }
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleAutoCalc = (char: string) => {
      if (!font || !font.fontObj) return;
      
      const harmonicSpacing = calculateHarmonicSpacing(font.fontObj, char);
      
      const newSettings = {
          ...localSettings,
          [char]: {
              lsb: harmonicSpacing,
              rsb: char === 'n' ? Math.round(harmonicSpacing * 0.9) : harmonicSpacing 
          }
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  // --- Dynamic Character List Generation ---
  // Extracts all available unicode glyphs from the font to populate the selector
  const availableChars = useMemo(() => {
    if (!font || !font.fontObj) {
        // Fallback default list
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
    }

    const uniqueChars = new Set<string>();
    
    // 1. Add Priority Characters (ASCII)
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('').forEach(c => uniqueChars.add(c));

    // 2. Scan font for all other unicodes
    const numGlyphs = font.fontObj.glyphs.length;
    for (let i = 0; i < numGlyphs; i++) {
        const glyph = font.fontObj.glyphs.get(i);
        if (glyph.unicode) {
            try {
                const char = String.fromCodePoint(glyph.unicode);
                // Exclude control characters and empty strings
                if (char && char.trim() !== '') {
                    uniqueChars.add(char);
                }
            } catch (e) {
                // Ignore invalid codepoints
            }
        }
    }

    return Array.from(uniqueChars);
  }, [font]);

  // --- Override Logic ---
  
  // Get the CURRENT metrics for the override char from the font object itself (Fallback/Background truth)
  const currentOverrideMetrics = useMemo(() => {
      if (!font || !font.fontObj) return { lsb: 0, rsb: 0 };
      const glyph = font.fontObj.charToGlyph(overrideChar);
      if (!glyph) return { lsb: 0, rsb: 0 };
      
      const box = glyph.getBoundingBox();
      const lsb = box.x1;
      const rsb = glyph.advanceWidth - box.x2;
      return { lsb: Math.round(lsb), rsb: Math.round(rsb) };
  }, [font, overrideChar]);

  const hasOverride = useMemo(() => {
      return !!localSettings.overrides[overrideChar];
  }, [localSettings.overrides, overrideChar]);

  // CRITICAL FIX: Determines the value to display in the UI.
  // 1. If an override exists in local state, use it (Instant feedback).
  // 2. If not, fallback to the calculated metric from the font (Derived).
  // This solves the "stuck slider" issue caused by useMemo conflict.
  const displayLsb = localSettings.overrides[overrideChar]?.lsb ?? currentOverrideMetrics.lsb;
  const displayRsb = localSettings.overrides[overrideChar]?.rsb ?? currentOverrideMetrics.rsb;

  const updateOverride = (side: 'lsb' | 'rsb', val: number) => {
      const current = localSettings.overrides[overrideChar] || { lsb: null, rsb: null }; // Null means use rule
      
      // When we update one side, we must ensure the OTHER side is set to a concrete value
      // otherwise it might flip back to null/derived behavior unpredictably if we only store partial state.
      const safeLsb = current.lsb !== null ? current.lsb : currentOverrideMetrics.lsb;
      const safeRsb = current.rsb !== null ? current.rsb : currentOverrideMetrics.rsb;

      const newOverride = {
          lsb: side === 'lsb' ? val : safeLsb,
          rsb: side === 'rsb' ? val : safeRsb
      };

      const newSettings = {
          ...localSettings,
          overrides: {
              ...localSettings.overrides,
              [overrideChar]: newOverride
          }
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  const resetOverride = () => {
      const newOverrides = { ...localSettings.overrides };
      delete newOverrides[overrideChar];
      const newSettings = {
          ...localSettings,
          overrides: newOverrides
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  // Generate test context for overrides
  const overrideContext = useMemo(() => {
     // Check if char is generally uppercase or lowercase to decide context
     const isUpper = overrideChar.toUpperCase() === overrideChar && overrideChar.toLowerCase() !== overrideChar;
     // Numbers and Symbols default to uppercase context (HHO..) usually looks better for alignment check
     if (isUpper || !overrideChar.match(/[a-z]/)) {
         return [`HH${overrideChar}HH`, `OO${overrideChar}OO`];
     } else {
         return [`nn${overrideChar}nn`, `oo${overrideChar}oo`];
     }
  }, [overrideChar]);

  return (
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6 md:p-8 border border-slate-800 h-full overflow-y-auto custom-scrollbar shadow-2xl">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800 sticky top-0 bg-slate-900/90 z-10 backdrop-blur-sm -mx-2 px-2">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">
                    Método de Tracy
                    <TheoreticalTooltip content="O método de Walter Tracy utiliza 'caracteres-chaves' (H, O, n, o) para definir o espaçamento, propagando estas métricas para todo o alfabeto com base nas formas." />
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Espaçamento de Caracteres-Chave</p>
            </div>
        </div>
      </div>

      <div className="space-y-8 pb-10">
        <div className="space-y-6">
            <TunerBlock 
                char="H" 
                title="Ajuste de Hastes (Maiúsculas)" 
                testWords={['HHHH']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
                symmetrical={true}
            />
            <TunerBlock 
                char="O" 
                title="Ajuste Circular (Maiúsculas)" 
                testWords={['HHOHH', 'HHOOHH']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
                symmetrical={true}
            />
            <TunerBlock 
                char="n" 
                title="Ajuste de Hastes (Minúsculas)" 
                testWords={['nnnn']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
            />
            <TunerBlock 
                char="o" 
                title="Ajuste Circular (Minúsculas)" 
                testWords={['nnonn', 'nnonon', 'nnoonn']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
                symmetrical={true}
            />
        </div>

        {/* Detailed Propagation Tuning */}
        <div className="mt-12 border-t border-slate-800 pt-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
                        Ajustes de Exceção
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Sobrescreva as regras para glifos específicos (H3/H5)</p>
                </div>
            </div>
            
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
                 {/* Selector */}
                 <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                     <div className="flex-1">
                         <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Seletor de Glifo de Referência</label>
                         <select 
                            value={overrideChar}
                            onChange={(e) => setOverrideChar(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm shadow-inner focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                         >
                             {availableChars.map(c => (
                                 <option key={c} value={c}>
                                     {c} (U+{c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')})
                                 </option>
                             ))}
                         </select>
                     </div>
                     
                     <div className="text-sm text-slate-400 flex flex-col justify-end">
                         <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                             <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                             {hasOverride ? (
                                 <motion.span initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-yellow-400 font-black px-3 py-1 bg-yellow-400/10 rounded-lg border border-yellow-400/20 text-[10px] uppercase tracking-widest">Sobrescrito</motion.span>
                             ) : (
                                 <span className="text-blue-400 font-black px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 text-[10px] uppercase tracking-widest">Por Regra</span>
                             )}
                         </div>

                         {hasOverride && (
                             <button onClick={resetOverride} className="text-[10px] text-red-400 hover:text-red-300 font-black uppercase tracking-widest flex items-center gap-1.5 mt-3 justify-end transition-colors">
                                 <RotateCcw className="w-3 h-3" /> Restaurar Original
                             </button>
                         )}
                     </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6 order-2 lg:order-1">
                        <div className="space-y-4">
                            {/* Override LSB */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-slate-400">Distância à Esquerda</label>
                                    <input 
                                        type="number"
                                        value={displayLsb}
                                        onChange={(e) => updateOverride('lsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs font-bold outline-none transition-all ${hasOverride ? 'border-yellow-600 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'border-slate-700 text-blue-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={displayLsb}
                                    onChange={(e) => updateOverride('lsb', Number(e.target.value))}
                                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                             {/* Override RSB */}
                             <div>
                                 <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-slate-400">Distância à Direita</label>
                                    <input 
                                        type="number"
                                        value={displayRsb}
                                        onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs font-bold outline-none transition-all ${hasOverride ? 'border-yellow-600 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'border-slate-700 text-green-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={displayRsb}
                                    onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                    className="w-full accent-green-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                         {/* Text Preview (Live) */}
                        <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800">
                             {overrideContext.map(w => (
                                <LiveTestWord key={w} word={w} fontFamily={fontFamily} font={font} settings={localSettings} />
                            ))}
                        </div>
                    </div>
                    
                    {/* Visualizer */}
                    <div className="h-48 md:h-64 lg:h-auto order-1 lg:order-2 min-h-[250px]">
                        <GlyphVisualizer 
                            char={overrideChar} 
                            font={font} 
                            lsb={displayLsb} 
                            rsb={displayRsb} 
                        />
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
