
import React, { useMemo } from 'react';
import { FontState } from '../types';
import { getGlyphData } from '../services/fontService';

interface GlyphVisualizerProps {
  char: string;
  font: FontState | null;
  lsb: number; // Proposed LSB from slider
  rsb: number; // Proposed RSB from slider
}

export const GlyphVisualizer: React.FC<GlyphVisualizerProps> = React.memo(({ char, font, lsb, rsb }) => {
  const glyphData = useMemo(() => {
    if (!font || !font.fontObj) return null;
    return getGlyphData(font.fontObj, char);
  }, [font?.fontObj, char]);

  if (!glyphData) return <div className="bg-gray-900 rounded h-full flex items-center justify-center text-gray-600 text-xs font-mono">Sem Dados</div>;

  const { xMin, xMax, yMax, pathData } = glyphData;
  const metrics = font?.metrics;
  const upm = metrics?.unitsPerEm || 1000;
  const ascender = metrics?.ascender || 800;
  const descender = metrics?.descender || -200;
  const capHeight = metrics?.capHeight || 700;
  

  // -- FIXED ORIGIN LOGIC --
  // 1. The Typographic Origin (x=0) is fixed. It represents the Pen Start.
  // 2. The Glyph Geometry (Ink) originally starts at 'xMin'.
  // 3. We want the Visual Ink to start at 'lsb' relative to the Origin.
  //    Therefore, we must translate the glyph geometry by: (Target LSB - Original xMin).
  
  const originX = 0;
  
  // Geometric Width of the glyph (Ink only)
  const inkWidth = xMax - xMin;

  // Calculate Translation Delta
  const shiftX = lsb - xMin;
const shiftY = capHeight;
  // Visual Coordinates (Where things end up after shift)
  const visualInkStart = lsb; // Because Origin is 0
  const visualInkEnd = visualInkStart + inkWidth;
  const advanceWidth = visualInkEnd + rsb;

  // -- ViewBox Calculation --
  // We want to center the "Advance Width" area in the view, while maintaining scale relative to UPM.
  const viewScale = 1.6; // Scale factor to see surroundings
  const viewWidth = upm * viewScale; 
  const viewHeight = (ascender - descender) * 1.5;
  
  // Center X: Middle of the calculated advance width
  const centerX = advanceWidth / 2;
  const vbMinX = centerX - (viewWidth / 2);
  
  // Center Y: Middle of Ascender/Descender
  const vbMinY = -ascender - (viewHeight * 0.2); 
  
  const gridSize = 100;

  return (
    <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden flex flex-col items-center justify-center relative select-none h-full group">
       
       {/* HUD Info */}
       <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            <div className="bg-gray-900/90 border border-gray-700 px-2 py-1 rounded text-[10px] font-mono text-gray-400 shadow-xl">
               <span className="text-gray-500">UPM:</span> <span className="text-gray-200">{upm}</span>
            </div>
       </div>

       <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 pointer-events-none text-right">
            <div className="bg-gray-900/90 border border-gray-700 px-2 py-1 rounded text-[10px] font-mono shadow-xl flex gap-3">
               <span>LSB: <span className="text-blue-400 font-bold">{lsb}</span></span>
               <span>RSB: <span className="text-green-400 font-bold">{rsb}</span></span>
               <span>AW: <span className="text-gray-200 font-bold">{advanceWidth}</span></span>
            </div>
       </div>

       <svg 
         width="100%" 
         height="100%"
         viewBox={`${vbMinX} ${vbMinY} ${viewWidth} ${viewHeight}`}
         className="w-full h-full"
         preserveAspectRatio="xMidYMid meet"
       >
         <defs>
            <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x="0" y="0">
                <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
            </pattern>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
               <path d="M0,0 L0,6 L6,3 z" fill="#3B82F6" />
            </marker>
         </defs>

         <g transform="scale(1,-1)">
            {/* 1. Background Grid (Infinite) */}
            <rect x={vbMinX - 2000} y={-4000} width={viewWidth + 4000} height={8000} fill="url(#grid)" />

            {/* 2. Reference Metrics Lines */}
            {/* Baseline (y=0) */}
            <line x1={vbMinX - 2000} y1="0" x2={vbMinX + viewWidth + 2000} y2="0" stroke="#4B5563" strokeWidth="2" vectorEffect="non-scaling-stroke" /> 
            {/* Ascender */}
            <line x1={vbMinX - 2000} y1={ascender} x2={vbMinX + viewWidth + 2000} y2={ascender} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {/* Cap Height */}
            <line x1={vbMinX - 2000} y1={capHeight} x2={vbMinX + viewWidth + 2000} y2={capHeight} stroke="rgba(34, 197, 94, 0.2)" strokeDasharray="2 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {/* Descender */}
            <line x1={vbMinX - 2000} y1={descender} x2={vbMinX + viewWidth + 2000} y2={descender} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />


            {/* 3. VISUALIZATION ZONES */}
            
            {/* LSB Area (Blue) - From Origin (0) to Visual Ink Start */}
            <rect 
                x={Math.min(originX, visualInkStart)} 
                y={descender} 
                width={Math.abs(visualInkStart - originX)} 
                height={ascender - descender}
                fill={lsb >= 0 ? "rgba(59, 130, 246, 0.15)" : "rgba(239, 68, 68, 0.15)"}
            />

            {/* RSB Area (Green) - From Visual Ink End to Advance Width */}
            <rect 
                x={Math.min(visualInkEnd, advanceWidth)} 
                y={descender} 
                width={Math.abs(advanceWidth - visualInkEnd)} 
                height={ascender - descender}
                fill={rsb >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"}
            />


            {/* 4. THE GLYPH (Translated) */}
            {/* We shift the entire coordinate system of the glyph to place ink at the desired LSB location */}
           <g transform={`translate(${shiftX}, 0) scale(1,-1)`}>
                <path d={pathData} fill="white" fillOpacity="0.95" />
                
                {/* Debug: Original Bounding Box (Ghost) relative to the shifted glyph */}
                <rect 
                    x={xMin} y={descender} width={inkWidth} height={ascender - descender}
                    fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" strokeWidth="0.5" vectorEffect="non-scaling-stroke"
                />
            </g>


            {/* 5. CRITICAL LINES (Drawn last to be on top) */}

            {/* ORIGIN LINE (x=0) - FIXED */}
            <line x1="0" y1={descender - 200} x2="0" y2={ascender + 200} stroke="#60A5FA" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            
            {/* ADVANCE WIDTH LINE (x=AW) - MOVES */}
            <line x1={advanceWidth} y1={descender - 200} x2={advanceWidth} y2={ascender + 200} stroke="#34D399" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />


            {/* 6. INDICATORS */}
            {/* LSB Arrow */}
            <line x1={0} y1={ascender/2} x2={visualInkStart} y2={ascender/2} stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrow)" vectorEffect="non-scaling-stroke" />


            {/* Labels (Inverted Y back for text) */}
            <g transform="scale(1, -1)">
                <text x={5} y={-10} className="text-[10px] fill-blue-400 font-bold font-mono" style={{fontSize: '24px'}}>0 (ORG)</text>
                <text x={advanceWidth + 5} y={-10} className="text-[10px] fill-green-400 font-bold font-mono" style={{fontSize: '24px'}}>AL (AW)</text>
            </g>
         </g>
       </svg>
    </div>
  );
});
