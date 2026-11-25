import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, ZoomIn } from 'lucide-react';
import { computeSharpness } from '../data/biologyExperiments';
import { PH_CHART_COLORS, drawMicroscopeSpecimen } from '../three/proceduralTextures';
import { ExperimentConfig, RigState } from '../types/lab';

interface OpticalLoupeOverlayProps {
  experiment: ExperimentConfig;
  rigState: RigState;
}

/**
 * Picture-in-Picture Magnifier Loupe / Microscope Eyepiece Optical View.
 * Renders real-time procedural Vernier/Screw Gauge/Burette scales, pH Paper
 * Strip comparison, or Biology specimen slides with focus blur & brightness.
 */
export const OpticalLoupeOverlay: React.FC<OpticalLoupeOverlayProps> = ({ experiment, rigState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const isVernier = experiment.subMode.startsWith('vernier');
  const isScrew = experiment.subMode.startsWith('screw') || experiment.subMode === 'spherometer';
  const isTitration = experiment.subMode.startsWith('titration');
  const isPhTile = experiment.subMode === 'ph_tile';
  const isBiology = experiment.rigType === 'biology_microscopy';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (isVernier) {
      // Magnified Vernier Calliper scale alignment
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const mmVal = rigState.jawPositionMm;
      const msrMm = Math.floor(mmVal);
      const vsc = Math.round((mmVal - msrMm) * 10) % 10;

      // Top main scale (centered near current mmVal)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 14, w, 58);
      ctx.strokeStyle = '#0f172a';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';

      const pxPerMm = 18;
      const originX = 36 - (mmVal - 2) * pxPerMm;
      for (let m = 0; m <= 80; m++) {
        const x = originX + m * pxPerMm;
        if (x < -10 || x > w + 10) continue;
        const isCm = m % 10 === 0;
        const isHalf = m % 5 === 0;
        ctx.lineWidth = isCm ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 72);
        ctx.lineTo(x, isCm ? 38 : isHalf ? 48 : 56);
        ctx.stroke();
        if (isCm) ctx.fillText(`${m / 10}cm`, x, 30);
      }

      // Bottom Vernier sliding scale
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 74, w, 52);
      const vStart = originX + mmVal * pxPerMm;
      for (let i = 0; i <= 10; i++) {
        const x = vStart + i * (pxPerMm * 0.9);
        ctx.strokeStyle = i === vsc ? '#0284c7' : '#0f172a';
        ctx.lineWidth = i === vsc ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x, 74);
        ctx.lineTo(x, i % 5 === 0 ? 104 : 94);
        ctx.stroke();
        if (i === 0 || i === 5 || i === 10 || i === vsc) {
          ctx.fillStyle = i === vsc ? '#0284c7' : '#0f172a';
          ctx.fillText(String(i), x, 118);
        }
      }
    } else if (isScrew) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      const valMm =
        experiment.subMode === 'spherometer'
          ? rigState.spherometerHeightMm
          : rigState.thimbleRotation * 0.01;

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(10, 42, 120, 56);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 70);
      ctx.lineTo(130, 70);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px "IBM Plex Mono", monospace';
      for (let m = 0; m <= 5; m++) {
        const x = 22 + m * 20;
        ctx.beginPath();
        ctx.moveTo(x, 70);
        ctx.lineTo(x, 52);
        ctx.stroke();
        ctx.fillText(String(m), x - 3, 49);
      }

      // Thimble drum right side
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(130, 16, 108, 108);
      const csr = Math.round((valMm * 100) % 100);
      for (let d = -3; d <= 3; d++) {
        const div = (csr + d + 100) % 100;
        const y = 70 - d * 14;
        ctx.strokeStyle = d === 0 ? '#0284c7' : '#0f172a';
        ctx.lineWidth = d === 0 ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(130, y);
        ctx.lineTo(165, y);
        ctx.stroke();
        ctx.fillStyle = d === 0 ? '#0284c7' : '#0f172a';
        ctx.fillText(String(div), 178, y + 4);
      }
    } else if (isTitration) {
      // Burette Meniscus Loupe
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const ml = rigState.titratedMl;
      const isKmno4 = experiment.subMode.includes('kmno4');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(88, 6, 72, h - 12);

      // Liquid column up to center meniscus
      ctx.fillStyle = isKmno4 ? 'rgba(147, 51, 234, 0.72)' : 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.moveTo(90, h - 6);
      ctx.lineTo(90, 66);
      ctx.quadraticCurveTo(124, isKmno4 ? 66 : 74, 158, 66);
      ctx.lineTo(158, h - 6);
      ctx.closePath();
      ctx.fill();

      // Graduation lines near ml
      ctx.strokeStyle = '#e2e8f0';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px "IBM Plex Mono", monospace';
      const baseMl = Math.floor(ml);
      for (let d = -3; d <= 3; d++) {
        const tickVal = baseMl + d;
        if (tickVal < 0 || tickVal > 50) continue;
        const y = 70 + (tickVal - ml) * 20;
        ctx.lineWidth = tickVal % 5 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(90, y);
        ctx.lineTo(tickVal % 5 === 0 ? 122 : 110, y);
        ctx.stroke();
        ctx.fillText(`${tickVal}.0`, 128, y + 4);
      }
    } else if (isPhTile) {
      // Universal pH 1-14 Reference Chart & 6 Physical Indicator Paper Strips
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Top reference scale 1-14
      const swW = (w - 16) / 14;
      ctx.font = 'bold 9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      PH_CHART_COLORS.forEach((c, idx) => {
        const x = 8 + idx * swW;
        ctx.fillStyle = c.hex;
        ctx.fillRect(x + 1, 10, swW - 2, 22);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(String(c.ph), x + swW / 2, 43);
      });

      // 6 pH paper strips (dry amber vs tested)
      const samples = [
        { lbl: 'HCl', tip: '#dc2626', ph: '1.2' },
        { lbl: 'NaOH', tip: '#5b21b6', ph: '13' },
        { lbl: 'Acid', tip: '#f97316', ph: '3.0' },
        { lbl: 'Lemon', tip: '#ea580c', ph: '2.2' },
        { lbl: 'H₂O', tip: '#22c55e', ph: '7.0' },
        { lbl: 'HCO₃', tip: '#06b6d4', ph: '8.5' },
      ];
      samples.forEach((s, i) => {
        const x = 14 + i * 38;
        // Dry upper half of paper strip
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x, 54, 28, 34);
        // Dipped reactive lower half
        ctx.fillStyle = rigState.litmusTested ? s.tip : '#facc15';
        ctx.fillRect(x, 88, 28, 28);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(x, 54, 28, 62);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 9px "IBM Plex Mono", monospace';
        ctx.fillText(s.lbl, x + 14, 128);
        if (rigState.litmusTested) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`pH ${s.ph}`, x + 14, 138);
        }
      });
    } else if (isBiology) {
      const specimen = experiment.eyepieceType || experiment.subMode;
      const plasmolysis = experiment.subMode === 'plasmolysis' ? Math.min(1, rigState.osmosisTimeHr) : 0;
      drawMicroscopeSpecimen(
        ctx,
        w,
        h,
        specimen,
        rigState.objectivePower,
        rigState.stainAdded,
        plasmolysis
      );
    }
  }, [experiment, rigState, isVernier, isScrew, isTitration, isPhTile, isBiology]);

  if (!isVernier && !isScrew && !isTitration && !isPhTile && !isBiology) {
    return null;
  }

  const sharpness = isBiology ? computeSharpness(rigState) : 100;
  const blurPx = isBiology ? ((100 - sharpness) / 100) * 6.5 : 0;
  const brightness = isBiology ? 0.55 + rigState.mirrorAngle * 1.1 : 1;

  return (
    <div className="no-print bg-slate-950/92 border border-slate-700/75 rounded-lg p-2.5 shadow-xl w-[252px]">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300">
          {isBiology ? <Eye className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
          <span>
            {isBiology
              ? `Eyepiece (${rigState.objectivePower * 10}×)`
              : isTitration
                ? 'Meniscus Loupe'
                : isPhTile
                  ? 'pH Paper & Chart'
                  : 'Scale Loupe'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono-tabular text-slate-400">
            {isBiology
              ? `${sharpness}%`
              : isTitration
                ? `${rigState.titratedMl.toFixed(2)} mL`
                : isPhTile
                  ? rigState.litmusTested
                    ? 'Tested'
                    : 'Dry'
                  : isVernier
                    ? `${(rigState.jawPositionMm / 10).toFixed(2)} cm`
                    : experiment.subMode === 'spherometer'
                      ? `${rigState.spherometerHeightMm.toFixed(2)} mm`
                      : `${(rigState.thimbleRotation * 0.01).toFixed(2)} mm`}
          </span>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {!collapsed && (
        <>
          <div className="mt-2 relative overflow-hidden rounded border border-slate-800 bg-slate-900 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={236}
              height={132}
              style={{
                filter: `blur(${blurPx.toFixed(1)}px) brightness(${brightness.toFixed(2)})`,
              }}
              className={`block ${isBiology ? 'rounded-full w-[132px] h-[132px] my-1 border-2 border-slate-700' : 'w-full h-[132px]'}`}
            />
          </div>
          {isBiology && (
            <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
              {rigState.slidePlaced
                ? experiment.eyepieceCaption || 'Adjust Coarse & Fine knobs for > 90% sharpness.'
                : 'Place specimen slide on stage to view.'}
            </p>
          )}
        </>
      )}
    </div>
  );
};
