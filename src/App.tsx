import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { labAudio } from './audio/LabAudioEngine';
import { auth, googleProvider } from './firebase';
import {
  saveExperimentToCloud,
  subscribeToStudentExperiments,
  upsertStudentProfile,
} from './services/studentCloudService';
import { BottomControlDock } from './components/BottomControlDock';
import { ExperimentCatalogModal } from './components/ExperimentCatalogModal';
import { LabPerformanceDashboard } from './components/LabPerformanceDashboard';
import { LabRecordPrintSheet } from './components/LabRecordPrintSheet';
import { ObservationPanel } from './components/ObservationPanel';
import { OpticalLoupeOverlay } from './components/OpticalLoupeOverlay';
import { ProcedureChecklist } from './components/ProcedureChecklist';
import { StudentLoginModal } from './components/StudentLoginModal';
import { ThreeLabViewport, ThreeLabViewportHandle } from './components/ThreeLabViewport';
import { DisciplineFilter, TopNavHeader } from './components/TopNavHeader';
import { ALL_EXPERIMENTS, applyControlAction, createInitialRigState } from './data/experiments';
import {
  CameraPreset,
  ExamScoreBreakdown,
  ExperimentConfig,
  GraphPoint,
  LabMode,
  RigState,
  SafetyAlert,
  StudentAccount,
  UserExperimentRecord,
} from './types/lab';
import {
  createExamExperimentVariant,
  extractGraphPoint,
  generateExamUnknownFactor,
} from './utils/examAndGraphEngine';

const CLOUD_CACHE_PREFIX = 'omnilab_cloud_cache_v1::';
const EXAM_DURATION_SEC = 15 * 60;

const EMPTY_USER_RECORD: UserExperimentRecord = {
  completedIds: [],
  observations: {},
  vivaScores: {},
  safetyScores: {},
  examScores: {},
  graphPoints: {},
};

const GRAPH_CAPTURE_ACTIONS = new Set([
  'capture_reading',
  'advance_cooling',
  'add_single_drop',
  'set_rheostat',
  'set_pend_len',
  'set_spring_load',
  'set_prism_i',
  'set_osmosis_time',
]);

function loadCachedUserRecord(uid: string): UserExperimentRecord {
  try {
    const raw = localStorage.getItem(`${CLOUD_CACHE_PREFIX}${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserExperimentRecord>;
      return {
        completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
        observations:
          parsed.observations && typeof parsed.observations === 'object' ? parsed.observations : {},
        vivaScores:
          parsed.vivaScores && typeof parsed.vivaScores === 'object' ? parsed.vivaScores : {},
        safetyScores:
          parsed.safetyScores && typeof parsed.safetyScores === 'object' ? parsed.safetyScores : {},
        examScores:
          parsed.examScores && typeof parsed.examScores === 'object' ? parsed.examScores : {},
        graphPoints:
          parsed.graphPoints && typeof parsed.graphPoints === 'object' ? parsed.graphPoints : {},
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return { ...EMPTY_USER_RECORD };
}

function saveCachedUserRecord(uid: string, record: UserExperimentRecord): void {
  try {
    localStorage.setItem(`${CLOUD_CACHE_PREFIX}${uid}`, JSON.stringify(record));
  } catch {
    // ignore storage quota errors
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentAccount | null>(null);
  const [userRecord, setUserRecord] = useState<UserExperimentRecord>({ ...EMPTY_USER_RECORD });
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const pendingOverridesRef = useRef<{ displayName?: string; rollNumber?: string } | undefined>(
    undefined
  );
  const syncedDocIdsRef = useRef<Set<string>>(new Set());
  const syncTimersRef = useRef<Map<string, number>>(new Map());
  const safetyScoreRef = useRef<number>(100);

  const [activeDiscipline, setActiveDiscipline] = useState<DisciplineFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const [labMode, setLabMode] = useState<LabMode>('practice');
  const [examFactor, setExamFactor] = useState<number>(() => generateExamUnknownFactor());
  const [examTimerSec, setExamTimerSec] = useState<number>(EXAM_DURATION_SEC);

  const [activeExp, setActiveExp] = useState<ExperimentConfig>(ALL_EXPERIMENTS[0]);
  const [rigState, setRigState] = useState<RigState>(() => createInitialRigState(ALL_EXPERIMENTS[0]));

  const [activePreset, setActivePreset] = useState<CameraPreset>(ALL_EXPERIMENTS[0].cameraPresets[0]);
  const [presetTrigger, setPresetTrigger] = useState(0);

  // Audio HUD state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [ambienceEnabled, setAmbienceEnabled] = useState(false);
  const [xrSupported, setXrSupported] = useState(false);
  const [xrActive, setXrActive] = useState(false);
  const viewportRef = useRef<ThreeLabViewportHandle | null>(null);

  // Strict step ticks, timestamps & safety tracker
  const [stepUnlocked, setStepUnlocked] = useState<boolean[]>(() =>
    ALL_EXPERIMENTS[0].steps.map(() => false)
  );
  const [stepTimestamps, setStepTimestamps] = useState<(string | null)[]>(() =>
    ALL_EXPERIMENTS[0].steps.map(() => null)
  );
  const [safetyScore, setSafetyScore] = useState<number>(100);
  const [safetyAlert, setSafetyAlert] = useState<SafetyAlert | null>(null);
  const [graphSnapshotUrl, setGraphSnapshotUrl] = useState<string | null>(null);

  const prevStepUnlockedRef = useRef<boolean[]>(ALL_EXPERIMENTS[0].steps.map(() => false));
  const lastSafetyMsgRef = useRef<string | null>(null);

  // Effective experiment variant (Exam Mode randomizes unknown specimen targets cleanly)
  const effectiveExp = useMemo(
    () => (labMode === 'exam' ? createExamExperimentVariant(activeExp, examFactor) : activeExp),
    [activeExp, labMode, examFactor]
  );

  const completedIds = userRecord.completedIds;
  const allStepsDone = useMemo(() => stepUnlocked.every(Boolean), [stepUnlocked]);
  const isCompleted = completedIds.includes(activeExp.id);
  const vivaScore = userRecord.vivaScores?.[activeExp.id] ?? 0;
  const graphPoints = userRecord.graphPoints?.[activeExp.id] ?? [];

  // Live 30-Mark Practical Exam Grading Breakdown
  const examBreakdown: ExamScoreBreakdown = useMemo(() => {
    const doneSteps = stepUnlocked.filter(Boolean).length;
    const totalSteps = Math.max(1, effectiveExp.steps.length);
    const safetyPenaltyMarks = ((100 - safetyScore) / 10) * 1.5;
    const procedureMarks = Math.max(
      0,
      Math.min(20, Number(((doneSteps / totalSteps) * 20 - safetyPenaltyMarks).toFixed(1)))
    );
    const calculationMarks = isCompleted ? 5 : 0;
    const vivaMarks = Math.min(5, vivaScore);
    const totalMarks = Number((procedureMarks + calculationMarks + vivaMarks).toFixed(1));
    return {
      procedureMarks,
      calculationMarks,
      vivaMarks,
      totalMarks,
      safetyScore,
      mode: labMode,
      completedAt: new Date().toLocaleString(),
    };
  }, [stepUnlocked, effectiveExp.steps.length, safetyScore, isCompleted, vivaScore, labMode]);

  // Keep safetyScoreRef synced for async cloud saves
  useEffect(() => {
    safetyScoreRef.current = safetyScore;
  }, [safetyScore]);

  // Listen to Firebase Auth state & attach Firestore real-time sync
  useEffect(() => {
    let unsubExperiments: (() => void) | null = null;
    let active = true;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubExperiments) {
        unsubExperiments();
        unsubExperiments = null;
      }
      syncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      syncTimersRef.current.clear();

      if (!user) {
        syncedDocIdsRef.current = new Set();
        if (active) {
          setFirebaseUser(null);
          setStudent(null);
          setUserRecord({ ...EMPTY_USER_RECORD });
          setAuthReady(true);
        }
        return;
      }

      if (!user.emailVerified || !user.email) {
        await signOut(auth).catch(() => {});
        if (active) {
          setFirebaseUser(null);
          setStudent(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const overrides = pendingOverridesRef.current;
        pendingOverridesRef.current = undefined;
        const profile = await upsertStudentProfile(user, overrides);
        if (!active) return;

        setFirebaseUser(user);
        setStudent(profile);
        setUserRecord(loadCachedUserRecord(user.uid));
        setPresetTrigger((n) => n + 1);
        setAuthReady(true);

        unsubExperiments = subscribeToStudentExperiments(
          user.uid,
          (cloudRecord, docIds) => {
            if (!active) return;
            syncedDocIdsRef.current = docIds;
            setUserRecord(cloudRecord);
            saveCachedUserRecord(user.uid, cloudRecord);
          },
          (err) => {
            if (active) setFatalError(err);
          }
        );
      } catch (err) {
        if (active) {
          setAuthReady(true);
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

    return () => {
      active = false;
      unsubAuth();
      if (unsubExperiments) unsubExperiments();
      syncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      syncTimersRef.current.clear();
    };
  }, []);

  // Keep local read-through cache synced
  useEffect(() => {
    if (firebaseUser?.uid) {
      saveCachedUserRecord(firebaseUser.uid, userRecord);
    }
  }, [firebaseUser?.uid, userRecord]);

  // Exam countdown timer
  useEffect(() => {
    if (!student || labMode !== 'exam' || isCompleted) return;
    const id = window.setInterval(() => {
      setExamTimerSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [student, labMode, isCompleted]);

  const handleEnableAudio = useCallback(() => {
    const ok = labAudio.enable();
    if (ok) {
      setAudioEnabled(true);
    }
  }, []);

  // Auto-unlock audio on first pointer interaction
  useEffect(() => {
    const onFirstGesture = () => {
      if (!labAudio.isEnabled()) {
        if (labAudio.enable()) {
          setAudioEnabled(true);
        }
      }
      window.removeEventListener('pointerdown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onFirstGesture);
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    labAudio.setVolume(v);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      labAudio.setMuted(next);
      return next;
    });
  }, []);

  const handleToggleAmbience = useCallback(() => {
    setAmbienceEnabled((prev) => {
      const next = !prev;
      labAudio.setAmbience(next);
      return next;
    });
  }, []);

  const scheduleCloudSync = useCallback(
    (expId: string, nextRecord: UserExperimentRecord, immediate = false) => {
      const uid = firebaseUser?.uid;
      if (!uid) return;
      const existingTimer = syncTimersRef.current.get(expId);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }
      const delayMs = immediate ? 30 : 400;
      const timerId = window.setTimeout(() => {
        syncTimersRef.current.delete(expId);
        void saveExperimentToCloud(
          uid,
          expId,
          {
            completed: nextRecord.completedIds.includes(expId),
            observations: nextRecord.observations[expId] ?? { fields: {}, result: '' },
            vivaScore: nextRecord.vivaScores?.[expId] ?? 0,
            safetyScore: nextRecord.safetyScores?.[expId] ?? safetyScoreRef.current,
            examScore: nextRecord.examScores?.[expId],
            graphPoints: nextRecord.graphPoints?.[expId] ?? [],
          },
          syncedDocIdsRef.current.has(expId)
        )
          .then(() => {
            syncedDocIdsRef.current.add(expId);
          })
          .catch((err) => {
            setFatalError(err instanceof Error ? err : new Error(String(err)));
          });
      }, delayMs);
      syncTimersRef.current.set(expId, timerId);
    },
    [firebaseUser?.uid]
  );

  const handleSignInWithGoogle = useCallback(
    async (overrides?: { displayName?: string; rollNumber?: string }) => {
      pendingOverridesRef.current = overrides;
      try {
        await signInWithPopup(auth, googleProvider);
        labAudio.playStepTick();
      } catch (err) {
        pendingOverridesRef.current = undefined;
        throw err;
      }
    },
    []
  );

  const handleUpdateProfile = useCallback(
    async (updates: { displayName: string; rollNumber: string }) => {
      if (!firebaseUser) return;
      const updated = await upsertStudentProfile(firebaseUser, updates);
      setStudent(updated);
    },
    [firebaseUser]
  );

  const handleExportBackup = useCallback(() => {
    if (!student) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      student: {
        name: student.name,
        identifier: student.identifier,
        rollNumber: student.rollNumber ?? '',
      },
      progress: userRecord,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omnilab-backup-${(student.rollNumber || student.name).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [student, userRecord]);

  const handleLogout = useCallback(() => {
    labAudio.stopAllLoops();
    labAudio.setAmbience(false);
    setAmbienceEnabled(false);
    setCatalogOpen(false);
    setDashboardOpen(false);
    syncTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    syncTimersRef.current.clear();
    void signOut(auth).catch((err) => {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    });
  }, []);

  const triggerSafety = useCallback(
    (message: string) => {
      if (lastSafetyMsgRef.current !== message) {
        lastSafetyMsgRef.current = message;
        labAudio.playSafetyBuzz();
        setSafetyAlert({ id: Date.now(), message, timestamp: Date.now() });
        setSafetyScore((prev) => {
          const next = Math.max(0, prev - 10);
          setUserRecord((rec) => {
            const nextRec: UserExperimentRecord = {
              ...rec,
              safetyScores: { ...(rec.safetyScores ?? {}), [activeExp.id]: next },
            };
            scheduleCloudSync(activeExp.id, nextRec, false);
            return nextRec;
          });
          return next;
        });
      }
    },
    [activeExp.id, scheduleCloudSync]
  );

  // Strict sequential step validation + safety rule check
  const evaluateStepsAndSafety = useCallback(
    (nextState: RigState, prevState: RigState, exp: ExperimentConfig) => {
      if (exp.checkSafety) {
        const err = exp.checkSafety(nextState, prevState);
        if (err) {
          triggerSafety(err);
        } else {
          lastSafetyMsgRef.current = null;
        }
      }

      const prevTicks = prevStepUnlockedRef.current;
      const updatedTicks = [...prevTicks];
      const earnedIndices: number[] = [];
      let blockedIdx = -1;

      for (let i = 0; i < exp.steps.length; i++) {
        if (updatedTicks[i]) continue;
        if (i > 0 && !updatedTicks[i - 1]) {
          blockedIdx = i;
          break;
        }
        if (exp.steps[i].check(nextState)) {
          updatedTicks[i] = true;
          earnedIndices.push(i);
        }
      }

      if (blockedIdx >= 0 && earnedIndices.length === 0) {
        const skippedTo = exp.steps.findIndex(
          (step, idx) =>
            idx >= blockedIdx && !prevTicks[idx] && !step.check(prevState) && step.check(nextState)
        );
        if (skippedTo >= 0) {
          triggerSafety(
            `Step order violation: Complete Step ${blockedIdx} before proceeding to Step ${skippedTo + 1}.`
          );
        }
      }

      if (earnedIndices.length > 0) {
        labAudio.playStepTick();
        prevStepUnlockedRef.current = updatedTicks;
        setStepUnlocked(updatedTicks);
        const ts = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setStepTimestamps((prev) => prev.map((v, idx) => (earnedIndices.includes(idx) ? ts : v)));
      }
    },
    [triggerSafety]
  );

  const appendGraphPointForExp = useCallback(
    (expId: string, pt: GraphPoint) => {
      setUserRecord((prev) => {
        const existing = prev.graphPoints?.[expId] ?? [];
        const last = existing[existing.length - 1];
        if (last && Math.abs(last.x - pt.x) < 1e-4 && Math.abs(last.y - pt.y) < 1e-4) {
          return prev;
        }
        const nextRec: UserExperimentRecord = {
          ...prev,
          graphPoints: {
            ...(prev.graphPoints ?? {}),
            [expId]: [...existing, pt].slice(-24),
          },
        };
        scheduleCloudSync(expId, nextRec, false);
        return nextRec;
      });
    },
    [scheduleCloudSync]
  );

  const handlePatchState = useCallback(
    (patch: Partial<RigState>) => {
      setRigState((prev) => {
        const next = { ...prev, ...patch };
        evaluateStepsAndSafety(next, prev, effectiveExp);
        return next;
      });
    },
    [effectiveExp, evaluateStepsAndSafety]
  );

  const handleControlAction = useCallback(
    (action: string, value?: number | string | boolean) => {
      setRigState((prev) => {
        const next = applyControlAction(prev, action, value);
        evaluateStepsAndSafety(next, prev, effectiveExp);
        if (GRAPH_CAPTURE_ACTIONS.has(action)) {
          const curCount = (userRecord.graphPoints?.[effectiveExp.id] ?? []).length;
          const pt = extractGraphPoint(
            effectiveExp,
            next,
            curCount,
            labMode === 'exam' ? examFactor : 1
          );
          appendGraphPointForExp(effectiveExp.id, pt);
        }
        return next;
      });
    },
    [
      effectiveExp,
      evaluateStepsAndSafety,
      userRecord.graphPoints,
      labMode,
      examFactor,
      appendGraphPointForExp,
    ]
  );

  const loadExperiment = useCallback((exp: ExperimentConfig) => {
    labAudio.stopAllLoops();
    const initial = createInitialRigState(exp);
    const emptyTicks = exp.steps.map(() => false);
    prevStepUnlockedRef.current = emptyTicks;
    lastSafetyMsgRef.current = null;
    setActiveExp(exp);
    setRigState(initial);
    setStepUnlocked(emptyTicks);
    setStepTimestamps(exp.steps.map(() => null));
    setSafetyScore(100);
    setSafetyAlert(null);
    setGraphSnapshotUrl(null);
    setExamFactor(generateExamUnknownFactor());
    setExamTimerSec(EXAM_DURATION_SEC);
    setActivePreset(exp.cameraPresets[0]);
    setPresetTrigger((n) => n + 1);
  }, []);

  const handleResetExperiment = useCallback(() => {
    labAudio.playMetallicTick(1600, 0.4);
    loadExperiment(activeExp);
  }, [activeExp, loadExperiment]);

  const handleToggleLabMode = useCallback(
    (mode: LabMode) => {
      if (mode === labMode) return;
      labAudio.playSwitchClack();
      setLabMode(mode);
      loadExperiment(activeExp);
    },
    [labMode, activeExp, loadExperiment]
  );

  const handleSelectDiscipline = useCallback(
    (d: DisciplineFilter) => {
      setActiveDiscipline(d);
      if (d !== 'All' && activeExp.discipline !== d) {
        const firstMatch = ALL_EXPERIMENTS.find((e) => e.discipline === d);
        if (firstMatch) loadExperiment(firstMatch);
      }
    },
    [activeExp.discipline, loadExperiment]
  );

  // Global keyboard arrow-key precision fine-tuning for active slider control
  useEffect(() => {
    if (!student || catalogOpen || dashboardOpen) return;
    const primarySlider = effectiveExp.controls.find((c) => c.type === 'slider');
    if (!primarySlider) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;

      ev.preventDefault();
      const dir = ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? 1 : -1;
      const mult = ev.shiftKey ? 5 : 1;
      const step = (primarySlider.step ?? 1) * mult;
      const min = primarySlider.min ?? 0;
      const max = primarySlider.max ?? 100;
      const cur = Number(primarySlider.getValue?.(rigState) ?? min);
      const nextVal = Math.max(min, Math.min(max, Number((cur + dir * step).toFixed(4))));
      handleControlAction(primarySlider.action, nextVal);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [student, catalogOpen, dashboardOpen, effectiveExp.controls, rigState, handleControlAction]);

  const handleSaveObservation = useCallback(
    (expId: string, data: { fields: Record<string, string>; result: string }) => {
      setUserRecord((prev) => {
        const nextRec: UserExperimentRecord = {
          ...prev,
          observations: {
            ...prev.observations,
            [expId]: data,
          },
        };
        scheduleCloudSync(expId, nextRec, false);
        return nextRec;
      });
    },
    [scheduleCloudSync]
  );

  const handleVivaScoreChange = useCallback(
    (score: number) => {
      setUserRecord((prev) => {
        const nextViva = { ...(prev.vivaScores ?? {}), [activeExp.id]: score };
        const nextExamScores =
          labMode === 'exam'
            ? {
                ...(prev.examScores ?? {}),
                [activeExp.id]: {
                  ...examBreakdown,
                  vivaMarks: Math.min(5, score),
                  totalMarks: Number(
                    (
                      examBreakdown.procedureMarks +
                      examBreakdown.calculationMarks +
                      Math.min(5, score)
                    ).toFixed(1)
                  ),
                },
              }
            : prev.examScores;
        const nextRec: UserExperimentRecord = {
          ...prev,
          vivaScores: nextViva,
          examScores: nextExamScores,
        };
        scheduleCloudSync(activeExp.id, nextRec, true);
        return nextRec;
      });
    },
    [activeExp.id, labMode, examBreakdown, scheduleCloudSync]
  );

  const handleVerifySuccess = useCallback(() => {
    labAudio.playCompletionFanfare();
    setUserRecord((prev) => {
      const nextCompleted = prev.completedIds.includes(activeExp.id)
        ? prev.completedIds
        : [...prev.completedIds, activeExp.id];
      const nextExamScores =
        labMode === 'exam'
          ? {
              ...(prev.examScores ?? {}),
              [activeExp.id]: {
                ...examBreakdown,
                calculationMarks: 5,
                totalMarks: Number(
                  (examBreakdown.procedureMarks + 5 + examBreakdown.vivaMarks).toFixed(1)
                ),
              },
            }
          : prev.examScores;
      const nextRec: UserExperimentRecord = {
        ...prev,
        completedIds: nextCompleted,
        safetyScores: { ...(prev.safetyScores ?? {}), [activeExp.id]: safetyScore },
        examScores: nextExamScores,
      };
      scheduleCloudSync(activeExp.id, nextRec, true);
      return nextRec;
    });
  }, [activeExp.id, labMode, examBreakdown, safetyScore, scheduleCloudSync]);

  const handleVerifyFail = useCallback((msg: string) => {
    labAudio.playSafetyBuzz();
    setSafetyAlert({ id: Date.now(), message: msg, timestamp: Date.now() });
  }, []);

  if (fatalError) {
    throw fatalError;
  }

  const activeObs = userRecord.observations[activeExp.id] ?? { fields: {}, result: '' };

  return (
    <>
      <div className="no-print relative w-screen h-screen overflow-hidden bg-[#0b101b] flex flex-col">
        {student && (
          <TopNavHeader
            activeDiscipline={activeDiscipline}
            onSelectDiscipline={handleSelectDiscipline}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenCatalog={() => setCatalogOpen(true)}
            onOpenDashboard={() => setDashboardOpen(true)}
            completedCount={completedIds.length}
            labMode={labMode}
            onToggleLabMode={handleToggleLabMode}
            examTimerSec={examTimerSec}
            safetyScore={safetyScore}
            audioEnabled={audioEnabled}
            volume={volume}
            muted={muted}
            ambienceEnabled={ambienceEnabled}
            onEnableAudio={handleEnableAudio}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onToggleAmbience={handleToggleAmbience}
            xrSupported={xrSupported}
            xrActive={xrActive}
            onToggleVR={() => void viewportRef.current?.toggleVR()}
            student={student}
            onUpdateProfile={handleUpdateProfile}
            onExportBackup={handleExportBackup}
            onLogout={handleLogout}
          />
        )}

        {/* Full-Bleed 3D Lab Viewport */}
        <main className="relative flex-1 min-h-0 w-full">
          <ThreeLabViewport
            ref={viewportRef}
            experiment={effectiveExp}
            rigState={rigState}
            labMode={labMode}
            activePreset={activePreset}
            presetTrigger={presetTrigger}
            safetyFlash={Boolean(safetyAlert)}
            introOrbit={!student}
            onPatchState={handlePatchState}
            onXrSupportChange={setXrSupported}
            onXrActiveChange={setXrActive}
          />

          {!authReady && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60">
              <div className="px-5 py-3.5 rounded-xl bg-[#0b1120]/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-2xl">
                Restoring student cloud session...
              </div>
            </div>
          )}

          {authReady && !student && (
            <StudentLoginModal
              onSignInWithGoogle={handleSignInWithGoogle}
              onUnlockAudio={handleEnableAudio}
            />
          )}

          {student && (
            <>
              {/* Top-Left Floating Procedure Checklist & Safety Alert */}
              <ProcedureChecklist
                experiment={effectiveExp}
                stepUnlocked={stepUnlocked}
                safetyAlert={safetyAlert}
                labMode={labMode}
                safetyScore={safetyScore}
                examScore={examBreakdown}
                onDismissSafety={() => setSafetyAlert(null)}
              />

              {/* Top-Right Cluster: Observation/Graph/Viva Drawer anchored at top-right + Collapsible Optical Loupe beside it */}
              <div className="no-print fixed top-16 right-4 z-20 flex flex-col md:flex-row-reverse gap-2.5 items-end md:items-start pointer-events-auto">
                <ObservationPanel
                  experiment={effectiveExp}
                  rigState={rigState}
                  allStepsDone={allStepsDone}
                  isCompleted={isCompleted}
                  labMode={labMode}
                  examFactor={labMode === 'exam' ? examFactor : 1}
                  examBreakdown={examBreakdown}
                  graphPoints={graphPoints}
                  onAddGraphPoint={(pt) => appendGraphPointForExp(activeExp.id, pt)}
                  onClearGraphPoints={() =>
                    setUserRecord((prev) => {
                      const nextRec: UserExperimentRecord = {
                        ...prev,
                        graphPoints: { ...(prev.graphPoints ?? {}), [activeExp.id]: [] },
                      };
                      scheduleCloudSync(activeExp.id, nextRec, true);
                      return nextRec;
                    })
                  }
                  onGraphSnapshot={setGraphSnapshotUrl}
                  vivaScore={vivaScore}
                  onVivaScoreChange={handleVivaScoreChange}
                  savedObservation={activeObs}
                  onSaveObservation={handleSaveObservation}
                  onVerifySuccess={handleVerifySuccess}
                  onVerifyFail={handleVerifyFail}
                  onDownloadRecord={() => window.print()}
                />
                <OpticalLoupeOverlay experiment={effectiveExp} rigState={rigState} />
              </div>

              {/* Bottom Center Unified Collapsible Control Dock */}
              <BottomControlDock
                experiment={effectiveExp}
                rigState={rigState}
                labMode={labMode}
                activePresetId={activePreset.id}
                onSelectPreset={(preset) => {
                  setActivePreset(preset);
                  setPresetTrigger((n) => n + 1);
                }}
                onControlAction={handleControlAction}
                onResetExperiment={handleResetExperiment}
              />
            </>
          )}
        </main>

        {student && (
          <>
            <ExperimentCatalogModal
              open={catalogOpen}
              onClose={() => setCatalogOpen(false)}
              experiments={ALL_EXPERIMENTS}
              activeExperimentId={activeExp.id}
              completedIds={completedIds}
              activeDiscipline={activeDiscipline}
              onSelectDiscipline={setActiveDiscipline}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectExperiment={loadExperiment}
            />

            <LabPerformanceDashboard
              open={dashboardOpen}
              onClose={() => setDashboardOpen(false)}
              experiments={ALL_EXPERIMENTS}
              userRecord={userRecord}
              studentName={student.name}
            />
          </>
        )}
      </div>

      {/* Print-Only Formal Practical Lab Record Sheet */}
      {student && (
        <LabRecordPrintSheet
          student={student}
          experiment={effectiveExp}
          labMode={labMode}
          stepTimestamps={stepTimestamps}
          observations={activeObs.fields}
          verifiedResult={activeObs.result}
          vivaScore={vivaScore}
          safetyScore={safetyScore}
          examBreakdown={labMode === 'exam' ? examBreakdown : null}
          graphSnapshotUrl={graphSnapshotUrl}
        />
      )}
    </>
  );
}
