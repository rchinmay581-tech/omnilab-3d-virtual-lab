import React, { useEffect, useState } from 'react';
import {
  Award,
  Calculator,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  LineChart,
} from 'lucide-react';
import {
  ExamScoreBreakdown,
  ExperimentConfig,
  GraphPoint,
  LabMode,
  RigState,
} from '../types/lab';
import { LiveGraphPlotter } from './LiveGraphPlotter';
import { VivaQuizTab } from './VivaQuizTab';

type DrawerTab = 'readings' | 'graph' | 'viva';

interface ObservationPanelProps {
  experiment: ExperimentConfig;
  rigState: RigState;
  allStepsDone: boolean;
  isCompleted: boolean;
  labMode: LabMode;
  examFactor: number;
  examBreakdown: ExamScoreBreakdown;
  graphPoints: GraphPoint[];
  onAddGraphPoint: (pt: GraphPoint) => void;
  onClearGraphPoints: () => void;
  onGraphSnapshot: (dataUrl: string) => void;
  vivaScore: number;
  onVivaScoreChange: (score: number) => void;
  savedObservation?: { fields: Record<string, string>; result: string };
  onSaveObservation?: (expId: string, data: { fields: Record<string, string>; result: string }) => void;
  onVerifySuccess: () => void;
  onVerifyFail: (msg: string) => void;
  onDownloadRecord: () => void;
}

export const ObservationPanel: React.FC<ObservationPanelProps> = ({
  experiment,
  rigState,
  allStepsDone,
  isCompleted,
  labMode,
  examFactor,
  examBreakdown,
  graphPoints,
  onAddGraphPoint,
  onClearGraphPoints,
  onGraphSnapshot,
  vivaScore,
  onVivaScoreChange,
  savedObservation,
  onSaveObservation,
  onVerifySuccess,
  onVerifyFail,
  onDownloadRecord,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('readings');
  const [obsValues, setObsValues] = useState<Record<string, string>>(savedObservation?.fields ?? {});
  const [resultInput, setResultInput] = useState(savedObservation?.result ?? '');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setObsValues(savedObservation?.fields ?? {});
    setResultInput(savedObservation?.result ?? '');
    setFeedback(null);
  }, [experiment.id, savedObservation]);

  // Auto-expand when user completes all 3D procedure steps
  useEffect(() => {
    if (allStepsDone && !isCompleted) {
      setCollapsed(false);
    }
  }, [allStepsDone, isCompleted]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();

    if (!allStepsDone) {
      const msg = 'Complete all 3D procedure steps first before verifying your final calculation.';
      setFeedback({ ok: false, text: msg });
      onVerifyFail(msg);
      return;
    }

    for (const field of experiment.observationFields) {
      const raw = parseFloat(obsValues[field.key] ?? '');
      if (Number.isNaN(raw)) {
        const msg = `Enter a valid number for ${field.label}.`;
        setFeedback({ ok: false, text: msg });
        onVerifyFail(msg);
        return;
      }
      const tol = (field.tolerancePct ?? 8) / 100;
      const diff = Math.abs(raw - field.expectedValue);
      const allowed = Math.max(0.05, Math.abs(field.expectedValue) * tol);
      if (diff > allowed) {
        const msg =
          labMode === 'exam'
            ? `${field.label} (${raw}) does not match the unknown specimen apparatus reading.`
            : `${field.label} (${raw}) differs from the 3D apparatus reading (~${field.expectedValue} ${field.unit}).`;
        setFeedback({ ok: false, text: msg });
        onVerifyFail(msg);
        return;
      }
    }

    const userRes = parseFloat(resultInput);
    if (Number.isNaN(userRes)) {
      const msg = `Enter your calculated ${experiment.resultLabel}.`;
      setFeedback({ ok: false, text: msg });
      onVerifyFail(msg);
      return;
    }

    const resTol = experiment.tolerancePct / 100;
    const resDiff = Math.abs(userRes - experiment.groundTruthResult);
    const maxDiff = Math.max(0.01, Math.abs(experiment.groundTruthResult) * resTol);

    if (resDiff > maxDiff) {
      const msg =
        labMode === 'exam'
          ? `Result ${userRes} ${experiment.resultUnit} is outside acceptable exam tolerance. Recheck your calculations.`
          : `Result ${userRes} ${experiment.resultUnit} is outside ±${experiment.tolerancePct}% tolerance (expected ~${experiment.groundTruthResult}). Check formula: ${experiment.formulaLabel}`;
      setFeedback({ ok: false, text: msg });
      onVerifyFail(msg);
      return;
    }

    onSaveObservation?.(experiment.id, { fields: obsValues, result: resultInput });
    setFeedback({
      ok: true,
      text:
        labMode === 'exam'
          ? `Verified! Exam Calculation (+5/5 Marks) awarded. Complete Viva-Voce tab for full 30/30.`
          : `Verified! Within ±${experiment.tolerancePct}% lab tolerance. Experiment badge unlocked.`,
    });
    onVerifySuccess();
  };

  return (
    <div className="no-print bg-[#0d1424]/92 border border-slate-700/75 rounded-lg overflow-hidden shadow-xl w-[320px] max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2 border-b border-slate-800/80 hover:bg-slate-900/60 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
          <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          <span>Observations, Graph & Viva</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isCompleted && <Award className="w-3.5 h-3.5 text-emerald-400" />}
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="flex flex-col">
          {/* Sub-Tab Selector */}
          <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-900/80 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('readings')}
              className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                activeTab === 'readings'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3 h-3" />
              <span>Readings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                activeTab === 'graph'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-3 h-3" />
              <span>Live Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('viva')}
              className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                activeTab === 'viva'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Viva ({vivaScore}/5)</span>
            </button>
          </div>

          <div className="p-3 max-h-[calc(100vh-19.5rem)] overflow-y-auto lab-scroll">
            {activeTab === 'readings' && (
              <form onSubmit={handleVerify} className="space-y-2.5">
                {labMode === 'practice' ? (
                  <div className="text-[11px] font-mono-tabular text-cyan-300 bg-slate-900/90 border border-slate-800 rounded p-2">
                    {experiment.formulaLabel}
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-300 bg-rose-950/50 border border-rose-800/70 rounded p-2 flex items-center justify-between">
                    <span>Exam Mode Active</span>
                    <span className="font-mono-tabular font-bold">{examBreakdown.totalMarks} / 30 Marks</span>
                  </div>
                )}

                {experiment.observationFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      {f.label} <span className="text-slate-500">({f.unit})</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={obsValues[f.key] ?? ''}
                      onChange={(e) => {
                        const nextFields = { ...obsValues, [f.key]: e.target.value };
                        setObsValues(nextFields);
                        onSaveObservation?.(experiment.id, { fields: nextFields, result: resultInput });
                      }}
                      placeholder={labMode === 'exam' ? 'Measure on 3D rig' : `e.g. ${f.placeholder}`}
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[11px] text-slate-200 font-medium mb-1">
                    {experiment.resultLabel}{' '}
                    <span className="text-slate-400">({experiment.resultUnit})</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={resultInput}
                    onChange={(e) => {
                      const nextRes = e.target.value;
                      setResultInput(nextRes);
                      onSaveObservation?.(experiment.id, { fields: obsValues, result: nextRes });
                    }}
                    placeholder={labMode === 'exam' ? 'Calculated unknown value' : `Expected ±${experiment.tolerancePct}%`}
                    className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-slate-950 border border-cyan-700/70 rounded text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {feedback && (
                  <div
                    className={`text-[11px] p-2 rounded border leading-snug ${
                      feedback.ok
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-600/60 text-rose-200'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
                >
                  {isCompleted ? 'Re-Verify Calculation' : 'Verify & Complete Lab'}
                </button>

                {isCompleted && (
                  <button
                    type="button"
                    onClick={onDownloadRecord}
                    className="w-full py-2 px-3 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>📄 Download Lab Record (PDF)</span>
                  </button>
                )}
              </form>
            )}

            {activeTab === 'graph' && (
              <LiveGraphPlotter
                experiment={experiment}
                rigState={rigState}
                points={graphPoints}
                examFactor={examFactor}
                onAddPoint={onAddGraphPoint}
                onClearPoints={onClearGraphPoints}
                onSnapshotReady={onGraphSnapshot}
              />
            )}

            {activeTab === 'viva' && (
              <VivaQuizTab
                experiment={experiment}
                allStepsDone={allStepsDone}
                savedScore={vivaScore}
                onScoreChange={onVivaScoreChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
