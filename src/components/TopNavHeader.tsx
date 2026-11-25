import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, BookOpen, Check, Clock, Download, Glasses, Hash, LogOut, Search, ShieldAlert, User, Volume2, VolumeX, Wind } from 'lucide-react';
import { Discipline, LabMode, StudentAccount } from '../types/lab';
import { MAX_DISPLAY_NAME_LEN, MAX_ROLL_NUMBER_LEN, isValidRollNumber } from '../services/studentCloudService';

export type DisciplineFilter = 'All' | Discipline;

interface TopNavHeaderProps {
  activeDiscipline: DisciplineFilter;
  onSelectDiscipline: (d: DisciplineFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCatalog: () => void;
  onOpenDashboard: () => void;
  completedCount: number;
  labMode: LabMode;
  onToggleLabMode: (mode: LabMode) => void;
  examTimerSec: number;
  safetyScore: number;
  audioEnabled: boolean;
  volume: number;
  muted: boolean;
  ambienceEnabled: boolean;
  onEnableAudio: () => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onToggleAmbience: () => void;
  xrSupported: boolean;
  xrActive: boolean;
  onToggleVR: () => void;
  student: StudentAccount | null;
  onUpdateProfile: (updates: { displayName: string; rollNumber: string }) => Promise<void>;
  onExportBackup: () => void;
  onLogout: () => void;
}

const TABS: { id: DisciplineFilter; label: string }[] = [
  { id: 'All', label: 'All (90)' },
  { id: 'Physics', label: 'Physics (30)' },
  { id: 'Chemistry', label: 'Chemistry (30)' },
  { id: 'Biology', label: 'Biology (30)' },
];

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TopNavHeader: React.FC<TopNavHeaderProps> = ({
  activeDiscipline,
  onSelectDiscipline,
  searchQuery,
  onSearchChange,
  onOpenCatalog,
  onOpenDashboard,
  completedCount,
  labMode,
  onToggleLabMode,
  examTimerSec,
  safetyScore,
  audioEnabled,
  volume,
  muted,
  ambienceEnabled,
  onEnableAudio,
  onVolumeChange,
  onToggleMute,
  onToggleAmbience,
  xrSupported,
  xrActive,
  onToggleVR,
  student,
  onUpdateProfile,
  onExportBackup,
  onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState(student?.name ?? '');
  const [editRoll, setEditRoll] = useState(student?.rollNumber ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEditName(student?.name ?? '');
    setEditRoll(student?.rollNumber ?? '');
  }, [student?.name, student?.rollNumber]);

  useEffect(() => {
    if (!profileOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (profileBoxRef.current && !profileBoxRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener('mousedown', onOutside);
    return () => window.removeEventListener('mousedown', onOutside);
  }, [profileOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;
    setProfileError(null);
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setProfileError('Student Name cannot be empty.');
      return;
    }
    if (!isValidRollNumber(editRoll)) {
      setProfileError('Roll Number allows letters, numbers, spaces, -, _, ., and /.');
      return;
    }
    setSavingProfile(true);
    try {
      await onUpdateProfile({ displayName: trimmedName, rollNumber: editRoll.trim() });
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 1800);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <header className="no-print relative z-30 h-14 px-3 bg-[#0b101b]/95 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
      {/* Zone 1: Brand Wordmark + Practice/Exam Mode Pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap">
          OmniLab 3D
        </span>

        {/* Practice vs Exam Mode Toggle Pill */}
        <div className="flex items-center p-0.5 rounded-full bg-slate-900 border border-slate-700/80">
          <button
            type="button"
            onClick={() => onToggleLabMode('practice')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
              labMode === 'practice'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🟢 Practice
          </button>
          <button
            type="button"
            onClick={() => onToggleLabMode('exam')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
              labMode === 'exam'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔴 Exam (30M)
          </button>
        </div>

        {labMode === 'exam' && (
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-rose-950/90 border border-rose-700/70 text-[11px] font-mono-tabular text-rose-200">
            <Clock className="w-3 h-3 text-rose-400" />
            <span>{formatTimer(examTimerSec)}</span>
          </div>
        )}
      </div>

      {/* Zone 2: Discipline Tabs + Search + Catalog + D3 Performance Dashboard */}
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
        <div className="hidden 2xl:flex items-center gap-1 p-1 bg-slate-900 rounded-md border border-slate-800 shrink-0">
          {TABS.map((t) => {
            const active = activeDiscipline === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectDiscipline(t.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-[190px] min-w-[100px] hidden sm:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onOpenCatalog();
            }}
            placeholder="Search 90 labs..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          type="button"
          onClick={onOpenCatalog}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Labs</span>
          <span className="font-mono-tabular text-slate-400">({completedCount}/90)</span>
        </button>

        <button
          type="button"
          onClick={onOpenDashboard}
          title="Open Lab Performance Dashboard (D3 Radar)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/70 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Performance</span>
        </button>

        {/* WebXR VR Session Toggle Button */}
        <button
          type="button"
          disabled={!xrSupported}
          onClick={onToggleVR}
          title={
            xrSupported
              ? xrActive
                ? 'Exit WebXR VR Lab session'
                : 'Enter WebXR VR Lab session relative to bench'
              : 'WebXR unsupported — connect a VR headset & compatible browser'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
            xrActive
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white cursor-pointer'
              : xrSupported
                ? 'bg-sky-600 hover:bg-sky-500 border-sky-400 text-white cursor-pointer'
                : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Glasses className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {xrActive ? 'Exit VR' : xrSupported ? 'VR Mode' : 'VR N/A'}
          </span>
        </button>
      </div>

      {/* Zone 3: Safety Pill + Master Audio + Logged-In Student Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          title="Live Lab Safety & Accuracy Score"
          className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-mono-tabular font-semibold ${
            safetyScore >= 90
              ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
              : safetyScore >= 70
                ? 'bg-amber-950/70 border-amber-700/70 text-amber-300'
                : 'bg-rose-950/80 border-rose-700/70 text-rose-300'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{safetyScore}%</span>
        </div>

        {!audioEnabled ? (
          <button
            type="button"
            onClick={onEnableAudio}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loud Audio</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleAmbience}
              title="Toggle laboratory ventilation ambience"
              className={`hidden xl:flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                ambienceEnabled
                  ? 'bg-emerald-950/90 border-emerald-600/70 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Ambience</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-md px-2 py-1">
              <button
                type="button"
                onClick={onToggleMute}
                title={muted ? 'Unmute Lab Audio' : 'Mute Lab Audio'}
                className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {muted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                aria-label="Master Volume"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                className="w-14 accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono-tabular text-slate-300 w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </>
        )}

        {student && (
          <div ref={profileBoxRef} className="relative flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              title={`${student.name} (${student.identifier}) — Edit Profile`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 max-w-[165px] transition-colors cursor-pointer"
            >
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              )}
              <span className="truncate font-medium">{student.name}</span>
              {student.rollNumber && (
                <span className="hidden xl:inline text-[10px] font-mono-tabular text-cyan-300 shrink-0">
                  #{student.rollNumber}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out / Switch Google Account"
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Sign Out</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-11 w-72 rounded-xl bg-[#0b1120] border border-slate-700 shadow-2xl p-4 space-y-3 z-50">
                <div className="border-b border-slate-800 pb-2.5">
                  <div className="text-xs font-semibold text-white truncate">{student.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{student.identifier}</div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      maxLength={MAX_DISPLAY_NAME_LEN}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Roll Number / Student ID
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={MAX_ROLL_NUMBER_LEN}
                        value={editRoll}
                        onChange={(e) => setEditRoll(e.target.value)}
                        placeholder="e.g. 12-SCI-042"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono-tabular bg-slate-950 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  {profileError && (
                    <div className="text-[11px] text-rose-300">{profileError}</div>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex-1 py-1.5 px-2.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {profileSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onExportBackup();
                        setProfileOpen(false);
                      }}
                      title="Download JSON backup of your lab progress"
                      className="py-1.5 px-2.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Backup</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
