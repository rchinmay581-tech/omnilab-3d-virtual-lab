import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  ExamScoreBreakdown,
  GraphPoint,
  StudentAccount,
  UserExperimentRecord,
} from '../types/lab';

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const MAX_DISPLAY_NAME_LEN = 80;
export const MAX_ROLL_NUMBER_LEN = 32;
export const ROLL_NUMBER_PATTERN = /^[a-zA-Z0-9_.\-/ ]*$/;
export const MAX_PHOTO_URL_LEN = 512;
export const MAX_EXPERIMENT_ID_LEN = 40;
export const MAX_OBSERVATION_KEYS = 20;
export const MAX_RESULT_LEN = 100;
export const MAX_GRAPH_POINTS = 24;

export function sanitizeDisplayName(raw: string | null | undefined, email: string): string {
  const cleaned = (raw ?? '').trim().slice(0, MAX_DISPLAY_NAME_LEN);
  if (cleaned.length >= 1) return cleaned;
  const prefix = email.split('@')[0]?.trim() || 'Student';
  return prefix.slice(0, MAX_DISPLAY_NAME_LEN);
}

export function sanitizeRollNumber(raw: string | null | undefined): string {
  const cleaned = (raw ?? '').trim().slice(0, MAX_ROLL_NUMBER_LEN);
  return cleaned.replace(/[^a-zA-Z0-9_.\-/ ]/g, '').slice(0, MAX_ROLL_NUMBER_LEN);
}

export function isValidRollNumber(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length <= MAX_ROLL_NUMBER_LEN && ROLL_NUMBER_PATTERN.test(trimmed);
}

function sanitizeObservations(
  obs: Record<string, string> | undefined
): Record<string, string> {
  if (!obs || typeof obs !== 'object') return {};
  const entries = Object.entries(obs).slice(0, MAX_OBSERVATION_KEYS);
  const clean: Record<string, string> = {};
  for (const [k, v] of entries) {
    const key = String(k).trim().slice(0, 48);
    if (!key) continue;
    clean[key] = String(v ?? '').slice(0, 80);
  }
  return clean;
}

function sanitizeGraphPoints(points: GraphPoint[] | undefined): GraphPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .slice(-MAX_GRAPH_POINTS)
    .filter((pt) => Number.isFinite(pt?.x) && Number.isFinite(pt?.y))
    .map((pt) => {
      const base: GraphPoint = { x: Number(pt.x), y: Number(pt.y) };
      if (typeof pt.label === 'string' && pt.label.trim()) {
        base.label = pt.label.trim().slice(0, 40);
      }
      return base;
    });
}

function sanitizeExamScore(exam: ExamScoreBreakdown | undefined): ExamScoreBreakdown | undefined {
  if (!exam || typeof exam !== 'object') return undefined;
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Number.isFinite(val) ? val : min));
  return {
    procedureMarks: clamp(exam.procedureMarks, 0, 20),
    calculationMarks: clamp(exam.calculationMarks, 0, 5),
    vivaMarks: clamp(exam.vivaMarks, 0, 5),
    totalMarks: clamp(exam.totalMarks, 0, 30),
    safetyScore: clamp(exam.safetyScore, 0, 100),
    mode: exam.mode === 'exam' ? 'exam' : 'practice',
    completedAt: String(exam.completedAt ?? new Date().toLocaleString()).slice(0, 64),
  };
}

export async function upsertStudentProfile(
  user: User,
  overrides?: { displayName?: string; rollNumber?: string }
): Promise<StudentAccount> {
  const email = user.email?.trim() ?? '';
  if (!email) {
    throw new Error('Google account must have a verified email address.');
  }

  const profilePath = `students/${user.uid}`;
  const profileRef = doc(db, 'students', user.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(profileRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, profilePath);
  }

  const photoUrl =
    typeof user.photoURL === 'string' && user.photoURL.length <= MAX_PHOTO_URL_LEN
      ? user.photoURL
      : '';

  if (!existingSnap.exists()) {
    const displayName = sanitizeDisplayName(overrides?.displayName || user.displayName, email);
    const rollNumber = sanitizeRollNumber(overrides?.rollNumber ?? '');
    const payload: Record<string, unknown> = {
      uid: user.uid,
      displayName,
      email,
      rollNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (photoUrl) {
      payload.photoUrl = photoUrl;
    }

    try {
      await setDoc(profileRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, profilePath);
    }

    return {
      uid: user.uid,
      identifier: email,
      method: 'google',
      name: displayName,
      rollNumber: rollNumber || undefined,
      photoUrl: photoUrl || undefined,
    };
  }

  const existingData = existingSnap.data() as {
    displayName?: string;
    rollNumber?: string;
    photoUrl?: string;
  };
  const nextName = overrides?.displayName?.trim()
    ? sanitizeDisplayName(overrides.displayName, email)
    : sanitizeDisplayName(existingData.displayName || user.displayName, email);
  const nextRoll =
    overrides?.rollNumber !== undefined
      ? sanitizeRollNumber(overrides.rollNumber)
      : sanitizeRollNumber(existingData.rollNumber ?? '');

  const shouldUpdate =
    (overrides?.displayName !== undefined && nextName !== existingData.displayName) ||
    (overrides?.rollNumber !== undefined && nextRoll !== (existingData.rollNumber ?? '')) ||
    (photoUrl && photoUrl !== existingData.photoUrl);

  if (shouldUpdate) {
    const updatePayload: Record<string, unknown> = {
      displayName: nextName,
      rollNumber: nextRoll,
      updatedAt: serverTimestamp(),
    };
    if (photoUrl) {
      updatePayload.photoUrl = photoUrl;
    }
    try {
      await updateDoc(profileRef, updatePayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, profilePath);
    }
  }

  return {
    uid: user.uid,
    identifier: email,
    method: 'google',
    name: nextName,
    rollNumber: nextRoll || undefined,
    photoUrl: photoUrl || existingData.photoUrl || undefined,
  };
}

export async function saveExperimentToCloud(
  uid: string,
  expId: string,
  data: {
    completed: boolean;
    observations: { fields: Record<string, string>; result: string };
    vivaScore: number;
    safetyScore: number;
    examScore?: ExamScoreBreakdown;
    graphPoints: GraphPoint[];
  },
  alreadyExists?: boolean
): Promise<void> {
  const cleanExpId = expId.trim().slice(0, MAX_EXPERIMENT_ID_LEN);
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanExpId)) return;

  const docPath = `students/${uid}/experiments/${cleanExpId}`;
  const docRef = doc(db, 'students', uid, 'experiments', cleanExpId);

  let exists = alreadyExists;
  if (exists === undefined) {
    try {
      const snap = await getDoc(docRef);
      exists = snap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
  }

  const sanitizedFields = sanitizeObservations(data.observations?.fields);
  const sanitizedResult = String(data.observations?.result ?? '').slice(0, MAX_RESULT_LEN);
  const sanitizedViva = Math.max(0, Math.min(5, Number(data.vivaScore) || 0));
  const sanitizedSafety = Math.max(0, Math.min(100, Number(data.safetyScore) || 100));
  const sanitizedGraph = sanitizeGraphPoints(data.graphPoints);
  const sanitizedExam = sanitizeExamScore(data.examScore);

  if (!exists) {
    const createPayload: Record<string, unknown> = {
      studentId: uid,
      experimentId: cleanExpId,
      completed: Boolean(data.completed),
      observations: sanitizedFields,
      result: sanitizedResult,
      vivaScore: sanitizedViva,
      safetyScore: sanitizedSafety,
      graphPoints: sanitizedGraph,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (sanitizedExam) {
      createPayload.examScore = sanitizedExam;
    }
    try {
      await setDoc(docRef, createPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
    return;
  }

  const updatePayload: Record<string, unknown> = {
    completed: Boolean(data.completed),
    observations: sanitizedFields,
    result: sanitizedResult,
    vivaScore: sanitizedViva,
    safetyScore: sanitizedSafety,
    graphPoints: sanitizedGraph,
    updatedAt: serverTimestamp(),
  };
  if (sanitizedExam) {
    updatePayload.examScore = sanitizedExam;
  }

  try {
    await updateDoc(docRef, updatePayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export function subscribeToStudentExperiments(
  uid: string,
  onRecord: (record: UserExperimentRecord, syncedDocIds: Set<string>) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = `students/${uid}/experiments`;
  const q = query(collection(db, 'students', uid, 'experiments'), where('studentId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const completedIds: string[] = [];
      const observations: UserExperimentRecord['observations'] = {};
      const vivaScores: Record<string, number> = {};
      const safetyScores: Record<string, number> = {};
      const examScores: Record<string, ExamScoreBreakdown> = {};
      const graphPoints: Record<string, GraphPoint[]> = {};
      const syncedDocIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as {
          experimentId?: string;
          completed?: boolean;
          observations?: Record<string, string>;
          result?: string;
          vivaScore?: number;
          safetyScore?: number;
          examScore?: ExamScoreBreakdown;
          graphPoints?: GraphPoint[];
        };
        const expId = d.experimentId || docSnap.id;
        syncedDocIds.add(expId);

        if (d.completed) {
          completedIds.push(expId);
        }
        if (d.observations || typeof d.result === 'string') {
          observations[expId] = {
            fields: d.observations && typeof d.observations === 'object' ? d.observations : {},
            result: typeof d.result === 'string' ? d.result : '',
          };
        }
        if (typeof d.vivaScore === 'number') {
          vivaScores[expId] = d.vivaScore;
        }
        if (typeof d.safetyScore === 'number') {
          safetyScores[expId] = d.safetyScore;
        }
        if (d.examScore && typeof d.examScore === 'object') {
          examScores[expId] = d.examScore;
        }
        if (Array.isArray(d.graphPoints)) {
          graphPoints[expId] = d.graphPoints;
        }
      });

      onRecord(
        {
          completedIds,
          observations,
          vivaScores,
          safetyScores,
          examScores,
          graphPoints,
        },
        syncedDocIds
      );
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
