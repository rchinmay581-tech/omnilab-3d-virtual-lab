import React, { useMemo, useState } from 'react';
import { Atom, CheckCircle2, ChevronDown, ChevronUp, Dna, FlaskConical, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ExperimentConfig, LabMode, RigState } from '../types/lab';
import { evaluateLiveEquation } from '../utils/liveEquationEngine';

interface LiveEquationBannerProps {
  experiment: ExperimentConfig;
  rigState: RigState;
  labMode: LabMode;
}

export const LiveEquationBanner: React.FC<LiveEquationBannerProps> = ({
  experiment,
  rigState,
  labMode,
}) => {
  const [minimized, setMinimized] = useState(false);

  const eq = useMemo(
    () => evaluateLiveEquation(experiment, rigState, labMode),
    [experiment, rigState, labMode]
  );

  const DisciplineIcon =
    experiment.discipline === 'Chemistry'
      ? FlaskConical
      : experiment.discipline === 'Physics'
        ? Atom
        : Dna;

  const isFormed = eq.stage === 'formed';
  const isMixing = eq.stage === 'mixing';

  return (
    <div className="w-full mb-1.5 pointer-events-auto">
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative overflow-hidden rounded-lg border bg-[#081021]/95 shadow-xl px-3 py-2"
        style={{
          borderColor: isFormed ? eq.accentHex : isMixing ? '#f59e0b80' : '#334155cc',
          boxShadow: isFormed ? `0 0 22px -6px ${eq.accentHex}88` : undefined,
        }}
      >
        {/* Animated shimmer sweep whenever equation stage or reaction updates */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${experiment.id}-${eq.stage}-${eq.equation}`}
            initial={{ x: '-100%', opacity: 0.55 }}
            animate={{ x: '135%', opacity: 0 }}
            transition={{ duration: 0.95, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
            style={{
              background: `linear-gradient(90deg, transparent, ${eq.accentHex}38, transparent)`,
            }}
          />
        </AnimatePresence>

        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <motion.div
              key={`${experiment.id}-${eq.stage}-icon`}
              initial={{ scale: 0.72, rotate: -14 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="w-6 h-6 rounded flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${eq.accentHex}1f`,
                borderColor: `${eq.accentHex}66`,
                color: eq.accentHex,
              }}
            >
              {isFormed ? <Sparkles className="w-3.5 h-3.5" /> : <DisciplineIcon className="w-3.5 h-3.5" />}
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${experiment.id}-${eq.stage}-${eq.equation}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22 }}
                className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5"
              >
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border w-fit shrink-0"
                  style={{
                    backgroundColor: `${eq.accentHex}20`,
                    borderColor: `${eq.accentHex}55`,
                    color: isFormed ? '#f8fafc' : eq.accentHex,
                  }}
                >
                  {isFormed && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {eq.badge}
                </span>

                <span className="font-mono-tabular text-xs sm:text-[13px] font-semibold text-white truncate">
                  {eq.equation}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            title={minimized ? 'Show reaction details' : 'Minimize details'}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 shrink-0 cursor-pointer"
          >
            {minimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!minimized && (
          <AnimatePresence mode="wait">
            <motion.p
              key={`${experiment.id}-${eq.phenomenon}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative mt-1 pl-8 text-[11px] text-slate-300 leading-snug truncate"
              title={eq.phenomenon}
            >
              {eq.phenomenon}
            </motion.p>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};
