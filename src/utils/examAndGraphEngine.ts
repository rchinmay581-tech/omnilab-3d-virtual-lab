import { ExperimentConfig, GraphPoint, RigState } from '../types/lab';

export interface GraphSpec {
  title: string;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  curveMode: 'linear' | 'smooth';
}

export function getGraphSpecForExperiment(exp: ExperimentConfig): GraphSpec {
  const sm = exp.subMode;
  if (sm === 'ohm_law' || sm === 'meter_bridge' || sm === 'potentiometer' || sm === 'series_parallel' || sm === 'galvanometer') {
    return {
      title: 'Voltage (V) vs. Current (I)',
      xLabel: 'Current I',
      yLabel: 'Voltage V',
      xUnit: 'A',
      yUnit: 'V',
      curveMode: 'linear',
    };
  }
  if (sm === 'diode') {
    return {
      title: 'P-N Junction V–I Characteristic',
      xLabel: 'Forward Voltage V',
      yLabel: 'Current I',
      xUnit: 'V',
      yUnit: 'mA',
      curveMode: 'smooth',
    };
  }
  if (sm === 'pendulum') {
    return {
      title: 'Pendulum Length (L) vs. Period Squared (T²)',
      xLabel: 'Length L',
      yLabel: 'T²',
      xUnit: 'cm',
      yUnit: 's²',
      curveMode: 'linear',
    };
  }
  if (sm === 'hooke_law' || sm === 'spring_constant' || sm === 'friction') {
    return {
      title: 'Applied Load vs. Extension / Force',
      xLabel: 'Load Mass',
      yLabel: 'Extension',
      xUnit: 'g',
      yUnit: 'cm',
      curveMode: 'linear',
    };
  }
  if (sm === 'cooling_curve' || sm === 'newton_cooling' || sm === 'calorimetry') {
    return {
      title: 'Cooling / Thermal Curve (T vs. t)',
      xLabel: 'Elapsed Step / Time',
      yLabel: 'Temperature T',
      xUnit: 'min',
      yUnit: '°C',
      curveMode: 'smooth',
    };
  }
  if (sm === 'prism') {
    return {
      title: 'Prism Deviation Curve (δ vs. i)',
      xLabel: 'Incidence Angle i',
      yLabel: 'Deviation δ',
      xUnit: '°',
      yUnit: '°',
      curveMode: 'smooth',
    };
  }
  if (sm.startsWith('titration')) {
    return {
      title: 'Titration Curve (pH vs. Titrant Volume)',
      xLabel: 'Burette Volume',
      yLabel: 'Solution pH',
      xUnit: 'mL',
      yUnit: 'pH',
      curveMode: 'smooth',
    };
  }
  if (sm === 'kinetics_cross' || sm === 'kinetics') {
    return {
      title: 'Reaction Rate (1/t) vs. Concentration',
      xLabel: 'Concentration',
      yLabel: 'Rate (1/t)',
      xUnit: 'M',
      yUnit: 's⁻¹',
      curveMode: 'linear',
    };
  }
  if (sm === 'boyle') {
    return {
      title: "Boyle's Law (Pressure vs. Compression)",
      xLabel: 'Volume Index',
      yLabel: 'Pressure P',
      xUnit: 'arb',
      yUnit: 'cm Hg',
      curveMode: 'smooth',
    };
  }
  if (exp.rigType === 'biology_microscopy') {
    return {
      title: 'Observation / Focus Response Curve',
      xLabel: 'Trial / Adjustment',
      yLabel: sm === 'osmosis' || sm === 'respiration' ? 'Column Rise' : 'Sharpness',
      xUnit: sm === 'osmosis' || sm === 'respiration' ? 'hr' : '#',
      yUnit: sm === 'osmosis' || sm === 'respiration' ? 'cm' : '%',
      curveMode: 'smooth',
    };
  }
  return {
    title: `${exp.shortTitle} — Trial Readings`,
    xLabel: 'Trial #',
    yLabel: exp.resultLabel,
    xUnit: '#',
    yUnit: exp.resultUnit || 'units',
    curveMode: 'linear',
  };
}

export function extractGraphPoint(
  exp: ExperimentConfig,
  state: RigState,
  existingCount: number,
  examFactor = 1
): GraphPoint {
  const sm = exp.subMode;
  if (sm === 'ohm_law' || sm === 'meter_bridge' || sm === 'potentiometer' || sm === 'series_parallel' || sm === 'galvanometer') {
    const iVal = Number((state.ammeterA / examFactor).toFixed(2));
    const vVal = Number((state.voltmeterV).toFixed(2));
    return { x: iVal, y: vVal };
  }
  if (sm === 'diode') {
    return { x: Number(state.voltmeterV.toFixed(2)), y: Number(state.ammeterA.toFixed(1)) };
  }
  if (sm === 'pendulum') {
    const gEff = 980 / examFactor;
    const tSec = 2 * Math.PI * Math.sqrt(state.pendulumLengthCm / gEff);
    return { x: Number(state.pendulumLengthCm.toFixed(1)), y: Number((tSec * tSec).toFixed(2)) };
  }
  if (sm === 'hooke_law' || sm === 'spring_constant' || sm === 'friction') {
    const ext = Number(((state.springLoadG * 0.024 + state.panMassG * 0.03) * examFactor).toFixed(2));
    const mass = state.springLoadG > 0 ? state.springLoadG : state.panMassG;
    return { x: mass, y: ext };
  }
  if (sm === 'cooling_curve' || sm === 'newton_cooling' || sm === 'calorimetry') {
    return { x: existingCount * 2, y: Number(state.tempC.toFixed(1)) };
  }
  if (sm === 'prism') {
    const i = state.prismAngleIncidence;
    const deltaMin = 38 * examFactor;
    const delta = Number((deltaMin + 0.035 * Math.pow(i - 48, 2)).toFixed(1));
    return { x: i, y: delta };
  }
  if (sm.startsWith('titration')) {
    const eqVol = 20.0 * examFactor;
    const v = state.titratedMl;
    const ph = Number((1.8 + 10.4 / (1 + Math.exp(-(v - eqVol) * 1.1))).toFixed(2));
    return { x: Number(v.toFixed(2)), y: ph };
  }
  if (sm === 'kinetics_cross' || sm === 'kinetics') {
    const conc = Number((0.02 + state.reagentAddedCount * 0.02).toFixed(2));
    const rate = Number((conc * 0.65 * examFactor).toFixed(4));
    return { x: conc, y: rate };
  }
  if (sm === 'boyle') {
    return { x: existingCount + 1, y: Number((76 + state.boylePressureOffsetCm).toFixed(1)) };
  }
  if (sm === 'osmosis' || sm === 'respiration') {
    return {
      x: Number(state.osmosisTimeHr.toFixed(1)),
      y: Number((state.osmosisTimeHr * 2.1 * examFactor).toFixed(2)),
    };
  }
  // Default trial reading near current apparatus state
  let yVal = exp.groundTruthResult * examFactor;
  if (sm.startsWith('vernier')) yVal = Number((state.jawPositionMm / 10).toFixed(2));
  else if (sm === 'screw_wire') yVal = Number((state.thimbleRotation * 0.01).toFixed(2));
  else if (sm === 'spherometer') yVal = Number(state.spherometerHeightMm.toFixed(2));
  else if (exp.rigType === 'biology_microscopy') {
    yVal = Number(Math.max(10, Math.min(100, 100 - Math.abs(state.fineFocus - 0.72) * 110)).toFixed(0));
  }
  return { x: existingCount + 1, y: Number(yVal.toFixed(2)) };
}

export interface LinearFitResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export function computeLinearFit(points: GraphPoint[]): LinearFitResult | null {
  if (points.length < 2) return null;
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = slope * p.x + intercept;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - pred) ** 2;
  }
  const rSquared = ssTot < 1e-9 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, rSquared };
}

/** Generate a deterministic unknown specimen factor in [0.85, 0.94] U [1.06, 1.15] for Exam Mode */
export function generateExamUnknownFactor(): number {
  const high = Math.random() >= 0.5;
  const raw = high ? 1.06 + Math.random() * 0.09 : 0.85 + Math.random() * 0.09;
  return Number(raw.toFixed(3));
}

/**
 * Produces an Exam-Mode variant of an ExperimentConfig with a randomized unknown target
 * so memorized practice values cannot simply be typed in, while keeping 3D step conditions valid.
 */
export function createExamExperimentVariant(
  exp: ExperimentConfig,
  unknownFactor: number
): ExperimentConfig {
  const scaledGroundTruth = Number((exp.groundTruthResult * unknownFactor).toFixed(2));
  const scaledFields = exp.observationFields.map((f, idx) => {
    const isDiscreteCount = /count|moles|hydration|state|pH/i.test(f.label) && f.expectedValue <= 14;
    if (isDiscreteCount && idx === 0 && exp.subMode === 'ph_tile') return f;
    const expectedValue = Number((f.expectedValue * unknownFactor).toFixed(2));
    return {
      ...f,
      expectedValue,
      placeholder: 'Exam Mode (Hidden)',
    };
  });

  return {
    ...exp,
    observationFields: scaledFields,
    groundTruthResult: scaledGroundTruth,
    getLiveReadout: (s: RigState) => {
      const base = exp.getLiveReadout(s).map((entry) => {
        // Scale primary analog/digital meter numbers to reflect unknown specimen
        const numMatch = entry.value.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
        if (numMatch && !/\/|Readings|Captures|Drops|Steps|Sharpness/i.test(entry.label)) {
          const val = parseFloat(numMatch[1]);
          const suffix = numMatch[2];
          if (!Number.isNaN(val) && val !== 0) {
            const scaled = (val * unknownFactor).toFixed(numMatch[1].includes('.') ? numMatch[1].split('.')[1].length : 0);
            return { ...entry, value: `${scaled}${suffix ? ' ' + suffix : ''}` };
          }
        }
        return entry;
      });
      return [
        ...base,
        { label: 'Unknown Specimen Tag', value: `EX-${Math.round(unknownFactor * 1000)}` },
      ];
    },
  };
}
