/**
 * Phase 0 TDD Security Spec Verification for OmniLab 3D Firestore Rules.
 * Evaluates the "Dirty Dozen" adversarial payloads defined in security_spec.md.
 */

export interface DirtyPayloadCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyPayloadCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Profile Read',
    targetPath: '/students/student_alpha',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User Profile Read (PII Leak)',
    targetPath: '/students/student_alpha',
    operation: 'get',
    auth: { uid: 'student_beta', email: 'beta@school.edu', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Bypass',
    targetPath: '/students/student_alpha',
    operation: 'create',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: false },
    payload: {
      uid: 'student_alpha',
      displayName: 'Alpha',
      email: 'alpha@school.edu',
      rollNumber: '101',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Profile Collection Scrape',
    targetPath: '/students',
    operation: 'list',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Create',
    targetPath: '/students/student_alpha',
    operation: 'create',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    payload: {
      uid: 'student_beta',
      displayName: 'Spoofer',
      email: 'alpha@school.edu',
      rollNumber: '101',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection',
    targetPath: '/students/student_alpha',
    operation: 'update',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    payload: {
      displayName: 'Alpha',
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning / Path Traversal',
    targetPath: '/students/student_alpha/experiments/bad..id',
    operation: 'create',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    payload: {
      studentId: 'student_alpha',
      experimentId: 'bad..id',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphan Subcollection Write (Master Gate)',
    targetPath: '/students/orphan_uid/experiments/phy-1',
    operation: 'create',
    auth: { uid: 'orphan_uid', email: 'orphan@school.edu', email_verified: true },
    payload: {
      studentId: 'orphan_uid',
      experimentId: 'phy-1',
      completed: false,
      observations: {},
      result: '',
      vivaScore: 0,
      safetyScore: 100,
      graphPoints: [],
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Spoofing',
    targetPath: '/students/student_alpha',
    operation: 'create',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    payload: {
      uid: 'student_alpha',
      displayName: 'Alpha',
      email: 'alpha@school.edu',
      rollNumber: '101',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable Field Tampering',
    targetPath: '/students/student_alpha',
    operation: 'update',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    payload: {
      email: 'hijacked@school.edu',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Array / Payload Overflow',
    targetPath: '/students/student_alpha/experiments/phy-1',
    operation: 'update',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    payload: {
      graphPoints: Array.from({ length: 25 }, (_, i) => ({ x: i, y: i })),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Score Out-of-Range / Type Poisoning',
    targetPath: '/students/student_alpha/experiments/phy-1',
    operation: 'update',
    auth: { uid: 'student_alpha', email: 'alpha@school.edu', email_verified: true },
    payload: {
      vivaScore: 999,
      completed: 'yes',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
