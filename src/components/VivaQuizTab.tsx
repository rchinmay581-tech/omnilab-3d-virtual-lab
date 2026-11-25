import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, GraduationCap, Lock, RotateCcw, XCircle } from 'lucide-react';
import { labAudio } from '../audio/LabAudioEngine';
import { getVivaQuestionsForExperiment } from '../data/vivaQuestions';
import { ExperimentConfig } from '../types/lab';

interface VivaQuizTabProps {
  experiment: ExperimentConfig;
  allStepsDone: boolean;
  savedScore?: number;
  onScoreChange: (score: number) => void;
}

export const VivaQuizTab: React.FC<VivaQuizTabProps> = ({
  experiment,
  allStepsDone,
  savedScore,
  onScoreChange,
}) => {
  const questions = useMemo(() => getVivaQuestionsForExperiment(experiment), [experiment]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSummary, setCompletedSummary] = useState(false);

  useEffect(() => {
    setAnswers({});
    setCurrentIdx(0);
    setCompletedSummary(false);
  }, [experiment.id]);

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.reduce(
    (acc, q) => (answers[q.id] === q.correctIndex ? acc + 1 : acc),
    0
  );

  const handleSelect = (qId: string, optionIdx: number, correctIdx: number) => {
    if (answers[qId] !== undefined) return;
    const nextAnswers = { ...answers, [qId]: optionIdx };
    setAnswers(nextAnswers);
    if (optionIdx === correctIdx) {
      labAudio.playStepTick();
    } else {
      labAudio.playSafetyBuzz();
    }
    const nextScore = questions.reduce(
      (acc, q) => (nextAnswers[q.id] === q.correctIndex ? acc + 1 : acc),
      0
    );
    onScoreChange(nextScore);
  };

  if (!allStepsDone) {
    return (
      <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 text-center space-y-2">
        <Lock className="w-6 h-6 text-amber-400 mx-auto" />
        <div className="text-xs font-semibold text-slate-200">Viva-Voce Locked</div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Complete all 3D procedure steps ([✔]) first to unlock your 5 tailored Viva-Voce questions.
        </p>
      </div>
    );
  }

  if (completedSummary) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="p-3.5 rounded-lg bg-slate-900/85 border border-slate-700 space-y-3 text-center">
        <GraduationCap className="w-7 h-7 text-emerald-400 mx-auto" />
        <div>
          <div className="text-xs text-slate-400">Viva-Voce Completed</div>
          <div className="font-mono-tabular text-2xl font-bold text-white mt-0.5">
            {correctCount} / {questions.length}
            <span className="text-xs font-normal text-emerald-300 ml-1.5">({pct}%)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCompletedSummary(false);
              setCurrentIdx(0);
            }}
            className="flex-1 py-1.5 px-2.5 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            Review Answers
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setCurrentIdx(0);
              setCompletedSummary(false);
              onScoreChange(0);
            }}
            className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-medium rounded bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retake</span>
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const chosen = answers[q.id];
  const answered = chosen !== undefined;
  const isLast = currentIdx === questions.length - 1;

  return (
    <div className="space-y-2.5">
      {/* Header Progress Bar & Step Dots */}
      <div className="flex items-center justify-between px-2.5 py-2 rounded bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <GraduationCap className="w-4 h-4" />
          <span>
            Q{currentIdx + 1} / {questions.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {questions.map((item, idx) => {
            const ans = answers[item.id];
            const unlocked = idx <= currentIdx || ans !== undefined;
            const dotCls =
              ans === item.correctIndex
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : ans !== undefined
                  ? 'bg-rose-500 text-white border-rose-400'
                  : idx === currentIdx
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-slate-950 text-slate-500 border-slate-700';
            return (
              <button
                key={item.id}
                type="button"
                disabled={!unlocked}
                onClick={() => setCurrentIdx(idx)}
                className={`w-5 h-5 rounded-full text-[10px] font-mono-tabular font-bold border flex items-center justify-center ${
                  unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${dotCls}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <span className="font-mono-tabular font-bold text-emerald-300">
          {answeredCount > 0 ? correctCount : savedScore ?? 0}/{questions.length}
        </span>
      </div>

      {/* Active Single Question Card */}
      <div className="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800 space-y-2">
        <p className="text-[11px] font-medium text-slate-100 leading-snug">
          <span className="text-cyan-400 font-mono-tabular mr-1">Q{currentIdx + 1}.</span>
          {q.question}
        </p>

        <div className="space-y-1.5">
          {q.options.map((opt, oIdx) => {
            const isSelected = chosen === oIdx;
            const isCorrect = oIdx === q.correctIndex;
            let cls =
              'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-cyan-600/70';
            if (answered) {
              if (isCorrect) {
                cls = 'bg-emerald-950/75 border-emerald-500/80 text-emerald-200';
              } else if (isSelected) {
                cls = 'bg-rose-950/75 border-rose-500/80 text-rose-200';
              } else {
                cls = 'bg-slate-950/50 border-slate-800/70 text-slate-500';
              }
            }
            return (
              <button
                key={oIdx}
                type="button"
                disabled={answered}
                onClick={() => handleSelect(q.id, oIdx, q.correctIndex)}
                className={`w-full text-left px-2.5 py-1.5 rounded border text-[11px] flex items-center justify-between gap-2 transition-colors ${
                  answered ? 'cursor-default' : 'cursor-pointer'
                } ${cls}`}
              >
                <span>{opt}</span>
                {answered && isCorrect && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                {answered && isSelected && !isCorrect && (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] text-slate-300 bg-slate-950/80 rounded p-2 border border-slate-800 leading-snug">
              {q.explanation}
            </p>
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  setCompletedSummary(true);
                } else {
                  setCurrentIdx((idx) => Math.min(questions.length - 1, idx + 1));
                }
              }}
              className="w-full py-1.5 px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isLast ? 'Finish & View Viva Score' : `Next Question (Q${currentIdx + 2})`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
