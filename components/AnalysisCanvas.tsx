
import React, { useState, useMemo, useRef } from 'react';
import { TracySettings, FontState, MethodType } from '../types';
import { Layers, Type, AlignJustify, Download, BarChart2, Columns, ArrowUpDown, FileText, Loader2, Search, X, Settings2 } from 'lucide-react';
import { calculateAverageSB, downloadFont, getCharMetrics, generateFontFaceCSS } from '../services/fontService';
import { motion, AnimatePresence } from 'motion/react';
import { SpacingDiagram } from './SpacingDiagram';
import { SousaAnalysisView } from './SousaAnalysisView';
import { GlyphVisualizer } from './GlyphVisualizer';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface AnalysisCanvasProps {
  fonts: Record<string, FontState | null>;
  isCompareMode?: boolean;
  customLabels?: {
      original: string;
      tracy: string;
  };
  onUpdateGlyph?: (method: MethodType, char: string, lsb: number | null, rsb: number | null) => void;
}

const PARAGRAPH_TEXT = "Hook, a do. Joe, succor asclepias cod efferent. Fans rolls, oceania leets boise sentimentalisation, geologian pedicels, plowtail, dip em kinins tetracerous, non a revisal, at. Clamer goon, downstrokes imputative blip ballonne, yakin ouenite, he. Em arapunga, oat, a feud. Palaeoclimatologist, a ten noncrucial a to, rauli, a sirky, coy, if, pour my xmas. Hew, wisher seventy. Conducts, ya note, algic. Iricism, mil, swob groundling, koruny, hi lode, overwoman, shrive. Educate am fractocumulus, they tempt. Us goloe, offic, wammus, luminescing. Wow, relighted. Veracious glacon, seed, dram bat oral sgabellos noviceship, age neo cant bethorn, cirri nondepressed laserdisks, mom owl, fall. Multicordate, is, splint chremzel a he, kodak, acre, yokel, pope kong. A mojarra, savant, dredges, squattest ye. Plonked algologist, sip citrin. us gimp, woke, congressing.";

const RemainingGlyphItem = React.memo(({ g, font, borderColor, onClick }: { g: any, font: any, borderColor: string, onClick?: (char: string, lsb: number, rsb: number) => void }) => (
    <div 
        key={g.unicode} 
        onClick={() => onClick?.(g.char, g.lsb, g.rsb)}
        className={`bg-gray-800/30 rounded h-16 p-1 flex items-center border ${borderColor} hover:bg-gray-800 transition-colors cursor-pointer`}
    >
        <div className="flex-1 flex flex-col items-center justify-center h-full border-r border-gray-700/30">
            <span className="text-[9px] text-gray-500 font-bold mb-0.5 leading-none">L</span>
            <span className="text-[11px] text-gray-300 font-mono leading-none">{g.lsb}</span>
        </div>
        <div 
            className="w-10 text-xl text-white text-center flex items-center justify-center leading-none pb-1"
            style={{ fontFamily: `'${font.fullFontFamily}'` }}
        >
            {/* Special visualization for Space */}
            {g.char === ' ' ? <span className="text-[10px] text-gray-500 font-mono">SPACE</span> : g.char}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center h-full border-l border-gray-700/30">
            <span className="text-[9px] text-gray-500 font-bold mb-0.5 leading-none">R</span>
            <span className="text-[11px] text-gray-300 font-mono leading-none">{g.rsb}</span>
        </div>
    </div>
));

// --- NEW COMPONENT: Displays metrics for glyphs NOT in the standard topology (Numbers, Punctuation, etc.) ---
const RemainingGlyphsView = ({ font, method, searchQuery = '', onGlyphClick }: { font: FontState | null, method: MethodType, searchQuery?: string, onGlyphClick?: (char: string, lsb: number, rsb: number) => void }) => {
    const glyphs = useMemo(() => {
        if (!font || !font.fontObj) return [];
        
        const standardChars = new Set([
            ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''),
            ..."abcdefghijklmnopqrstuvwxyz".split('')
        ]);
        
        const found: Array<{ char: string, lsb: number, rsb: number, unicode: number }> = [];
        
        const numGlyphs = font.fontObj.glyphs.length;
        for (let i = 0; i < numGlyphs; i++) {
            const glyph = font.fontObj.glyphs.get(i);
            if (glyph.unicode) {
                try {
                    const char = String.fromCodePoint(glyph.unicode);
                    // Filter out standard chars (shown above)
                    // Explicitly allow Space (char === ' ') or non-empty strings (Punctuation/Numbers)
                    if (!standardChars.has(char)) {
                        if (char.trim() !== '' || char === ' ') {
                            const { lsb, rsb } = getCharMetrics(font.fontObj, char);
                            found.push({ char, lsb, rsb, unicode: glyph.unicode });
                        }
                    }
                } catch (e) {}
            }
        }
        
        // Filter by searchQuery
        const filtered = searchQuery 
            ? found.filter(g => 
                g.char.toLowerCase().includes(searchQuery.toLowerCase()) || 
                g.unicode.toString(16).toLowerCase().includes(searchQuery.toLowerCase())
              )
            : found;

        return filtered.sort((a, b) => a.unicode - b.unicode);
    }, [font?.fontObj, searchQuery]); // Added searchQuery to dependency

    if (!font || !font.fontObj || glyphs.length === 0) return null;

    const methodColor = method === MethodType.TRACY ? 'text-pink-400' : 'text-cyan-400';
    const borderColor = method === MethodType.TRACY ? 'border-pink-500/20' : 'border-cyan-500/20';

    return (
        <div className="mt-8 pt-6 border-t border-gray-800">
             <h4 className={`text-sm font-bold uppercase mb-4 tracking-wider flex items-center gap-2 ${methodColor}`}>
                 Glifos Complementares (Algarismos, Pontuação e Símbolos)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {glyphs.map(g => (
                    <RemainingGlyphItem key={g.unicode} g={g} font={font} borderColor={borderColor} onClick={onGlyphClick} />
                ))}
            </div>
        </div>
    );
};

export const AnalysisCanvas: React.FC<AnalysisCanvasProps> = ({ fonts, isCompareMode = false, customLabels, onUpdateGlyph }) => {
  const [testText, setTestText] = useState("HHOOHOH\nnnoonon\nminimum");
  const [fontSize, setFontSize] = useState(120);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [viewMode, setViewMode] = useState<'stack' | 'overlay' | 'metrics' | 'side-by-side'>('side-by-side');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdjustment, setSelectedAdjustment] = useState<{
    char: string,
    method: MethodType,
    lsb: number,
    rsb: number
  } | null>(null);
  
  // Ref for capturing the visualization container
  const exportRef = useRef<HTMLDivElement>(null);
  
  const originalFont = fonts[MethodType.ORIGINAL];
  const tracyFont = fonts[MethodType.TRACY];
  const sousaFont = fonts[MethodType.SOUSA];

  // Logic to determine labels based on mode and props
  const labelOriginal = isCompareMode 
    ? (customLabels?.original || 'Referência Original') 
    : (originalFont?.fullFontFamily || 'Original');
    
  const labelTracy = isCompareMode 
    ? (customLabels?.tracy || 'Espécime Ajustado') 
    : "Método Walter Tracy";

  const handleExport = (type: MethodType) => {
      const fontState = fonts[type];
      if (fontState?.fontObj) {
          downloadFont(fontState.fontObj, type);
      }
  };

  const getAvgSB = (type: MethodType) => {
      const f = fonts[type];
      return f?.fontObj ? calculateAverageSB(f.fontObj) : 0;
  };

  const setPreset = (text: string, size: number) => {
      setTestText(text);
      setFontSize(size);
  };

  // --- PRECISE METRIC CALCULATIONS ---
  // Calculates the absolute Y positions for grid lines and text positioning
  const calculateMetrics = () => {
      // Default fallback
      const empty = { 
          grid: '', 
          gridLight: '',
          lhPx: fontSize * lineHeight, 
          refBaseline: 0, 
          expCorrectionY: 0 
      };

      if (!originalFont?.metrics) return empty;

      // 1. Constants
      const LH_RATIO = lineHeight;
      const lhPx = fontSize * LH_RATIO;
      
      // 2. Reference Metrics (The Source of Truth for the Grid)
      const refM = originalFont.metrics;
      // Safeguard against invalid UPM
      const safeRefUPM = refM.unitsPerEm || 1000; 
      const refScale = fontSize / safeRefUPM;
      
      const refContentH = (refM.ascender + Math.abs(refM.descender)) * refScale;
      const refLeading = lhPx - refContentH;
      const refBaselineY = (refLeading / 2) + (refM.ascender * refScale);

      // Grid Coordinates (Aligned to Reference)
      const gridY = {
          asc: refBaselineY - (refM.ascender * refScale),
          cap: refBaselineY - (refM.capHeight * refScale),
          x: refBaselineY - (refM.xHeight * refScale),
          base: refBaselineY,
          desc: refBaselineY + (Math.abs(refM.descender) * refScale) // Positive direction downwards
      };

      // 3. Experimental Metrics (For alignment correction)
      let expCorrectionY = 0;
      if (tracyFont?.metrics) {
          const expM = tracyFont.metrics;
          const safeExpUPM = expM.unitsPerEm || 1000;
          const expScale = fontSize / safeExpUPM;
          
          const expNaturalBaselineY = ( (lhPx - (expM.ascender + Math.abs(expM.descender)) * expScale) / 2) + (expM.ascender * expScale);
          
          expCorrectionY = refBaselineY - expNaturalBaselineY;
      }

      // Helper to generate SVG string (DRY)
      const generateSVG = (isLightMode: boolean) => {
          const colors = isLightMode ? {
               asc: '#d97706', // Darker Yellow
               cap: '#15803d', // Darker Green
               x: '#1d4ed8',   // Darker Blue
               base: '#000000', // BLACK Baseline
               desc: '#b91c1c', // Darker Red
               lbl: '#4b5563', // Gray 600
               refLine: 'rgba(0,0,0,0.3)'
          } : {
               asc: '#EAB308',
               cap: '#22C55E',
               x: '#3B82F6',
               base: '#FFFFFF',
               desc: '#EF4444',
               lbl: 'rgba(255, 255, 255, 0.4)',
               refLine: 'rgba(255, 255, 255, 0.2)'
          };

          if (isCompareMode) {
            return `
                <svg width="100%" height="${lhPx}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
                    <style>
                        .line { stroke-width: 0.5px; vector-effect: non-scaling-stroke; stroke-dasharray: 4 2; opacity: 0.5; }
                        .base { stroke-width: 0.8px; stroke-dasharray: none; opacity: 0.7; }
                    </style>
                    <line x1="0" y1="${gridY.asc}" x2="100%" y2="${gridY.asc}" class="line" stroke="${colors.asc}" />
                    <line x1="0" y1="${gridY.cap}" x2="100%" y2="${gridY.cap}" class="line" stroke="${colors.cap}" />
                    <line x1="0" y1="${gridY.x}" x2="100%" y2="${gridY.x}" class="line" stroke="${colors.x}" />
                    <line x1="0" y1="${gridY.base}" x2="100%" y2="${gridY.base}" class="base" stroke="${colors.base}" />
                    <line x1="0" y1="${gridY.desc}" x2="100%" y2="${gridY.desc}" class="line" stroke="${colors.desc}" />
                </svg>
            `;
          } else {
             return `
                <svg width="100%" height="${lhPx}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
                    <defs>
                        <style>
                            .txt { font-family: 'Fira Code', monospace; font-size: 8px; font-weight: 500; }
                            .line { stroke-width: 0.5px; vector-effect: non-scaling-stroke; }
                            .ref { stroke: ${colors.refLine}; stroke-dasharray: 2 2; }
                            .lbl { fill: ${colors.lbl}; }
                            .base { stroke: ${isLightMode ? 'rgba(8, 145, 178, 1)' : 'rgba(6, 182, 212, 0.7)'}; stroke-width: 0.8px; } 
                        </style>
                    </defs>
                    <line x1="0" y1="${gridY.asc}" x2="100%" y2="${gridY.asc}" class="line ref" />
                    <text x="4" y="${gridY.asc + 8}" class="txt lbl">ASC</text>

                    <line x1="0" y1="${gridY.cap}" x2="100%" y2="${gridY.cap}" class="line ref" />
                    <text x="28" y="${gridY.cap + 8}" class="txt lbl">CAP</text>

                    <line x1="0" y1="${gridY.x}" x2="100%" y2="${gridY.x}" class="line ref" />
                    <text x="4" y="${gridY.x - 3}" class="txt lbl">x-Height</text>

                    <line x1="0" y1="${gridY.base}" x2="100%" y2="${gridY.base}" class="line base" />
                    <text x="4" y="${gridY.base - 3}" class="txt lbl" style="fill: ${isLightMode ? 'rgba(8, 145, 178, 1)' : 'rgba(6, 182, 212, 0.8)'}">BASE</text>

                    <line x1="0" y1="${gridY.desc}" x2="100%" y2="${gridY.desc}" class="line ref" />
                    <text x="4" y="${gridY.desc - 3}" class="txt lbl">DESC</text>
                </svg>
            `;
          }
      };

      const svgDark = generateSVG(false);
      const svgLight = generateSVG(true);

      return {
          grid: `url("data:image/svg+xml;utf8,${encodeURIComponent(svgDark.replace(/\s+/g, ' ').trim())}")`,
          gridLight: `url("data:image/svg+xml;utf8,${encodeURIComponent(svgLight.replace(/\s+/g, ' ').trim())}")`,
          lhPx,
          refBaseline: refBaselineY,
          expCorrectionY
      };
  };

  const { grid, gridLight, lhPx, expCorrectionY } = calculateMetrics();

  const handlePdfExport = async () => {
    if (!exportRef.current) return;
    setIsExportingPdf(true);

    try {
        // 1. Capture the DOM element with WHITE background enforcement
        // IMPORTANT: We use windowWidth to ensure we capture wide layouts, but windowHeight is null to capture full scroll height
        const canvas = await html2canvas(exportRef.current, {
            scale: 2, // Good balance between quality and file size
            useCORS: true,
            backgroundColor: '#ffffff', // FORCE WHITE BACKGROUND
            logging: false,
            // Ensure we capture everything
            windowWidth: exportRef.current.scrollWidth + 50,
            height: null, // Auto height
            onclone: (clonedDoc) => {
                const element = clonedDoc.querySelector('[data-export-target="true"]') as HTMLElement;
                if (element) {
                    // --- FORCE LIGHT MODE STYLES FOR EXPORT ---
                    element.style.backgroundColor = '#ffffff';
                    element.style.color = '#000000';
                    element.style.height = 'auto'; // FORCE FULL HEIGHT
                    element.style.overflow = 'visible'; // SHOW ALL TEXT
                    element.style.maxHeight = 'none';

                    // --- OVERLAY MODE SPECIFIC FIXES ---
                    // Since Overlay mode uses absolute positioning, the parent height is 0. 
                    // We must calculate the content height to force the canvas to grow.
                    if (viewMode === 'overlay') {
                        const refText = element.querySelector('.overlay-reference-text') as HTMLElement;
                        if (refText) {
                            // Clone style to measure
                            refText.style.height = 'auto';
                            refText.style.position = 'relative'; // Switch to relative to push parent
                            // We need to approximate the height needed. 
                            // A safer bet in clones is to set the parent height to the scrollHeight of the text content
                            element.style.height = `${refText.scrollHeight + 200}px`;
                            
                            // Reset position to absolute for the screenshot to align correctly
                            refText.style.position = 'absolute';
                        }
                    } else {
                        // Side by Side Mode
                        // Expand the grid and inner containers
                        element.classList.remove('h-full');
                        element.style.height = 'auto';
                        const children = element.querySelectorAll('.overflow-y-auto');
                        children.forEach((child) => {
                            (child as HTMLElement).style.overflow = 'visible';
                            (child as HTMLElement).style.height = 'auto';
                            (child as HTMLElement).style.maxHeight = 'none';
                        });
                    }
                    
                    // Specific Handling for Side-by-Side Text Colors
                    const textElements = element.querySelectorAll('p, h4, span, div');
                    textElements.forEach((el) => {
                         const style = window.getComputedStyle(el);
                         // If it's a grid overlay div (has background image), swap to Light Grid
                         if ((el as HTMLElement).style.backgroundImage && (el as HTMLElement).style.backgroundImage.includes('data:image/svg')) {
                             (el as HTMLElement).style.backgroundImage = gridLight;
                             return;
                         }

                         // If text is white/gray (light), force it to black/dark gray
                         const color = style.color;
                         if (color.startsWith('rgb(2') || color === 'white' || color.includes('255, 255') || color.includes('209, 213')) {
                             (el as HTMLElement).style.color = '#111827'; // gray-900
                         }
                    });

                    // Remove borders or make them light gray
                    const bordered = element.querySelectorAll('.border-gray-800, .border-gray-700, .bg-gray-900');
                    bordered.forEach(el => {
                        el.classList.remove('bg-gray-900', 'bg-gray-800', 'bg-gray-950');
                        el.classList.add('bg-white');
                        (el as HTMLElement).style.borderColor = '#e5e7eb'; // gray-200
                        (el as HTMLElement).style.backgroundColor = '#ffffff';
                    });

                    // --- OVERLAY SPECIFIC STYLE ADJUSTMENTS ---
                    // Darken the reference text stroke for white paper
                    const referenceText = element.querySelector('.overlay-reference-text') as HTMLElement;
                    if (referenceText) {
                         referenceText.style.webkitTextStroke = '0.8px rgba(0, 0, 0, 0.4)';
                    }
                    
                    // Re-position Legend for Print (Bottom of the content, not fixed to screen)
                    const legend = element.querySelector('.overlay-legend') as HTMLElement;
                    if (legend) {
                        legend.style.position = 'absolute';
                        legend.style.bottom = '10px';
                        legend.style.right = '10px';
                        legend.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                        legend.style.borderColor = '#e5e7eb';
                        legend.style.color = '#000';
                        legend.style.boxShadow = 'none';
                        // Fix legend text colors
                        legend.querySelectorAll('.text-gray-300').forEach(el => (el as HTMLElement).style.color = '#000');
                        legend.querySelectorAll('.text-gray-400').forEach(el => (el as HTMLElement).style.color = '#4b5563');
                    }
                    
                    // Hide export buttons in the clone
                    const ignoreBtns = clonedDoc.querySelectorAll('button');
                    ignoreBtns.forEach(btn => btn.style.display = 'none');
                }
            }
        });

        // 2. Initialize PDF (Landscape A4)
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const headerHeight = 40;

        // 3. Detailed Header Info (White bg, Black text for PDF cleanliness)
        pdf.setFillColor(255, 255, 255); 
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');

        pdf.setTextColor(0, 0, 0); // Black text
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Relatório SAAME Typography Lab", margin, 10);
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60); 
        const dateStr = new Date().toLocaleString();
        
        // Metadata Column 1
        pdf.text(`Data: ${dateStr}`, margin, 16);
        pdf.text(`Modo de Visualização: ${viewMode === 'side-by-side' ? 'Comparação Lado a Lado' : 'Sobreposição (Overlay)'}`, margin, 21);
        
        // Metadata Column 2 (Parameters)
        const col2X = margin + 80;
        pdf.text(`Tamanho da Fonte: ${fontSize}px`, col2X, 16);
        pdf.text(`Entrelinha: ${lineHeight}em`, col2X, 21);
        
        // Metadata Column 3 (Legend)
        const col3X = margin + 140;
        pdf.setFont("helvetica", "bold");
        pdf.text("LEGENDA:", col3X, 16);
        pdf.setFont("helvetica", "normal");
        
        if (viewMode === 'overlay') {
            // Reference (Original)
            pdf.setFillColor(150, 150, 150); // Grey box for ref
            pdf.rect(col3X, 18, 3, 3, 'F');
            pdf.text(`Original: ${labelOriginal.substring(0, 20)}`, col3X + 5, 21);
            
            if (isCompareMode) {
                // Compare Mode: Reference vs Experimental
                pdf.setDrawColor(6, 182, 212); // Cyan Stroke (Contrast)
                pdf.setLineWidth(0.5);
                pdf.rect(col3X, 23, 3, 3, 'S');
                pdf.text(`Experimental: ${labelTracy.substring(0, 20)}`, col3X + 5, 26);
            } else {
                // Lab Mode: Original (Grey), Tracy (Pink), Sousa (Cyan)
                
                // Tracy
                pdf.setDrawColor(236, 72, 153); // Pink Stroke
                pdf.setLineWidth(0.5);
                pdf.rect(col3X, 23, 3, 3, 'S');
                pdf.text(`Tracy: ${labelTracy.substring(0, 20)}`, col3X + 5, 26);
 
                // Sousa
                pdf.setDrawColor(6, 182, 212); // Cyan Stroke
                pdf.setLineWidth(0.5);
                pdf.rect(col3X, 28, 3, 3, 'S');
                pdf.text(`Sousa: Método Miguel Sousa`, col3X + 5, 31);
            }
 
        } else {
             // Side-by-Side
             if (isCompareMode) {
                 pdf.text(`Esquerda: ${labelOriginal.substring(0, 20)}`, col3X, 21);
                 pdf.text(`Direita: ${labelTracy.substring(0, 20)}`, col3X, 26);
             } else {
                 pdf.text(`Esquerda: Original`, col3X, 21);
                 pdf.text(`Centro: Tracy`, col3X, 26);
                 pdf.text(`Direita: Sousa`, col3X, 31);
             }
        }

        // 4. Add Image with Multi-Page Logic
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        
        const availableWidth = pageWidth - (margin * 2);
        // Calculate the height the full image would take on the PDF
        const fullImgHeightOnPdf = (imgProps.height * availableWidth) / imgProps.width;
        
        let heightLeft = fullImgHeightOnPdf;
        let position = headerHeight; // Start after header
        let pageImgY = 0; // Where in the source image we are slicing from (conceptually)

        // First Page
        // If image fits on one page (minus header and footer margin)
        if (fullImgHeightOnPdf <= (pageHeight - headerHeight - margin)) {
             pdf.addImage(imgData, 'PNG', margin, position, availableWidth, fullImgHeightOnPdf);
        } else {
             // Multi-page loop
             // We add the image, but shifted up for subsequent pages
             // Note: jsPDF addImage supports simple placement. For splitting a long canvas cleanly across pages without slicing manually, 
             // the standard trick is to add the same image with a negative Y offset on subsequent pages, masked by the page boundaries.
             
             let yOffset = headerHeight;
             
             while (heightLeft > 0) {
                 pdf.addImage(imgData, 'PNG', margin, yOffset, availableWidth, fullImgHeightOnPdf);
                 
                 heightLeft -= (pageHeight - (yOffset === headerHeight ? headerHeight : margin) - margin); // Subtract visible area
                 yOffset -= (pageHeight - margin * 2); // Shift up for next page
                 
                 if (heightLeft > 0) {
                     pdf.addPage();
                     // No header on subsequent pages, just top margin
                     yOffset = margin - (fullImgHeightOnPdf - heightLeft); 
                     // Actually, a simpler approach for the offset in the loop:
                     // Just use the standard negative offset technique.
                 }
             }
        }
        
        // Save
        pdf.save(`SAAME_Analysis_${viewMode}_${Date.now()}.pdf`);

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Failed to generate PDF. Check console for details.");
    } finally {
        setIsExportingPdf(false);
    }
  };

  const ComparativeMetricsView = ({ category }: { category: 'Uppercase' | 'Lowercase' }) => {
      const allChars = category === 'Uppercase' ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('') : "abcdefghijklmnopqrstuvwxyz".split('');
      
      const chars = useMemo(() => {
          if (!searchQuery) return allChars;
          return allChars.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      }, [allChars, searchQuery]);

      if (!originalFont?.fontObj || !tracyFont?.fontObj) return null;
      if (chars.length === 0) return null;

      return (
          <div className="mb-8">
              <h4 className="text-sm font-bold uppercase mb-4 tracking-wider text-gray-400 border-b border-gray-800 pb-2">
                  {category === 'Uppercase' ? 'Maiúsculas' : 'Minúsculas'} - Comparação
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {chars.map(char => {
                      const m1 = getCharMetrics(originalFont.fontObj!, char);
                      const m2 = getCharMetrics(tracyFont.fontObj!, char);
                      
                      const diffL = m2.lsb - m1.lsb;
                      const diffR = m2.rsb - m1.rsb;
                      
                      const hasChange = diffL !== 0 || diffR !== 0;

                      return (
                          <div key={char} className={`bg-gray-800/40 rounded p-3 border ${hasChange ? 'border-cyan-500/30 bg-cyan-900/5' : 'border-gray-700/50'} flex flex-col gap-2 group hover:bg-gray-800 transition-colors`}>
                              {/* Header */}
                              <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                                  <span className="text-3xl leading-none text-white" style={{ fontFamily: tracyFont.fullFontFamily }}>{char}</span>
                                  <span className="text-[10px] text-gray-600 font-mono">{char.charCodeAt(0)}</span>
                              </div>

                              {/* LSB Block */}
                              <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 font-bold text-[10px] w-8">LSB</span>
                                  <div className="flex-1 flex justify-between items-center">
                                      <span className="text-gray-500 text-[10px]">{m1.lsb}</span>
                                      <span className="text-gray-600 text-[10px]">→</span>
                                      <span className={`font-mono font-medium ${diffL !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                          {m2.lsb}
                                      </span>
                                  </div>
                              </div>

                              {/* RSB Block */}
                              <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 font-bold text-[10px] w-8">RSB</span>
                                  <div className="flex-1 flex justify-between items-center">
                                      <span className="text-gray-500 text-[10px]">{m1.rsb}</span>
                                      <span className="text-gray-600 text-[10px]">→</span>
                                      <span className={`font-mono font-medium ${diffR !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                          {m2.rsb}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      );
  };

  const ExtendedComparativeView = () => {
        if (!originalFont?.fontObj || !tracyFont?.fontObj) return null;

        const glyphs = useMemo(() => {
            const standardChars = new Set([
                ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''),
                ..."abcdefghijklmnopqrstuvwxyz".split('')
            ]);
            
            const found: Array<{ char: string, unicode: number }> = [];
            const numGlyphs = tracyFont.fontObj.glyphs.length;
            
            for (let i = 0; i < numGlyphs; i++) {
                const glyph = tracyFont.fontObj.glyphs.get(i);
                if (glyph.unicode) {
                    try {
                        const char = String.fromCodePoint(glyph.unicode);
                        // Filter out standard chars (which are handled in other views)
                        // Explicitly keep Space (char === ' ') or non-empty strings
                        if (!standardChars.has(char)) {
                            if (char.trim() !== '' || char === ' ') {
                                found.push({ char, unicode: glyph.unicode });
                            }
                        }
                    } catch (e) {}
                }
            }
            
            // Filter by searchQuery
            const filtered = searchQuery 
                ? found.filter(g => 
                    g.char.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    g.unicode.toString(16).toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : found;

            return filtered.sort((a, b) => a.unicode - b.unicode);
        }, [tracyFont, searchQuery]); // Added searchQuery

        if (glyphs.length === 0) return null;

        return (
            <div className="mb-8 mt-12 pt-8 border-t border-gray-800">
                <h4 className="text-sm font-bold uppercase mb-4 tracking-wider text-gray-400 border-b border-gray-800 pb-2">
                    Comparação de Glifos Complementares (Incl. Pontuação e Espaço)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {glyphs.map(g => {
                        const m1 = getCharMetrics(originalFont.fontObj!, g.char);
                        const m2 = getCharMetrics(tracyFont.fontObj!, g.char);
                        
                        const diffL = m2.lsb - m1.lsb;
                        const diffR = m2.rsb - m1.rsb;
                        const hasChange = diffL !== 0 || diffR !== 0;

                        return (
                            <div key={g.unicode} className={`bg-gray-800/40 rounded p-3 border ${hasChange ? 'border-cyan-500/30 bg-cyan-900/5' : 'border-gray-700/50'} flex flex-col gap-2 group hover:bg-gray-800 transition-colors`}>
                                {/* Header */}
                                <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                                    <span className="text-2xl leading-none text-white w-full text-center" style={{ fontFamily: tracyFont.fullFontFamily }}>
                                        {/* Visualize Space */}
                                        {g.char === ' ' ? <span className="text-xs text-gray-500 font-mono tracking-widest">[ESPAÇO]</span> : g.char}
                                    </span>
                                </div>
                                <div className="text-[9px] text-gray-600 font-mono text-center mb-1">{g.unicode} (U+{g.unicode.toString(16).toUpperCase()})</div>

                                {/* LSB Block */}
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold text-[10px] w-6">L</span>
                                    <div className="flex-1 flex justify-between items-center pl-2">
                                        <span className="text-gray-500 text-[10px]">{m1.lsb}</span>
                                        <span className="text-gray-600 text-[10px]">→</span>
                                        <span className={`font-mono font-medium ${diffL !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                            {m2.lsb}
                                        </span>
                                    </div>
                                </div>

                                {/* RSB Block */}
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold text-[10px] w-6">R</span>
                                    <div className="flex-1 flex justify-between items-center pl-2">
                                        <span className="text-gray-500 text-[10px]">{m1.rsb}</span>
                                        <span className="text-gray-600 text-[10px]">→</span>
                                        <span className={`font-mono font-medium ${diffR !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                            {m2.rsb}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-xl">
       {/* Inject Local Styles to enforce precision within this canvas context */}
       <style>
            {Object.values(fonts).filter((f): f is FontState => !!f).map(f => generateFontFaceCSS(f)).join('\n')}
       </style>

      {/* Toolbar */}
      <div className="bg-gray-800 p-3 flex flex-col xl:flex-row gap-4 border-b border-gray-700">
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
            <div className="flex items-center gap-2 px-2 bg-gray-700/50 rounded p-1">
                <Type className="w-4 h-4 text-gray-400" />
                <input 
                    type="number" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-1 text-sm text-center text-white"
                />
                <span className="text-xs text-gray-400">px</span>
            </div>
            
            {/* Line Height Control */}
            <div className="flex items-center gap-2 px-2 bg-gray-700/50 rounded p-1">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <input 
                    type="number"
                    step="0.1" 
                    min="0.8"
                    max="3.0"
                    value={lineHeight} 
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-1 text-sm text-center text-white"
                />
                <span className="text-xs text-gray-400">em (Entrelinha)</span>
            </div>

            <div className="flex gap-1 bg-gray-700/50 rounded p-1">
                 <button 
                    onClick={() => setViewMode('side-by-side')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'side-by-side' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Parágrafos Lado a Lado"
                 >
                    <Columns className="w-4 h-4" />
                 </button>
                 {!isCompareMode && (
                 <button 
                    onClick={() => setViewMode('stack')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'stack' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Visualização Empilhada"
                 >
                    <AlignJustify className="w-4 h-4" />
                 </button>
                 )}
                 <button 
                    onClick={() => setViewMode('overlay')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'overlay' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Visualização Overlay"
                 >
                    <Layers className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setViewMode('metrics')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'metrics' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Dados de Métricas"
                 >
                    <BarChart2 className="w-4 h-4" />
                 </button>
            </div>

            {/* UPDATED: PDF Export Button for Side-by-Side and Overlay */}
            {(viewMode === 'overlay' || viewMode === 'side-by-side') && (
                <button
                    onClick={handlePdfExport}
                    disabled={isExportingPdf}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600 text-white rounded text-xs font-bold transition-colors border border-gray-600 ml-2"
                    title="Exportar Relatório Visual para PDF"
                >
                    {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-400" />}
                    <span className="hidden md:inline">Exportar PDF</span>
                </button>
            )}

        </div>

            <div className="flex-1 flex gap-2">
            <textarea 
                value={testText} 
                onChange={(e) => setTestText(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 font-sans min-w-0 resize-none h-10 leading-tight"
                placeholder="Digite o texto para análise rítmica..."
            />
            <div className="flex flex-col gap-1 justify-center">
                 <div className="flex gap-1">
                    <button onClick={() => setPreset("HHOOHOH\nnnoonon\nminimum", 120)} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-gray-300 whitespace-nowrap flex-1">Análise</button>
                    <button onClick={() => setPreset("Hamburgforeigns", 120)} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-gray-300 whitespace-nowrap flex-1">Palavra</button>
                 </div>
                 <button onClick={() => setPreset(PARAGRAPH_TEXT, 18)} className="text-[10px] bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800 px-2 py-0.5 rounded text-blue-200 whitespace-nowrap w-full">¶ Parágrafo</button>
            </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-950 relative">
        
        {viewMode === 'side-by-side' && (
             <div 
                ref={exportRef} 
                data-export-target="true"
                className={`grid ${isCompareMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'} gap-0 h-full divide-y md:divide-y-0 md:divide-x divide-gray-800 bg-gray-950`}
             >
                {/* Original */}
                <div className="flex flex-col h-full bg-gray-900/30 order-1 overflow-y-auto">
                     <div className="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center sticky top-0 z-10" data-html2canvas-ignore>
                         <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 truncate max-w-[200px]" title={labelOriginal}>
                             {labelOriginal}
                         </h4>
                         <button onClick={() => handleExport(MethodType.ORIGINAL)} className="opacity-50 hover:opacity-100"><Download className="w-3 h-3 text-gray-400" /></button>
                     </div>
                     <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        {/* Added explicit line-height to match metrics logic even in paragraph view */}
                        <p style={{ fontFamily: originalFont?.fullFontFamily || 'serif', fontSize: `${fontSize}px`, lineHeight: lineHeight }} className="text-gray-300 whitespace-pre-wrap break-words">
                            {testText}
                        </p>
                     </div>
                </div>

                {/* Adjusted / Tracy */}
                <div className="flex flex-col h-full order-2 overflow-y-auto">
                     <div className="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center sticky top-0 z-10" data-html2canvas-ignore>
                         <h4 className={`text-xs font-bold uppercase tracking-widest ${isCompareMode ? 'text-cyan-400' : 'text-pink-400'} truncate max-w-[200px]`} title={labelTracy}>
                            {labelTracy}
                         </h4>
                         <button onClick={() => handleExport(MethodType.TRACY)} className="opacity-50 hover:opacity-100"><Download className={`w-3 h-3 ${isCompareMode ? 'text-cyan-400' : 'text-pink-400'}`} /></button>
                     </div>
                     <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        <p style={{ fontFamily: tracyFont?.fullFontFamily || 'serif', fontSize: `${fontSize}px`, lineHeight: lineHeight }} className="text-gray-200 whitespace-pre-wrap break-words">
                            {testText}
                        </p>
                     </div>
                </div>

                {/* Sousa Method - Hidden in Compare Mode */}
                {!isCompareMode && (
                    <div className="flex flex-col h-full order-3 overflow-y-auto">
                         <div className="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center sticky top-0 z-10" data-html2canvas-ignore>
                             <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Método Miguel Sousa</h4>
                             <button onClick={() => handleExport(MethodType.SOUSA)} className="opacity-50 hover:opacity-100"><Download className="w-3 h-3 text-cyan-400" /></button>
                         </div>
                         <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                            <p style={{ fontFamily: sousaFont?.fullFontFamily || 'serif', fontSize: `${fontSize}px`, lineHeight: lineHeight }} className="text-gray-200 whitespace-pre-wrap break-words">
                                {testText}
                            </p>
                         </div>
                    </div>
                )}
             </div>
        )}

        {viewMode === 'stack' && (
            <div className="space-y-8 p-4 md:p-8 bg-gray-950">
                {originalFont?.url && (
                    <div className="border-l-4 border-gray-500 pl-4 bg-gray-900/40 p-4 rounded-r transition-all hover:bg-gray-900/60">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-2">
                                <span className="w-3 h-3 bg-gray-500 rounded-sm"></span> {labelOriginal}
                             </h4>
                             <button onClick={() => handleExport(MethodType.ORIGINAL)} className="text-xs text-gray-400 hover:text-white flex gap-1 items-center bg-gray-800 px-2 py-1 rounded border border-gray-700" data-html2canvas-ignore><Download className="w-3 h-3"/> OTF</button>
                        </div>
                        <p style={{ fontFamily: originalFont.fullFontFamily, fontSize: `${fontSize}px`, lineHeight: lineHeight }} className="text-white opacity-90 break-words whitespace-pre-wrap">
                            {testText}
                        </p>
                    </div>
                )}
                {tracyFont?.url && (
                    <div className={`border-l-4 ${isCompareMode ? 'border-cyan-500 bg-cyan-900/10 hover:bg-cyan-900/20' : 'border-pink-500 bg-pink-900/10 hover:bg-pink-900/20'} pl-4 p-4 rounded-r transition-all`}>
                        <div className="flex justify-between items-center mb-2">
                             <h4 className={`text-xs uppercase font-bold tracking-wider flex items-center gap-2 ${isCompareMode ? 'text-cyan-500' : 'text-pink-500'}`}>
                                <span className={`w-3 h-3 rounded-sm ${isCompareMode ? 'bg-cyan-500' : 'bg-pink-500'}`}></span> 
                                {labelTracy}
                             </h4>
                             <button onClick={() => handleExport(MethodType.TRACY)} className={`text-xs hover:text-white flex gap-1 items-center bg-gray-800 px-2 py-1 rounded border border-gray-700 ${isCompareMode ? 'text-cyan-400' : 'text-pink-400'}`} data-html2canvas-ignore><Download className="w-3 h-3"/> OTF</button>
                        </div>
                        <p style={{ fontFamily: tracyFont.fullFontFamily, fontSize: `${fontSize}px`, lineHeight: lineHeight }} className="text-white break-words whitespace-pre-wrap">
                            {testText}
                        </p>
                    </div>
                )}
                {!isCompareMode && sousaFont?.url && (
                    <div className="border-l-4 border-cyan-500 pl-4 bg-cyan-900/10 p-4 rounded-r transition-all hover:bg-cyan-900/20">
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs uppercase text-cyan-500 font-bold tracking-wider flex items-center gap-2">
                                <span className="w-3 h-3 bg-cyan-500 rounded-sm"></span> Sousa Method
                             </h4>
                             <button onClick={() => handleExport(MethodType.SOUSA)} className="text-xs text-cyan-400 hover:text-white flex gap-1 items-center bg-gray-800 px-2 py-1 rounded border border-gray-700" data-html2canvas-ignore><Download className="w-3 h-3"/> OTF</button>
                        </div>
                        <p style={{ fontFamily: sousaFont.fullFontFamily, fontSize: `${fontSize}px`, lineHeight: lineHeight }} className="text-white break-words whitespace-pre-wrap">
                            {testText}
                        </p>
                    </div>
                )}
            </div>
        )}

        {viewMode === 'overlay' && (
            <div ref={exportRef} data-export-target="true" className="relative pt-8 min-h-[500px] flex justify-center p-4 bg-gray-950">
                
                {/* Legend */}
                 <div className="overlay-legend fixed bottom-8 right-8 bg-gray-900/90 backdrop-blur p-4 rounded-lg border border-gray-700 z-50 text-xs shadow-2xl pointer-events-none min-w-[200px]" data-html2canvas-ignore>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-4 h-4 border border-gray-500 rounded bg-transparent"></span> 
                        <span className="text-gray-300 truncate max-w-[150px]">{labelOriginal}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-4 h-4 border rounded bg-transparent ${isCompareMode ? 'border-cyan-500' : 'border-pink-500'}`}></span> 
                        <span className={`${isCompareMode ? 'text-cyan-400' : 'text-pink-400'} truncate max-w-[150px]`}>
                            {labelTracy}
                        </span>
                    </div>
                    {/* Explicitly show Sousa legend in standard SAAME Lab mode */}
                    {!isCompareMode && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-4 h-4 border border-cyan-500 rounded bg-transparent"></span> 
                            <span className="text-cyan-400">Sousa (Cyan)</span>
                        </div>
                    )}
                    
                    {/* Grid Lines Legend (Compare Mode Only) */}
                    {isCompareMode && (
                        <div className="border-t border-gray-700 mt-2 pt-2">
                            <div className="text-[10px] text-gray-900 uppercase font-bold mb-1">Grid Lines</div>
                            <div className="grid grid-cols-2 gap-1">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-yellow-400"></div> <span className="text-gray-400">Ascender</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-green-400"></div> <span className="text-gray-400">Cap Height</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-blue-400"></div> <span className="text-gray-400">x-Height</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-white"></div> <span className="text-white">Baseline</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-red-400"></div> <span className="text-gray-400">Descender</span></div>
                            </div>
                        </div>
                    )}

                    {isCompareMode && (
                         <div className="mt-2 text-[9px] text-gray-500 italic border-t border-gray-700 pt-2">
                             Visuals rendered as wireframes. Baselines mathematically aligned.
                         </div>
                    )}
                </div>

                <div className="w-full text-center">
                    <div className="relative inline-block text-left">
                        
                         {/* Original (Reference) - Anchored at Top 0 */}
                        <div 
                            className="overlay-reference-text absolute top-0 left-0 z-10 select-none pointer-events-none w-full"
                            style={{ 
                                fontFamily: originalFont?.fullFontFamily || 'Original', 
                                fontSize: `${fontSize}px`,
                                color: 'transparent',
                                WebkitTextStroke: '0.8px rgba(156, 163, 175, 0.6)', 
                                whiteSpace: 'pre-wrap',
                                lineHeight: `${lhPx}px`,
                                height: '100%'
                            }}
                        >
                            {testText}
                        </div>

                        {/* Adjusted (Experimental) - Anchored at Calculated Correction Y */}
                        <div 
                            className={`absolute left-0 z-20 select-none pointer-events-none w-full ${isCompareMode ? 'select-text z-30' : ''}`}
                            style={{ 
                                top: `${expCorrectionY}px`, // Force alignment to Reference Baseline
                                fontFamily: tracyFont?.fullFontFamily || 'Tracy', 
                                fontSize: `${fontSize}px`,
                                color: 'transparent',
                                WebkitTextStroke: isCompareMode ? '0.8px rgba(6, 182, 212, 0.8)' : '1px rgba(236, 72, 153, 0.8)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: `${lhPx}px`,
                                height: '100%'
                            }}
                        >
                            {testText}
                        </div>

                        {/* Sousa - Hidden in Compare */}
                        {!isCompareMode && (
                            <div 
                                className="relative z-30 select-text w-full"
                                style={{ 
                                    fontFamily: sousaFont?.fullFontFamily || 'Sousa', 
                                    fontSize: `${fontSize}px`,
                                    WebkitTextStroke: '1px rgba(6, 182, 212, 0.9)', 
                                    color: 'transparent',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: `${lhPx}px`
                                }}
                            >
                                {testText}
                            </div>
                        )}
                        
                        {/* Independent SVG Grid Overlay Layer - Rendered ON TOP (z-50) */}
                        {isCompareMode && (
                            <div 
                                style={{
                                    backgroundImage: grid,
                                    backgroundSize: `100% ${lhPx}px`,
                                    backgroundRepeat: 'repeat-y',
                                    backgroundPosition: '0 0',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'none',
                                    zIndex: 50
                                }}
                            />
                        )}

                        {/* Placeholder to give height/shape to container */}
                        {isCompareMode && (
                             <div style={{ fontSize: `${fontSize}px`, opacity: 0, pointerEvents: 'none', lineHeight: `${lhPx}px`, whiteSpace: 'pre-wrap' }}>{testText}</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'metrics' && (
             <div className="p-4 md:p-8 max-w-7xl mx-auto">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h3 className="text-xl font-bold flex gap-2 items-center text-white"><BarChart2 className="text-blue-400" /> Metrics Analysis</h3>
                    
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text"
                            placeholder="Pesquisar glifo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-700 rounded"
                            >
                                <X className="w-3 h-3 text-gray-400" />
                            </button>
                        )}
                    </div>
                 </div>
                 
                 {isCompareMode ? (
                     <>
                        {/* Comparative Stats Summary */}
                        <div className="space-y-8 bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-8">
                             <div className="flex flex-col md:flex-row gap-8 justify-between">
                                 <div className="flex-1">
                                     <h4 className="font-bold text-gray-300 mb-4">{labelOriginal}</h4>
                                     <div className="flex justify-between text-sm mb-2 text-gray-400">
                                         <span>Global Average Spacing</span>
                                         <span>{getAvgSB(MethodType.ORIGINAL)} units</span>
                                     </div>
                                 </div>
                                 <div className="w-px bg-gray-700 hidden md:block"></div>
                                 <div className="flex-1">
                                     <h4 className="font-bold text-cyan-400 mb-4">{labelTracy}</h4>
                                     <div className="flex justify-between text-sm mb-2 text-cyan-300">
                                         <span>Global Average Spacing</span>
                                         <span>{getAvgSB(MethodType.TRACY)} units</span>
                                     </div>
                                 </div>
                             </div>
                        </div>
                        
                        {/* Detailed Character Cards */}
                        <ComparativeMetricsView category="Lowercase" />
                        <ComparativeMetricsView category="Uppercase" />
                        
                        {/* NEW: Full Extended Character Set Comparison */}
                        <ExtendedComparativeView />
                     </>
                 ) : (
                     <>
                         <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                             <div className="space-y-8">
                                 <SpacingDiagram 
                                    font={tracyFont} 
                                    method={MethodType.TRACY} 
                                    category="Lowercase" 
                                    searchQuery={searchQuery}
                                    onGlyphClick={(char, lsb, rsb) => setSelectedAdjustment({ char, method: MethodType.TRACY, lsb, rsb })}
                                 />
                                 <SpacingDiagram 
                                    font={tracyFont} 
                                    method={MethodType.TRACY} 
                                    category="Uppercase" 
                                    searchQuery={searchQuery}
                                    onGlyphClick={(char, lsb, rsb) => setSelectedAdjustment({ char, method: MethodType.TRACY, lsb, rsb })}
                                 />
                                 <RemainingGlyphsView 
                                    font={tracyFont} 
                                    method={MethodType.TRACY} 
                                    searchQuery={searchQuery}
                                    onGlyphClick={(char, lsb, rsb) => setSelectedAdjustment({ char, method: MethodType.TRACY, lsb, rsb })}
                                 />
                             </div>
                             <div className="space-y-8">
                                 <SousaAnalysisView 
                                    font={sousaFont} 
                                    category="Lowercase" 
                                    searchQuery={searchQuery}
                                    onGlyphClick={(char, lsb, rsb) => setSelectedAdjustment({ char, method: MethodType.SOUSA, lsb, rsb })}
                                 />
                                 <SousaAnalysisView 
                                    font={sousaFont} 
                                    category="Uppercase" 
                                    searchQuery={searchQuery}
                                    onGlyphClick={(char, lsb, rsb) => setSelectedAdjustment({ char, method: MethodType.SOUSA, lsb, rsb })}
                                 />
                                 <RemainingGlyphsView 
                                    font={sousaFont} 
                                    method={MethodType.SOUSA} 
                                    searchQuery={searchQuery}
                                    onGlyphClick={(char, lsb, rsb) => setSelectedAdjustment({ char, method: MethodType.SOUSA, lsb, rsb })}
                                 />
                             </div>
                         </div>
                     </>
                 )}
             </div>
        )}

        {/* Individual Adjustment Modal */}
        <AnimatePresence>
            {selectedAdjustment && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <Settings2 className={`w-5 h-5 ${selectedAdjustment.method === MethodType.TRACY ? 'text-pink-400' : 'text-cyan-400'}`} />
                                <h3 className="text-white font-bold uppercase text-sm tracking-tight">
                                    Ajuste Individual: {selectedAdjustment.char}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedAdjustment(null)} className="p-1 hover:bg-slate-800 rounded">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col items-center justify-center min-h-[140px]">
                                        <div 
                                            className="text-7xl text-white leading-none"
                                            style={{ fontFamily: fonts[selectedAdjustment.method]?.fullFontFamily }}
                                        >
                                            {selectedAdjustment.char}
                                        </div>
                                        <div className="text-[10px] text-gray-600 font-mono mt-4 uppercase tracking-widest">
                                            {selectedAdjustment.method === MethodType.TRACY ? 'Walter Tracy' : 'Miguel Sousa'}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-none">LSB</label>
                                                <span className="text-xs font-mono text-blue-400">{selectedAdjustment.lsb}</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="-100"
                                                max="400"
                                                value={selectedAdjustment.lsb}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    setSelectedAdjustment(prev => prev ? { ...prev, lsb: val } : null);
                                                    onUpdateGlyph?.(selectedAdjustment.method, selectedAdjustment.char, val, selectedAdjustment.rsb);
                                                }}
                                                className="w-full accent-blue-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-none">RSB</label>
                                                <span className="text-xs font-mono text-green-400">{selectedAdjustment.rsb}</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="-100"
                                                max="400"
                                                value={selectedAdjustment.rsb}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    setSelectedAdjustment(prev => prev ? { ...prev, rsb: val } : null);
                                                    onUpdateGlyph?.(selectedAdjustment.method, selectedAdjustment.char, selectedAdjustment.lsb, val);
                                                }}
                                                className="w-full accent-green-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-full min-h-[250px] bg-slate-950/50 rounded-xl overflow-hidden border border-slate-800/50">
                                    <GlyphVisualizer 
                                        char={selectedAdjustment.char}
                                        font={fonts[selectedAdjustment.method]}
                                        lsb={selectedAdjustment.lsb}
                                        rsb={selectedAdjustment.rsb}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-800 flex justify-end">
                            <button 
                                onClick={() => setSelectedAdjustment(null)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
                            >
                                Concluir
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
};
