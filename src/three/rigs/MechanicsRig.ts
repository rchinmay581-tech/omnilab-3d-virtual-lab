import * as THREE from 'three';
import { labAudio } from '../../audio/LabAudioEngine';
import { ExperimentConfig, RigState } from '../../types/lab';
import { addContactShadow, LabMaterials } from '../labEnvironment';
import {
  createBarometerDialTexture,
  createCircularScaleTexture,
  createGraphPaperTexture,
  createRulerTexture,
  createStopwatchDialTexture,
  createVernierMainScaleTexture,
  createVernierSliderTexture,
} from '../proceduralTextures';
import { makeBenchPlaque } from './rigHelpers';
import { DragTarget, LabRig } from './rigTypes';

/**
 * 3D Precision Mechanics Rig (Physics 1-12)
 * Complete 3D equipment parity for every apparatus item:
 * - Vernier Callipers + Magnifier Loupe + Brass Sphere / Beaker
 * - Screw Gauge + Wire / Lamina + Millimeter Graph Paper Sheet
 * - Spherometer + Switchable Flat Glass Plate / Curved Watch Glass & Surface Swap Tray
 * - Beam Balance + Arrest Knob + Standard Weights + Object 1 (45g) & Object 2 (70g)
 * - Parallelogram Law Board + Pulleys + Slotted Weights P, Q, W + Live Vector Lines
 * - Inclined Plane / Limiting Friction + Brass Roller / Block + Extra Normal Weights Tray + Scale Pan
 * - Helical Spring + Millimeter Scale + Slotted 50g Weights Tray + Hanger
 * - Simple Pendulum + Split Cork + Brass Bob + Interactive 3D Digital Stopwatch
 * - Boyle's Law Mercury U-Tube + Mounted Aneroid Barometer Dial (76 cm Hg)
 */
export function createMechanicsRig(
  subMode: string,
  materials: LabMaterials,
  maxAniso: number
): LabRig {
  const group = new THREE.Group();
  const dragTargets: DragTarget[] = [];
  const disposables: { dispose: () => void }[] = [];

  addContactShadow(group, materials.contactShadow, 1.45, 0.002);

  let vernierSliderGroup: THREE.Group | null = null;
  let vernierDepthRod: THREE.Mesh | null = null;
  let screwThimbleGroup: THREE.Group | null = null;
  let screwSpindle: THREE.Mesh | null = null;
  let spherometerScrewGroup: THREE.Group | null = null;
  let spherometerPlate: THREE.Mesh | null = null;
  let spherometerCurvedDome: THREE.Mesh | null = null;
  let balanceBeamGroup: THREE.Group | null = null;
  let leftPanGroup: THREE.Group | null = null;
  let rightPanGroup: THREE.Group | null = null;
  let balancePointer: THREE.Mesh | null = null;
  let balanceObjL: THREE.Mesh | null = null;
  let balanceObj2Bench: THREE.Mesh | null = null;
  let arrestKnob: THREE.Mesh | null = null;
  const balanceWeights: THREE.Mesh[] = [];
  let pendulumPivot: THREE.Group | null = null;
  let pendulumCord: THREE.Mesh | null = null;
  let pendulumBob: THREE.Mesh | null = null;
  let springMesh: THREE.Mesh | null = null;
  let springWeightGroup: THREE.Group | null = null;
  const springDiscs: THREE.Mesh[] = [];
  let inclineGroup: THREE.Group | null = null;
  let inclineRoller: THREE.Group | null = null;
  let frictionBlock: THREE.Group | null = null;
  const extraFrictionWeights: THREE.Mesh[] = [];
  let pulleyPan: THREE.Group | null = null;
  const panWeights: THREE.Mesh[] = [];
  let inclineCordLine: THREE.Line | null = null;
  let mercuryLeft: THREE.Mesh | null = null;
  let mercuryRight: THREE.Mesh | null = null;
  let rightTubeGroup: THREE.Group | null = null;
  let paraKnot: THREE.Mesh | null = null;
  let paraCordLine: THREE.Line | null = null;
  let paraDiagLine: THREE.Line | null = null;
  let weightPMesh: THREE.Mesh | null = null;
  let weightQMesh: THREE.Mesh | null = null;

  let prevPendulumSign = 1;
  let lastTickJaw = -1;
  let lastTickThimble = -1;

  if (subMode === 'vernier_sphere' || subMode === 'vernier_beaker') {
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.95), materials.darkAnodized);
    standBase.position.set(0, 0.04, 0);
    standBase.receiveShadow = true;
    group.add(standBase);

    const calliperRoot = new THREE.Group();
    calliperRoot.position.set(-0.9, 0.58, 0);

    const mainScaleTex = createVernierMainScaleTexture(maxAniso);
    disposables.push(mainScaleTex);
    const beamMat = new THREE.MeshStandardMaterial({
      map: mainScaleTex,
      metalness: 0.72,
      roughness: 0.28,
    });
    disposables.push(beamMat);

    const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.05), beamMat);
    mainBeam.position.set(1.0, 0.1, 0);
    mainBeam.castShadow = true;
    calliperRoot.add(mainBeam);

    const lowerFixedJaw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.05), materials.brushedSteel);
    lowerFixedJaw.position.set(-0.04, -0.22, 0);
    lowerFixedJaw.castShadow = true;
    calliperRoot.add(lowerFixedJaw);

    const upperFixedJaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.045), materials.brushedSteel);
    upperFixedJaw.position.set(-0.02, 0.28, 0);
    calliperRoot.add(upperFixedJaw);

    vernierSliderGroup = new THREE.Group();
    const sliderTex = createVernierSliderTexture(maxAniso);
    disposables.push(sliderTex);
    const sliderMat = new THREE.MeshStandardMaterial({
      map: sliderTex,
      metalness: 0.78,
      roughness: 0.24,
    });
    disposables.push(sliderMat);

    const sliderCarriage = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.075), sliderMat);
    sliderCarriage.position.set(0.21, 0.09, 0.01);
    sliderCarriage.castShadow = true;
    vernierSliderGroup.add(sliderCarriage);

    const lowerMoveJaw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.05), materials.brushedSteel);
    lowerMoveJaw.position.set(0.04, -0.22, 0);
    lowerMoveJaw.castShadow = true;
    vernierSliderGroup.add(lowerMoveJaw);

    const upperMoveJaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.045), materials.brushedSteel);
    upperMoveJaw.position.set(0.02, 0.28, 0);
    vernierSliderGroup.add(upperMoveJaw);

    const lockScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.09, 16), materials.brass);
    lockScrew.position.set(0.22, 0.24, 0.02);
    vernierSliderGroup.add(lockScrew);

    vernierDepthRod = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.025, 0.015), materials.brushedSteel);
    vernierDepthRod.position.set(1.25, 0.1, -0.028);
    vernierSliderGroup.add(vernierDepthRod);

    calliperRoot.add(vernierSliderGroup);
    group.add(calliperRoot);

    if (subMode === 'vernier_sphere') {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.228, 36, 36), materials.brass);
      sphere.position.set(-0.672, 0.36, 0);
      sphere.castShadow = true;
      group.add(sphere);
    } else {
      const beakerPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.24, 0),
        new THREE.Vector2(0.26, 0.03),
        new THREE.Vector2(0.26, 0.56),
        new THREE.Vector2(0.23, 0.56),
        new THREE.Vector2(0.23, 0.04),
        new THREE.Vector2(0, 0.04),
      ];
      const beakerGeo = new THREE.LatheGeometry(beakerPts, 36);
      disposables.push(beakerGeo);
      const beaker = new THREE.Mesh(beakerGeo, materials.borosilicateGlass);
      beaker.position.set(-0.62, 0.08, 0);
      beaker.renderOrder = 2;
      group.add(beaker);
    }

    // Benchtop Magnifier Loupe Prop (click to verify zero error / inspect scale)
    const loupeGroup = new THREE.Group();
    loupeGroup.position.set(1.02, 0.08, 0.24);
    const loupeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.24, 14), materials.darkAnodized);
    loupeHandle.rotation.z = -0.5;
    loupeHandle.position.set(0.08, 0.1, 0);
    const loupeRim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 12, 24), materials.brass);
    loupeRim.position.set(-0.02, 0.24, 0);
    const loupeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.018, 24), materials.borosilicateGlass);
    loupeLens.rotation.x = Math.PI / 2;
    loupeLens.position.set(-0.02, 0.24, 0);
    loupeGroup.add(loupeHandle, loupeRim, loupeLens);
    group.add(loupeGroup);

    group.add(
      makeBenchPlaque(
        'LC 0.01cm',
        subMode === 'vernier_sphere' ? 'Zero Check / Loupe' : 'Internal & Depth',
        '#0284c7',
        [0.98, 0.08, -0.26],
        materials,
        maxAniso,
        disposables,
        0.92
      )
    );

    dragTargets.push({
      mesh: loupeGroup,
      label: 'Magnifier Loupe (click to check zero error at closed jaws)',
      onClick: (_state, onPatch) => {
        labAudio.playMetallicTick(2500, 0.5);
        onPatch({ zeroErrorChecked: true, jawPositionMm: 0 });
      },
    });

    dragTargets.push({
      mesh: vernierSliderGroup,
      label: 'Vernier Sliding Jaw (drag horizontally)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.jawPositionMm + dx * 48, 0, 80);
        if (Math.floor(next) !== lastTickJaw) {
          lastTickJaw = Math.floor(next);
          labAudio.playMetallicTick(2900, 0.45);
        }
        onPatch({ jawPositionMm: Number(next.toFixed(2)) });
      },
    });
  } else if (subMode === 'screw_wire' || subMode === 'screw_lamina') {
    const baseStand = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.95), materials.darkAnodized);
    baseStand.position.set(-0.1, 0.04, 0);
    group.add(baseStand);

    const uShape = new THREE.Shape();
    uShape.moveTo(-0.55, 0.15);
    uShape.quadraticCurveTo(-0.62, -0.45, 0, -0.48);
    uShape.quadraticCurveTo(0.62, -0.45, 0.55, 0.15);
    uShape.lineTo(0.42, 0.15);
    uShape.quadraticCurveTo(0.46, -0.32, 0, -0.35);
    uShape.quadraticCurveTo(-0.46, -0.32, -0.42, 0.15);
    uShape.closePath();

    const frameGeo = new THREE.ExtrudeGeometry(uShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    });
    disposables.push(frameGeo);
    const uFrame = new THREE.Mesh(frameGeo, materials.darkAnodized);
    uFrame.position.set(-0.3, 0.72, -0.06);
    uFrame.castShadow = true;
    group.add(uFrame);

    const anvil = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 24), materials.brushedSteel);
    anvil.rotation.z = Math.PI / 2;
    anvil.position.set(-0.68, 0.88, 0);
    group.add(anvil);

    const sleeveTex = createVernierMainScaleTexture(maxAniso);
    disposables.push(sleeveTex);
    const sleeveMat = new THREE.MeshStandardMaterial({ map: sleeveTex, metalness: 0.7, roughness: 0.3 });
    disposables.push(sleeveMat);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.58, 28), sleeveMat);
    sleeve.rotation.z = -Math.PI / 2;
    sleeve.position.set(0.52, 0.88, 0);
    group.add(sleeve);

    screwSpindle = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.55, 24), materials.brushedSteel);
    screwSpindle.rotation.z = Math.PI / 2;
    screwSpindle.position.set(-0.02, 0.88, 0);
    group.add(screwSpindle);

    screwThimbleGroup = new THREE.Group();
    screwThimbleGroup.position.set(0.65, 0.88, 0);

    const circTex = createCircularScaleTexture(50, '0.01mm', maxAniso);
    disposables.push(circTex);
    const thimbleMat = new THREE.MeshStandardMaterial({ map: circTex, metalness: 0.8, roughness: 0.25 });
    disposables.push(thimbleMat);

    const thimbleDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.42, 32), thimbleMat);
    thimbleDrum.rotation.z = Math.PI / 2;
    thimbleDrum.castShadow = true;
    screwThimbleGroup.add(thimbleDrum);

    const ratchet = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.18, 20), materials.brass);
    ratchet.rotation.z = Math.PI / 2;
    ratchet.position.x = 0.28;
    screwThimbleGroup.add(ratchet);

    group.add(screwThimbleGroup);

    if (subMode === 'screw_wire') {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 16), materials.copper);
      wire.position.set(-0.55, 0.72, 0);
      group.add(wire);
    } else {
      const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.52, 0.42), materials.brass);
      lamina.position.set(-0.55, 0.88, 0);
      group.add(lamina);

      // Millimeter Graph Paper Sheet for Lamina Surface Area (12.5 cm²)
      const graphBoard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), materials.wood);
      graphBoard.position.set(1.32, 0.02, 0.12);
      graphBoard.receiveShadow = true;
      const graphTex = createGraphPaperTexture(maxAniso);
      const graphMat = new THREE.MeshStandardMaterial({ map: graphTex, roughness: 0.65 });
      disposables.push(graphTex, graphMat);
      const graphSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.82), graphMat);
      graphSheet.rotation.x = -Math.PI / 2;
      graphSheet.position.set(1.32, 0.045, 0.12);
      group.add(graphBoard, graphSheet);

      dragTargets.push({
        mesh: graphSheet,
        label: 'Millimeter Graph Sheet (click to trace lamina area 12.5 cm²)',
        onClick: (_state, onPatch) => {
          labAudio.playMetallicTick(2500, 0.45);
          onPatch({ zeroErrorChecked: true });
        },
      });
    }

    dragTargets.push({
      mesh: screwThimbleGroup,
      label: 'Screw Gauge Thimble & Ratchet (drag to rotate)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.thimbleRotation + dx * 320, 0, 600);
        if (Math.floor(next / 10) !== lastTickThimble) {
          lastTickThimble = Math.floor(next / 10);
          labAudio.playMetallicTick(3400, 0.5);
        }
        onPatch({ thimbleRotation: Math.round(next) });
      },
    });
  } else if (subMode === 'spherometer') {
    spherometerPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 48), materials.borosilicateGlass);
    spherometerPlate.position.set(0, 0.04, 0);
    group.add(spherometerPlate);

    const domeGeo = new THREE.SphereGeometry(1.15, 36, 18, 0, Math.PI * 2, 0, 0.65);
    disposables.push(domeGeo);
    spherometerCurvedDome = new THREE.Mesh(domeGeo, materials.borosilicateGlass);
    spherometerCurvedDome.position.set(0, -0.88, 0);
    spherometerCurvedDome.visible = false;
    group.add(spherometerCurvedDome);

    const frame = new THREE.Group();
    frame.position.set(0, 0.34, 0);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 24), materials.brass);
    frame.add(hub);

    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.06), materials.brass);
      arm.position.set(Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27);
      arm.rotation.y = -a;
      frame.add(arm);

      const leg = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 16), materials.brushedSteel);
      leg.rotation.x = Math.PI;
      leg.position.set(Math.cos(a) * 0.52, -0.15, Math.sin(a) * 0.52);
      frame.add(leg);
    }
    group.add(frame);

    spherometerScrewGroup = new THREE.Group();
    spherometerScrewGroup.position.set(0, 0.55, 0);
    const dialTex = createCircularScaleTexture(100, '0.01mm', maxAniso);
    disposables.push(dialTex);
    const discMat = new THREE.MeshStandardMaterial({ map: dialTex, metalness: 0.75, roughness: 0.25 });
    disposables.push(discMat);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 48), discMat);
    spherometerScrewGroup.add(disc);
    const centralScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.65, 16), materials.brushedSteel);
    centralScrew.position.y = -0.18;
    spherometerScrewGroup.add(centralScrew);
    group.add(spherometerScrewGroup);

    // Side Surface Swap Tray (Flat Plate <-> Curved Watch Glass)
    const swapTray = new THREE.Group();
    swapTray.position.set(1.32, 0.02, 0.15);
    const trayBase = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.54), materials.darkAnodized);
    const spareLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.03, 28),
      materials.borosilicateGlass
    );
    spareLens.position.y = 0.04;
    swapTray.add(trayBase, spareLens);
    group.add(swapTray);
    group.add(
      makeBenchPlaque('SURFACE', 'Click to Swap Plate', '#0284c7', [1.32, 0.04, -0.22], materials, maxAniso, disposables, 0.92)
    );

    const togglePlate = (state: RigState, onPatch: (patch: Partial<RigState>) => void) => {
      labAudio.playMetallicTick(2000, 0.5);
      onPatch({ plateMode: state.plateMode === 'flat' ? 'curved' : 'flat' });
    };

    dragTargets.push({
      mesh: swapTray,
      label: 'Surface Plate Tray (click to switch Flat Plate / Curved Watch Glass)',
      onClick: togglePlate,
    });

    dragTargets.push({
      mesh: spherometerScrewGroup,
      label: 'Spherometer Central Screw Disc (drag to turn)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.spherometerHeightMm + dx * 6, -2, 8);
        if (Math.floor(next * 5) !== lastTickThimble) {
          lastTickThimble = Math.floor(next * 5);
          labAudio.playMetallicTick(3100, 0.45);
        }
        onPatch({ spherometerHeightMm: Number(next.toFixed(2)) });
      },
    });
  } else if (subMode === 'beam_balance') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.85), materials.wood);
    base.position.set(-0.15, 0.05, 0);
    base.receiveShadow = true;
    group.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.35, 24), materials.brass);
    pillar.position.set(-0.15, 0.75, 0);
    pillar.castShadow = true;
    group.add(pillar);

    // Front Beam Arrest Knob on base pillar
    arrestKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 18), materials.brass);
    arrestKnob.rotation.x = Math.PI / 2;
    arrestKnob.position.set(-0.15, 0.18, 0.14);
    group.add(arrestKnob);

    balanceBeamGroup = new THREE.Group();
    balanceBeamGroup.position.set(-0.15, 1.42, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 0.05), materials.brass);
    beam.castShadow = true;
    balanceBeamGroup.add(beam);

    balancePointer = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.82, 12), materials.brushedSteel);
    balancePointer.rotation.x = Math.PI;
    balancePointer.position.set(0, -0.42, 0.04);
    balanceBeamGroup.add(balancePointer);

    leftPanGroup = new THREE.Group();
    leftPanGroup.position.set(-0.82, -0.78, 0);
    const panMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.04, 28), materials.brass);
    leftPanGroup.add(panMeshL);
    balanceObjL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 20), materials.copper);
    balanceObjL.position.y = 0.1;
    leftPanGroup.add(balanceObjL);
    balanceBeamGroup.add(leftPanGroup);

    rightPanGroup = new THREE.Group();
    rightPanGroup.position.set(0.82, -0.78, 0);
    const panMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.04, 28), materials.brass);
    rightPanGroup.add(panMeshR);
    for (let i = 0; i < 7; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 18), materials.brushedSteel);
      w.position.set(((i % 2) - 0.5) * 0.12, 0.04 + Math.floor(i / 2) * 0.042, 0);
      balanceWeights.push(w);
      rightPanGroup.add(w);
    }
    balanceBeamGroup.add(rightPanGroup);

    group.add(balanceBeamGroup);

    // Object 2 (70 g Metal Cylinder) on bench tray beside balance
    const objTray = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 22), materials.darkAnodized);
    objTray.position.set(1.18, 0.015, 0.18);
    group.add(objTray);
    balanceObj2Bench = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.21, 20), materials.brushedSteel);
    balanceObj2Bench.position.set(1.18, 0.135, 0.18);
    balanceObj2Bench.castShadow = true;
    group.add(balanceObj2Bench);
    group.add(makeBenchPlaque('OBJ 1 & 2', '45g / 70g Swap', '#d97706', [1.18, 0.04, -0.18], materials, maxAniso, disposables, 0.9));

    dragTargets.push({
      mesh: arrestKnob,
      label: 'Beam Arrest Knob (click to lock/release beam)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2200, 0.5);
        onPatch({ beamArrestReleased: !state.beamArrestReleased });
      },
    });

    dragTargets.push({
      mesh: balanceObj2Bench,
      label: 'Object 2 Cylinder 70g (click to swap Object 1 / Object 2 on left pan)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2400, 0.5);
        onPatch({ leftMassG: state.leftMassG === 45 ? 70 : 45 });
      },
    });

    dragTargets.push({
      mesh: rightPanGroup,
      label: 'Right Pan Standard Weights (click to add +5g)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2200, 0.55);
        onPatch({ rightMassG: state.rightMassG >= 100 ? 10 : state.rightMassG + 5 });
      },
    });
  } else if (subMode === 'pendulum') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.55), materials.darkAnodized);
    base.position.set(-0.4, 0.03, 0);
    group.add(base);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.2, 16), materials.brushedSteel);
    rod.position.set(-0.4, 1.12, 0);
    group.add(rod);

    const clampArm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.06), materials.brass);
    clampArm.position.set(-0.12, 2.1, 0);
    group.add(clampArm);

    // Split Cork Halves holding suspension thread
    for (const cz of [-0.022, 0.022]) {
      const cork = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.032), materials.wood);
      cork.position.set(0.16, 2.09, cz);
      group.add(cork);
    }

    pendulumPivot = new THREE.Group();
    pendulumPivot.position.set(0.16, 2.08, 0);

    pendulumCord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 10), materials.ceramicWhite);
    pendulumCord.position.y = -0.7;
    pendulumPivot.add(pendulumCord);

    pendulumBob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 28, 28), materials.brass);
    pendulumBob.position.y = -1.4;
    pendulumBob.castShadow = true;
    pendulumPivot.add(pendulumBob);

    group.add(pendulumPivot);

    // 3D Digital Stopwatch on bench
    const swGroup = new THREE.Group();
    swGroup.position.set(0.75, 0.04, 0.25);
    const swBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.34), materials.darkAnodized);
    const swTex = createStopwatchDialTexture('PENDULUM', '20 OSC', maxAniso);
    const swMat = new THREE.MeshStandardMaterial({ map: swTex, roughness: 0.35 });
    disposables.push(swTex, swMat);
    const swFace = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), swMat);
    swFace.rotation.x = -Math.PI / 2;
    swFace.position.y = 0.042;
    swGroup.add(swBody, swFace);
    group.add(swGroup);

    dragTargets.push({
      mesh: swGroup,
      label: 'Digital Stopwatch (click to start/stop oscillation)',
      onClick: (state, onPatch) => {
        labAudio.playPendulumWhoosh();
        onPatch({ pendulumRunning: !state.pendulumRunning });
      },
    });

    dragTargets.push({
      mesh: pendulumBob,
      label: 'Pendulum Bob (drag sideways to displace & release)',
      onDrag: (dx, _dy, _state, onPatch) => {
        const ang = THREE.MathUtils.clamp(dx * 45, -14, 14);
        onPatch({ pendulumAngleDeg: Number(ang.toFixed(1)), pendulumRunning: true });
      },
    });
  } else if (subMode === 'spring') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.65), materials.darkAnodized);
    base.position.set(0, 0.03, 0);
    group.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 16), materials.brushedSteel);
    pole.position.set(-0.32, 1.08, 0);
    group.add(pole);

    const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.06), materials.brass);
    topArm.position.set(-0.08, 2.05, 0);
    group.add(topArm);

    const rulerTex = createRulerTexture(60, maxAniso);
    disposables.push(rulerTex);
    const rulerMat = new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.4 });
    disposables.push(rulerMat);
    const scaleBoard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.02), rulerMat);
    scaleBoard.position.set(0.32, 1.05, -0.04);
    group.add(scaleBoard);

    const helixPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      const a = t * Math.PI * 2 * 10;
      helixPts.push(new THREE.Vector3(Math.cos(a) * 0.08, -t * 0.9, Math.sin(a) * 0.08));
    }
    const helixCurve = new THREE.CatmullRomCurve3(helixPts);
    const springGeo = new THREE.TubeGeometry(helixCurve, 120, 0.013, 8, false);
    disposables.push(springGeo);
    springMesh = new THREE.Mesh(springGeo, materials.brushedSteel);
    springMesh.position.set(0.08, 2.02, 0);
    group.add(springMesh);

    springWeightGroup = new THREE.Group();
    springWeightGroup.position.set(0.08, 1.08, 0);
    const hangerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 12), materials.brushedSteel);
    hangerStem.position.y = -0.08;
    const hangerPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 24), materials.brass);
    hangerPlate.position.y = -0.18;
    springWeightGroup.add(hangerStem, hangerPlate);

    for (let i = 0; i < 6; i++) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.032, 24), materials.brass);
      disc.position.y = -0.15 + i * 0.035;
      disc.visible = false;
      springDiscs.push(disc);
      springWeightGroup.add(disc);
    }

    const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.015), materials.copper);
    pointer.position.set(0.12, 0.02, 0);
    springWeightGroup.add(pointer);
    group.add(springWeightGroup);

    // Spare 50 g Slotted Weights Tray beside base
    const spareTray = new THREE.Group();
    spareTray.position.set(-0.78, 0.02, 0.22);
    const trayDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 20), materials.darkAnodized);
    spareTray.add(trayDisk);
    for (let i = 0; i < 3; i++) {
      const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16), materials.brass);
      sw.position.set(0, 0.03 + i * 0.032, 0);
      spareTray.add(sw);
    }
    group.add(spareTray);

    dragTargets.push({
      mesh: spareTray,
      label: 'Spare 50g Slotted Weights (click to load +50g)',
      onClick: (state, onPatch) => {
        labAudio.playSpringBoing();
        onPatch({ springLoadG: state.springLoadG >= 300 ? 0 : state.springLoadG + 50 });
      },
    });

    dragTargets.push({
      mesh: springWeightGroup,
      label: 'Slotted Mass Hanger (click to add +50g)',
      onClick: (state, onPatch) => {
        labAudio.playSpringBoing();
        onPatch({ springLoadG: state.springLoadG >= 300 ? 50 : state.springLoadG + 50 });
      },
    });
  } else if (subMode === 'inclined_plane' || subMode === 'friction') {
    const baseBoard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.8), materials.wood);
    baseBoard.position.set(0, 0.04, 0);
    group.add(baseBoard);

    inclineGroup = new THREE.Group();
    inclineGroup.position.set(-0.85, 0.1, 0);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.58), materials.wood);
    plank.position.set(0.87, 0, 0);
    plank.castShadow = true;
    inclineGroup.add(plank);

    const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 24), materials.brass);
    pulley.rotation.x = Math.PI / 2;
    pulley.position.set(1.78, 0.08, 0);
    inclineGroup.add(pulley);

    if (subMode === 'inclined_plane') {
      inclineRoller = new THREE.Group();
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 28), materials.brass);
      cyl.rotation.x = Math.PI / 2;
      inclineRoller.add(cyl);
      inclineRoller.position.set(0.8, 0.14, 0);
      inclineGroup.add(inclineRoller);
    } else {
      frictionBlock = new THREE.Group();
      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.28), materials.darkAnodized);
      frictionBlock.add(blk);
      for (let i = 0; i < 4; i++) {
        const ew = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 18), materials.brass);
        ew.position.set(0, 0.1 + i * 0.042, 0);
        ew.visible = false;
        extraFrictionWeights.push(ew);
        frictionBlock.add(ew);
      }
      frictionBlock.position.set(0.75, 0.11, 0);
      inclineGroup.add(frictionBlock);

      // Spare Normal Weights Tray on bench
      const wtTray = new THREE.Group();
      wtTray.position.set(-1.3, 0.02, 0.25);
      const tPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 18), materials.darkAnodized);
      const tWt = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16), materials.brass);
      tWt.position.y = 0.04;
      wtTray.add(tPlate, tWt);
      group.add(wtTray);

      const addBlockMass = (state: RigState, onPatch: (patch: Partial<RigState>) => void) => {
        labAudio.playMetallicTick(2000, 0.45);
        const next = state.extraNormalMassG >= 160 ? 0 : state.extraNormalMassG + 40;
        onPatch({ extraNormalMassG: next });
      };

      dragTargets.push({
        mesh: frictionBlock,
        label: 'Wooden Block (click to add +40g normal load)',
        onClick: addBlockMass,
      });
      dragTargets.push({
        mesh: wtTray,
        label: 'Extra Normal Weights Tray (click to place +40g on block)',
        onClick: addBlockMass,
      });
    }

    group.add(inclineGroup);

    pulleyPan = new THREE.Group();
    pulleyPan.position.set(1.05, 0.48, 0);
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.04, 24), materials.brass);
    pulleyPan.add(pan);
    for (let i = 0; i < 6; i++) {
      const pw = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.032, 18), materials.brushedSteel);
      pw.position.y = 0.036 + i * 0.034;
      pw.visible = false;
      panWeights.push(pw);
      pulleyPan.add(pw);
    }
    group.add(pulleyPan);

    const cordGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.1, 0.25, 0),
      new THREE.Vector3(0.93, 0.25, 0),
      new THREE.Vector3(1.05, 0.48, 0),
    ]);
    const cordMat = new THREE.LineBasicMaterial({ color: 0xe2e8f0 });
    disposables.push(cordGeo, cordMat);
    inclineCordLine = new THREE.Line(cordGeo, cordMat);
    group.add(inclineCordLine);

    dragTargets.push({
      mesh: pulleyPan,
      label: 'Scale Pan (click to add weights)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2400, 0.5);
        onPatch({ panMassG: state.panMassG >= 140 ? 15 : state.panMassG + 15 });
      },
    });
  } else if (subMode === 'boyles') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 0.08), materials.wood);
    board.position.set(0, 1.05, -0.1);
    group.add(board);

    const rulerTex = createRulerTexture(100, maxAniso);
    disposables.push(rulerTex);
    const scaleMat = new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.4 });
    disposables.push(scaleMat);
    const scaleMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.9), scaleMat);
    scaleMesh.position.set(0, 1.05, -0.055);
    group.add(scaleMesh);

    // Mounted Aneroid Barometer Dial (H = 76 cm Hg)
    const baroTex = createBarometerDialTexture(maxAniso);
    const baroMat = new THREE.MeshStandardMaterial({ map: baroTex, roughness: 0.35 });
    disposables.push(baroTex, baroMat);
    const baroBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 28), materials.brass);
    baroBezel.rotation.x = Math.PI / 2;
    baroBezel.position.set(0.42, 1.82, -0.05);
    const baroFace = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), baroMat);
    baroFace.position.set(0.42, 1.82, -0.026);
    group.add(baroBezel, baroFace);

    const tubeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 20);
    disposables.push(tubeGeo);
    const leftTube = new THREE.Mesh(tubeGeo, materials.borosilicateGlass);
    leftTube.position.set(-0.24, 1.05, 0.05);
    group.add(leftTube);

    const uBendCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, 0.28, 0.05),
      new THREE.Vector3(-0.14, 0.14, 0.05),
      new THREE.Vector3(0.14, 0.14, 0.05),
      new THREE.Vector3(0.24, 0.28, 0.05),
    ]);
    const uBendGeo = new THREE.TubeGeometry(uBendCurve, 20, 0.032, 12, false);
    disposables.push(uBendGeo);
    const uBend = new THREE.Mesh(uBendGeo, materials.rubberBlack);
    group.add(uBend);

    const hgMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.96, roughness: 0.08 });
    disposables.push(hgMat);
    mercuryLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 18), hgMat);
    mercuryLeft.position.set(-0.24, 0.65, 0.05);
    group.add(mercuryLeft);

    rightTubeGroup = new THREE.Group();
    rightTubeGroup.position.set(0.24, 1.05, 0.05);
    const rightTube = new THREE.Mesh(tubeGeo, materials.borosilicateGlass);
    rightTubeGroup.add(rightTube);
    mercuryRight = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 18), hgMat);
    mercuryRight.position.y = -0.4;
    rightTubeGroup.add(mercuryRight);
    group.add(rightTubeGroup);

    dragTargets.push({
      mesh: rightTubeGroup,
      label: 'Open Mercury Reservoir (drag vertically)',
      onDrag: (_dx, dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.boylePressureOffsetCm - dy * 45, -25, 35);
        onPatch({ boylePressureOffsetCm: Number(next.toFixed(1)) });
      },
    });
  } else {
    // Parallelogram Law of Forces Board
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.7, 0.07), materials.wood);
    board.position.set(0, 1.05, -0.08);
    group.add(board);

    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.4), materials.ceramicWhite);
    paper.position.set(0, 1.05, -0.04);
    group.add(paper);

    for (const px of [-0.88, 0.88]) {
      const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 24), materials.brass);
      pulley.rotation.x = Math.PI / 2;
      pulley.position.set(px, 1.75, 0.02);
      group.add(pulley);
    }

    paraKnot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 18), materials.copper);
    paraKnot.position.set(0, 1.15, 0.04);
    group.add(paraKnot);

    const weightW = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 20), materials.brass);
    weightW.position.set(0, 0.6, 0.04);
    group.add(weightW);

    weightPMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 20), materials.brass);
    weightPMesh.position.set(-0.96, 1.15, 0.04);
    group.add(weightPMesh);

    weightQMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 20), materials.brass);
    weightQMesh.position.set(0.96, 1.15, 0.04);
    group.add(weightQMesh);

    const cordGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.96, 1.15, 0.04),
      new THREE.Vector3(-0.88, 1.75, 0.04),
      new THREE.Vector3(0, 1.15, 0.04),
      new THREE.Vector3(0.88, 1.75, 0.04),
      new THREE.Vector3(0.96, 1.15, 0.04),
      new THREE.Vector3(0, 1.15, 0.04),
      new THREE.Vector3(0, 0.6, 0.04),
    ]);
    const cordMat = new THREE.LineBasicMaterial({ color: 0x0f172a });
    disposables.push(cordGeo, cordMat);
    paraCordLine = new THREE.Line(cordGeo, cordMat);
    group.add(paraCordLine);

    // Drawn Parallelogram Vector Overlay on White Paper (visible when vectors marked)
    const diagGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.15, -0.035),
      new THREE.Vector3(-0.35, 1.4, -0.035),
      new THREE.Vector3(0, 1.65, -0.035),
      new THREE.Vector3(0.35, 1.4, -0.035),
      new THREE.Vector3(0, 1.15, -0.035),
      new THREE.Vector3(0, 1.65, -0.035),
    ]);
    const diagMat = new THREE.LineBasicMaterial({ color: 0xdc2626 });
    disposables.push(diagGeo, diagMat);
    paraDiagLine = new THREE.Line(diagGeo, diagMat);
    paraDiagLine.visible = false;
    group.add(paraDiagLine);

    dragTargets.push({
      mesh: weightPMesh,
      label: 'Left Slotted Weight P (click to cycle 50-250g)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2100, 0.45);
        onPatch({ weightP: state.weightP >= 250 ? 50 : state.weightP + 25 });
      },
    });
    dragTargets.push({
      mesh: weightQMesh,
      label: 'Right Slotted Weight Q (click to cycle 50-250g)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2100, 0.45);
        onPatch({ weightQ: state.weightQ >= 250 ? 50 : state.weightQ + 25 });
      },
    });
    dragTargets.push({
      mesh: paper,
      label: 'Drawing Paper (click to trace parallelogram vectors)',
      onClick: (_state, onPatch) => {
        labAudio.playMetallicTick(2500, 0.4);
        onPatch({ zeroErrorChecked: true });
      },
    });
    dragTargets.push({
      mesh: paraKnot,
      label: 'Central Force Knot (click to set 150g / 150g equilibrium)',
      onClick: (_state, onPatch) => {
        labAudio.playMetallicTick(2500, 0.4);
        onPatch({ weightP: 150, weightQ: 150 });
      },
    });
  }

  return {
    group,
    dragTargets,
    update: (dt: number, state: RigState, _exp: ExperimentConfig) => {
      if (vernierSliderGroup) {
        const targetX = (state.jawPositionMm / 100) * 1.45;
        vernierSliderGroup.position.x = THREE.MathUtils.damp(vernierSliderGroup.position.x, targetX, 14, dt);
      }
      if (screwThimbleGroup && screwSpindle) {
        const mm = state.thimbleRotation * 0.01;
        const targetX = 0.45 + mm * 0.08;
        screwThimbleGroup.position.x = THREE.MathUtils.damp(screwThimbleGroup.position.x, targetX, 14, dt);
        screwThimbleGroup.rotation.x = (state.thimbleRotation / 50) * Math.PI * 2;
        screwSpindle.position.x = THREE.MathUtils.damp(screwSpindle.position.x, -0.15 + mm * 0.08, 14, dt);
      }
      if (spherometerScrewGroup && spherometerPlate && spherometerCurvedDome) {
        const isCurved = state.plateMode === 'curved';
        spherometerPlate.visible = !isCurved;
        spherometerCurvedDome.visible = isCurved;
        spherometerScrewGroup.position.y = THREE.MathUtils.damp(
          spherometerScrewGroup.position.y,
          0.48 + state.spherometerHeightMm * 0.03,
          12,
          dt
        );
        spherometerScrewGroup.rotation.y = state.spherometerHeightMm * Math.PI * 2;
      }
      if (balanceBeamGroup && leftPanGroup && rightPanGroup) {
        const diff = state.rightMassG - state.leftMassG + state.balancingScrewOffset;
        const targetTilt = state.beamArrestReleased ? THREE.MathUtils.clamp(-diff * 0.008, -0.18, 0.18) : 0;
        balanceBeamGroup.rotation.z = THREE.MathUtils.damp(balanceBeamGroup.rotation.z, targetTilt, 8, dt);
        leftPanGroup.rotation.z = -balanceBeamGroup.rotation.z;
        rightPanGroup.rotation.z = -balanceBeamGroup.rotation.z;

        const wCount = Math.min(7, Math.max(1, Math.round(state.rightMassG / 10)));
        balanceWeights.forEach((w, idx) => {
          w.visible = idx < wCount;
        });

        if (balanceObjL && balanceObj2Bench) {
          const isObj2 = state.leftMassG >= 60;
          balanceObjL.material = isObj2 ? materials.brushedSteel : materials.copper;
          balanceObjL.scale.y = isObj2 ? 1.3 : 1.0;
          balanceObj2Bench.visible = !isObj2;
        }
        if (arrestKnob) {
          arrestKnob.position.z = state.beamArrestReleased ? 0.17 : 0.13;
        }
      }
      if (pendulumPivot && pendulumCord && pendulumBob) {
        const lenM = state.pendulumLengthCm / 100;
        const visualLen = THREE.MathUtils.clamp(lenM * 1.1, 0.65, 1.75);
        pendulumCord.scale.y = visualLen / 1.4;
        pendulumCord.position.y = -visualLen / 2;
        pendulumBob.position.y = -visualLen;

        if (state.pendulumRunning) {
          const omega = Math.sqrt(9.81 / Math.max(0.3, lenM));
          const amp = THREE.MathUtils.degToRad(Math.max(5, Math.abs(state.pendulumAngleDeg)));
          const angle = amp * Math.cos(omega * state.elapsedTime * 1.4);
          pendulumPivot.rotation.z = angle;
          const sign = Math.sign(angle);
          if (sign !== 0 && sign !== prevPendulumSign) {
            prevPendulumSign = sign;
            if (Math.random() < 0.35) labAudio.playPendulumWhoosh();
          }
        } else {
          pendulumPivot.rotation.z = THREE.MathUtils.degToRad(state.pendulumAngleDeg);
        }
      }
      if (springMesh && springWeightGroup) {
        const ext = (state.springLoadG / 300) * 0.45;
        const vib = Math.sin(state.elapsedTime * 9) * 0.015;
        const sy = 1 + ext + vib;
        springMesh.scale.y = THREE.MathUtils.damp(springMesh.scale.y, sy, 10, dt);
        springWeightGroup.position.y = 2.02 - 0.9 * springMesh.scale.y;

        const discCount = Math.round(state.springLoadG / 50);
        springDiscs.forEach((d, idx) => {
          d.visible = idx < discCount;
        });
      }
      if (inclineGroup) {
        const rad = THREE.MathUtils.degToRad(state.subMode === 'friction' ? 0 : state.angleDeg);
        inclineGroup.rotation.z = THREE.MathUtils.damp(inclineGroup.rotation.z, rad, 10, dt);
        let localX = 0.75;
        if (inclineRoller) {
          const forceNet = state.panMassG - 100 * Math.sin(rad);
          const posX = THREE.MathUtils.clamp(0.8 + forceNet * 0.008, 0.25, 1.45);
          inclineRoller.position.x = THREE.MathUtils.damp(inclineRoller.position.x, posX, 5, dt);
          localX = inclineRoller.position.x;
        }
        if (frictionBlock) {
          const limit = 0.38 * (120 + state.extraNormalMassG);
          const slide = state.panMassG > limit ? 1.35 : 0.72;
          frictionBlock.position.x = THREE.MathUtils.damp(frictionBlock.position.x, slide, 5, dt);
          localX = frictionBlock.position.x;

          const extraCount = Math.round(state.extraNormalMassG / 40);
          extraFrictionWeights.forEach((ew, idx) => {
            ew.visible = idx < extraCount;
          });
        }

        const panCount = Math.min(6, Math.max(1, Math.round(state.panMassG / 22)));
        panWeights.forEach((pw, idx) => {
          pw.visible = idx < panCount;
        });

        if (pulleyPan && inclineCordLine) {
          const pWorldX = -0.85 + Math.cos(inclineGroup.rotation.z) * 1.78;
          const pWorldY = 0.1 + Math.sin(inclineGroup.rotation.z) * 1.78 + 0.08;
          const bWorldX = -0.85 + Math.cos(inclineGroup.rotation.z) * localX;
          const bWorldY = 0.1 + Math.sin(inclineGroup.rotation.z) * localX + 0.14;
          pulleyPan.position.set(pWorldX + 0.1, Math.max(0.25, pWorldY - 0.5), 0);

          const pos = inclineCordLine.geometry.attributes.position as THREE.BufferAttribute;
          pos.setXYZ(0, bWorldX, bWorldY, 0);
          pos.setXYZ(1, pWorldX, pWorldY, 0);
          pos.setXYZ(2, pulleyPan.position.x, pulleyPan.position.y, 0);
          pos.needsUpdate = true;
        }
      }
      if (rightTubeGroup && mercuryLeft && mercuryRight) {
        const offset = state.boylePressureOffsetCm * 0.015;
        rightTubeGroup.position.y = THREE.MathUtils.damp(rightTubeGroup.position.y, 1.05 + offset, 10, dt);
        mercuryLeft.scale.y = THREE.MathUtils.damp(mercuryLeft.scale.y, 1 + offset * 0.45, 10, dt);
      }
      if (paraKnot && weightPMesh && weightQMesh && paraCordLine) {
        const shift = (state.weightQ - state.weightP) * 0.003;
        paraKnot.position.x = THREE.MathUtils.damp(paraKnot.position.x, shift, 8, dt);
        weightPMesh.scale.y = 0.7 + (state.weightP / 200) * 0.8;
        weightQMesh.scale.y = 0.7 + (state.weightQ / 200) * 0.8;

        const pos = paraCordLine.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(2, paraKnot.position.x, paraKnot.position.y, 0.04);
        pos.setXYZ(5, paraKnot.position.x, paraKnot.position.y, 0.04);
        pos.setXYZ(6, paraKnot.position.x, 0.6, 0.04);
        pos.needsUpdate = true;

        if (paraDiagLine) {
          paraDiagLine.visible = state.zeroErrorChecked;
        }
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
