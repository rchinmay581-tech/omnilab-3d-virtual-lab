import React, { useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Minus, Plus, RotateCcw } from 'lucide-react';
import { CameraPreset, CameraPresetId, ExperimentConfig, LabMode, RigState } from '../types/lab';
import { LiveEquationBanner } from './LiveEquationBanner';

interface BottomControlDockProps {
  experiment: ExperimentConfig;
  rigState: RigState;
  labMode: LabMode;
  activePresetId: CameraPresetId;
  onSelectPreset: (preset: CameraPreset) => void;
  onControlAction: (action: string, value?: number | string | boolean) => void;
  onResetExperiment: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  experiment,
  rigState,
  labMode,
  activePresetId,
  onSelectPreset,
  onControlAction,
  onResetExperiment,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const readouts = experiment.getLiveReadout(rigState);
  const hasSliders = experiment.controls.some((c) => c.type === 'slider');

  return (
    <div className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(940px,95vw)] pointer-events-auto flex flex-col items-center">
      <LiveEquationBanner experiment={experiment} rigState={rigState} labMode={labMode} />

      {/* Collapse / Expand Handle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-t-md bg-[#0d1424]/95 border border-b-0 border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{collapsed ? 'Show Controls' : 'Hide Controls'}</span>
      </button>

      {!collapsed && (
        <div className="w-full bg-[#0d1424]/94 border border-slate-700/80 rounded-lg p-3 shadow-2xl space-y-2.5">
          {/* Top Row: Camera Presets + Live Instrument Telemetry + Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Camera className="w-3.5 h-3.5 text-cyan-400 mr-1" />
              {[
                {
                  id: 'lab_room' as const,
                  label: 'Lab Room View',
                  position: [-0.45, 2.35, 5.1] as [number, number, number],
                  target: [0, 0.75, -0.3] as [number, number, number],
                },
                ...experiment.cameraPresets,
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    activePresetId === preset.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              {readouts.map((r) => (
                <div key={r.label} className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">{r.label}:</span>
                  <span className="font-mono-tabular font-semibold text-cyan-300">{r.value}</span>
                </div>
              ))}
              <button
                type="button"
                onClick={onResetExperiment}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Experiment-specific Apparatus Controls + Fine-Tune Steppers */}
          <div className="flex flex-wrap items-center gap-2.5">
            {experiment.controls.map((ctrl) => {
              if (ctrl.type === 'button') {
                return (
                  <button
                    key={ctrl.id}
                    type="button"
                    onClick={() => onControlAction(ctrl.action)}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {ctrl.label}
                  </button>
                );
              }

              if (ctrl.type === 'toggle') {
                const active = Boolean(ctrl.getValue?.(rigState));
                return (
                  <button
                    key={ctrl.id}
                    type="button"
                    onClick={() => onControlAction(ctrl.action, !active)}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {ctrl.label}: {active ? 'ON' : 'OFF'}
                  </button>
                );
              }

              if (ctrl.type === 'select' && ctrl.options) {
                const curVal = String(ctrl.getValue?.(rigState) ?? '');
                return (
                  <label key={ctrl.id} className="flex items-center gap-2 text-xs text-slate-300">
                    <span>{ctrl.label}</span>
                    <select
                      value={curVal}
                      onChange={(e) => onControlAction(ctrl.action, e.target.value)}
                      className="px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {ctrl.options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              if (ctrl.type === 'slider') {
                const val = Number(ctrl.getValue?.(rigState) ?? ctrl.min ?? 0);
                const min = ctrl.min ?? 0;
                const max = ctrl.max ?? 100;
                const step = ctrl.step ?? 1;
                const nudge = (dir: -1 | 1) => {
                  const next = Math.max(min, Math.min(max, Number((val + dir * step).toFixed(4))));
                  onControlAction(ctrl.action, next);
                };

                return (
                  <div
                    key={ctrl.id}
                    className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-xs"
                  >
                    <span className="text-slate-300 whitespace-nowrap mr-0.5">{ctrl.label}</span>
                    <button
                      type="button"
                      onClick={() => nudge(-1)}
                      title={`Decrease ${ctrl.label} by ${step}`}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="range"
                      aria-label={ctrl.label}
                      min={min}
                      max={max}
                      step={step}
                      value={val}
                      onChange={(e) => onControlAction(ctrl.action, Number(e.target.value))}
                      className="w-20 sm:w-24 accent-cyan-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => nudge(1)}
                      title={`Increase ${ctrl.label} by ${step}`}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="font-mono-tabular text-cyan-300 w-14 text-right whitespace-nowrap">
                      {val}
                      {ctrl.unit ? ` ${ctrl.unit}` : ''}
                    </span>
                  </div>
                );
              }

              return null;
            })}

            {hasSliders && (
              <span className="hidden lg:inline text-[10px] text-slate-500 ml-auto">
                Tip: Use ←/→ Arrow keys for precision fine-tuning
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
