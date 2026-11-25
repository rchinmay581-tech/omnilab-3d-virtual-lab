import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Award, BarChart3, ShieldAlert, Sparkles, X } from 'lucide-react';
import { Discipline, ExperimentConfig, RigType, UserExperimentRecord } from '../types/lab';

interface LabPerformanceDashboardProps {
  open: boolean;
  onClose: () => void;
  experiments: ExperimentConfig[];
  userRecord: UserExperimentRecord;
  studentName: string;
}

interface RadarAxisStat {
  key: RigType;
  label: string;
  discipline: Discipline;
  completed: number;
  total: number;
  pct: number;
  avgViva: number;
}

const RIG_CATEGORIES: { key: RigType; label: string; discipline: Discipline }[] = [
  { key: 'mechanics', label: 'Mechanics & Vernier', discipline: 'Physics' },
  { key: 'thermal_electrical', label: 'Thermal & Circuits', discipline: 'Physics' },
  { key: 'optics', label: 'Optics & Ray-Tracing', discipline: 'Physics' },
  { key: 'wet_chemistry', label: 'Wet Chem & Titration', discipline: 'Chemistry' },
  { key: 'qualitative_analysis', label: 'Qualitative Ions', discipline: 'Chemistry' },
  { key: 'biology_microscopy', label: 'Microscopy & Bio', discipline: 'Biology' },
];

export const LabPerformanceDashboard: React.FC<LabPerformanceDashboardProps> = ({
  open,
  onClose,
  experiments,
  userRecord,
  studentName,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [filterDisc, setFilterDisc] = useState<'All' | Discipline>('All');
  const [hoveredAxis, setHoveredAxis] = useState<RadarAxisStat | null>(null);

  const axisStats: RadarAxisStat[] = useMemo(() => {
    const completedSet = new Set(userRecord.completedIds);
    return RIG_CATEGORIES.map((cat) => {
      const matching = experiments.filter((e) => e.rigType === cat.key);
      const doneList = matching.filter((e) => completedSet.has(e.id));
      const vivaValues = matching
        .map((e) => userRecord.vivaScores?.[e.id])
        .filter((v): v is number => typeof v === 'number');
      const avgViva = vivaValues.length
        ? vivaValues.reduce((a, b) => a + b, 0) / vivaValues.length
        : 0;

      // Proficiency weights completed labs (75%) + viva mastery (25%)
      const completionPct = matching.length > 0 ? (doneList.length / matching.length) * 100 : 0;
      const vivaPct = (avgViva / 5) * 100;
      const combined = Math.round(
        vivaValues.length > 0 ? completionPct * 0.75 + vivaPct * 0.25 : completionPct
      );
      // Filter boost/dimming handled visually; return clean value
      return {
        key: cat.key,
        label: cat.label,
        discipline: cat.discipline,
        completed: doneList.length,
        total: matching.length,
        pct: Math.min(100, Math.max(0, combined)),
        avgViva: Number(avgViva.toFixed(1)),
      };
    });
  }, [experiments, userRecord]);

  const disciplineCounts = useMemo(() => {
    const set = new Set(userRecord.completedIds);
    const countFor = (d: Discipline) =>
      experiments.filter((e) => e.discipline === d && set.has(e.id)).length;
    const examEntries = Object.values(userRecord.examScores ?? {});
    const avgExam = examEntries.length
      ? examEntries.reduce((a, b) => a + b.totalMarks, 0) / examEntries.length
      : null;
    const safetyVals = Object.values(userRecord.safetyScores ?? {});
    const avgSafety = safetyVals.length
      ? Math.round(safetyVals.reduce((a, b) => a + b, 0) / safetyVals.length)
      : 100;
    const vivaVals = Object.values(userRecord.vivaScores ?? {});
    const avgViva = vivaVals.length
      ? Number((vivaVals.reduce((a, b) => a + b, 0) / vivaVals.length).toFixed(1))
      : null;

    return {
      Physics: countFor('Physics'),
      Chemistry: countFor('Chemistry'),
      Biology: countFor('Biology'),
      avgExam,
      avgSafety,
      avgViva,
    };
  }, [experiments, userRecord]);

  // Draw D3 Polar Radar Chart
  useEffect(() => {
    if (!open || !svgRef.current) return;

    const width = 440;
    const height = 360;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 122;
    const levels = [25, 50, 75, 100];

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${cx}, ${cy})`);

    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);
    const n = axisStats.length;
    const angleSlice = (Math.PI * 2) / n;

    // Concentric polar grid rings
    levels.forEach((lvl) => {
      const r = rScale(lvl);
      g.append('circle')
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#334155')
        .attr('stroke-dasharray', lvl === 100 ? 'none' : '3 3')
        .attr('stroke-width', lvl === 100 ? 1.4 : 1);

      g.append('text')
        .attr('x', 4)
        .attr('y', -r + 11)
        .attr('fill', '#64748b')
        .attr('font-size', '9px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(`${lvl}%`);
    });

    // Radial spokes & labels
    axisStats.forEach((stat, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x2 = Math.cos(angle) * radius;
      const y2 = Math.sin(angle) * radius;

      const highlighted = filterDisc === 'All' || filterDisc === stat.discipline;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', highlighted ? '#475569' : '#1e293b')
        .attr('stroke-width', 1.2);

      const lx = Math.cos(angle) * (radius + 24);
      const ly = Math.sin(angle) * (radius + 20);
      const anchor = Math.abs(lx) < 12 ? 'middle' : lx > 0 ? 'start' : 'end';

      g.append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('text-anchor', anchor)
        .attr('dominant-baseline', 'middle')
        .attr('fill', highlighted ? '#e2e8f0' : '#475569')
        .attr('font-size', '11px')
        .attr('font-weight', highlighted ? '600' : '400')
        .text(stat.label);
    });

    // Radar polygon via d3.lineRadial
    const radarData: [number, number][] = axisStats.map((stat, i) => {
      const active = filterDisc === 'All' || filterDisc === stat.discipline;
      const val = active ? Math.max(6, stat.pct) : 4;
      return [i * angleSlice, rScale(val)];
    });

    const radialLine = d3
      .lineRadial<[number, number]>()
      .angle((d) => d[0])
      .radius((d) => d[1])
      .curve(d3.curveLinearClosed);

    const accentColor =
      filterDisc === 'Chemistry'
        ? '#f59e0b'
        : filterDisc === 'Biology'
          ? '#10b981'
          : '#06b6d4';

    g.append('path')
      .datum(radarData)
      .attr('d', radialLine)
      .attr('fill', accentColor)
      .attr('fill-opacity', 0.24)
      .attr('stroke', accentColor)
      .attr('stroke-width', 2.4);

    // Interactive vertices
    axisStats.forEach((stat, i) => {
      const active = filterDisc === 'All' || filterDisc === stat.discipline;
      const val = active ? Math.max(6, stat.pct) : 4;
      const angle = i * angleSlice - Math.PI / 2;
      const vx = Math.cos(angle) * rScale(val);
      const vy = Math.sin(angle) * rScale(val);

      g.append('circle')
        .attr('cx', vx)
        .attr('cy', vy)
        .attr('r', active ? 5.5 : 3.5)
        .attr('fill', active ? accentColor : '#334155')
        .attr('stroke', '#0b1120')
        .attr('stroke-width', 1.8)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredAxis(stat))
        .on('mouseleave', () => setHoveredAxis(null));
    });
  }, [open, axisStats, filterDisc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 no-print">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#0d1424] border border-slate-700 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-100">
                Lab Performance Dashboard
              </h2>
              <p className="text-xs text-slate-400">
                {studentName} · D3 Polar Radar Proficiency Across Physics, Chemistry & Biology
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto lab-scroll grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: D3 Polar Radar Chart */}
          <div className="lg:col-span-7 bg-slate-950/75 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
            <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-200">
                Proficiency Radar (D3 Polar)
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md border border-slate-800">
                {(['All', 'Physics', 'Chemistry', 'Biology'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFilterDisc(d)}
                    className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                      filterDisc === d
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <svg ref={svgRef} className="w-full max-w-[440px] h-[330px]" />

            <div className="w-full min-h-[34px] mt-1 px-3 py-1.5 rounded bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
              {hoveredAxis ? (
                <>
                  <span className="text-cyan-300 font-medium">
                    {hoveredAxis.label} ({hoveredAxis.discipline})
                  </span>
                  <span className="font-mono-tabular text-slate-200">
                    {hoveredAxis.completed}/{hoveredAxis.total} Labs · {hoveredAxis.pct}% Proficiency · Viva {hoveredAxis.avgViva}/5
                  </span>
                </>
              ) : (
                <span className="text-slate-400">
                  Hover any radar node to inspect category mastery & viva average.
                </span>
              )}
            </div>
          </div>

          {/* Right: KPI & Discipline Breakdown */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Verified Labs</span>
                </div>
                <div className="font-mono-tabular text-2xl font-bold text-white mt-1">
                  {userRecord.completedIds.length}
                  <span className="text-xs font-normal text-slate-400"> / 90</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Avg Lab Safety</span>
                </div>
                <div className="font-mono-tabular text-2xl font-bold text-emerald-300 mt-1">
                  {disciplineCounts.avgSafety}%
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exam Mode Avg</span>
                </div>
                <div className="font-mono-tabular text-2xl font-bold text-amber-300 mt-1">
                  {disciplineCounts.avgExam !== null ? disciplineCounts.avgExam.toFixed(1) : '—'}
                  <span className="text-xs font-normal text-slate-400"> / 30</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Award className="w-3.5 h-3.5 text-sky-400" />
                  <span>Viva Avg</span>
                </div>
                <div className="font-mono-tabular text-2xl font-bold text-sky-300 mt-1">
                  {disciplineCounts.avgViva !== null ? disciplineCounts.avgViva : '—'}
                  <span className="text-xs font-normal text-slate-400"> / 5</span>
                </div>
              </div>
            </div>

            {/* Subject Progress Bars */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-200">Subject Completion</div>
              {(
                [
                  { name: 'Physics', count: disciplineCounts.Physics, bar: 'bg-cyan-500', text: 'text-cyan-300' },
                  { name: 'Chemistry', count: disciplineCounts.Chemistry, bar: 'bg-amber-500', text: 'text-amber-300' },
                  { name: 'Biology', count: disciplineCounts.Biology, bar: 'bg-emerald-500', text: 'text-emerald-300' },
                ] as const
              ).map((sub) => (
                <div key={sub.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={sub.text}>{sub.name}</span>
                    <span className="font-mono-tabular text-slate-300">{sub.count} / 30</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${sub.bar} transition-all duration-300`}
                      style={{ width: `${Math.round((sub.count / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Category Table */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-slate-200 mb-1">Category Proficiency</div>
              {axisStats.map((a) => (
                <div key={a.key} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">{a.label}</span>
                  <span className="font-mono-tabular text-cyan-300">
                    {a.completed}/{a.total} ({a.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
