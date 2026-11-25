export type Discipline = 'Physics' | 'Chemistry' | 'Biology';

export type RigType =
  | 'mechanics'
  | 'thermal_electrical'
  | 'optics'
  | 'wet_chemistry'
  | 'qualitative_analysis'
  | 'biology_microscopy';

export type CameraPresetId = 'lab_room' | 'overview' | 'loupe' | 'eyepiece';

export type LabMode = 'practice' | 'exam';

export interface StudentAccount {
  uid?: string;
  identifier: string; // email or student identifier
  method: 'google' | 'email' | 'phone';
  name: string;
  rollNumber?: string;
  photoUrl?: string;
}

export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ExamScoreBreakdown {
  procedureMarks: number; // out of 20
  calculationMarks: number; // out of 5
  vivaMarks: number; // out of 5
  totalMarks: number; // out of 30
  safetyScore: number; // 0-100
  mode: LabMode;
  completedAt: string;
}

export interface UserExperimentRecord {
  completedIds: string[];
  observations: Record<string, { fields: Record<string, string>; result: string }>;
  vivaScores?: Record<string, number>;
  safetyScores?: Record<string, number>;
  examScores?: Record<string, ExamScoreBreakdown>;
  graphPoints?: Record<string, GraphPoint[]>;
}

export interface VivaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface ObservationField {
  key: string;
  label: string;
  unit: string;
  placeholder: string;
  expectedValue: number;
  tolerancePct?: number;
}

export interface RigState {
  // General & timing
  elapsedTime: number;
  subMode: string;
  // Mechanics (Phy 1-12)
  jawPositionMm: number; // 0 - 120 mm (Vernier)
  measurementCount: number; // Perpendicular readings taken
  zeroErrorChecked: boolean;
  thimbleRotation: number; // 0 - 1000 (0.01mm steps)
  ratchetClicks: number;
  spherometerHeightMm: number; // -5 to +10 mm
  plateMode: 'flat' | 'curved';
  leftMassG: number;
  rightMassG: number;
  beamArrestReleased: boolean;
  balancingScrewOffset: number;
  weightP: number;
  weightQ: number;
  angleDeg: number; // Inclined plane / prism angle
  panMassG: number;
  extraNormalMassG: number;
  springLoadG: number;
  pendulumLengthCm: number;
  pendulumAngleDeg: number;
  pendulumRunning: boolean;
  pendulumOscillations: number;
  stopwatchSec: number;
  boylePressureOffsetCm: number; // -30 to +40 cm Hg

  // Thermal & Electrical (Phy 13-22, 30)
  calorimeterWaterAdded: boolean;
  solidHeated: boolean;
  solidTransferred: boolean;
  stirrerCount: number;
  tempC: number;
  wiresConnected: number; // 0 to 4 terminals connected
  keyClosed: boolean;
  key2Closed: boolean;
  rheostatPos: number; // 0 to 1
  resistanceBoxR: number;
  shuntBoxS: number;
  reverseBias: boolean;
  circuitMode: 'series' | 'parallel' | 'single';
  bridgeDistanceCm: number; // Sonometer 10 - 90 cm
  electromagnetOn: boolean;
  ammeterA: number;
  voltmeterV: number;
  galvDeflection: number;

  // Optics (Phy 23-29)
  objectPosCm: number;
  lensOrMirrorPosCm: number;
  imagePinPosCm: number;
  parallaxError: number;
  secondLensRemoved: boolean;
  prismAngleIncidence: number; // 30 to 65 deg
  emergentPinsAligned: boolean;
  microscopeHeightMm: number;
  slabPlaced: boolean;
  powderSprinkled: boolean;
  liquidAdded: boolean;

  // Wet Chemistry (Chem 1-15, 28-30)
  pipetteAdded: boolean;
  indicatorAdded: boolean;
  buretteFilled: boolean;
  stopcockOpen: number; // 0 (closed) to 1 (stream)
  titratedMl: number; // 0 - 50 mL
  flaskSwirled: number;
  endpointReached: boolean;
  overshot: boolean;
  reagentAddedCount: number;
  phDropsTested: number;
  litmusTested: boolean;
  splinterTested: boolean;
  electrolysisCurrentOn: boolean;
  gasCollectedMl: number;
  beakerStirred: boolean;
  solutionHeated: boolean;
  saltAddedG: number;
  crossObscured: boolean;
  zincAdded: boolean;
  carbonateAdded: boolean;

  // Qualitative Analysis (Chem 16-27)
  burnerLit: boolean;
  matchDragged: boolean;
  gasValveOpen: boolean;
  primaryReagentAdded: boolean;
  confirmatoryReagentAdded: boolean;
  h2sPassed: boolean;
  flameTestDone: boolean;
  silverMirrorFormed: boolean;
  brownRingFormed: boolean;
  tubeWarmed: boolean;
  iceBathUsed: boolean;

  // Biology (Bio 1-30)
  objectivePower: 10 | 45 | 100;
  mirrorAngle: number; // -1 to 1
  diaphragmOpen: number; // 0 to 1
  slidePlaced: boolean;
  stainAdded: boolean;
  glycerineAdded: boolean;
  coverslipPlaced: boolean;
  coarseFocus: number; // 0 to 1
  fineFocus: number; // 0 to 1
  focusSharpness: number; // 0 to 100
  specimenIndex: number; // For multi-specimen studies
  dissectionProgress: number; // 0 to 4 whorls/parts
  osmosisTimeHr: number; // 0 to 2.5
  chromatographyProgress: number; // 0 to 1
  jointAngleDeg: number; // -45 to 90
  spotTileTested: number; // 0 to 5
  dryWeightG: number;
  swollenWeightG: number;
  cobaltBlueTested: boolean;
}

export interface StepRule {
  id: string;
  instruction: string;
  hint: string;
  check: (state: RigState) => boolean;
}

export interface ControlSpec {
  id: string;
  label: string;
  type: 'slider' | 'button' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string | number }[];
  getValue?: (state: RigState) => number | string | boolean;
  action: string;
}

export interface ExperimentConfig {
  id: string;
  number: number;
  discipline: Discipline;
  title: string;
  shortTitle: string;
  rigType: RigType;
  subMode: string;
  summary: string;
  apparatusList: string[];
  steps: StepRule[];
  controls: ControlSpec[];
  cameraPresets: CameraPreset[];
  formulaLabel: string;
  observationFields: ObservationField[];
  resultLabel: string;
  resultUnit: string;
  groundTruthResult: number;
  tolerancePct: number;
  /** Optional safety rule check returning warning message if violated */
  checkSafety?: (state: RigState, prev: RigState) => string | null;
  /** Compute live readout string for telemetry HUD */
  getLiveReadout: (state: RigState) => { label: string; value: string }[];
  /** Microscope/Loupe specimen info */
  eyepieceType?: string;
  eyepieceCaption?: string;
}

export interface SafetyAlert {
  id: number;
  message: string;
  timestamp: number;
}
