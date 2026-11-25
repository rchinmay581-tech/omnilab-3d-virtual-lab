import * as THREE from 'three';
import { labAudio } from '../../audio/LabAudioEngine';
import { ExperimentConfig, RigState } from '../../types/lab';
import { addContactShadow, LabMaterials } from '../labEnvironment';
import {
  createBuretteScaleTexture,
  createPhChartTexture,
  createSpottingTileTexture,
  createStopwatchDialTexture,
} from '../proceduralTextures';
import { makeBenchPlaque, makeLabeledBottle, makeSolidJar } from './rigHelpers';
import { DragTarget, LabRig } from './rigTypes';

const _dummy = new THREE.Object3D();
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

/**
 * 3D Wet Chemistry & Titration Rig (Chemistry 1-15, 28-30)
 * Every apparatus listed in `apparatusList` and `steps` is modeled, clearly labeled,
 * clickable in 3D, and animated in lockstep with the Bottom Control Dock.
 */
export function createWetChemistryRig(
  subMode: string,
  materials: LabMaterials,
  maxAniso: number
): LabRig {
  const group = new THREE.Group();
  const dragTargets: DragTarget[] = [];
  const disposables: { dispose: () => void }[] = [];

  addContactShadow(group, materials.contactShadow, 1.6, 0.002);

  // State change trackers (animate identically for 3D clicks AND Dock actions)
  let prevReagentCount = 0;
  let prevLitmusTested = false;
  let prevSplinterTested = false;
  let prevBeakerStirred = false;
  let prevFlaskSwirled = 0;
  let prevSaltAddedG = 0;
  let prevIndicatorAdded = false;
  let prevPipetteAdded = false;
  let prevTitratedMl = 0;
  let prevZincAdded = false;
  let prevCarbonateAdded = false;

  let phPipetteAnim = 0;
  let phTargetWellIdx = 0;
  let phStripDipAnim = 0;
  let bottlePourAnim = 0;
  let bottle2PourAnim = 0;
  let pipetteAnim = 0;
  let solidPourAnim = 0;
  let stirAnim = 0;
  let swirlAnim = 0;
  let litmusDipAnim = 0;
  let splinterAnim = 0;
  let singleDropAnim = 0;
  let kineticsStartTime: number | null = null;

  // Titration refs
  let stopcockGroup: THREE.Group | null = null;
  let buretteLiquid: THREE.Mesh | null = null;
  let flaskGroup: THREE.Group | null = null;
  let flaskLiquidMat: THREE.MeshStandardMaterial | null = null;
  let flaskLiquidMesh: THREE.Mesh | null = null;
  let dropletMesh: THREE.Mesh | null = null;
  let dropperGroup: THREE.Group | null = null;
  let titrationPipetteGroup: THREE.Group | null = null;
  let heaterRingMat: THREE.MeshStandardMaterial | null = null;
  let dropletY = 0.88;
  let dropAccum = 0;

  // Electrolysis refs
  let bubbleInstanced: THREE.InstancedMesh | null = null;
  let cathodeGasCol: THREE.Mesh | null = null;
  let anodeGasCol: THREE.Mesh | null = null;
  let bubblePhases: Float32Array | null = null;

  // ph_tile refs
  const phWellDrops: THREE.Mesh[] = [];
  const phStripTipMats: THREE.MeshStandardMaterial[] = [];
  let phStripsGroup: THREE.Group | null = null;
  let phPipetteGroup: THREE.Group | null = null;
  let phFallingDrop: THREE.Mesh | null = null;
  const wellCoords: [number, number][] = [
    [-0.44, -0.18],
    [-0.08, -0.18],
    [0.28, -0.18],
    [-0.44, 0.2],
    [-0.08, 0.2],
    [0.28, 0.2],
  ];

  // Thermal decomposition boiling tube refs
  let decompCrystalMat: THREE.MeshStandardMaterial | null = null;
  let decompCrystalMesh: THREE.Mesh | null = null;
  let decompFlameMat: THREE.ShaderMaterial | null = null;
  let decompFlameCone: THREE.Mesh | null = null;
  let decompFlameLight: THREE.PointLight | null = null;
  let decompFumes: THREE.InstancedMesh | null = null;
  let decompFumePhases: Float32Array | null = null;
  let feso4Jar: THREE.Group | null = null;

  // Displacement / Reactivity tube rack refs
  const rackTubeFluids: THREE.MeshStandardMaterial[] = [];
  let immersedNailGroup: THREE.Group | null = null;
  let immersedNailMat: THREE.MeshStandardMaterial | null = null;
  let trayNailsGroup: THREE.Group | null = null;
  const metalStripGroup: THREE.Group[] = [];

  // General beaker / kinetics / calorimeter refs
  let thermometerCol: THREE.Mesh | null = null;
  let crossMark: THREE.Mesh | null = null;
  let beakerFluidMat: THREE.MeshStandardMaterial | null = null;
  let precipitateDisk: THREE.Mesh | null = null;
  let zincGranulesGroup: THREE.Group | null = null;
  let stirRodGroup: THREE.Group | null = null;
  let beakerLitmusStrip: THREE.Mesh | null = null;
  let beakerLitmusMat: THREE.MeshStandardMaterial | null = null;
  let beakerDropStream: THREE.Mesh | null = null;
  let splinterGroup: THREE.Group | null = null;
  let popFlashLight: THREE.PointLight | null = null;
  let beakerBubbles: THREE.InstancedMesh | null = null;
  let beakerBubblePhases: Float32Array | null = null;
  let sideBottle2: THREE.Group | null = null;
  let zincJar: THREE.Group | null = null;
  let carbonateJar: THREE.Group | null = null;
  let solidJarMain: THREE.Group | null = null;

  const isTitration = subMode.startsWith('titration');

  if (isTitration) {
    const isKmno4 = subMode.includes('kmno4');
    const isHotOxalic = subMode === 'titration_kmno4_oxalic';

    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 0.95), materials.ceramicWhite);
    tile.position.set(0.1, 0.015, 0);
    tile.receiveShadow = true;
    group.add(tile);

    heaterRingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0xea580c,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    disposables.push(heaterRingMat);
    const heaterRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 12, 28), heaterRingMat);
    heaterRing.rotation.x = Math.PI / 2;
    heaterRing.position.set(0.1, 0.034, 0.05);
    group.add(heaterRing);

    if (isHotOxalic) {
      const heaterKnob = new THREE.Group();
      heaterKnob.position.set(0.5, 0.04, 0.35);
      const knobBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 16), materials.darkAnodized);
      const knobDial = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 16), materials.copper);
      knobDial.position.y = 0.03;
      heaterKnob.add(knobBase, knobDial);
      group.add(heaterKnob);
      dragTargets.push({
        mesh: heaterKnob,
        label: 'Heater Regulator (click to heat oxalic acid to 65 °C)',
        onClick: (_state, onPatch) => {
          labAudio.playFlameIgnite();
          onPatch({ solutionHeated: true, tempC: 65.0 });
        },
      });
    }

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.45), materials.darkAnodized);
    base.position.set(-0.48, 0.025, -0.15);
    group.add(base);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.35, 16), materials.brushedSteel);
    rod.position.set(-0.48, 1.18, -0.15);
    rod.castShadow = true;
    group.add(rod);

    const clampArm = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.06), materials.brass);
    clampArm.position.set(-0.18, 1.75, -0.05);
    group.add(clampArm);

    const buretteScale = createBuretteScaleTexture(maxAniso);
    disposables.push(buretteScale);
    const buretteTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.046, 1.4, 24, 1, true),
      materials.borosilicateGlass
    );
    buretteTube.position.set(0.1, 1.68, 0.05);
    buretteTube.renderOrder = 3;
    group.add(buretteTube);

    const scaleMat = new THREE.MeshBasicMaterial({ map: buretteScale, transparent: true, depthWrite: false });
    disposables.push(scaleMat);
    const scaleOverlay = new THREE.Mesh(
      new THREE.CylinderGeometry(0.047, 0.047, 1.25, 24, 1, true),
      scaleMat
    );
    scaleOverlay.position.set(0.1, 1.68, 0.05);
    scaleOverlay.renderOrder = 4;
    group.add(scaleOverlay);

    group.add(
      makeBenchPlaque(
        isKmno4 ? 'KMnO₄' : 'NaOH',
        'Burette Titrant',
        isKmno4 ? '#9333ea' : '#0284c7',
        [0.42, 0.03, -0.32],
        materials,
        maxAniso,
        disposables,
        0.9
      )
    );

    const buretteLiqMat = new THREE.MeshStandardMaterial({
      color: isKmno4 ? 0x7e22ce : 0xdbeafe,
      transparent: true,
      opacity: isKmno4 ? 0.85 : 0.45,
      roughness: 0.15,
    });
    disposables.push(buretteLiqMat);
    buretteLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.25, 20), buretteLiqMat);
    buretteLiquid.position.set(0.1, 1.68, 0.05);
    group.add(buretteLiquid);

    stopcockGroup = new THREE.Group();
    stopcockGroup.position.set(0.1, 0.94, 0.05);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 16), materials.ceramicWhite);
    body.rotation.z = Math.PI / 2;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.16), materials.copper);
    handle.position.x = 0.07;
    stopcockGroup.add(body, handle);
    group.add(stopcockGroup);

    const dropMat = new THREE.MeshStandardMaterial({
      color: isKmno4 ? 0xa855f7 : 0x7dd3fc,
      transparent: true,
      opacity: 0.9,
    });
    disposables.push(dropMat);
    dropletMesh = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), dropMat);
    dropletMesh.position.set(0.1, 0.85, 0.05);
    dropletMesh.visible = false;
    group.add(dropletMesh);

    flaskGroup = new THREE.Group();
    flaskGroup.position.set(0.1, 0.035, 0.05);
    const flaskPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.27, 0.0),
      new THREE.Vector2(0.28, 0.05),
      new THREE.Vector2(0.09, 0.45),
      new THREE.Vector2(0.08, 0.62),
      new THREE.Vector2(0.1, 0.65),
    ];
    const flaskGeo = new THREE.LatheGeometry(flaskPts, 32);
    disposables.push(flaskGeo);
    const flaskGlass = new THREE.Mesh(flaskGeo, materials.borosilicateGlass);
    flaskGlass.renderOrder = 3;
    flaskGroup.add(flaskGlass);

    flaskLiquidMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.65,
      roughness: 0.15,
    });
    disposables.push(flaskLiquidMat);
    flaskLiquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.25, 0.18, 28), flaskLiquidMat);
    flaskLiquidMesh.position.y = 0.1;
    flaskGroup.add(flaskLiquidMesh);

    if (isHotOxalic) {
      const therm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.72, 12), materials.borosilicateGlass);
      therm.position.set(0.05, 0.44, 0);
      therm.rotation.z = -0.14;
      flaskGroup.add(therm);
      const hgMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      disposables.push(hgMat);
      thermometerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.36, 10), hgMat);
      thermometerCol.position.set(0.035, 0.32, 0);
      thermometerCol.rotation.z = -0.14;
      flaskGroup.add(thermometerCol);
    }
    group.add(flaskGroup);

    // Left Stock Reagent Flask (0.05M Oxalic Acid or FAS) + 10 mL Glass Pipette
    const stockBottle = makeLabeledBottle({
      formula: subMode === 'titration_kmno4_fas' ? '0.05M FAS' : '0.05M H₂C₂O₄',
      name: subMode === 'titration_kmno4_fas' ? 'Ferrous Amm. Sulph.' : 'Oxalic Acid Sol.',
      liquidColor: subMode === 'titration_kmno4_fas' ? 0xd9f99d : 0xdbeafe,
      bandColor: '#0284c7',
      dropperCap: false,
      scale: 1.12,
      pos: [-0.95, 0, 0.22],
      materials,
      maxAniso,
      disposables,
    });
    group.add(stockBottle);

    titrationPipetteGroup = new THREE.Group();
    titrationPipetteGroup.position.set(-0.76, 0.02, 0.42);
    const pipTube = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.007, 0.56, 12), materials.borosilicateGlass);
    pipTube.rotation.z = Math.PI / 2;
    const pipBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 14), materials.borosilicateGlass);
    pipBulb.rotation.z = Math.PI / 2;
    titrationPipetteGroup.add(pipTube, pipBulb);
    group.add(titrationPipetteGroup);

    // Right Indicator / Acidification Dropper Bottle
    dropperGroup = makeLabeledBottle({
      formula: isKmno4 ? 'Dil. H₂SO₄' : 'Phenol.',
      name: isKmno4 ? 'Acidification' : 'Indicator Drops',
      liquidColor: isKmno4 ? 0xe0f2fe : 0xfbcfe8,
      bandColor: isKmno4 ? '#dc2626' : '#db2777',
      pos: [0.88, 0, 0.25],
      materials,
      maxAniso,
      disposables,
    });
    group.add(dropperGroup);

    dragTargets.push({
      mesh: titrationPipetteGroup,
      label: '10 mL Glass Pipette & Stock Solution (click to pipette 10 mL into flask)',
      onClick: (_state, onPatch) => {
        labAudio.playLiquidPour(0.35);
        onPatch({ pipetteAdded: true });
      },
    });

    dragTargets.push({
      mesh: stockBottle,
      label: subMode === 'titration_kmno4_fas' ? '0.05 M FAS Stock Bottle (click to pipette 10 mL)' : '0.05 M Oxalic Acid Stock (click to pipette 10 mL)',
      onClick: (_state, onPatch) => {
        labAudio.playLiquidPour(0.35);
        onPatch({ pipetteAdded: true });
      },
    });

    dragTargets.push({
      mesh: stopcockGroup,
      label: 'Burette Stopcock (click or drag to dispense drops)',
      onClick: (state, onPatch) => {
        labAudio.playDroplet();
        onPatch({ stopcockOpen: state.stopcockOpen > 0 ? 0 : 0.5 });
      },
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.stopcockOpen + dx * 1.4, 0, 1);
        onPatch({ stopcockOpen: Number(next.toFixed(2)) });
      },
    });

    dragTargets.push({
      mesh: flaskGroup,
      label: 'Conical Flask (click to swirl solution)',
      onClick: (state, onPatch) => {
        labAudio.playSwirl();
        onPatch({ flaskSwirled: state.flaskSwirled + 1 });
      },
    });

    dragTargets.push({
      mesh: dropperGroup,
      label: isKmno4 ? 'Dil. H₂SO₄ Bottle (click to acidify flask)' : 'Phenolphthalein Dropper (click to add indicator)',
      onClick: (_state, onPatch) => {
        labAudio.playDroplet();
        onPatch({ indicatorAdded: true, pipetteAdded: true });
      },
    });
  } else if (subMode === 'electrolysis') {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 0.85, 32), materials.borosilicateGlass);
    mug.position.set(0, 0.425, 0);
    mug.renderOrder = 3;
    group.add(mug);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.42,
      roughness: 0.1,
    });
    disposables.push(waterMat);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.46, 0.65, 32), waterMat);
    water.position.set(0, 0.34, 0);
    group.add(water);

    for (const [idx, px] of [-0.2, 0.2].entries()) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.45, 16), materials.rubberBlack);
      rod.position.set(px, 0.24, 0);
      group.add(rod);

      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.85, 24), materials.borosilicateGlass);
      tube.position.set(px, 0.68, 0);
      tube.renderOrder = 4;
      group.add(tube);

      const gasMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.5 });
      disposables.push(gasMat);
      const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.4, 20), gasMat);
      gas.position.set(px, 1.0, 0);
      group.add(gas);
      if (idx === 0) cathodeGasCol = gas;
      else anodeGasCol = gas;
    }

    group.add(makeBenchPlaque('H₂ (2V)', 'Cathode (−)', '#0284c7', [-0.24, 0.03, 0.62], materials, maxAniso, disposables, 0.85));
    group.add(makeBenchPlaque('O₂ (1V)', 'Anode (+)', '#dc2626', [0.24, 0.03, 0.62], materials, maxAniso, disposables, 0.85));

    const battery = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.36), materials.darkAnodized);
    battery.position.set(-1.05, 0.18, 0);
    group.add(battery);
    group.add(makeBenchPlaque('6V DC', 'Power Pack', '#f59e0b', [-1.05, 0.36, 0.2], materials, maxAniso, disposables, 0.8));

    // Red & Black Insulated Wires from 6V Battery to Carbon Electrodes
    const wireColors = [0x111827, 0xdc2626];
    const targetsX = [-0.2, 0.2];
    wireColors.forEach((col, i) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.92 + i * 0.18, 0.36, 0.08),
        new THREE.Vector3(-0.55, 0.05, 0.25 - i * 0.45),
        new THREE.Vector3(targetsX[i], 0.05, 0.08 - i * 0.16),
      ]);
      const wGeo = new THREE.TubeGeometry(curve, 24, 0.013, 8, false);
      const wMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
      disposables.push(wGeo, wMat);
      group.add(new THREE.Mesh(wGeo, wMat));
    });

    const bGeo = new THREE.SphereGeometry(0.016, 10, 10);
    const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    disposables.push(bGeo, bMat);
    bubbleInstanced = new THREE.InstancedMesh(bGeo, bMat, 48);
    bubbleInstanced.frustumCulled = false;
    bubblePhases = new Float32Array(48);
    for (let i = 0; i < 48; i++) bubblePhases[i] = Math.random();
    group.add(bubbleInstanced);

    // Always-visible Burning Wooden Splinter resting on ceramic tray
    const splinterTray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.22), materials.ceramicWhite);
    splinterTray.position.set(0.88, 0.012, 0.35);
    group.add(splinterTray);

    splinterGroup = new THREE.Group();
    splinterGroup.position.set(0.88, 0.06, 0.35);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, 0.018), materials.wood);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    disposables.push(emberMat);
    const flameTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 12), emberMat);
    flameTip.rotation.z = Math.PI / 2;
    flameTip.position.x = -0.23;
    splinterGroup.add(stick, flameTip);
    group.add(splinterGroup);

    popFlashLight = new THREE.PointLight(0xfbbf24, 0, 3.5);
    popFlashLight.position.set(-0.2, 1.15, 0);
    group.add(popFlashLight);

    dragTargets.push({
      mesh: battery,
      label: '6V DC Battery Switch (click to start/stop electrolysis)',
      onClick: (state, onPatch) => {
        labAudio.playSwitchClack();
        onPatch({ electrolysisCurrentOn: !state.electrolysisCurrentOn });
      },
    });

    dragTargets.push({
      mesh: splinterGroup,
      label: 'Burning Splinter (click to test H₂ gas pop at cathode)',
      onClick: (_state, onPatch) => {
        labAudio.playPopTest();
        onPatch({ splinterTested: true });
      },
    });
  } else if (subMode === 'ph_tile') {
    const tileTex = createSpottingTileTexture(maxAniso);
    const tileTopMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.25 });
    const tileBodyGeo = new THREE.BoxGeometry(1.18, 0.055, 0.88);
    const tilePlaneGeo = new THREE.PlaneGeometry(1.16, 0.86);
    disposables.push(tileTex, tileTopMat, tileBodyGeo, tilePlaneGeo);

    const tileBase = new THREE.Mesh(tileBodyGeo, materials.ceramicWhite);
    tileBase.position.set(-0.02, 0.028, 0.02);
    tileBase.receiveShadow = true;
    tileBase.castShadow = true;
    group.add(tileBase);

    const tileTop = new THREE.Mesh(tilePlaneGeo, tileTopMat);
    tileTop.rotation.x = -Math.PI / 2;
    tileTop.position.set(-0.02, 0.057, 0.02);
    group.add(tileTop);

    const dropGeo = new THREE.CylinderGeometry(0.085, 0.09, 0.016, 20);
    disposables.push(dropGeo);
    wellCoords.forEach(([wx, wz]) => {
      const dropMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.78,
        roughness: 0.08,
      });
      disposables.push(dropMat);
      const drop = new THREE.Mesh(dropGeo, dropMat);
      drop.position.set(wx + 0.06, 0.064, wz);
      drop.scale.set(0.01, 1, 0.01);
      drop.visible = false;
      phWellDrops.push(drop);
      group.add(drop);
    });

    phPipetteGroup = new THREE.Group();
    phPipetteGroup.position.set(-0.98, 0.52, 0.05);
    const pipGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.006, 0.36, 16), materials.borosilicateGlass);
    const pipBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.11, 16), materials.rubberBlack);
    pipBulb.position.y = 0.22;
    phPipetteGroup.add(pipGlass, pipBulb);
    phPipetteGroup.rotation.z = -0.22;
    group.add(phPipetteGroup);

    const pDropMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
    disposables.push(pDropMat);
    phFallingDrop = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), pDropMat);
    phFallingDrop.visible = false;
    group.add(phFallingDrop);

    // All 6 labeled Test Solution Dropper Bottles in 2 rows of 3
    const bottleGroup = new THREE.Group();
    const solutions = [
      { f: 'Dil. HCl', n: 'pH ~ 1.2', col: 0xef4444, b: '#dc2626', x: -1.16, z: -0.32 },
      { f: 'Dil. NaOH', n: 'pH ~ 13', col: 0x6366f1, b: '#4f46e5', x: -1.16, z: 0.02 },
      { f: 'CH₃COOH', n: 'Acetic Acid', col: 0xf97316, b: '#ea580c', x: -1.16, z: 0.36 },
      { f: 'Lemon', n: 'Citric Acid', col: 0xfacc15, b: '#ca8a04', x: -0.88, z: -0.32 },
      { f: 'H₂O', n: 'Distilled', col: 0x38bdf8, b: '#0284c7', x: -0.88, z: 0.02 },
      { f: 'NaHCO₃', n: 'Bicarb.', col: 0x14b8a6, b: '#0d9488', x: -0.88, z: 0.36 },
    ];
    solutions.forEach((sol) => {
      bottleGroup.add(
        makeLabeledBottle({
          formula: sol.f,
          name: sol.n,
          liquidColor: sol.col,
          bandColor: sol.b,
          scale: 0.85,
          pos: [sol.x, 0, sol.z],
          materials,
          maxAniso,
          disposables,
        })
      );
    });
    group.add(bottleGroup);

    dragTargets.push({
      mesh: bottleGroup,
      label: '6 Test Solution Dropper Bottles (click to drop onto spotting tile)',
      onClick: (state, onPatch) => {
        labAudio.playDroplet();
        onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
      },
    });

    const chartTex = createPhChartTexture(maxAniso);
    const chartMat = new THREE.MeshStandardMaterial({ map: chartTex, roughness: 0.45 });
    const chartGeo = new THREE.BoxGeometry(0.56, 0.035, 0.36);
    disposables.push(chartTex, chartMat, chartGeo);

    const chartBooklet = new THREE.Mesh(chartGeo, [
      materials.ceramicWhite,
      materials.ceramicWhite,
      chartMat,
      materials.ceramicWhite,
      materials.ceramicWhite,
      materials.ceramicWhite,
    ]);
    chartBooklet.position.set(0.92, 0.018, -0.26);
    chartBooklet.rotation.y = -0.18;
    chartBooklet.castShadow = true;
    group.add(chartBooklet);

    phStripsGroup = new THREE.Group();
    phStripsGroup.position.set(0.9, 0.025, 0.24);

    const stripBodyGeo = new THREE.BoxGeometry(0.32, 0.008, 0.048);
    const stripTipGeo = new THREE.BoxGeometry(0.11, 0.009, 0.048);
    const dryPaperMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.85 });
    disposables.push(stripBodyGeo, stripTipGeo, dryPaperMat);

    for (let i = 0; i < 6; i++) {
      const strip = new THREE.Group();
      strip.position.set(i % 2 === 0 ? -0.04 : 0.04, i * 0.006, (i - 2.5) * 0.068);
      strip.rotation.y = (i - 2.5) * 0.08 - 0.1;

      const body = new THREE.Mesh(stripBodyGeo, dryPaperMat);
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.85 });
      disposables.push(tipMat);
      phStripTipMats.push(tipMat);

      const tip = new THREE.Mesh(stripTipGeo, tipMat);
      tip.position.x = -0.165;
      strip.add(body, tip);
      phStripsGroup.add(strip);
    }
    group.add(phStripsGroup);

    dragTargets.push({
      mesh: phStripsGroup,
      label: 'Universal pH Paper Strips (click to touch & test spotting tile wells)',
      onClick: (_state, onPatch) => {
        labAudio.playDroplet();
        onPatch({ litmusTested: true });
      },
    });

    dragTargets.push({
      mesh: chartBooklet,
      label: 'Universal pH 1–14 Color Chart (click to record pH color match)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2800, 0.5);
        onPatch({ measurementCount: state.measurementCount + 1 });
      },
    });
  } else if (subMode === 'thermal_decomp') {
    // Dedicated Dry Boiling Tube in Clamp Stand + Bunsen Burner + Green FeSO4·7H2O Jar
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.45), materials.darkAnodized);
    standBase.position.set(-0.45, 0.025, -0.15);
    group.add(standBase);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.35, 14), materials.brushedSteel);
    rod.position.set(-0.45, 0.68, -0.15);
    group.add(rod);
    const clampArm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.035, 0.05), materials.brass);
    clampArm.position.set(-0.24, 0.88, -0.05);
    group.add(clampArm);

    const tubeGroup = new THREE.Group();
    tubeGroup.position.set(0.08, 0.78, 0);
    tubeGroup.rotation.z = -1.05;
    const boilingTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.82, 24, 1, true),
      materials.borosilicateGlass
    );
    boilingTube.renderOrder = 3;
    const tubeBottom = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 12), materials.borosilicateGlass);
    tubeBottom.position.y = -0.41;
    decompCrystalMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55 });
    disposables.push(decompCrystalMat);
    decompCrystalMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.16, 18), decompCrystalMat);
    decompCrystalMesh.position.y = -0.32;
    decompCrystalMesh.visible = false;
    tubeGroup.add(decompCrystalMesh, boilingTube, tubeBottom);
    group.add(tubeGroup);

    // Bunsen Burner below closed end of tilted boiling tube
    const burnerGroup = new THREE.Group();
    burnerGroup.position.set(-0.2, 0, 0);
    const bBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 24), materials.darkAnodized);
    bBase.position.y = 0.03;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 20), materials.brass);
    collar.position.y = 0.09;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 18), materials.brushedSteel);
    barrel.position.y = 0.28;
    burnerGroup.add(bBase, collar, barrel);

    decompFlameMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.x += sin(uTime * 11.0 + p.y * 8.0) * 0.015 * uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec3 col = mix(vec3(0.15, 0.5, 1.0), vec3(0.55, 0.85, 1.0), smoothstep(0.45, 0.0, vUv.y));
          gl_FragColor = vec4(col, (1.0 - vUv.y) * 0.9);
        }
      `,
    });
    disposables.push(decompFlameMat);
    decompFlameCone = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 18, 6, true), decompFlameMat);
    decompFlameCone.position.y = 0.56;
    decompFlameCone.visible = false;
    decompFlameLight = new THREE.PointLight(0x38bdf8, 0, 3.5);
    decompFlameLight.position.y = 0.58;
    burnerGroup.add(decompFlameCone, decompFlameLight);
    group.add(burnerGroup);

    // SO2 / SO3 evolved gas fumes exiting boiling tube mouth
    const fGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const fMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.45 });
    disposables.push(fGeo, fMat);
    decompFumes = new THREE.InstancedMesh(fGeo, fMat, 24);
    decompFumes.frustumCulled = false;
    decompFumePhases = new Float32Array(24);
    for (let i = 0; i < 24; i++) decompFumePhases[i] = Math.random();
    group.add(decompFumes);

    feso4Jar = makeSolidJar({
      formula: 'FeSO₄·7H₂O',
      name: 'Ferrous Sulphate',
      powderColor: 0x4ade80,
      bandColor: '#16a34a',
      granules: true,
      pos: [0.82, 0, 0.22],
      materials,
      maxAniso,
      disposables,
    });
    group.add(feso4Jar);

    dragTargets.push({
      mesh: feso4Jar,
      label: 'Green FeSO₄·7H₂O Crystals & Spatula (click to load boiling tube)',
      onClick: (state, onPatch) => {
        labAudio.playFizz(0.3);
        onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
      },
    });

    dragTargets.push({
      mesh: burnerGroup,
      label: 'Bunsen Burner (click to heat boiling tube strongly)',
      onClick: (_state, onPatch) => {
        labAudio.playFlameIgnite();
        onPatch({ solutionHeated: true, tempC: 65.0 });
      },
    });
  } else if (subMode === 'displacement' || subMode === 'reactivity') {
    // Multi-tube Wooden Rack + Distinct Metal Specimens + Salt Solution Bottles
    const isDisp = subMode === 'displacement';
    const tubeCount = isDisp ? 2 : 4;

    const rackGroup = new THREE.Group();
    rackGroup.position.set(0, 0, -0.05);
    const rW = isDisp ? 0.85 : 1.45;
    const rackBase = new THREE.Mesh(new THREE.BoxGeometry(rW, 0.055, 0.34), materials.wood);
    rackBase.position.y = 0.028;
    const rackTop = new THREE.Mesh(new THREE.BoxGeometry(rW, 0.038, 0.34), materials.wood);
    rackTop.position.y = 0.5;
    const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 12), materials.wood);
    pL.position.set(-rW / 2 + 0.07, 0.27, 0);
    const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 12), materials.wood);
    pR.position.set(rW / 2 - 0.07, 0.27, 0);
    rackGroup.add(rackBase, rackTop, pL, pR);

    const tubeSpecs = isDisp
      ? [
          { f: 'Control', n: 'Blue CuSO₄', col: 0x0284c7 },
          { f: 'Rxn Tube', n: 'CuSO₄ + Fe', col: 0x0284c7 },
        ]
      : [
          { f: 'ZnSO₄', n: 'Tube 1 (+Al)', col: 0xe2e8f0 },
          { f: 'FeSO₄', n: 'Tube 2 (+Zn)', col: 0x86efac },
          { f: 'CuSO₄', n: 'Tube 3 (+Fe)', col: 0x0284c7 },
          { f: 'Al₂(SO₄)₃', n: 'Tube 4 (+Cu)', col: 0xe2e8f0 },
        ];

    for (let i = 0; i < tubeCount; i++) {
      const tx = isDisp ? (i === 0 ? -0.2 : 0.2) : -0.45 + i * 0.3;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.74, 20), materials.borosilicateGlass);
      tube.position.set(tx, 0.44, 0);
      tube.renderOrder = 3;
      rackGroup.add(tube);

      const fMat = new THREE.MeshStandardMaterial({
        color: tubeSpecs[i].col,
        transparent: true,
        opacity: 0.78,
        roughness: 0.14,
      });
      disposables.push(fMat);
      rackTubeFluids.push(fMat);
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.36, 18), fMat);
      fluid.position.set(tx, 0.27, 0);
      rackGroup.add(fluid);

      rackGroup.add(
        makeBenchPlaque(
          tubeSpecs[i].f,
          tubeSpecs[i].n,
          '#0284c7',
          [tx, 0.03, 0.28],
          materials,
          maxAniso,
          disposables,
          0.78
        )
      );
    }

    if (isDisp) {
      // Iron nail immersed inside Reaction Tube (Tube 1 at x = 0.2)
      immersedNailGroup = new THREE.Group();
      immersedNailGroup.position.set(0.2, 0.35, 0);
      immersedNailMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 });
      disposables.push(immersedNailMat);
      const nailBody = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.008, 0.42, 12), immersedNailMat);
      const nailHead = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.015, 12), materials.brushedSteel);
      nailHead.position.y = 0.21;
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.32, 6), materials.ceramicWhite);
      thread.position.y = 0.36;
      immersedNailGroup.add(nailBody, nailHead, thread);
      immersedNailGroup.visible = false;
      rackGroup.add(immersedNailGroup);

      // Watch glass tray with clean spare Iron Nails on right
      trayNailsGroup = new THREE.Group();
      trayNailsGroup.position.set(0.85, 0, 0.22);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.03, 24), materials.ceramicWhite);
      dish.position.y = 0.015;
      trayNailsGroup.add(dish);
      for (let k = -1; k <= 1; k++) {
        const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.007, 0.28, 10), materials.brushedSteel);
        nail.rotation.z = Math.PI / 2;
        nail.rotation.y = k * 0.2;
        nail.position.set(0, 0.042, k * 0.06);
        trayNailsGroup.add(nail);
      }
      group.add(trayNailsGroup);
      group.add(makeBenchPlaque('Fe Nails', 'Cleaned Iron', '#64748b', [0.85, 0.03, 0.48], materials, maxAniso, disposables, 0.82));

      dropperGroup = makeLabeledBottle({
        formula: 'CuSO₄',
        name: 'Copper Sulphate',
        liquidColor: 0x0284c7,
        bandColor: '#0284c7',
        pos: [-0.85, 0, 0.2],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup);

      dragTargets.push({
        mesh: trayNailsGroup,
        label: 'Cleaned Iron Nails (click to immerse into CuSO₄ Reaction Tube)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.3);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: dropperGroup,
        label: 'Blue CuSO₄ Solution Bottle (click to advance displacement)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.35);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
    } else {
      // 4 Metal Strips (Al, Zn, Fe, Cu) on front tray for Reactivity Series
      const stripColors = [0xe2e8f0, 0x94a3b8, 0x64748b, 0xc86d44];
      const stripNames = ['Al Strip', 'Zn Strip', 'Fe Strip', 'Cu Strip'];
      const metalTray = new THREE.Group();
      metalTray.position.set(0, 0, 0.56);
      const trayPad = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.025, 0.32), materials.ceramicWhite);
      trayPad.position.y = 0.012;
      metalTray.add(trayPad);
      stripColors.forEach((col, i) => {
        const sx = -0.45 + i * 0.3;
        const sm = new THREE.MeshStandardMaterial({ color: col, metalness: 0.88, roughness: 0.24 });
        disposables.push(sm);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.24), sm);
        strip.position.set(sx, 0.032, 0);
        const mg = new THREE.Group();
        mg.add(strip);
        metalStripGroup.push(mg);
        metalTray.add(mg);
        metalTray.add(makeBenchPlaque(stripNames[i], 'Metal Sample', '#0f766e', [sx, 0.03, 0.2], materials, maxAniso, disposables, 0.72));
      });
      group.add(metalTray);

      dropperGroup = makeLabeledBottle({
        formula: 'SO₄²⁻ Salts',
        name: 'Al/Zn/Fe/Cu Sols',
        liquidColor: 0x0284c7,
        bandColor: '#0284c7',
        pos: [-1.02, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup);

      dragTargets.push({
        mesh: metalTray,
        label: 'Al, Zn, Fe, Cu Metal Strips (click to immerse into salt tubes)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.35);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: dropperGroup,
        label: 'Sulphate Salt Solutions Bottle (click to fill/observe)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.35);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
    }
    group.add(rackGroup);
  } else {
    // General Wet Chemistry Beaker / Calorimeter / Conical Flask / Acid-Base / Quicklime / Saponification
    const isCalorimeter = subMode === 'enthalpy_neut' || subMode === 'enthalpy_sol';
    const isKinetics = subMode === 'kinetics_cross';

    const tile = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 1.1), materials.ceramicWhite);
    tile.position.set(0, 0.015, 0);
    group.add(tile);

    heaterRingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0xea580c,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    disposables.push(heaterRingMat);
    const heaterRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 12, 32), heaterRingMat);
    heaterRing.rotation.x = Math.PI / 2;
    heaterRing.position.set(0, 0.034, 0);
    group.add(heaterRing);

    if (isKinetics) {
      const xMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      disposables.push(xMat);
      crossMark = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.006, 0.035), xMat);
      crossMark.position.set(0, 0.033, 0);
      crossMark.rotation.y = Math.PI / 4;
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.006, 0.035), xMat);
      bar2.rotation.y = Math.PI / 2;
      crossMark.add(bar2);
      group.add(crossMark);
    }

    // Main Vessel (Insulated Calorimeter, Conical Flask, or Borosilicate Beaker)
    let vesselMesh: THREE.Mesh;
    if (isCalorimeter) {
      const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.68, 32), materials.wood);
      jacket.position.set(0, 0.36, 0);
      jacket.castShadow = true;
      group.add(jacket);
      vesselMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.66, 28), materials.copper);
      vesselMesh.position.set(0, 0.39, 0);
      group.add(vesselMesh);
    } else if (isKinetics) {
      const flaskPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.3, 0),
        new THREE.Vector2(0.31, 0.05),
        new THREE.Vector2(0.11, 0.48),
        new THREE.Vector2(0.1, 0.68),
        new THREE.Vector2(0.12, 0.72),
      ];
      const fGeo = new THREE.LatheGeometry(flaskPts, 32);
      disposables.push(fGeo);
      vesselMesh = new THREE.Mesh(fGeo, materials.borosilicateGlass);
      vesselMesh.position.set(0, 0.03, 0);
      vesselMesh.renderOrder = 3;
      group.add(vesselMesh);
    } else {
      const beakerPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.32, 0),
        new THREE.Vector2(0.34, 0.04),
        new THREE.Vector2(0.34, 0.72),
        new THREE.Vector2(0.31, 0.72),
        new THREE.Vector2(0.31, 0.05),
        new THREE.Vector2(0, 0.05),
      ];
      const bGeo = new THREE.LatheGeometry(beakerPts, 32);
      disposables.push(bGeo);
      vesselMesh = new THREE.Mesh(bGeo, materials.borosilicateGlass);
      vesselMesh.position.set(0, 0.03, 0);
      vesselMesh.renderOrder = 3;
      group.add(vesselMesh);
    }

    const startColor =
      subMode === 'equilibrium'
        ? 0x991b1b
        : subMode === 'saponification'
          ? 0xfef08a
          : subMode === 'kinetics_cross'
            ? 0xe0f2fe
            : 0xdbeafe;

    beakerFluidMat = new THREE.MeshStandardMaterial({
      color: startColor,
      transparent: true,
      opacity: isKinetics ? 0.38 : 0.72,
      roughness: 0.15,
    });
    disposables.push(beakerFluidMat);
    const fluid = new THREE.Mesh(
      new THREE.CylinderGeometry(isKinetics ? 0.22 : 0.295, isKinetics ? 0.29 : 0.295, 0.38, 28),
      beakerFluidMat
    );
    fluid.position.set(0, isCalorimeter ? 0.56 : 0.24, 0);
    group.add(fluid);

    // Quicklime CaO chunks / Precipitate disk at bottom
    const pMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
    disposables.push(pMat);
    precipitateDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 24), pMat);
    precipitateDisk.position.set(0, 0.075, 0);
    precipitateDisk.visible = subMode === 'quicklime';
    group.add(precipitateDisk);

    // Metallic Zn Granules inside beaker for acid_base (visible once zincAdded)
    if (subMode === 'acid_base') {
      zincGranulesGroup = new THREE.Group();
      const znMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.82, roughness: 0.3 });
      const znGeo = new THREE.DodecahedronGeometry(0.032, 0);
      disposables.push(znMat, znGeo);
      for (let i = 0; i < 6; i++) {
        const gMesh = new THREE.Mesh(znGeo, znMat);
        const a = (i / 6) * Math.PI * 2;
        gMesh.position.set(Math.cos(a) * 0.11, 0.095, Math.sin(a) * 0.11);
        gMesh.rotation.set(i, i * 0.7, 0);
        zincGranulesGroup.add(gMesh);
      }
      zincGranulesGroup.visible = false;
      group.add(zincGranulesGroup);
    }

    // Glass Stirring Rod (rotates circularly inside beaker when stirred)
    stirRodGroup = new THREE.Group();
    stirRodGroup.position.set(0, isCalorimeter ? 0.45 : 0.35, 0);
    const stirRod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.88, 12), materials.borosilicateGlass);
    stirRod.position.set(0.11, 0.12, 0);
    stirRod.rotation.z = 0.18;
    stirRodGroup.add(stirRod);
    group.add(stirRodGroup);

    // Thermometer
    const therm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 14), materials.borosilicateGlass);
    therm.position.set(0.19, 0.56, -0.06);
    therm.rotation.z = -0.15;
    group.add(therm);

    const hgMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    disposables.push(hgMat);
    thermometerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 10), hgMat);
    thermometerCol.position.set(0.17, 0.4, -0.06);
    thermometerCol.rotation.z = -0.15;
    group.add(thermometerCol);

    // Litmus Paper Strip for acid_base & acetic_acid
    if (subMode === 'acid_base' || subMode === 'acetic_acid') {
      beakerLitmusMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.85 });
      disposables.push(beakerLitmusMat);
      beakerLitmusStrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.36, 0.008), beakerLitmusMat);
      beakerLitmusStrip.position.set(0.72, 0.06, 0.32);
      beakerLitmusStrip.rotation.x = -Math.PI / 2;
      group.add(beakerLitmusStrip);
      group.add(makeBenchPlaque('Litmus', 'Blue / Red Paper', '#2563eb', [0.72, 0.03, 0.56], materials, maxAniso, disposables, 0.78));

      dragTargets.push({
        mesh: beakerLitmusStrip,
        label: 'Litmus Indicator Strip (click to dip into solution)',
        onClick: (_state, onPatch) => {
          labAudio.playDroplet();
          onPatch({ litmusTested: true });
        },
      });
    }

    // Always-visible Burning Wooden Splinter on stand for acid_base
    if (subMode === 'acid_base') {
      const standPad = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.024, 0.2), materials.ceramicWhite);
      standPad.position.set(0.95, 0.012, -0.15);
      group.add(standPad);

      splinterGroup = new THREE.Group();
      splinterGroup.position.set(0.95, 0.06, -0.15);
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.018, 0.018), materials.wood);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      disposables.push(flameMat);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 12), flameMat);
      flame.rotation.z = Math.PI / 2;
      flame.position.x = -0.22;
      splinterGroup.add(stick, flame);
      group.add(splinterGroup);

      popFlashLight = new THREE.PointLight(0xfbbf24, 0, 4);
      popFlashLight.position.set(0, 0.85, 0);
      group.add(popFlashLight);

      dragTargets.push({
        mesh: splinterGroup,
        label: 'Burning Splinter (click to perform H₂ gas pop test)',
        onClick: (_state, onPatch) => {
          labAudio.playPopTest();
          onPatch({ splinterTested: true, zincAdded: true });
        },
      });
    }

    // Rising Effervescence Bubbles / Steam InstancedMesh (36 particles)
    const ebGeo = new THREE.SphereGeometry(0.016, 8, 8);
    const ebMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.78, roughness: 0.1 });
    disposables.push(ebGeo, ebMat);
    beakerBubbles = new THREE.InstancedMesh(ebGeo, ebMat, 36);
    beakerBubbles.frustumCulled = false;
    beakerBubblePhases = new Float32Array(36);
    for (let i = 0; i < 36; i++) beakerBubblePhases[i] = Math.random();
    group.add(beakerBubbles);

    // Pouring droplet stream
    const streamMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 });
    disposables.push(streamMat);
    beakerDropStream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 10), streamMat);
    beakerDropStream.position.set(-0.08, 0.65, 0.04);
    beakerDropStream.visible = false;
    group.add(beakerDropStream);

    // SubMode-specific Labeled Bottles, Solid Jars, Equilibrium Rack, Stopwatch, Lather Tubes
    if (subMode === 'acid_base') {
      dropperGroup = makeLabeledBottle({
        formula: 'Dil. HCl',
        name: 'Hydrochloric Acid',
        liquidColor: 0xbae6fd,
        bandColor: '#dc2626',
        pos: [-0.82, 0, 0.2],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: 'Dil. NaOH',
        name: 'Sodium Hydroxide',
        liquidColor: 0xe0f2fe,
        bandColor: '#2563eb',
        pos: [-1.12, 0, 0.2],
        materials,
        maxAniso,
        disposables,
      });
      zincJar = makeSolidJar({
        formula: 'Zn',
        name: 'Zinc Granules',
        powderColor: 0x94a3b8,
        bandColor: '#475569',
        granules: true,
        pos: [-0.88, 0, -0.3],
        materials,
        maxAniso,
        disposables,
      });
      carbonateJar = makeSolidJar({
        formula: 'Na₂CO₃',
        name: 'Sod. Carbonate',
        powderColor: 0xf8fafc,
        bandColor: '#0d9488',
        pos: [0.85, 0, -0.52],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup, sideBottle2, zincJar, carbonateJar);

      dragTargets.push({
        mesh: dropperGroup,
        label: 'Dil. HCl Dropper Bottle (click to add acid to beaker)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: sideBottle2,
        label: 'Dil. NaOH Bottle (click to add base to beaker)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: zincJar,
        label: 'Zinc Granules Jar & Spatula (click to add Zn granules)',
        onClick: (state, onPatch) => {
          labAudio.playFizz(0.65);
          onPatch({ zincAdded: true, reagentAddedCount: state.reagentAddedCount + 1 });
        },
      });
      dragTargets.push({
        mesh: carbonateJar,
        label: 'Na₂CO₃ Powder Jar & Spatula (click for CO₂ fizz test)',
        onClick: (state, onPatch) => {
          labAudio.playFizz(0.85);
          onPatch({ carbonateAdded: true, reagentAddedCount: state.reagentAddedCount + 1 });
        },
      });
    } else if (subMode === 'quicklime') {
      dropperGroup = makeLabeledBottle({
        formula: 'H₂O',
        name: 'Distilled Water',
        liquidColor: 0x38bdf8,
        bandColor: '#0284c7',
        pos: [-0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      solidJarMain = makeSolidJar({
        formula: 'CaO',
        name: 'Quicklime Lumps',
        powderColor: 0xf8fafc,
        bandColor: '#d97706',
        granules: true,
        pos: [0.82, 0, 0.18],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup, solidJarMain);
      dragTargets.push({
        mesh: dropperGroup,
        label: 'Distilled Water Bottle (click to add to quicklime)',
        onClick: (state, onPatch) => {
          labAudio.playFizz(0.75);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, tempC: Math.min(68, state.tempC + 18.5) });
        },
      });
    } else if (subMode === 'double_displacement') {
      dropperGroup = makeLabeledBottle({
        formula: 'Na₂SO₄',
        name: 'Sodium Sulphate',
        liquidColor: 0xdbeafe,
        bandColor: '#0284c7',
        pos: [-0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: 'BaCl₂',
        name: 'Barium Chloride',
        liquidColor: 0xe0f2fe,
        bandColor: '#7c3aed',
        pos: [0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup, sideBottle2);
      dragTargets.push({
        mesh: dropperGroup,
        label: 'Na₂SO₄ Bottle (click to pour into vessel)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: sideBottle2,
        label: 'BaCl₂ Bottle (click to precipitate white BaSO₄)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
    } else if (subMode === 'acetic_acid') {
      dropperGroup = makeLabeledBottle({
        formula: 'CH₃COOH',
        name: 'Glacial Acetic',
        liquidColor: 0xe0f2fe,
        bandColor: '#ea580c',
        pos: [-0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: 'H₂O',
        name: 'Distilled Water',
        liquidColor: 0x38bdf8,
        bandColor: '#0284c7',
        pos: [-1.12, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      carbonateJar = makeSolidJar({
        formula: 'NaHCO₃',
        name: 'Sod. Bicarbonate',
        powderColor: 0xf8fafc,
        bandColor: '#0d9488',
        pos: [0.82, 0, -0.22],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup, sideBottle2, carbonateJar);
      dragTargets.push({
        mesh: dropperGroup,
        label: 'Acetic Acid Bottle (click to mix with water)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: sideBottle2,
        label: 'Water Bottle (click to mix with acetic acid)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: carbonateJar,
        label: 'NaHCO₃ Jar & Spatula (click for brisk CO₂ effervescence)',
        onClick: (state, onPatch) => {
          labAudio.playFizz(0.9);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, carbonateAdded: true });
        },
      });
    } else if (subMode === 'saponification') {
      dropperGroup = makeLabeledBottle({
        formula: 'Veg. Oil',
        name: '20 mL Castor/Veg',
        liquidColor: 0xfacc15,
        bandColor: '#ca8a04',
        amber: true,
        pos: [-0.82, 0, 0.18],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: '20% NaOH',
        name: '30 mL Alkali',
        liquidColor: 0xe0f2fe,
        bandColor: '#2563eb',
        pos: [-1.12, 0, 0.18],
        materials,
        maxAniso,
        disposables,
      });
      solidJarMain = makeSolidJar({
        formula: 'NaCl',
        name: 'Common Salt',
        powderColor: 0xf8fafc,
        bandColor: '#0284c7',
        pos: [0.82, 0, 0.18],
        materials,
        maxAniso,
        disposables,
      });
      // Lather comparison tubes (Distilled vs Hard Water) at back right
      const latherRack = new THREE.Group();
      latherRack.position.set(0.84, 0, -0.34);
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.2), materials.wood);
      lb.position.y = 0.02;
      latherRack.add(lb);
      [-0.1, 0.1].forEach((tx) => {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.48, 16), materials.borosilicateGlass);
        t.position.set(tx, 0.28, 0);
        t.renderOrder = 3;
        latherRack.add(t);
      });
      group.add(dropperGroup, sideBottle2, solidJarMain, latherRack);

      dragTargets.push({
        mesh: dropperGroup,
        label: 'Vegetable Oil Bottle (click to mix Oil + 20% NaOH)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: sideBottle2,
        label: '20% NaOH Bottle (click to mix with oil)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: solidJarMain,
        label: 'Common Salt (NaCl) Jar & Spatula (click to salt out soap +8g)',
        onClick: (state, onPatch) => {
          labAudio.playFizz(0.35);
          onPatch({ saltAddedG: state.saltAddedG + 8 });
        },
      });
    } else if (subMode === 'equilibrium') {
      dropperGroup = makeLabeledBottle({
        formula: 'FeCl₃',
        name: 'Ferric Chloride',
        liquidColor: 0xf59e0b,
        bandColor: '#d97706',
        pos: [-0.82, 0, 0.22],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: 'KSCN',
        name: 'Pot. Thiocyanate',
        liquidColor: 0xe0f2fe,
        bandColor: '#dc2626',
        pos: [-1.12, 0, 0.22],
        materials,
        maxAniso,
        disposables,
      });
      const kclBottle = makeLabeledBottle({
        formula: 'KCl',
        name: 'Backward Shift',
        liquidColor: 0xdbeafe,
        bandColor: '#2563eb',
        pos: [0.85, 0, 0.22],
        materials,
        maxAniso,
        disposables,
      });
      // 4 Comparison Test Tubes in rack behind beaker
      const eqRack = new THREE.Group();
      eqRack.position.set(0.86, 0, -0.35);
      const rBase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.22), materials.wood);
      rBase.position.y = 0.02;
      eqRack.add(rBase);
      for (let i = 0; i < 4; i++) {
        const tx = -0.24 + i * 0.16;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.44, 14), materials.borosilicateGlass);
        t.position.set(tx, 0.25, 0);
        t.renderOrder = 3;
        const fMat = new THREE.MeshStandardMaterial({
          color: i === 0 ? 0x991b1b : i === 1 ? 0x7f1d1d : i === 2 ? 0xb91c1c : 0xfca5a5,
          transparent: true,
          opacity: 0.78,
        });
        disposables.push(fMat);
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), fMat);
        f.position.set(tx, 0.16, 0);
        eqRack.add(f, t);
      }
      group.add(dropperGroup, sideBottle2, kclBottle, eqRack);

      [dropperGroup, sideBottle2, kclBottle].forEach((b, idx) => {
        const labels = [
          'FeCl₃ Bottle (click to shift forward)',
          'KSCN Bottle (click to form [Fe(SCN)]²⁺)',
          'KCl Bottle (click to shift backward)',
        ];
        dragTargets.push({
          mesh: b,
          label: labels[idx],
          onClick: (state, onPatch) => {
            labAudio.playLiquidPour(0.35);
            onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
          },
        });
      });
    } else if (subMode === 'common_ion') {
      dropperGroup = makeLabeledBottle({
        formula: 'Sat. NaCl',
        name: 'Brine Filtrate',
        liquidColor: 0xdbeafe,
        bandColor: '#0284c7',
        pos: [-0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: 'Conc. HCl',
        name: 'Common Cl⁻ Ion',
        liquidColor: 0xfef3c7,
        bandColor: '#dc2626',
        amber: true,
        pos: [0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup, sideBottle2);
      dragTargets.push({
        mesh: dropperGroup,
        label: 'Saturated NaCl Bottle (click to pour brine)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: sideBottle2,
        label: 'Conc. HCl Bottle (click to precipitate NaCl crystals)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
    } else if (isKinetics) {
      dropperGroup = makeLabeledBottle({
        formula: '1M HCl',
        name: 'Hydrochloric Acid',
        liquidColor: 0xbae6fd,
        bandColor: '#dc2626',
        pos: [-0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: 'Na₂S₂O₃',
        name: '0.1M Thiosulphate',
        liquidColor: 0xe0f2fe,
        bandColor: '#0284c7',
        pos: [-1.12, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      // 3D Digital Stopwatch on right
      const swGroup = new THREE.Group();
      swGroup.position.set(0.84, 0.14, 0.15);
      const swBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.08), materials.darkAnodized);
      const swTex = createStopwatchDialTexture('KINETICS', '00:28.0', maxAniso);
      const swMat = new THREE.MeshStandardMaterial({ map: swTex, roughness: 0.35 });
      disposables.push(swTex, swMat);
      const swFace = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), swMat);
      swFace.position.z = 0.042;
      swGroup.rotation.x = -0.35;
      swGroup.add(swBody, swFace);
      group.add(dropperGroup, sideBottle2, swGroup);

      dragTargets.push({
        mesh: dropperGroup,
        label: '1M HCl Bottle (click to add 10 mL to thiosulphate)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.4);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, pipetteAdded: true });
        },
      });
      dragTargets.push({
        mesh: swGroup,
        label: 'Digital Stopwatch (click to record "X" disappearance time)',
        onClick: (state, onPatch) => {
          labAudio.playMetallicTick(2800, 0.5);
          onPatch({ measurementCount: state.measurementCount + 1 });
        },
      });
    } else if (subMode === 'enthalpy_neut') {
      dropperGroup = makeLabeledBottle({
        formula: '1M NaOH',
        name: '50 mL Base',
        liquidColor: 0x38bdf8,
        bandColor: '#2563eb',
        pos: [-0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      sideBottle2 = makeLabeledBottle({
        formula: '1M HCl',
        name: '50 mL Acid',
        liquidColor: 0xe0f2fe,
        bandColor: '#dc2626',
        pos: [0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup, sideBottle2);
      dragTargets.push({
        mesh: dropperGroup,
        label: '1M NaOH Bottle (click to pour 50 mL into calorimeter)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.45);
          onPatch({ reagentAddedCount: state.reagentAddedCount + 1, tempC: 31.8 });
        },
      });
      dragTargets.push({
        mesh: sideBottle2,
        label: '1M HCl Bottle (click to verify initial temp T₁ = 25.0 °C)',
        onClick: (_state, onPatch) => {
          labAudio.playMetallicTick(2400, 0.45);
          onPatch({ zeroErrorChecked: true });
        },
      });
    } else if (subMode === 'enthalpy_sol') {
      dropperGroup = makeLabeledBottle({
        formula: 'H₂O',
        name: '100 mL Water',
        liquidColor: 0x38bdf8,
        bandColor: '#0284c7',
        pos: [-0.82, 0, 0.15],
        materials,
        maxAniso,
        disposables,
      });
      solidJarMain = makeSolidJar({
        formula: 'KNO₃',
        name: '5.0 g Powder',
        powderColor: 0xf8fafc,
        bandColor: '#0284c7',
        pos: [0.82, 0, 0.18],
        materials,
        maxAniso,
        disposables,
      });
      group.add(dropperGroup, solidJarMain);
      dragTargets.push({
        mesh: dropperGroup,
        label: 'Distilled Water (click to check T₁ = 25.0 °C)',
        onClick: (_state, onPatch) => {
          labAudio.playMetallicTick(2400, 0.45);
          onPatch({ zeroErrorChecked: true });
        },
      });
      dragTargets.push({
        mesh: solidJarMain,
        label: '5.0 g KNO₃ Powder Jar & Spatula (click to dissolve into water)',
        onClick: (_state, onPatch) => {
          labAudio.playLiquidPour(0.35);
          onPatch({ saltAddedG: 5, tempC: 20.9 });
        },
      });
    }

    dragTargets.push({
      mesh: stirRodGroup,
      label: 'Glass Stirring Rod (click to stir mixture)',
      onClick: (state, onPatch) => {
        labAudio.playSwirl();
        onPatch({ beakerStirred: true, flaskSwirled: state.flaskSwirled + 1 });
      },
    });
    dragTargets.push({
      mesh: vesselMesh,
      label: 'Reaction Vessel (click to stir / swirl)',
      onClick: (state, onPatch) => {
        labAudio.playSwirl();
        onPatch({ beakerStirred: true, flaskSwirled: state.flaskSwirled + 1 });
      },
    });
  }

  return {
    group,
    dragTargets,
    update: (dt: number, state: RigState, _exp: ExperimentConfig, onPatch) => {
      if (state.reagentAddedCount > prevReagentCount || state.saltAddedG > prevSaltAddedG) {
        if (subMode === 'ph_tile') {
          phTargetWellIdx = Math.min(5, Math.max(0, prevReagentCount * 2));
          phPipetteAnim = 1.0;
        } else {
          bottlePourAnim = 1.0;
          if (state.saltAddedG > prevSaltAddedG) solidPourAnim = 1.0;
        }
        if (subMode === 'kinetics_cross' && kineticsStartTime === null) {
          kineticsStartTime = state.elapsedTime;
        }
        prevReagentCount = state.reagentAddedCount;
        prevSaltAddedG = state.saltAddedG;
      }

      if (state.zincAdded && !prevZincAdded) {
        solidPourAnim = 1.0;
        prevZincAdded = true;
      } else if (!state.zincAdded) prevZincAdded = false;

      if (state.carbonateAdded && !prevCarbonateAdded) {
        bottle2PourAnim = 1.0;
        prevCarbonateAdded = true;
      } else if (!state.carbonateAdded) prevCarbonateAdded = false;

      if (state.pipetteAdded && !prevPipetteAdded) {
        pipetteAnim = 1.0;
        prevPipetteAdded = true;
      } else if (!state.pipetteAdded) prevPipetteAdded = false;

      if (state.litmusTested && !prevLitmusTested) {
        phStripDipAnim = 1.0;
        litmusDipAnim = 1.0;
        prevLitmusTested = true;
      } else if (!state.litmusTested) prevLitmusTested = false;

      if (state.splinterTested && !prevSplinterTested) {
        splinterAnim = 1.0;
        prevSplinterTested = true;
      } else if (!state.splinterTested) prevSplinterTested = false;

      if (state.beakerStirred !== prevBeakerStirred || state.flaskSwirled > prevFlaskSwirled) {
        stirAnim = 1.0;
        swirlAnim = 1.0;
        prevBeakerStirred = state.beakerStirred;
        prevFlaskSwirled = state.flaskSwirled;
      }

      if (state.indicatorAdded && !prevIndicatorAdded) {
        bottlePourAnim = 1.0;
        prevIndicatorAdded = true;
      } else if (!state.indicatorAdded) prevIndicatorAdded = false;

      if (state.titratedMl > prevTitratedMl + 0.05 && state.stopcockOpen === 0) {
        singleDropAnim = 1.0;
      }
      prevTitratedMl = state.titratedMl;

      // 1. Titration animations
      if (isTitration) {
        if (stopcockGroup) {
          stopcockGroup.rotation.z = THREE.MathUtils.damp(
            stopcockGroup.rotation.z,
            state.stopcockOpen * (Math.PI / 2),
            14,
            dt
          );
        }
        if (buretteLiquid) {
          const frac = THREE.MathUtils.clamp(1 - state.titratedMl / 50, 0.04, 1);
          buretteLiquid.scale.y = frac;
          buretteLiquid.position.y = 1.055 + frac * 0.625;
        }
        if (heaterRingMat) {
          heaterRingMat.emissiveIntensity = state.solutionHeated ? 1.8 : 0;
        }
        if (titrationPipetteGroup) {
          if (pipetteAnim > 0.01) {
            pipetteAnim *= Math.exp(-2.4 * dt);
            const arc = Math.sin(pipetteAnim * Math.PI);
            titrationPipetteGroup.position.set(
              THREE.MathUtils.lerp(-0.76, 0.1, arc),
              0.02 + arc * 0.85,
              THREE.MathUtils.lerp(0.42, 0.05, arc)
            );
            titrationPipetteGroup.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 2, arc);
          } else {
            titrationPipetteGroup.position.set(-0.76, 0.02, 0.42);
            titrationPipetteGroup.rotation.z = 0;
          }
        }
        if (dropperGroup) {
          if (bottlePourAnim > 0.01) {
            bottlePourAnim *= Math.exp(-2.8 * dt);
            const arc = Math.sin(bottlePourAnim * Math.PI);
            dropperGroup.position.x = THREE.MathUtils.lerp(0.88, 0.28, arc);
            dropperGroup.position.y = arc * 0.72;
            dropperGroup.rotation.z = arc * 0.65;
          } else {
            dropperGroup.position.set(0.88, 0, 0.25);
            dropperGroup.rotation.z = 0;
          }
        }
        if ((state.stopcockOpen > 0.05 && state.titratedMl < 50) || singleDropAnim > 0.01) {
          if (singleDropAnim > 0.01) singleDropAnim *= Math.exp(-4.0 * dt);
          dropAccum += dt * (1.8 + state.stopcockOpen * 6.5);
          if (dropletMesh) {
            dropletMesh.visible = true;
            dropletY -= dt * 2.6;
            if (dropletY < 0.22) dropletY = 0.88;
            dropletMesh.position.y = dropletY;
          }
          if (state.stopcockOpen > 0.05 && dropAccum >= 1) {
            dropAccum = 0;
            const added = 0.15 + state.stopcockOpen * 0.45;
            const nextMl = Math.min(50, Number((state.titratedMl + added).toFixed(2)));
            labAudio.playDroplet();
            onPatch({ titratedMl: nextMl });
          }
        } else if (dropletMesh) {
          dropletMesh.visible = false;
        }
        if (flaskLiquidMat && flaskLiquidMesh && flaskGroup) {
          if (!state.indicatorAdded && subMode === 'titration_phenol') {
            _colorA.setHex(0xe0f2fe);
          } else if (state.titratedMl < 17.8) {
            _colorA.setHex(0xe0f2fe);
          } else if (state.titratedMl <= 19.6) {
            _colorA.setHex(0xf9a8d4);
          } else {
            _colorA.setHex(0xdb2777);
          }
          flaskLiquidMat.color.lerp(_colorA, 1 - Math.exp(-8 * dt));
          flaskLiquidMesh.scale.y = 1 + state.titratedMl * 0.015;

          if (swirlAnim > 0.01) {
            swirlAnim *= Math.exp(-3.2 * dt);
            flaskGroup.rotation.z = Math.sin(state.elapsedTime * 18) * 0.09 * swirlAnim;
          } else {
            flaskGroup.rotation.z = 0;
          }
        }
      }

      // 2. Electrolysis animations
      if (subMode === 'electrolysis' && bubbleInstanced && bubblePhases) {
        for (let i = 0; i < 48; i++) {
          if (state.electrolysisCurrentOn) {
            bubblePhases[i] = (bubblePhases[i] + dt * (0.45 + (i % 5) * 0.1)) % 1;
          }
          const isCathode = i < 32;
          const xBase = isCathode ? -0.2 : 0.2;
          const jitter = Math.sin(i * 13.7 + state.elapsedTime * 4) * 0.04;
          _dummy.position.set(xBase + jitter, 0.25 + bubblePhases[i] * 0.72, Math.cos(i * 7) * 0.03);
          _dummy.scale.setScalar(state.electrolysisCurrentOn ? 1 : 0.001);
          _dummy.updateMatrix();
          bubbleInstanced.setMatrixAt(i, _dummy.matrix);
        }
        bubbleInstanced.instanceMatrix.needsUpdate = true;
        if (cathodeGasCol && anodeGasCol) {
          const fill = THREE.MathUtils.clamp(state.gasCollectedMl / 24, 0.1, 1.4);
          cathodeGasCol.scale.y = fill * 1.4;
          anodeGasCol.scale.y = fill * 0.7;
        }
        if (splinterGroup && popFlashLight) {
          if (splinterAnim > 0.01) {
            splinterAnim *= Math.exp(-2.2 * dt);
            const arc = Math.sin(splinterAnim * Math.PI);
            splinterGroup.position.set(
              THREE.MathUtils.lerp(0.88, -0.02, arc),
              THREE.MathUtils.lerp(0.06, 1.18, arc),
              THREE.MathUtils.lerp(0.35, 0.04, arc)
            );
            popFlashLight.intensity = splinterAnim > 0.45 && splinterAnim < 0.7 ? 5.5 : 0;
          } else {
            splinterGroup.position.set(0.88, 0.06, 0.35);
            popFlashLight.intensity = 0;
          }
        }
      }

      // 3. ph_tile animations
      if (subMode === 'ph_tile') {
        const dropsShown = Math.min(6, Math.max(0, state.reagentAddedCount * 2));
        phWellDrops.forEach((drop, idx) => {
          drop.visible = idx < dropsShown;
          const targetS = idx < dropsShown ? 1 : 0.01;
          drop.scale.x = THREE.MathUtils.damp(drop.scale.x, targetS, 10, dt);
          drop.scale.z = THREE.MathUtils.damp(drop.scale.z, targetS, 10, dt);
        });

        if (phPipetteGroup && phFallingDrop) {
          const [wx, wz] = wellCoords[phTargetWellIdx];
          if (phPipetteAnim > 0.01) {
            phPipetteAnim *= Math.exp(-2.3 * dt);
            const arc = Math.sin(phPipetteAnim * Math.PI);
            phPipetteGroup.position.x = THREE.MathUtils.lerp(-0.98, wx + 0.06, arc);
            phPipetteGroup.position.y = 0.45 + arc * 0.12;
            phPipetteGroup.position.z = THREE.MathUtils.lerp(0.05, wz, arc);
            phPipetteGroup.rotation.z = THREE.MathUtils.lerp(-0.22, 0.08, arc);

            if (phPipetteAnim > 0.25 && phPipetteAnim < 0.75) {
              phFallingDrop.visible = true;
              const dropFall = (0.75 - phPipetteAnim) / 0.5;
              phFallingDrop.position.set(wx + 0.06, THREE.MathUtils.lerp(0.36, 0.07, dropFall), wz);
            } else {
              phFallingDrop.visible = false;
            }
          } else {
            phPipetteGroup.position.set(-0.98, 0.52, 0.05);
            phPipetteGroup.rotation.z = -0.22;
            phFallingDrop.visible = false;
          }
        }

        const targetHexes = [0xdc2626, 0x5b21b6, 0xf97316, 0xea580c, 0x22c55e, 0x06b6d4];
        phStripTipMats.forEach((mat, idx) => {
          const target = state.litmusTested ? targetHexes[idx] : 0xfacc15;
          _colorA.setHex(target);
          mat.color.lerp(_colorA, 1 - Math.exp(-8 * dt));
        });

        if (phStripsGroup) {
          if (phStripDipAnim > 0.01) {
            phStripDipAnim *= Math.exp(-2.2 * dt);
            const dip = Math.sin(phStripDipAnim * Math.PI);
            phStripsGroup.position.x = THREE.MathUtils.lerp(0.9, 0.12, dip);
            phStripsGroup.position.y = 0.025 + Math.sin(phStripDipAnim * Math.PI * 2) * 0.08;
            phStripsGroup.rotation.z = dip * 0.14;
          } else {
            phStripsGroup.position.x = THREE.MathUtils.damp(
              phStripsGroup.position.x,
              state.litmusTested ? 0.62 : 0.9,
              8,
              dt
            );
            phStripsGroup.position.y = THREE.MathUtils.damp(phStripsGroup.position.y, 0.025, 8, dt);
            phStripsGroup.rotation.z = THREE.MathUtils.damp(phStripsGroup.rotation.z, 0, 8, dt);
          }
        }
      }

      // 4. Thermal Decomposition (Chem 4) animations
      if (subMode === 'thermal_decomp' && decompCrystalMesh && decompCrystalMat && decompFlameMat && decompFlameCone && decompFlameLight && decompFumes && decompFumePhases) {
        decompCrystalMesh.visible = state.reagentAddedCount > 0 || state.solutionHeated;
        _colorA.setHex(state.solutionHeated ? 0x9a3412 : 0x4ade80);
        decompCrystalMat.color.lerp(_colorA, 1 - Math.exp(-4 * dt));

        decompFlameMat.uniforms.uTime.value = state.elapsedTime;
        decompFlameCone.visible = state.solutionHeated;
        decompFlameLight.intensity = state.solutionHeated ? 1.8 + Math.sin(state.elapsedTime * 14) * 0.2 : 0;

        for (let i = 0; i < 24; i++) {
          if (state.solutionHeated) {
            decompFumePhases[i] = (decompFumePhases[i] + dt * (0.45 + (i % 4) * 0.12)) % 1;
          }
          const p = decompFumePhases[i];
          _dummy.position.set(
            0.44 + p * 0.22 + Math.sin(i * 3.1 + p * 4) * 0.04,
            0.98 + p * 0.52,
            Math.cos(i * 2.7) * 0.04
          );
          _dummy.scale.setScalar(state.solutionHeated ? 0.7 + p * 0.8 : 0.001);
          _dummy.updateMatrix();
          decompFumes.setMatrixAt(i, _dummy.matrix);
        }
        decompFumes.instanceMatrix.needsUpdate = true;
      }

      // 5. Displacement & Reactivity Series Tube Racks (Chem 5 & 7)
      if (subMode === 'displacement') {
        if (immersedNailGroup && immersedNailMat && rackTubeFluids.length >= 2) {
          immersedNailGroup.visible = state.reagentAddedCount >= 1;
          _colorA.setHex(state.reagentAddedCount >= 1 ? 0x86efac : 0x0284c7);
          rackTubeFluids[1].color.lerp(_colorA, 1 - Math.exp(-4 * dt));
          _colorB.setHex(state.reagentAddedCount >= 2 ? 0xb45309 : 0xcbd5e1);
          immersedNailMat.color.lerp(_colorB, 1 - Math.exp(-4 * dt));
        }
      } else if (subMode === 'reactivity') {
        if (rackTubeFluids.length >= 4 && metalStripGroup.length >= 4) {
          const immersed = state.reagentAddedCount >= 1;
          const shifted = state.reagentAddedCount >= 2;
          metalStripGroup.forEach((mg, i) => {
            const tx = -0.45 + i * 0.3;
            mg.position.y = THREE.MathUtils.damp(mg.position.y, immersed ? 0.25 : 0, 8, dt);
            mg.position.z = THREE.MathUtils.damp(mg.position.z, immersed ? -0.61 : 0, 8, dt);
            mg.rotation.x = THREE.MathUtils.damp(mg.rotation.x, immersed ? Math.PI / 2 : 0, 8, dt);
            mg.position.x = THREE.MathUtils.damp(mg.position.x, immersed ? tx * 0.0 : 0, 8, dt);
          });
          if (shifted) {
            _colorA.setHex(0xdbeafe);
            rackTubeFluids[1].color.lerp(_colorA, 0.08);
            _colorB.setHex(0x86efac);
            rackTubeFluids[2].color.lerp(_colorB, 0.08);
          }
        }
      }

      // 6. General Reaction Beaker animations (Chem 2, 3, 6, 8, 9, 11, 12, 28-30)
      if (beakerFluidMat && precipitateDisk) {
        if (heaterRingMat) {
          heaterRingMat.emissiveIntensity = state.solutionHeated ? 1.9 : 0;
        }
        if (zincGranulesGroup) {
          zincGranulesGroup.visible = state.zincAdded;
        }

        if (dropperGroup && beakerDropStream) {
          if (bottlePourAnim > 0.01) {
            bottlePourAnim *= Math.exp(-2.6 * dt);
            const arc = Math.sin(bottlePourAnim * Math.PI);
            dropperGroup.position.x = THREE.MathUtils.lerp(-0.82, -0.24, arc);
            dropperGroup.position.y = arc * 0.78;
            dropperGroup.rotation.z = -arc * 0.85;
            beakerDropStream.visible = arc > 0.55;
          } else {
            dropperGroup.position.set(-0.82, 0, dropperGroup.position.z);
            dropperGroup.rotation.z = 0;
            beakerDropStream.visible = false;
          }
        }

        if (carbonateJar) {
          if (bottle2PourAnim > 0.01) {
            bottle2PourAnim *= Math.exp(-2.6 * dt);
            const arc = Math.sin(bottle2PourAnim * Math.PI);
            carbonateJar.position.y = arc * 0.48;
            carbonateJar.rotation.z = arc * 0.45;
          } else {
            carbonateJar.position.y = 0;
            carbonateJar.rotation.z = 0;
          }
        }

        if (zincJar) {
          if (solidPourAnim > 0.01 && state.zincAdded) {
            solidPourAnim *= Math.exp(-2.6 * dt);
            const arc = Math.sin(solidPourAnim * Math.PI);
            zincJar.position.y = arc * 0.42;
            zincJar.rotation.z = -arc * 0.4;
          } else {
            zincJar.position.y = 0;
            zincJar.rotation.z = 0;
          }
        }

        if (stirRodGroup) {
          if (stirAnim > 0.01) {
            stirAnim *= Math.exp(-2.4 * dt);
            stirRodGroup.rotation.y += dt * 11 * stirAnim;
          }
        }

        if (beakerLitmusStrip && beakerLitmusMat) {
          if (litmusDipAnim > 0.01) {
            litmusDipAnim *= Math.exp(-2.2 * dt);
            const dip = Math.sin(litmusDipAnim * Math.PI);
            beakerLitmusStrip.position.x = THREE.MathUtils.lerp(0.72, 0.05, dip);
            beakerLitmusStrip.position.y = 0.06 + dip * 0.52;
            beakerLitmusStrip.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, 0, dip);
          } else if (state.litmusTested) {
            beakerLitmusStrip.position.set(0.64, 0.06, 0.32);
            beakerLitmusStrip.rotation.x = -Math.PI / 2;
          }
          _colorA.setHex(state.litmusTested ? 0xef4444 : 0x3b82f6);
          beakerLitmusMat.color.lerp(_colorA, 1 - Math.exp(-8 * dt));
        }

        if (splinterGroup && popFlashLight) {
          if (splinterAnim > 0.01) {
            splinterAnim *= Math.exp(-2.2 * dt);
            const arc = Math.sin(splinterAnim * Math.PI);
            splinterGroup.position.set(
              THREE.MathUtils.lerp(0.95, 0.16, arc),
              THREE.MathUtils.lerp(0.06, 0.82, arc),
              THREE.MathUtils.lerp(-0.15, 0.04, arc)
            );
            popFlashLight.intensity = splinterAnim > 0.45 && splinterAnim < 0.72 ? 6.0 : 0;
          } else {
            splinterGroup.position.set(0.95, 0.06, -0.15);
            popFlashLight.intensity = 0;
          }
        }

        if (beakerBubbles && beakerBubblePhases) {
          const activeFizz =
            (subMode === 'acid_base' && (state.zincAdded || state.carbonateAdded || state.splinterTested || state.reagentAddedCount >= 3)) ||
            (subMode === 'acetic_acid' && (state.carbonateAdded || state.reagentAddedCount >= 2)) ||
            (subMode === 'quicklime' && state.reagentAddedCount > 0) ||
            state.solutionHeated;

          for (let i = 0; i < 36; i++) {
            if (activeFizz) {
              beakerBubblePhases[i] = (beakerBubblePhases[i] + dt * (0.55 + (i % 5) * 0.14)) % 1;
            }
            const ang = i * 2.1;
            const r = 0.05 + (i % 4) * 0.055;
            const yTop = subMode === 'quicklime' || state.solutionHeated ? 0.75 : 0.44;
            _dummy.position.set(Math.cos(ang) * r, 0.1 + beakerBubblePhases[i] * yTop, Math.sin(ang) * r);
            _dummy.scale.setScalar(activeFizz ? 1 : 0.001);
            _dummy.updateMatrix();
            beakerBubbles.setMatrixAt(i, _dummy.matrix);
          }
          beakerBubbles.instanceMatrix.needsUpdate = true;
        }

        if ((subMode === 'double_displacement' || subMode === 'common_ion') && state.reagentAddedCount > 0) {
          precipitateDisk.visible = true;
          _colorB.setHex(0xf1f5f9);
          beakerFluidMat.color.lerp(_colorB, 0.1);
          beakerFluidMat.opacity = 0.88;
        } else if (subMode === 'quicklime' && state.reagentAddedCount > 0) {
          precipitateDisk.visible = true;
          _colorB.setHex(0xf8fafc);
          beakerFluidMat.color.lerp(_colorB, 0.12);
          beakerFluidMat.opacity = 0.9;
        } else if (subMode === 'saponification' && (state.saltAddedG > 0 || state.beakerStirred)) {
          precipitateDisk.visible = true;
          _colorB.setHex(0xfef3c7);
          beakerFluidMat.color.lerp(_colorB, 0.1);
          beakerFluidMat.opacity = 0.88;
        } else if (subMode === 'equilibrium' && state.reagentAddedCount > 0) {
          _colorB.setHex(state.reagentAddedCount >= 3 ? 0xfca5a5 : 0x7f1d1d);
          beakerFluidMat.color.lerp(_colorB, 0.12);
          beakerFluidMat.opacity = 0.85;
        } else if (subMode === 'acid_base' && (state.litmusTested || state.reagentAddedCount > 0)) {
          _colorB.setHex(state.reagentAddedCount > 1 ? 0x38bdf8 : 0xf43f5e);
          beakerFluidMat.color.lerp(_colorB, 0.12);
        } else if (subMode === 'enthalpy_neut' && state.reagentAddedCount > 0) {
          _colorB.setHex(0xfda4af);
          beakerFluidMat.color.lerp(_colorB, 0.1);
        } else if (subMode === 'enthalpy_sol' && state.saltAddedG > 0) {
          _colorB.setHex(0xe0f2fe);
          beakerFluidMat.color.lerp(_colorB, 0.1);
        } else if (subMode === 'kinetics_cross' && kineticsStartTime !== null) {
          const dtK = Math.max(0, state.elapsedTime - kineticsStartTime);
          const cloud = THREE.MathUtils.clamp(dtK / 8, 0, 1);
          _colorB.setHex(0xfef08a);
          beakerFluidMat.color.lerp(_colorB, 0.12);
          beakerFluidMat.opacity = 0.38 + cloud * 0.6;
        }
      }

      if (thermometerCol) {
        const tScale = THREE.MathUtils.clamp((state.tempC - 15) / 60, 0.2, 1.35);
        thermometerCol.scale.y = THREE.MathUtils.damp(thermometerCol.scale.y, tScale, 8, dt);
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
