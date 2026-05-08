
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AppStep, 
  FontState, 
  MethodType, 
  DEFAULT_TRACY_SETTINGS, 
  TracySettings,
  DEFAULT_SOUSA_SETTINGS,
  SousaSettings 
} from './types';
import { 
  createFontState, 
  cleanMetrics, 
  applyTracyMethod, 
  applySousaMethod, 
  createFontUrl, 
  parseFont,
  prepareFontForExport
} from './services/fontService';
import { FileUpload } from './components/FileUpload';
import { MetricTuner } from './components/MetricTuner';
import { SousaTuner } from './components/SousaTuner';
import { TheoreticalTooltip } from './components/TheoreticalTooltip';
import { AnalysisCanvas } from './components/AnalysisCanvas';
// Added 'Home' to the imports from lucide-react
import { ArrowRight, Activity, Type, MousePointerClick, RefreshCcw, Loader2, PlayCircle, Columns, Home, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { CompareSpacingFlow } from './CompareSpacingFlow';

const App: React.FC = () => {
  // Novo estado de navegação de alto nível para suportar o novo modo sem quebrar o antigo
  const [appMode, setAppMode] = useState<'START' | 'LAB' | 'COMPARE_SPACING'>('START');

  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fontBuffer, setFontBuffer] = useState<ArrayBuffer | null>(null);
  const [fontName, setFontName] = useState<string>('');
  
  // Font States
  const [fonts, setFonts] = useState<Record<string, FontState | null>>({
    [MethodType.ORIGINAL]: null,
    [MethodType.TRACY]: null,
    [MethodType.SOUSA]: null,
  });

  const [tracySettings, setTracySettings] = useState<TracySettings>(DEFAULT_TRACY_SETTINGS);
  const [sousaSettings, setSousaSettings] = useState<SousaSettings>(DEFAULT_SOUSA_SETTINGS);
  const [tuningTab, setTuningTab] = useState<'TRACY' | 'SOUSA'>('TRACY');
  const [showHelp, setShowHelp] = useState(false);

  // Load CSS for fonts
  useEffect(() => {
    // Inject @font-face rules dynamically
    const styleId = 'saame-font-faces';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    let css = '';
    // Use the dynamic fullFontFamily name for accurate rendering updates
    if (fonts[MethodType.ORIGINAL]) css += `@font-face { font-family: '${fonts[MethodType.ORIGINAL]!.fullFontFamily}'; src: url('${fonts[MethodType.ORIGINAL]!.url}'); }\n`;
    if (fonts[MethodType.TRACY]) css += `@font-face { font-family: '${fonts[MethodType.TRACY]!.fullFontFamily}'; src: url('${fonts[MethodType.TRACY]!.url}'); }\n`;
    if (fonts[MethodType.SOUSA]) css += `@font-face { font-family: '${fonts[MethodType.SOUSA]!.fullFontFamily}'; src: url('${fonts[MethodType.SOUSA]!.url}'); }\n`;
    
    styleTag.textContent = css;
  }, [fonts]);

  const handleFileLoaded = async (buffer: ArrayBuffer, name: string) => {
    setIsProcessing(true);
    setTimeout(async () => {
        setFontBuffer(buffer);
        setFontName(name);

        // 1. Store Original
        const originalState = await createFontState(buffer.slice(0), MethodType.ORIGINAL);
        
        // 2. Prepare Work Copies (Cleaned)
        const tBuff = buffer.slice(0);
        const sBuff = buffer.slice(0);
        
        const tFont = await parseFont(tBuff);
        const sFont = await parseFont(sBuff);
        
        // Clean metrics first
        cleanMetrics(tFont);
        cleanMetrics(sFont);
        
        // Apply default methods immediately to ensure valid initial state
        applyTracyMethod(tFont, DEFAULT_TRACY_SETTINGS);
        applySousaMethod(sFont, DEFAULT_SOUSA_SETTINGS);
        
        const tracyFamily = `Tracy-${Date.now()}`;
        // Note: createFontUrl now calls prepareFontForExport internally
        const tracyState: FontState = {
            type: MethodType.TRACY,
            fontObj: tFont,
            url: createFontUrl(tFont, tracyFamily), 
            fullFontFamily: tracyFamily,
            metrics: originalState.metrics
        };

        const sousaFamily = `Sousa-${Date.now()}`;
        const sousaState: FontState = {
            type: MethodType.SOUSA,
            fontObj: sFont,
            url: createFontUrl(sFont, sousaFamily),
            fullFontFamily: sousaFamily,
            metrics: originalState.metrics
        };

        setFonts({
            [MethodType.ORIGINAL]: originalState,
            [MethodType.TRACY]: tracyState,
            [MethodType.SOUSA]: sousaState
        });

        setStep(AppStep.PREPARATION);
        setIsProcessing(false);
    }, 100);
  };

  const handleProcess = async () => {
    if (!fontBuffer) return;
    setIsProcessing(true);
    
    // Give UI time to render loading state
    setTimeout(async () => {
        // 1. Create fresh copies from original buffer
        const tracyFont = await parseFont(fontBuffer.slice(0));
        const sousaFont = await parseFont(fontBuffer.slice(0));

        // 2. Clean
        cleanMetrics(tracyFont);
        cleanMetrics(sousaFont);

        // 3. Apply Methods
        applyTracyMethod(tracyFont, tracySettings);
        applySousaMethod(sousaFont, sousaSettings);

        // 4. Update State with new URLS
        // Fixed duplicate xHeight property in the fallback metrics object
        const originalMetrics = fonts[MethodType.ORIGINAL]?.metrics || { 
            ascender: 800, descender: -200, xHeight: 500, capHeight: 700, unitsPerEm: 1000 
        };

        const tracyFamily = `Tracy-Final-${Date.now()}`;
        // Explicitly pass family name to ensure binary matches CSS
        const newTracyState: FontState = {
            type: MethodType.TRACY,
            fontObj: tracyFont,
            url: createFontUrl(tracyFont, tracyFamily),
            fullFontFamily: tracyFamily,
            metrics: originalMetrics
        };

        const sousaFamily = `Sousa-Final-${Date.now()}`;
        const newSousaState: FontState = {
            type: MethodType.SOUSA,
            fontObj: sousaFont,
            url: createFontUrl(sousaFont, sousaFamily),
            fullFontFamily: sousaFamily,
            metrics: originalMetrics
        };

        setFonts(prev => ({
            ...prev,
            [MethodType.TRACY]: newTracyState,
            [MethodType.SOUSA]: newSousaState
        }));

        setStep(AppStep.ANALYSIS);
        setIsProcessing(false);
    }, 100);
  };

  const handleUpdateIndividualGlyph = (method: MethodType, char: string, lsb: number | null, rsb: number | null) => {
    if (method === MethodType.TRACY) {
      setTracySettings(prev => ({
        ...prev,
        overrides: {
          ...prev.overrides,
          [char]: { lsb, rsb }
        }
      }));
    } else if (method === MethodType.SOUSA) {
      // Sousa overrides are not null
      setSousaSettings(prev => ({
        ...prev,
        overrides: {
          ...prev.overrides,
          [char]: { lsb: lsb ?? 0, rsb: rsb ?? 0 }
        }
      }));
    }
  };

  // Debounced Tuner Update for Tracy
  useEffect(() => {
    let active = true;
    if (fontBuffer && (step === AppStep.PREPARATION || step === AppStep.ANALYSIS)) {
        const updateTuner = async () => {
            if (!active) return;
            const tempFont = await parseFont(fontBuffer.slice(0));
            if (!active) return;
            
            cleanMetrics(tempFont);
            applyTracyMethod(tempFont, tracySettings);
            
            // Unique family name forces browser repaint
            const familyName = `Tracy-${Date.now()}`;
            // createFontUrl sanitizes internals automatically now
            const url = createFontUrl(tempFont, familyName);

            setFonts(prev => {
                if (!active) return prev;
                // Revoke old URL to avoid memory leaks
                if (prev[MethodType.TRACY]?.url) {
                    URL.revokeObjectURL(prev[MethodType.TRACY]!.url);
                }
                return { 
                  ...prev, 
                  [MethodType.TRACY]: { 
                      ...prev[MethodType.TRACY]!, 
                      fontObj: tempFont, 
                      url,
                      fullFontFamily: familyName
                  } 
                };
            });
        };
        const timer = setTimeout(updateTuner, 100); // Fast debounce
        return () => { active = false; clearTimeout(timer); };
    }
  }, [tracySettings, step, tuningTab, fontBuffer]);

  // Debounced Tuner Update for Sousa
  useEffect(() => {
    let active = true;
    if (fontBuffer && (step === AppStep.PREPARATION || step === AppStep.ANALYSIS)) {
        const updateTuner = async () => {
            if (!active) return;
            const tempFont = await parseFont(fontBuffer.slice(0));
            if (!active) return;

            cleanMetrics(tempFont);
            applySousaMethod(tempFont, sousaSettings);

            const familyName = `Sousa-${Date.now()}`;
            const url = createFontUrl(tempFont, familyName);
            
            setFonts(prev => {
                if (!active) return prev;
                if (prev[MethodType.SOUSA]?.url) {
                    URL.revokeObjectURL(prev[MethodType.SOUSA]!.url);
                }
                return { 
                  ...prev, 
                  [MethodType.SOUSA]: { 
                      ...prev[MethodType.SOUSA]!, 
                      fontObj: tempFont, 
                      url,
                      fullFontFamily: familyName
                  } 
                };
            });
        };
        const timer = setTimeout(updateTuner, 100); 
        return () => { active = false; clearTimeout(timer); };
    }
  }, [sousaSettings, step, tuningTab, fontBuffer]);

  // NOVO: Renderização condicional da Tela Inicial
  if (appMode === 'START') {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-200 items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="text-center mb-16 relative">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              rotate: 0,
              y: [0, -10, 0]
            }}
            transition={{ 
              duration: 0.8,
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl inline-block mb-10 shadow-2xl shadow-blue-500/20"
          >
            <Activity className="w-16 h-16 text-white" />
          </motion.div>
            <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-7xl font-black text-white mb-6 flex items-center justify-center tracking-tighter"
          >
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400"
            >
              SAAME
            </span>
            <span className="text-blue-500 font-light ml-4">Lab</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 max-w-lg mx-auto text-lg md:text-xl font-medium leading-relaxed"
          >
            Sistema de Aplicação e Análise de Metodos de Espaçamento
          </motion.p>
        </div>
        
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
                delayChildren: 0.4
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative"
        >
          <motion.button 
            variants={{
              hidden: { y: 30, opacity: 0 },
              show: { y: 0, opacity: 1 }
            }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAppMode('LAB')}
            className="flex flex-col items-center p-10 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl hover:border-blue-500/50 transition-all group shadow-2xl"
          >
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <PlayCircle className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Laboratório de Espaçamento</h3>
            <p className="text-slate-500 text-sm text-center font-medium">Ajuste e processe fontes individuais usando métodos históricos e matemáticos.</p>
          </motion.button>
 
          <motion.button 
            variants={{
              hidden: { y: 30, opacity: 0 },
              show: { y: 0, opacity: 1 }
            }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAppMode('COMPARE_SPACING')}
            className="flex flex-col items-center p-10 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl hover:border-indigo-500/50 transition-all group shadow-2xl"
          >
             <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <Columns className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Fluxo de Comparação</h3>
            <p className="text-slate-500 text-sm text-center font-medium">Analise  métricas entre duas fontes tpográficos de forma independente.</p>
          </motion.button>
        </motion.div>
        
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-20 flex flex-col items-center gap-4"
        >
            <div className="h-px w-24 bg-slate-800" />
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-bold">Desenvolvido com SAAME Metrology Engine</p>
        </motion.div>
      </div>
    );
  }

  // NOVO: Renderização do novo fluxo COMPARE_SPACING
  if (appMode === 'COMPARE_SPACING') {
    return <CompareSpacingFlow onBack={() => setAppMode('START')} />;
  }

  // O RESTO DO COMPONENTE PERMANECE ABSOLUTAMENTE IGUAL (Fluxo LAB original)
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {isProcessing && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center flex-col"
            >
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-blue-500 blur-xl rounded-full -z-10"
                    />
                </div>
                <p className="text-white font-medium mt-6 tracking-widest uppercase text-[10px]">Processando Fontes</p>
                <div className="w-48 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                    <motion.div 
                        animate={{ x: [-200, 200] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                    />
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/80 gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Adicionado botão Home para o fluxo Lab */}
          <button 
            onClick={() => setAppMode('START')} 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all transform hover:scale-105"
            title="Voltar ao Início"
          >
            <Home className="w-5 h-5" />
          </button>
          
          <div className="h-8 w-px bg-slate-800 hidden md:block" />

          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 
                className="text-xl font-black tracking-tight text-white flex items-center"
              >
                <span
                  className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"
                >
                  SAAME
                </span>
                <span className="text-blue-500 font-light ml-2">Lab</span>
              </h1>
              <p className="hidden md:block text-[9px] text-slate-500 uppercase tracking-[0.2em] font-medium">Ambiente de Experimentação Tipográfica</p>
            </div>
          </div>
        </div>
        
        {/* Progress Stepper Improved (H1 & H4) */}
        <div className="flex items-center gap-2 md:gap-4 text-[10px] font-bold uppercase tracking-[0.2em] w-full md:w-auto justify-center md:justify-end">
            <div className={`flex items-center gap-3 transition-all duration-500 ${step === AppStep.UPLOAD ? 'text-blue-400' : fonts[MethodType.ORIGINAL] ? 'text-green-500' : 'text-slate-600'}`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  step === AppStep.UPLOAD ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white' : 
                  fonts[MethodType.ORIGINAL] ? 'border-green-500 bg-green-500/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-slate-800'
                }`}>
                  {fonts[MethodType.ORIGINAL] && step !== AppStep.UPLOAD ? <CheckCircle2 className="w-4 h-4" /> : '01'}
                </span>
                <div className="hidden lg:flex flex-col">
                    <span className="leading-none">Fonte</span>
                    <span className="text-[7px] text-slate-500 tracking-normal font-normal mt-1 italic opacity-60">Upload</span>
                </div>
            </div>
            
            <div className={`w-6 md:w-8 h-0.5 rounded-full ${step !== AppStep.UPLOAD ? 'bg-blue-500/50' : 'bg-slate-800'}`} />
            
            <div className={`flex items-center gap-3 transition-all duration-500 ${step === AppStep.PREPARATION ? 'text-blue-400' : step === AppStep.ANALYSIS ? 'text-green-500' : 'text-slate-600'}`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  step === AppStep.PREPARATION ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white' : 
                  step === AppStep.ANALYSIS ? 'border-green-500 bg-green-500/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-slate-800'
                }`}>
                  {step === AppStep.ANALYSIS ? <CheckCircle2 className="w-4 h-4" /> : '02'}
                </span>
                <div className="hidden lg:flex flex-col">
                    <span className="leading-none">Métricas</span>
                    <span className="text-[7px] text-slate-500 tracking-normal font-normal mt-1 italic opacity-60">Ajuste</span>
                </div>
            </div>
            
            <div className={`w-6 md:w-8 h-0.5 rounded-full ${step === AppStep.ANALYSIS ? 'bg-blue-500/50' : 'bg-slate-800'}`} />
            
             <div className={`flex items-center gap-3 transition-all duration-500 ${step === AppStep.ANALYSIS ? 'text-blue-400' : 'text-slate-600'}`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${step === AppStep.ANALYSIS ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white' : 'border-slate-800'}`}>03</span>
                <div className="hidden lg:flex flex-col">
                    <span className="leading-none">Análise</span>
                    <span className="text-[7px] text-slate-500 tracking-normal font-normal mt-1 italic opacity-60">Resultados</span>
                </div>
            </div>

            <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block" />

            <button 
              onClick={() => setShowHelp(true)}
              className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-400 transition-all group"
              title="Guia de Ajuda"
            >
              <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-2 md:p-6">
        
        {/* Help Modal (H10) */}
        <AnimatePresence>
          {showHelp && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                  <div className="flex items-center gap-3 text-blue-400">
                    <HelpCircle className="w-6 h-6" />
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">Guia de Referência SAAME</h2>
                  </div>
                  <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400 hover:text-white" />
                  </button>
                </div>
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <section>
                    <h3 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3">Método Tracy (Walter Tracy)</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Utiliza <span className="text-white font-bold italic">Caracteres-chave</span> (H, O, n, o) para basear o espaçamento da fonte. A ideia é que se esses glifos estiverem equilibrados, os outros podem ser derivados de suas proporções.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 italic">Hastes (H, n) definem o ritmo vertical</div>
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 italic">Curvas (O, o) definem a contraforma rítmica</div>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-3">Método Sousa</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Baseado na <span className="text-white font-bold italic">Estrutura das Letras</span>. Divide o alfabeto em grupos estruturais. Alterar o espaçamento de um grupo garante consistência visual imediata em todo o conjunto.
                    </p>
                  </section>
                  <section className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/20">
                    <h4 className="text-blue-300 font-bold text-sm mb-2 italic">Dica de Especialista</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      O equilíbrio ideal é alcançado quando o espaço entre as letras parece igual ao espaço dentro das letras (contraforma). Use as strings de teste para verificar palavras reais.
                    </p>
                  </section>
                </div>
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                  <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-widest">Entendido</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {step === AppStep.UPLOAD && (
            <div className="max-w-2xl mx-auto pt-12 px-4">
                <FileUpload onFileLoaded={handleFileLoaded} />
                <div className="mt-8 text-center text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
                    Carregue um arquivo .otf ou .ttf. O sistema gerará automaticamente uma cópia limpa (métricas zeradas) e uma cópia de referência Original para comparação rítmica.
                </div>
            </div>
        )}

        {step === AppStep.PREPARATION && (
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-full lg:overflow-hidden overflow-y-auto px-1">
                {/* Tuning Panel - Now First on Mobile and takes more space on Desktop */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-7 h-fit lg:h-full flex flex-col order-1 min-h-[500px]"
                >
                    <div className="flex gap-2 mb-4 bg-slate-900/80 backdrop-blur p-1.5 rounded-xl border border-slate-800 w-full sm:w-fit self-center lg:self-start z-20 shadow-xl">
                        <button 
                            onClick={() => setTuningTab('TRACY')}
                            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tuningTab === 'TRACY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Método Tracy
                        </button>
                        <button 
                            onClick={() => setTuningTab('SOUSA')}
                            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tuningTab === 'SOUSA' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Método Sousa
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 bg-slate-900/30 rounded-2xl border border-slate-800/50 shadow-inner">
                        {tuningTab === 'TRACY' ? (
                            <MetricTuner 
                                settings={tracySettings} 
                                onSettingsChange={setTracySettings}
                                fontFamily={fonts[MethodType.TRACY]?.fullFontFamily || 'sans-serif'}
                                font={fonts[MethodType.TRACY]}
                            />
                        ) : (
                            <SousaTuner 
                                settings={sousaSettings}
                                onSettingsChange={setSousaSettings}
                                fontFamily={fonts[MethodType.SOUSA]?.fullFontFamily || 'sans-serif'}
                                font={fonts[MethodType.SOUSA]}
                            />
                        )}
                    </div>
                </motion.div>

                {/* Info Panel - Lower priority on mobile, less aggressive on space */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-5 flex flex-col h-fit lg:h-full order-2 lg:shrink"
                >
                    <div className="bg-slate-900/60 backdrop-blur-sm flex-1 rounded-2xl border border-slate-800 p-6 md:p-8 flex items-center justify-center flex-col text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        
                        <div className="bg-slate-950 p-6 rounded-2xl mb-6 shadow-inner border border-slate-800/50">
                            <Type className="w-12 h-12 text-blue-500" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">{fontName}</h3>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-6"></div>
                        <div className="text-slate-400 max-w-sm mb-10 text-sm md:text-base leading-relaxed font-medium">
                            {tuningTab === 'TRACY' 
                                ? (
                                    <>
                                        Ajuste os glifos-chave usando a propagação de Walter Tracy. 
                                        Equilibre os <span className="text-blue-400 border-b border-blue-500/20 cursor-help">side bearings</span> 
                                        <TheoreticalTooltip content="Os side bearings (LSB e RSB) são os espaços laterais invisíveis que delimitam um glifo e controlam a distância entre caracteres." />
                                        contra a <span className="text-blue-400 border-b border-blue-500/20 cursor-help">contraforma</span> interna.
                                        <TheoreticalTooltip content="Espaço interno ou parcialmente fechado de um caractere. Influencia diretamente a legibilidade, o ritmo e o espaçamento." />
                                    </>
                                )
                                : (
                                    <>
                                        Defina <span className="text-indigo-400 border-b border-indigo-500/20 cursor-help">grupos topológicos</span>
                                        <TheoreticalTooltip content="Categorização de letras por similaridades estruturais (hastes vs curvas) para garantir consistência rítmica e equilíbrio visual." />
                                        e ajuste glifos minúsculos e maiúsculos usando strings de adesão para manter o fluxo metrológico.
                                    </>
                                )
                            }
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                            <button 
                                onClick={() => setStep(AppStep.UPLOAD)}
                                className="px-8 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all text-slate-300 font-bold text-xs uppercase tracking-widest hover:text-white"
                            >
                                Voltar
                            </button>
                            <button 
                                onClick={handleProcess}
                                className="px-10 py-4 rounded-xl bg-white text-slate-950 font-black shadow-2xl flex items-center justify-center gap-2 w-full sm:w-auto transform hover:scale-105 transition-all text-sm uppercase tracking-tighter hover:bg-blue-50 shadow-blue-500/10"
                            >
                                Processar e Avaliar <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}

        {step === AppStep.ANALYSIS && (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        <MousePointerClick className="w-5 h-5 text-green-400" />
                        Análise Comparativa
                    </h2>
                    <button 
                        onClick={() => setStep(AppStep.PREPARATION)}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <RefreshCcw className="w-3 h-3" /> <span className="hidden sm:inline">Ajustar Configurações</span>
                    </button>
                </div>
                <div className="flex-1 min-h-0">
                    <AnalysisCanvas fonts={fonts} onUpdateGlyph={handleUpdateIndividualGlyph} />
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
