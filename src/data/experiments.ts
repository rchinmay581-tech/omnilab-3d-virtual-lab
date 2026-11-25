import { labAudio } from '../audio/LabAudioEngine';
import { ExperimentConfig, RigState } from '../types/lab';
import { BIOLOGY_EXPERIMENTS } from './biologyExperiments';
import { CHEMISTRY_EXPERIMENTS } from './chemistryExperiments';
import { PHYSICS_EXPERIMENTS } from './physicsExperiments';

export const ALL_EXPERIMENTS: ExperimentConfig[] = [
  ...PHYSICS_EXPERIMENTS,
  ...CHEMISTRY_EXPERIMENTS,
  ...BIOLOGY_EXPERIMENTS,
];

export function createInitialRigState(exp: ExperimentConfig): RigState {
  return {
    elapsedTime: 0,
    subMode: exp.subMode,
    jawPositionMm: exp.subMode === 'vernier_sphere' ? 12.0 : 15.0,
    measurementCount: 0,
    zeroErrorChecked: false,
    thimbleRotation: 220,
    ratchetClicks: 0,
    spherometerHeightMm: 0.5,
    plateMode: 'flat',
    leftMassG: 45,
    rightMassG: 20,
    beamArrestReleased: false,
    balancingScrewOffset: 0,
    weightP: 100,
    weightQ: 100,
    angleDeg: 20,
    panMassG: 25,
    extraNormalMassG: 0,
    springLoadG: 0,
    pendulumLengthCm: 100,
    pendulumAngleDeg: 0,
    pendulumRunning: false,
    pendulumOscillations: 0,
    stopwatchSec: 0,
    boylePressureOffsetCm: 0,

    calorimeterWaterAdded: false,
    solidHeated: false,
    solidTransferred: false,
    stirrerCount: 0,
    tempC: 25.0,
    wiresConnected: 0,
    keyClosed: false,
    key2Closed: false,
    rheostatPos: 0.45,
    resistanceBoxR: 5000,
    shuntBoxS: 60,
    reverseBias: false,
    circuitMode: exp.subMode === 'series_parallel' ? 'series' : 'single',
    bridgeDistanceCm: 30,
    electromagnetOn: false,
    ammeterA: 0.6,
    voltmeterV: 2.4,
    galvDeflection: 24,

    objectPosCm: exp.subMode === 'concave_mirror' ? 18 : 30,
    lensOrMirrorPosCm: 75,
    imagePinPosCm: exp.subMode === 'liquid_mirror' ? 24.0 : exp.subMode === 'concave_mirror' ? 42.0 : 88.0,
    parallaxError: 0,
    secondLensRemoved: false,
    prismAngleIncidence: 40,
    emergentPinsAligned: false,
    microscopeHeightMm: 10.0,
    slabPlaced: false,
    powderSprinkled: false,
    liquidAdded: false,

    pipetteAdded: false,
    indicatorAdded: false,
    buretteFilled: true,
    stopcockOpen: 0,
    titratedMl: 0,
    flaskSwirled: 0,
    endpointReached: false,
    overshot: false,
    reagentAddedCount: 0,
    phDropsTested: 0,
    litmusTested: false,
    splinterTested: false,
    electrolysisCurrentOn: false,
    gasCollectedMl: 0,
    beakerStirred: false,
    solutionHeated: false,
    saltAddedG: 0,
    crossObscured: false,
    zincAdded: false,
    carbonateAdded: false,

    burnerLit: false,
    matchDragged: false,
    gasValveOpen: false,
    primaryReagentAdded: false,
    confirmatoryReagentAdded: false,
    h2sPassed: false,
    flameTestDone: false,
    silverMirrorFormed: false,
    brownRingFormed: false,
    tubeWarmed: false,
    iceBathUsed: false,

    objectivePower: 10,
    mirrorAngle: 0.1,
    diaphragmOpen: 0.7,
    slidePlaced: false,
    stainAdded: false,
    glycerineAdded: false,
    coverslipPlaced: false,
    coarseFocus: 0.25,
    fineFocus: 0.35,
    focusSharpness: 30,
    specimenIndex: 0,
    dissectionProgress: 0,
    osmosisTimeHr: 0,
    chromatographyProgress: 0,
    jointAngleDeg: 10,
    spotTileTested: 0,
    dryWeightG: 10.0,
    swollenWeightG: 10.0,
    cobaltBlueTested: false,
  };
}

export function recomputeElectricalMetrics(state: RigState): Partial<RigState> {
  if (!state.keyClosed || state.wiresConnected < 4) {
    return { ammeterA: 0, voltmeterV: 0, galvDeflection: 0 };
  }
  const supplyV = 6.0;
  const rRheo = 1.0 + (1 - state.rheostatPos) * 8.0;
  let rLoad = 4.0;
  if (state.subMode === 'series_parallel') {
    rLoad = state.circuitMode === 'series' ? 10.0 : 2.4;
  }
  if (state.subMode === 'diode') {
    if (state.reverseBias) {
      return { voltmeterV: Number((state.rheostatPos * 5).toFixed(2)), ammeterA: 0.02, galvDeflection: 0 };
    }
    const vf = Number((0.4 + state.rheostatPos * 0.6).toFixed(2));
    const ma = vf >= 0.7 ? Number(((vf - 0.65) * 65).toFixed(1)) : 0.2;
    return { voltmeterV: vf, ammeterA: ma, galvDeflection: 0 };
  }
  if (state.subMode === 'galvanometer') {
    const thetaFull = (2.0 / Math.max(500, state.resistanceBoxR + 100)) * 61200;
    const theta = state.key2Closed ? thetaFull * (state.shuntBoxS / (state.shuntBoxS + 100)) : thetaFull;
    return { galvDeflection: Number(theta.toFixed(1)), ammeterA: 0.1, voltmeterV: 2.0 };
  }
  const current = supplyV / (rRheo + rLoad);
  const vDrop = current * rLoad;
  return {
    ammeterA: Number(current.toFixed(2)),
    voltmeterV: Number(vDrop.toFixed(2)),
    galvDeflection: Number((current * 18).toFixed(1)),
  };
}

export function applyControlAction(
  prev: RigState,
  action: string,
  value?: number | string | boolean
): RigState {
  const next: RigState = { ...prev };

  switch (action) {
    case 'check_zero':
      labAudio.playMetallicTick(2500, 0.5);
      next.zeroErrorChecked = true;
      if (prev.subMode.startsWith('vernier')) next.jawPositionMm = 0;
      if (prev.subMode === 'spherometer' && prev.plateMode === 'flat') next.spherometerHeightMm = 0;
      break;
    case 'set_jaw':
      labAudio.playMetallicTick(2800, 0.35);
      next.jawPositionMm = Number(value);
      break;
    case 'set_thimble':
      labAudio.playMetallicTick(3400, 0.4);
      next.thimbleRotation = Number(value);
      break;
    case 'set_sph_h':
      labAudio.playMetallicTick(3000, 0.35);
      next.spherometerHeightMm = Number(value);
      break;
    case 'set_plate':
      labAudio.playMetallicTick(2000, 0.5);
      next.plateMode = value as 'flat' | 'curved';
      break;
    case 'toggle_arrest':
      labAudio.playMetallicTick(2200, 0.5);
      next.beamArrestReleased = Boolean(value);
      break;
    case 'set_right_mass':
      labAudio.playMetallicTick(2100, 0.45);
      next.rightMassG = Number(value);
      break;
    case 'set_wp':
      labAudio.playMetallicTick(2100, 0.4);
      next.weightP = Number(value);
      break;
    case 'set_wq':
      labAudio.playMetallicTick(2100, 0.4);
      next.weightQ = Number(value);
      break;
    case 'set_angle':
      next.angleDeg = Number(value);
      break;
    case 'set_pan_mass':
      labAudio.playMetallicTick(2300, 0.45);
      next.panMassG = Number(value);
      break;
    case 'set_extra_mass':
      labAudio.playMetallicTick(2000, 0.45);
      next.extraNormalMassG = Number(value);
      break;
    case 'set_spring_load':
      labAudio.playSpringBoing();
      next.springLoadG = Number(value);
      break;
    case 'set_pend_len':
      next.pendulumLengthCm = Number(value);
      break;
    case 'set_pend_ang':
      next.pendulumAngleDeg = Number(value);
      break;
    case 'toggle_pendulum':
      labAudio.playPendulumWhoosh();
      next.pendulumRunning = Boolean(value);
      break;
    case 'set_boyle':
      next.boylePressureOffsetCm = Number(value);
      break;
    case 'capture_reading':
      labAudio.playMetallicTick(3200, 0.65);
      next.measurementCount = prev.measurementCount + 1;
      break;

    // Thermal & Electrical
    case 'add_cal_water':
      labAudio.playLiquidPour(0.45);
      next.calorimeterWaterAdded = true;
      next.tempC = 25.0;
      break;
    case 'transfer_solid':
      labAudio.playLiquidPour(0.35);
      next.solidHeated = true;
      next.solidTransferred = true;
      if (prev.calorimeterWaterAdded) next.tempC = 36.4;
      break;
    case 'stir_cal':
      labAudio.playSwirl();
      next.stirrerCount = prev.stirrerCount + 1;
      break;
    case 'pour_hot_water':
      labAudio.playLiquidPour(0.5);
      next.calorimeterWaterAdded = true;
      next.tempC = 80.0;
      break;
    case 'advance_cooling':
      labAudio.playSwirl();
      next.stirrerCount = prev.stirrerCount + 1;
      next.tempC = Number((25 + (prev.tempC - 25) * 0.78).toFixed(1));
      break;
    case 'connect_wire':
      labAudio.playMetallicTick(2200, 0.55);
      next.wiresConnected = Math.min(4, prev.wiresConnected + 1);
      break;
    case 'toggle_key':
      labAudio.playSwitchClack();
      next.keyClosed = Boolean(value);
      break;
    case 'toggle_key2':
      labAudio.playSwitchClack();
      next.key2Closed = Boolean(value);
      break;
    case 'set_rheostat':
      next.rheostatPos = Number(value);
      break;
    case 'set_rbox':
      labAudio.playMetallicTick(2600, 0.4);
      next.resistanceBoxR = Number(value);
      break;
    case 'set_sbox':
      labAudio.playMetallicTick(2600, 0.4);
      next.shuntBoxS = Number(value);
      break;
    case 'set_circuit_mode':
      labAudio.playSwitchClack();
      next.circuitMode = value as 'series' | 'parallel';
      break;
    case 'toggle_reverse_bias':
      labAudio.playSwitchClack();
      next.reverseBias = Boolean(value);
      break;
    case 'toggle_em':
      labAudio.playSwitchClack();
      next.electromagnetOn = Boolean(value);
      labAudio.setTransformerHum(next.electromagnetOn);
      break;
    case 'set_bridge':
      labAudio.playMetallicTick(1800, 0.35);
      next.bridgeDistanceCm = Number(value);
      break;

    // Optics
    case 'set_obj_pin':
      next.objectPosCm = Number(value);
      break;
    case 'set_img_pin':
      next.imagePinPosCm = Number(value);
      break;
    case 'toggle_second_lens':
      labAudio.playMetallicTick(2000, 0.45);
      next.secondLensRemoved = Boolean(value);
      break;
    case 'set_prism_i':
      next.prismAngleIncidence = Number(value);
      break;
    case 'toggle_slab':
      labAudio.playMetallicTick(1900, 0.45);
      next.slabPlaced = Boolean(value);
      break;
    case 'sprinkle_powder':
      labAudio.playFizz(0.25);
      next.powderSprinkled = true;
      break;
    case 'set_tm_height':
      labAudio.playMetallicTick(2700, 0.35);
      next.microscopeHeightMm = Number(value);
      break;
    case 'add_liquid_mirror':
      labAudio.playDroplet();
      next.liquidAdded = true;
      break;

    // Wet Chemistry
    case 'add_reagent':
      labAudio.playLiquidPour(0.4);
      next.reagentAddedCount = prev.reagentAddedCount + 1;
      next.pipetteAdded = true;
      break;
    case 'add_reagent_fizz':
      labAudio.playFizz(0.9);
      next.reagentAddedCount = prev.reagentAddedCount + 1;
      next.carbonateAdded = true;
      break;
    case 'add_zinc':
      labAudio.playFizz(0.65);
      next.zincAdded = true;
      next.reagentAddedCount = prev.reagentAddedCount + 1;
      break;
    case 'add_water_quicklime':
      labAudio.playFizz(0.75);
      next.reagentAddedCount = prev.reagentAddedCount + 1;
      next.tempC = Math.min(68, prev.tempC + 18.5);
      break;
    case 'test_litmus':
      labAudio.playDroplet();
      next.litmusTested = true;
      break;
    case 'test_splinter':
      labAudio.playPopTest();
      next.splinterTested = true;
      next.zincAdded = true;
      break;
    case 'stir_beaker':
      labAudio.playSwirl();
      next.beakerStirred = true;
      break;
    case 'heat_solution':
      labAudio.playFlameIgnite();
      next.solutionHeated = true;
      next.tempC = 65.0;
      break;
    case 'add_salt':
      labAudio.playFizz(0.35);
      next.saltAddedG = prev.saltAddedG + 8;
      break;
    case 'toggle_electrolysis':
      labAudio.playSwitchClack();
      next.electrolysisCurrentOn = Boolean(value);
      break;
    case 'collect_gas':
      labAudio.playFizz(0.5);
      next.gasCollectedMl = Math.min(24, prev.gasCollectedMl + 4);
      break;
    case 'add_indicator':
      labAudio.playDroplet();
      next.pipetteAdded = true;
      next.indicatorAdded = true;
      break;
    case 'set_stopcock':
      next.stopcockOpen = Number(value);
      break;
    case 'add_single_drop':
      labAudio.playDroplet();
      next.titratedMl = Number(Math.min(50, prev.titratedMl + 0.2).toFixed(2));
      break;
    case 'swirl_flask':
      labAudio.playSwirl();
      next.flaskSwirled = prev.flaskSwirled + 1;
      break;
    case 'pour_naoh_neut':
      labAudio.playLiquidPour(0.45);
      next.reagentAddedCount = prev.reagentAddedCount + 1;
      next.tempC = 31.8;
      break;
    case 'add_kno3_endothermic':
      labAudio.playLiquidPour(0.35);
      next.saltAddedG = 5;
      next.tempC = 20.9;
      break;

    // Qualitative Analysis
    case 'toggle_burner':
      if (!prev.burnerLit) {
        labAudio.playFlameIgnite();
        labAudio.setBurnerLoop(true);
        next.burnerLit = true;
      } else {
        labAudio.setBurnerLoop(false);
        next.burnerLit = false;
      }
      break;
    case 'add_primary_qual':
      labAudio.playDroplet();
      if (prev.subMode === 'carbonate') labAudio.playFizz(0.8);
      next.primaryReagentAdded = true;
      next.reagentAddedCount = prev.reagentAddedCount + 1;
      break;
    case 'add_confirm_qual':
      labAudio.playDroplet();
      next.confirmatoryReagentAdded = true;
      if (prev.subMode === 'nitrate') next.brownRingFormed = true;
      if (prev.subMode === 'aldehyde_ketone') next.silverMirrorFormed = true;
      break;
    case 'warm_tube':
      labAudio.playFizz(0.45);
      next.tubeWarmed = true;
      next.flameTestDone = true;
      break;

    // Biology
    case 'place_slide':
      labAudio.playMetallicTick(2100, 0.45);
      next.slidePlaced = true;
      next.stainAdded = true;
      next.coverslipPlaced = true;
      break;
    case 'set_mirror':
      next.mirrorAngle = Number(value);
      break;
    case 'set_objective':
      labAudio.playMetallicTick(3300, 0.65);
      next.objectivePower = Number(value) as 10 | 45 | 100;
      break;
    case 'set_coarse':
      next.coarseFocus = Number(value);
      break;
    case 'set_fine':
      next.fineFocus = Number(value);
      break;
    case 'set_osmosis_time':
      next.osmosisTimeHr = Number(value);
      break;
    case 'test_cobalt':
      labAudio.playMetallicTick(2000, 0.4);
      next.cobaltBlueTested = true;
      break;
    case 'set_chromato':
      next.chromatographyProgress = Number(value);
      break;
    case 'test_spot_well':
      labAudio.playDroplet();
      next.spotTileTested = Math.min(5, prev.spotTileTested + 1);
      break;
    case 'set_joint_angle':
      next.jointAngleDeg = Number(value);
      break;
  }

  Object.assign(next, recomputeElectricalMetrics(next));
  return next;
}
