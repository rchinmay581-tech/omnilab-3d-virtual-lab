import React from 'react';
import { Check, Search, X } from 'lucide-react';
import { Discipline, ExperimentConfig } from '../types/lab';
import { DisciplineFilter } from './TopNavHeader';

interface ExperimentCatalogModalProps {
  open: boolean;
  onClose: () => void;
  experiments: ExperimentConfig[];
  activeExperimentId: string;
  completedIds: string[];
  activeDiscipline: DisciplineFilter;
  onSelectDiscipline: (d: DisciplineFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectExperiment: (exp: ExperimentConfig) => void;
}

const DISCIPLINES: DisciplineFilter[] = ['All', 'Physics', 'Chemistry', 'Biology'];

const RIG_LABELS: Record<string, string> = {
  mechanics: 'Precision Mechanics Rig',
  thermal_electrical: 'Thermal & Electrical Rig',
  optics: 'Optics & Ray-Tracing Rig',
  wet_chemistry: 'Wet Chemistry & Titration Rig',
  qualitative_analysis: 'Qualitative Analysis Rig',
  biology_microscopy: 'Microscopy & Physiology Rig',
};

const DISC_ACCENT: Record<Discipline, string> = {
  Physics: 'text-cyan-400',
  Chemistry: 'text-amber-400',
  Biology: 'text-emerald-400',
};

export const ExperimentCatalogModal: React.FC<ExperimentCatalogModalProps> = ({
  open,
  onClose,
  experiments,
  activeExperimentId,
  completedIds,
  activeDiscipline,
  onSelectDiscipline,
  searchQuery,
  onSearchChange,
  onSelectExperiment,
}) => {
  if (!open) return null;

  const q = searchQuery.trim().toLowerCase();
  const filtered = experiments.filter((exp) => {
    const matchDisc = activeDiscipline === 'All' || exp.discipline === activeDiscipline;
    const matchQ =
      !q ||
      exp.title.toLowerCase().includes(q) ||
      exp.summary.toLowerCase().includes(q) ||
      String(exp.number).includes(q);
    return matchDisc && matchQ;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl max-h-[86vh] bg-[#0d1424] border border-slate-700 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Laboratory Experiment Directory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any of the 90 Physics, Chemistry, and Biology 3D simulations · {completedIds.length} completed
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-md border border-slate-800">
            {DISCIPLINES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDiscipline(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeDiscipline === d
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {d === 'All' ? 'All (90)' : `${d} (30)`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter by name, apparatus, or #"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Grid of Experiments */}
        <div className="p-5 overflow-y-auto lab-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((exp) => {
            const isDone = completedIds.includes(exp.id);
            const isActive = exp.id === activeExperimentId;
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => {
                  onSelectExperiment(exp);
                  onClose();
                }}
                className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? 'bg-cyan-950/50 border-cyan-500'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                    <span className={`font-medium ${DISC_ACCENT[exp.discipline]}`}>
                      {exp.discipline} · Exp {String(exp.number).padStart(2, '0')}
                    </span>
                    {isDone && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Check className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                    {exp.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{exp.summary}</p>
                </div>

                <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800/80">
                  {RIG_LABELS[exp.rigType]}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-slate-400">
              No experiments match "{searchQuery}". Clear search to browse all 90 experiments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
