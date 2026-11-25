import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { ExamScoreBreakdown, ExperimentConfig, LabMode, SafetyAlert } from '../types/lab';

interface ProcedureChecklistProps {
  experiment: ExperimentConfig;
  stepUnlocked: boolean[];
  safetyAlert: SafetyAlert | null;
  labMode: LabMode;
  safetyScore: number;
  examScore: ExamScoreBreakdown;
  onDismissSafety: () => void;
}

/**
 * Floating Procedure Checklist panel.
 * Strict Physical Completion Rule: Checkboxes are NOT clickable by users;
 * green animated tick marks [✔] appear ONLY when the 3D apparatus satisfies
 * the step condition.
 */
export const ProcedureChecklist: React.FC<ProcedureChecklistProps> = ({
  experiment,
  stepUnlocked,
  safetyAlert,
  labMode,
  safetyScore,
  examScore,
  onDismissSafety,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = stepUnlocked.filter(Boolean).length;

  return (
    <aside className="no-print fixed top-18 left-4 z-20 w-[312px] max-w-[calc(100vw-2rem)] flex flex-col gap-2 pointer-events-auto">
      {/* Safety Alert Banner */}
      {safetyAlert && (
        <div className="bg-rose-950/95 border border-rose-500/80 rounded-lg p-3 shadow-lg flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-rose-200">Lab Safety & Procedure Alert (−10%)</div>
            <p className="text-xs text-rose-100/90 mt-0.5 leading-snug">{safetyAlert.message}</p>
          </div>
          <button
            type="button"
            onClick={onDismissSafety}
            className="text-[11px] text-rose-300 hover:text-white underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Procedure Checklist Panel (no backdrop-filter over WebGL) */}
      <div className="bg-[#0d1424]/92 border border-slate-700/75 rounded-lg overflow-hidden shadow-xl">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left border-b border-slate-800/80 hover:bg-slate-900/60 cursor-pointer"
        >
          <div className="min-w-0">
            <div className="text-[11px] text-cyan-400 font-medium">
              {experiment.discipline} · Exp {String(experiment.number).padStart(2, '0')} · {completedCount}/{experiment.steps.length} Steps
            </div>
            <div className="text-xs font-semibold text-slate-100 truncate">
              {experiment.shortTitle}
            </div>
          </div>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {!collapsed && (
          <div className="p-3 space-y-2.5 max-h-[46vh] overflow-y-auto lab-scroll">
            {/* Safety & Mode Status Strip */}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800 text-[11px]">
              <span className="flex items-center gap-1 text-slate-300">
                <ShieldCheck className={`w-3.5 h-3.5 ${safetyScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>Safety: <strong className="font-mono-tabular">{safetyScore}%</strong></span>
              </span>
              {labMode === 'exam' ? (
                <span className="font-mono-tabular font-semibold text-rose-300">
                  Exam: {examScore.totalMarks} / 30
                </span>
              ) : (
                <span className="text-emerald-300 font-medium">Practice Hints ON</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {labMode === 'exam' ? (
                <>
                  <EyeOff className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Exam Mode: Hints & target values hidden</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>Perform each step on the 3D apparatus to earn [✔]</span>
                </>
              )}
            </div>

            {experiment.steps.map((step, idx) => {
              const done = stepUnlocked[idx];
              const isCurrent = !done && (idx === 0 || stepUnlocked[idx - 1]);
              return (
                <div
                  key={step.id}
                  aria-disabled="true"
                  className={`p-2.5 rounded-md border transition-colors ${
                    done
                      ? 'bg-emerald-950/35 border-emerald-700/50'
                      : isCurrent
                        ? 'bg-slate-900/90 border-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border transition-transform duration-200 ${
                        done
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-105'
                          : 'bg-slate-900 border-slate-600 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs leading-snug ${
                          done ? 'text-emerald-200' : 'text-slate-200'
                        }`}
                      >
                        <span className="font-mono-tabular text-slate-400 mr-1">
                          {idx + 1}.
                        </span>
                        {step.instruction}
                      </p>
                      {labMode === 'practice' && !done && (
                        <p className="text-[11px] text-cyan-300/80 mt-1 leading-snug">
                          {step.hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
