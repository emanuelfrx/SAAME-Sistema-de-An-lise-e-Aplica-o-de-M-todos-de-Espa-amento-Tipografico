
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SousaSettings, SousaGroups, FontState } from '../types';
import { generateAdhesionText, getCharMetrics } from '../services/fontService';
import { Settings2, RotateCcw, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { GlyphVisualizer } from './GlyphVisualizer';
import { TheoreticalTooltip } from './TheoreticalTooltip';

interface SousaTunerProps {
  settings: SousaSettings;
  onSettingsChange: (newSettings: SousaSettings) => void;
  fontFamily: string;
  font: FontState | null;
}

// --- NEW COMPONENT: LiveTestWord for Sousa ---
// Handles CSS Margin compensation for immediate feedback
interface LiveTestWordProps {
  word: string;
  fontFamily: string;
  font: FontState | null;
  settings: SousaSettings;
}

const LiveTestWord: React.FC<LiveTestWordProps> = React.memo(({ word, fontFamily, font, settings }) => {
    const chars = word.split('');
    const upm = font?.metrics.unitsPerEm || 1000;
    
    return (
        <div 
            className="text-2xl md:text-3xl tracking-normal text-white break-all mb-1 whitespace-nowrap" 
            style={{ fontFamily: `'${fontFamily}'` }}
        >
            {chars.map((char, i) => {
                // 1. Get Base Truth (Current Font File)
                const baseMetrics = (font && font.fontObj) ? getCharMetrics(font.fontObj, char) : { lsb: 0, rsb: 0 };
                
                // 2. Get Live Truth (Local Settings)
                let targetLsb = baseMetrics.lsb;
                let targetRsb = baseMetrics.rsb;

                // Priority: Overrides > Masters
                if (settings.overrides[char]) {
                     targetLsb = settings.overrides[char].lsb;
                     targetRsb = settings.overrides[char].rsb;
                } else if (['n', 'o', 'H', 'O'].includes(char)) {
                    const master = settings[char as keyof Pick<SousaSettings, 'n'|'o'|'H'|'O'>];
                    targetLsb = master.lsb;
                    targetRsb = master.rsb;
                }
                
                // 3. Diff
                const deltaL = targetLsb - baseMetrics.lsb;
                const deltaR = targetRsb - baseMetrics.rsb;

                // 4. CSS Compensation
                const style = {
                    marginLeft: `${deltaL / upm}em`,
                    marginRight: `${deltaR / upm}em`,
                    display: 'inline-block'
                };

                return <span key={i} style={style}>{char}</span>
            })}
        </div>
    );
});

// Reusable Block Component similar to MetricTuner's TunerBlock
interface SousaBlockProps {
    char: 'n' | 'o' | 'H' | 'O';
    title: string;
    contextWords: string[];
    settings: SousaSettings;
    onUpdate: (char: 'n' | 'o' | 'H' | 'O', side: 'lsb' | 'rsb', val: number) => void;
    font: FontState | null;
    fontFamily: string;
}

const SousaMasterBlock: React.FC<SousaBlockProps> = React.memo(({ char, title, contextWords, settings, onUpdate, font, fontFamily }) => {
    // Explicitly access LSB and RSB from settings to ensure binding to state
    const currentLsb = settings[char].lsb;
    const currentRsb = settings[char].rsb;

    return (
        <section className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-indigo-400 text-xs uppercase tracking-[0.2em]">{title}</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6 order-2 lg:order-1">
                    <div className="space-y-4">
                        {/* LSB Control */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs text-gray-400">
                                    Distância à Esquerda
                                    <TheoreticalTooltip content="Espaço lateral esquerdo. Controla a distância em relação ao caractere anterior." />
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
                                    <TheoreticalTooltip content="Espaço lateral direito. Garante o equilíbrio rítmico no fluxo de leitura contínua." />
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
                    </div>
                
                {/* Text Preview (Live) */}
                <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800 text-center">
                    {contextWords.map(w => (
                        <LiveTestWord key={w} word={w} fontFamily={fontFamily} font={font} settings={settings} />
                    ))}
                </div>
            </div>

            {/* Visualizer */}
            <div className="h-48 md:h-64 lg:h-auto order-1 lg:order-2 min-h-[250px]">
                <GlyphVisualizer 
                    char={char} 
                    font={font} 
                    lsb={settings[char].lsb} 
                    rsb={settings[char].rsb} 
                />
            </div>
            </div>
        </section>
    );
});

export const SousaTuner: React.FC<SousaTunerProps> = ({ settings, onSettingsChange, fontFamily, font }) => {
  // CRITICAL FIX: Local state ensures sliders don't stick due to parent re-render latency
  const [localSettings, setLocalSettings] = useState<SousaSettings>(settings);
  const [showGroups, setShowGroups] = useState(false);
  const [overrideChar, setOverrideChar] = useState<string>('a');

  // Sync prop changes to local state
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // --- Handlers ---

  const handleGroupChange = (groupKey: keyof SousaGroups, value: string) => {
    const chars = value.split('').filter(c => c.trim() !== '');
    const uniqueChars = Array.from(new Set(chars));
    const newSettings = {
        ...localSettings,
        groups: {
            ...localSettings.groups,
            [groupKey]: uniqueChars
        }
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleMasterChange = (char: 'n'|'o'|'H'|'O', side: 'lsb'|'rsb', val: number) => {
      const newSettings = {
          ...localSettings,
          [char]: { ...localSettings[char], [side]: val }
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  // --- Dynamic Character List Generation ---
  const availableChars = useMemo(() => {
    if (!font || !font.fontObj) {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
    }
    const uniqueChars = new Set<string>();
    // Priority chars
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split('').forEach(c => uniqueChars.add(c));
    
    // Scan font
    const numGlyphs = font.fontObj.glyphs.length;
    for (let i = 0; i < numGlyphs; i++) {
        const glyph = font.fontObj.glyphs.get(i);
        if (glyph.unicode) {
            try {
                const char = String.fromCodePoint(glyph.unicode);
                if (char && char.trim() !== '') uniqueChars.add(char);
            } catch (e) {}
        }
    }
    return Array.from(uniqueChars);
  }, [font]);

  // --- Detailed Tuning Logic ---

  const getCharGroupStatus = (char: string) => {
      const g = localSettings.groups;
      if (g.group1.includes(char)) return "Grupo 1 (Relacional)";
      if (g.group2.includes(char)) return "Grupo 2 (Semi)";
      if (g.group3.includes(char)) return "Grupo 3 (Visual)";
      if (g.upperGroup1.includes(char)) return "Grupo Superior 1 (Relacional)";
      if (g.upperGroup2.includes(char)) return "Grupo Superior 2 (Semi)";
      if (g.upperGroup3.includes(char)) return "Grupo Superior 3 (Visual)";
      return "Sem Grupo (Ajuste Visual)";
  };

  const getCurrentMetric = (side: 'lsb' | 'rsb') => {
     // 1. Explicit Override in local state?
     if (localSettings.overrides[overrideChar] && localSettings.overrides[overrideChar][side] !== undefined && localSettings.overrides[overrideChar][side] !== null) {
         return localSettings.overrides[overrideChar][side]!;
     }
     
     // 2. Fallback: Read actual metric from processed font
     if (font && font.fontObj) {
         const glyph = font.fontObj.charToGlyph(overrideChar);
         if (glyph) {
             const box = glyph.getBoundingBox();
             if (side === 'lsb') return Math.round(box.x1);
             if (side === 'rsb') return Math.round(glyph.advanceWidth - box.x2);
         }
     }
     return 0;
  };

  const hasOverride = useMemo(() => {
      return !!localSettings.overrides[overrideChar];
  }, [localSettings.overrides, overrideChar]);

  const updateOverride = (side: 'lsb' | 'rsb', val: number) => {
      const current = localSettings.overrides[overrideChar] || { lsb: null, rsb: null };
      
      // If setting one side, ensure the other side preserves its current state (derived or overridden)
      let otherSideVal = side === 'lsb' ? current.rsb : current.lsb;
      if (otherSideVal === null) {
          otherSideVal = getCurrentMetric(side === 'lsb' ? 'rsb' : 'lsb');
      }

      const newOverride = {
          lsb: side === 'lsb' ? val : otherSideVal,
          rsb: side === 'rsb' ? val : otherSideVal
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
      const newSettings = { ...localSettings, overrides: newOverrides };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  // Generate test context based on char case and group
  const overrideContext = useMemo(() => {
     const isUpper = overrideChar.toUpperCase() === overrideChar && overrideChar.toLowerCase() !== overrideChar;
     const group = isUpper ? localSettings.groups.upperGroup1 : localSettings.groups.group1;
     return [generateAdhesionText(overrideChar, group)];
  }, [overrideChar, localSettings.groups]);

  // Derived values for inputs come from local state logic now
  const currentLsb = getCurrentMetric('lsb');
  const currentRsb = getCurrentMetric('rsb');

  return (
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6 md:p-8 border border-slate-800 h-full overflow-y-auto custom-scrollbar shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800 sticky top-0 bg-slate-900/90 z-10 backdrop-blur-sm -mx-2 px-2">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">
                    Método de Sousa
                    <TheoreticalTooltip content="O método de Miguel Sousa foca no agrupamento baseado na estrutura de cada lado do glifo. Caracteres com estruturas similares (como 'n' e 'm') são ajustados juntos para garantir um valor de cinza uniforme e ritmo óptico em blocos de texto." />
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Controle por Grupos</p>
            </div>
        </div>
      </div>

      <div className="space-y-8 pb-10">

        {/* --- 1. Topology Configuration (Collapsible) --- */}
        <div className="bg-gray-900/30 border border-gray-700 rounded-lg overflow-hidden">
            <button 
                onClick={() => setShowGroups(!showGroups)}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-gray-200 text-sm">
                        Configuração de Grupos de letras
                        <TheoreticalTooltip content="Glifos são categorizados pela sua estrutura (hastes, curvas, diagonais). Isso garante que caracteres que compartilham a mesma estrutura sejam espaçados de forma consistente." />
                    </span>
                </div>
                {showGroups ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
            </button>
            
            {showGroups && (
                <div className="p-4 space-y-6 border-t border-gray-700 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Lowercase Groups */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1">Minúsculas</h4>
                            <div>
                                <label className="block text-[10px] font-semibold text-blue-400 mb-1">Grupo 1 (Relacional)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={localSettings.groups.group1.join('')}
                                    onChange={(e) => handleGroupChange('group1', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-green-400 mb-1">Grupo 2 (Semi-Relacional)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={localSettings.groups.group2.join('')}
                                    onChange={(e) => handleGroupChange('group2', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Grupo 3 (Visual)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={localSettings.groups.group3.join('')}
                                    onChange={(e) => handleGroupChange('group3', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Uppercase Groups */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1">Maiúsculas</h4>
                            <div>
                                <label className="block text-[10px] font-semibold text-blue-400 mb-1">Grupo 1 (Relacional)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={localSettings.groups.upperGroup1.join('')}
                                    onChange={(e) => handleGroupChange('upperGroup1', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-green-400 mb-1">Grupo 2 (Semi-Relacional)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={localSettings.groups.upperGroup2.join('')}
                                    onChange={(e) => handleGroupChange('upperGroup2', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Grupo 3 (Visual)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={localSettings.groups.upperGroup3.join('')}
                                    onChange={(e) => handleGroupChange('upperGroup3', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- 2. Master Tuning --- */}
        <div className="space-y-6">
            <SousaMasterBlock 
                char="n" title="n (Mestre de Hastes - Minúsculas)" 
                contextWords={['nnnn', 'nonn']}
                settings={localSettings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
            <SousaMasterBlock 
                char="o" title="o (Mestre de Curvas - Minúsculas)" 
                contextWords={['nnonn', 'oooo']}
                settings={localSettings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
            <SousaMasterBlock 
                char="H" title="H (Mestre de Hastes - Maiúsculas)" 
                contextWords={['HHHH', 'HHOHH']}
                settings={localSettings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
            <SousaMasterBlock 
                char="O" title="O (Mestre de Curvas - Maiúsculas)" 
                contextWords={['HHOHH', 'OOOO']}
                settings={localSettings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
        </div>

        {/* --- 3. Detailed Tuning --- */}
        <div className="mt-12 border-t border-slate-800 pt-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
                        Ajustes de Exceção
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Sobrescreva as regras por glifo (H3)</p>
                </div>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
                 {/* Selector */}
                 <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                     <div className="flex-1">
                         <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Seletor de Glifo</label>
                         <select 
                            value={overrideChar}
                            onChange={(e) => setOverrideChar(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm shadow-inner focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
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
                             <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Origem</span>
                             {hasOverride ? (
                                 <motion.span initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-yellow-400 font-black px-3 py-1 bg-yellow-400/10 rounded-lg border border-yellow-400/20 text-[10px] uppercase tracking-widest">Sobrescrito</motion.span>
                             ) : (
                                 <span className="text-indigo-400 font-black px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-[10px] uppercase tracking-widest">
                                     {getCharGroupStatus(overrideChar)}
                                 </span>
                             )}
                         </div>

                         {hasOverride && (
                             <button onClick={resetOverride} className="text-[10px] text-red-400 hover:text-red-300 font-black uppercase tracking-widest flex items-center gap-1.5 mt-3 justify-end transition-colors">
                                 <RotateCcw className="w-3 h-3" /> Restaurar Espaçamento
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
                                        value={currentLsb}
                                        onChange={(e) => updateOverride('lsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs font-bold outline-none transition-all ${hasOverride ? 'border-yellow-600 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'border-slate-700 text-blue-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={currentLsb}
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
                                        value={currentRsb}
                                        onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs font-bold outline-none transition-all ${hasOverride ? 'border-yellow-600 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'border-slate-700 text-green-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={currentRsb}
                                    onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                    className="w-full accent-green-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                         {/* Text Preview (Live) */}
                        <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800 text-center">
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
                            lsb={currentLsb} 
                            rsb={currentRsb} 
                        />
                    </div>
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
};
