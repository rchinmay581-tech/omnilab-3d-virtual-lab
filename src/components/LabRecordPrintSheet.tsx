import React from 'react';
import {
  ExamScoreBreakdown,
  ExperimentConfig,
  LabMode,
  StudentAccount,
} from '../types/lab';

interface LabRecordPrintSheetProps {
  student: StudentAccount | null;
  experiment: ExperimentConfig;
  labMode: LabMode;
  stepTimestamps: (string | null)[];
  observations: Record<string, string>;
  verifiedResult: string;
  vivaScore: number;
  safetyScore: number;
  examBreakdown: ExamScoreBreakdown | null;
  graphSnapshotUrl: string | null;
}

export const LabRecordPrintSheet: React.FC<LabRecordPrintSheetProps> = ({
  student,
  experiment,
  labMode,
  stepTimestamps,
  observations,
  verifiedResult,
  vivaScore,
  safetyScore,
  examBreakdown,
  graphSnapshotUrl,
}) => {
  const nowStr = new Date().toLocaleString();

  return (
    <div className="hidden print-only-sheet p-6 text-slate-900 bg-white font-sans">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-800 pb-4 mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
            OmniLab 3D · Practical Examination & Lab Journal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {experiment.discipline} Practical Record Sheet
          </h1>
          <div className="text-sm font-medium text-slate-700 mt-0.5">
            Experiment #{String(experiment.number).padStart(2, '0')}: {experiment.title}
          </div>
        </div>

        <div className="text-right space-y-1">
          <span className="inline-block px-3 py-1 rounded border-2 border-slate-800 text-xs font-bold uppercase tracking-wide">
            {labMode === 'exam' ? 'Exam Mode (30 Marks)' : 'Practice Mode'}
          </span>
          <div className="text-xs text-slate-600">{nowStr}</div>
        </div>
      </div>

      {/* Student Metadata */}
      <div className="grid grid-cols-3 gap-4 p-3 rounded border border-slate-300 bg-slate-50 mb-5 text-xs">
        <div>
          <span className="text-slate-500 block">Student Name</span>
          <strong className="text-sm text-slate-900">{student?.name ?? 'Guest Student'}</strong>
          {student?.rollNumber && (
            <div className="text-[11px] font-mono text-slate-600 mt-0.5">
              Roll No: {student.rollNumber}
            </div>
          )}
        </div>
        <div>
          <span className="text-slate-500 block">
            {student?.method === 'google' ? 'Google Account' : `Student ID (${student?.method ?? 'id'})`}
          </span>
          <strong className="text-sm text-slate-900 break-all">{student?.identifier ?? '—'}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Safety & Accuracy Score</span>
          <strong className="text-sm text-emerald-700">{safetyScore}%</strong>
        </div>
      </div>

      {/* Aim */}
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Aim</h2>
        <p className="text-sm text-slate-800">{experiment.summary}</p>
      </div>

      {/* Procedure Steps */}
      <div className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
          Procedure & Verification Timestamps
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2.5 py-1.5 text-left w-10">#</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-left">Step Description</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-left w-36">Status / Time</th>
            </tr>
          </thead>
          <tbody>
            {experiment.steps.map((s, idx) => (
              <tr key={s.id}>
                <td className="border border-slate-300 px-2.5 py-1.5 font-mono">{idx + 1}</td>
                <td className="border border-slate-300 px-2.5 py-1.5">{s.instruction}</td>
                <td className="border border-slate-300 px-2.5 py-1.5 font-mono text-emerald-700">
                  {stepTimestamps[idx] ? `[✔] ${stepTimestamps[idx]}` : 'Pending'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observation Table + Graph Snapshot */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        <div className="col-span-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Observation Table
          </h2>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2.5 py-1.5 text-left">Quantity</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-right">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {experiment.observationFields.map((f) => (
                <tr key={f.key}>
                  <td className="border border-slate-300 px-2.5 py-1.5">{f.label}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono">
                    {observations[f.key] || '—'} {f.unit}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="border border-slate-300 px-2.5 py-1.5">{experiment.resultLabel}</td>
                <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono">
                  {verifiedResult || '—'} {experiment.resultUnit}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 p-2.5 rounded border border-slate-300 bg-slate-50 text-xs space-y-1">
            <div>
              <strong>Viva-Voce Score:</strong> {vivaScore} / 5
            </div>
            <div>
              <strong>Lab Safety Score:</strong> {safetyScore}%
            </div>
            {examBreakdown && (
              <div>
                <strong>30-Mark Practical Score:</strong> {examBreakdown.totalMarks} / 30 (Proc:{' '}
                {examBreakdown.procedureMarks}/20, Calc: {examBreakdown.calculationMarks}/5, Viva:{' '}
                {examBreakdown.vivaMarks}/5)
              </div>
            )}
          </div>
        </div>

        <div className="col-span-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Plotted Experimental Graph
          </h2>
          {graphSnapshotUrl ? (
            <img
              src={graphSnapshotUrl}
              alt="Experimental Graph Snapshot"
              className="w-full border border-slate-300 rounded"
            />
          ) : (
            <div className="h-36 border border-dashed border-slate-300 rounded flex items-center justify-center text-xs text-slate-500">
              No graph points recorded for this trial
            </div>
          )}
        </div>
      </div>

      {/* Official Stamp Footer */}
      <div className="pt-4 border-t border-slate-300 flex items-center justify-between">
        <div className="text-xs text-slate-600">
          Formula Used: <span className="font-mono font-semibold">{experiment.formulaLabel}</span>
        </div>
        <div className="px-4 py-2 border-2 border-emerald-700 text-emerald-800 font-bold text-xs tracking-widest uppercase rounded rotate-[-2deg]">
          VERIFIED BY 3D VIRTUAL LAB
        </div>
      </div>
    </div>
  );
};
