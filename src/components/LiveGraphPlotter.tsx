import React, { useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ExperimentConfig, GraphPoint, RigState } from '../types/lab';
import {
  computeLinearFit,
  extractGraphPoint,
  getGraphSpecForExperiment,
} from '../utils/examAndGraphEngine';

interface LiveGraphPlotterProps {
  experiment: ExperimentConfig;
  rigState: RigState;
  points: GraphPoint[];
  examFactor: number;
  onAddPoint: (pt: GraphPoint) => void;
  onClearPoints: () => void;
  onSnapshotReady?: (dataUrl: string) => void;
}

export const LiveGraphPlotter: React.FC<LiveGraphPlotterProps> = ({
  experiment,
  rigState,
  points,
  examFactor,
  onAddPoint,
  onClearPoints,
  onSnapshotReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spec = useMemo(() => getGraphSpecForExperiment(experiment), [experiment]);
  const fit = useMemo(() => computeLinearFit(points), [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padL = 44;
    const padR = 14;
    const padT = 22;
    const padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Background
    ctx.fillStyle = '#070c17';
    ctx.fillRect(0, 0, w, h);

    // Determine bounds
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    let minX = xs.length ? Math.min(...xs) : 0;
    let maxX = xs.length ? Math.max(...xs) : 10;
    let minY = ys.length ? Math.min(...ys) : 0;
    let maxY = ys.length ? Math.max(...ys) : 10;

    if (Math.abs(maxX - minX) < 1e-4) {
      minX -= 1;
      maxX += 1;
    } else {
      const mx = (maxX - minX) * 0.14;
      minX = Math.max(0, minX - mx * 0.4);
      maxX += mx;
    }

    if (Math.abs(maxY - minY) < 1e-4) {
      minY = Math.max(0, minY - 1);
      maxY += 1;
    } else {
      const my = (maxY - minY) * 0.16;
      minY = Math.max(0, minY - my * 0.4);
      maxY += my;
    }

    const toPx = (x: number) => padL + ((x - minX) / (maxX - minX)) * plotW;
    const toPy = (y: number) => padT + plotH - ((y - minY) / (maxY - minY)) * plotH;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#64748b';

    for (let i = 0; i <= 4; i++) {
      const gy = padT + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(w - padR, gy);
      ctx.stroke();
      const valY = maxY - ((maxY - minY) * i) / 4;
      ctx.textAlign = 'right';
      ctx.fillText(valY.toFixed(1), padL - 5, gy + 3);

      const gx = padL + (plotW * i) / 4;
      ctx.beginPath();
      ctx.moveTo(gx, padT);
      ctx.lineTo(gx, h - padB);
      ctx.stroke();
      const valX = minX + ((maxX - minX) * i) / 4;
      ctx.textAlign = 'center';
      ctx.fillText(valX.toFixed(1), gx, h - padB + 12);
    }

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, h - padB);
    ctx.lineTo(w - padR, h - padB);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${spec.xLabel} (${spec.xUnit})`, padL + plotW / 2, h - 6);

    ctx.save();
    ctx.translate(12, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${spec.yLabel} (${spec.yUnit})`, 0, 0);
    ctx.restore();

    // Sorted points for smooth curve or best fit line
    if (points.length >= 2) {
      const sorted = [...points].sort((a, b) => a.x - b.x);
      if (spec.curveMode === 'linear' && fit) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toPx(minX), toPy(fit.slope * minX + fit.intercept));
        ctx.lineTo(toPx(maxX), toPy(fit.slope * maxX + fit.intercept));
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        sorted.forEach((pt, idx) => {
          const px = toPx(pt.x);
          const py = toPy(pt.y);
          if (idx === 0) ctx.moveTo(px, py);
          else {
            const prev = sorted[idx - 1];
            const midX = (toPx(prev.x) + px) / 2;
            ctx.quadraticCurveTo(toPx(prev.x), toPy(prev.y), midX, (toPy(prev.y) + py) / 2);
            if (idx === sorted.length - 1) ctx.lineTo(px, py);
          }
        });
        ctx.stroke();
      }
    }

    // Data points
    points.forEach((pt) => {
      const px = toPx(pt.x);
      const py = toPy(pt.y);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    if (points.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Interact on 3D bench or click "+ Plot Point"', padL + plotW / 2, padT + plotH / 2);
    }

    onSnapshotReady?.(canvas.toDataURL('image/png'));
  }, [points, fit, spec, onSnapshotReady]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-cyan-300 truncate">{spec.title}</div>
        <span className="text-[10px] font-mono-tabular text-slate-400">{points.length} pts</span>
      </div>

      <canvas
        ref={canvasRef}
        width={290}
        height={176}
        className="w-full rounded border border-slate-800 bg-[#070c17]"
      />

      {fit ? (
        <div className="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px] font-mono-tabular">
          <span className="text-emerald-300">
            Slope m = {fit.slope.toFixed(3)} {spec.yUnit}/{spec.xUnit}
          </span>
          <span className="text-slate-400">R² = {fit.rSquared.toFixed(3)}</span>
        </div>
      ) : (
        <div className="px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
          Plot ≥ 2 readings to compute linear slope & best-fit curve.
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAddPoint(extractGraphPoint(experiment, rigState, points.length, examFactor))}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Plot 3D Point</span>
        </button>
        {points.length > 0 && (
          <button
            type="button"
            onClick={onClearPoints}
            title="Clear Plotted Points"
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
