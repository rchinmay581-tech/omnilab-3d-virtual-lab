import * as THREE from 'three';
import { labAudio } from '../../audio/LabAudioEngine';
import { ExperimentConfig, RigState } from '../../types/lab';
import { addContactShadow, LabMaterials } from '../labEnvironment';
import {
  createMicroscopeSlideTexture,
  createStopwatchDialTexture,
} from '../proceduralTextures';
import { makeBenchPlaque, makeLabeledBottle } from './rigHelpers';
import { DragTarget, LabRig } from './rigTypes';

/**
 * 3D Biology Microscopy, Dissection & Physiology Rig (Biology 1-30)
 * Complete 3D equipment parity across all 30 experiments:
 * - Left: 10-part Compound Microscope with sliding glass slide, stain drop,
 *   Coarse/Fine focus knobs, revolving 10x/45x/100x nosepiece, and substage mirror.
 * - Right Bench Station (for EVERY bio subMode):
 *   - Respiration (bio-3): Flask + Germinating Gram Seeds + Rubber Cork + Suspended KOH Vial + Bent Tube + Red Water Beaker
 *   - Osmoscope (bio-15): Water Beaker + Peeled Potato Cup + Pin Marker + Conc. Sugar Bottle
 *   - Plasmolysis (bio-16): Rhoeo Leaf Peel Beaker + 5% NaCl Dropper Bottle + Forceps
 *   - Imbibition (bio-17): Water Beaker + Swelling Raisins + Filter Paper Blot Sheet + Digital Balance (10.0→18.5g)
 *   - Transpiration (bio-19): Leafy Twig + Potometer + Upper & Lower CoCl₂ Strips with Clips + Stopwatch
 *   - Chromatography (bio-20): Jar + Rubber Cork + Strip + 4 Separating Pigment Bands (Chl-b, Chl-a, Xanthophyll, Carotene) + Pet. Ether & Spinach Extract
 *   - Food Tests (bio-21): 4-Well Tile + Iodine, Benedict's & Biuret Bottles + Filter Paper Grease Spot (color-accurate per test)
 *   - Amylase (bio-22): 4-Well Tile + 37°C Water Bath Beaker with Tube A & B + Iodine Dropper Bottle
 *   - Skeleton (bio-23): Articulated Joint (distal condyles, capsule, radius+ulna) + 206 Bones Chart
 *   - All Microscopy & Botanical Prep Modes: Preparation Tray with subMode-specific Stain Bottle
 *     (Safranin / Acetocarmine / Cotton Blue / Methylene Blue / 10% Sucrose), Glycerine Bottle,
 *     Coverslips & Slides Boxes, Forceps, and Watch Glass / Specimen Prop (Carrot, Potato Tuber,
 *     Nepenthes Leaf, Hibiscus Flower, Herbarium Sheet, Sprouting Onion Bulb in H₂O, Tradescantia Leaf, Petri Dish)
 */
export function createBiologyRig(
  subMode: string,
  materials: LabMaterials,
  maxAniso: number
): LabRig {
  const group = new THREE.Group();
  const dragTargets: DragTarget[] = [];
  const disposables: { dispose: () => void }[] = [];

  addContactShadow(group, materials.contactShadow, 1.55, 0.002);

  let prevSlidePlaced = false;
  let slidePlaceAnim = 0;

  // Compound Microscope always offset left so right side cleanly holds experiment benchware
  const scopeGroup = new THREE.Group();
  scopeGroup.position.set(-0.62, 0, 0);

  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.82), materials.darkAnodized);
  basePlate.position.set(0, 0.04, 0);
  basePlate.castShadow = true;
  scopeGroup.add(basePlate);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.48, 20), materials.darkAnodized);
  pillar.position.set(0, 0.28, -0.22);
  scopeGroup.add(pillar);

  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.45, -0.22),
    new THREE.Vector3(0, 0.85, -0.34),
    new THREE.Vector3(0, 1.25, -0.18),
    new THREE.Vector3(0, 1.32, 0.04),
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 28, 0.048, 14, false);
  disposables.push(armGeo);
  const armMesh = new THREE.Mesh(armGeo, materials.darkAnodized);
  armMesh.castShadow = true;
  scopeGroup.add(armMesh);

  const stage = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.52), materials.darkAnodized);
  stage.position.set(0, 0.62, 0.04);
  stage.castShadow = true;
  scopeGroup.add(stage);

  for (const cx of [-0.16, 0.16]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.14), materials.brass);
    clip.position.set(cx, 0.65, 0.04);
    scopeGroup.add(clip);
  }

  // Glass Slide on Stage + animated Stain Droplet
  const slideTex = createMicroscopeSlideTexture(subMode, maxAniso);
  const slideMat = new THREE.MeshBasicMaterial({ map: slideTex });
  disposables.push(slideTex, slideMat);

  const slideGroup = new THREE.Group();
  slideGroup.position.set(0, 0.65, 0.04);
  const glassSlide = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.012, 0.12), materials.borosilicateGlass);
  const specimenPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.09), slideMat);
  specimenPatch.rotation.x = -Math.PI / 2;
  specimenPatch.position.y = 0.008;
  slideGroup.add(glassSlide, specimenPatch);
  scopeGroup.add(slideGroup);

  const stainMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.9 });
  disposables.push(stainMat);
  const stainDrop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), stainMat);
  stainDrop.position.set(0, 0.72, 0.04);
  stainDrop.visible = false;
  scopeGroup.add(stainDrop);

  // Substage Mirror
  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(0, 0.34, 0.04);
  const mirrorDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 24), materials.brushedSteel);
  mirrorGroup.add(mirrorDisc);
  scopeGroup.add(mirrorGroup);

  // Body Tube + Eyepiece + Revolving Nosepiece
  const bodyTubeGroup = new THREE.Group();
  bodyTubeGroup.position.set(0, 1.15, 0.04);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.56, 24), materials.brushedSteel);
  tube.position.y = 0.18;
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.052, 0.16, 24), materials.darkAnodized);
  eyepiece.position.y = 0.52;
  bodyTubeGroup.add(tube, eyepiece);

  const nosepieceGroup = new THREE.Group();
  nosepieceGroup.position.set(0, -0.1, 0);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24), materials.darkAnodized);
  nosepieceGroup.add(turret);

  const objPowers = [10, 45, 100];
  objPowers.forEach((pwr, i) => {
    const ang = (i * Math.PI * 2) / 3;
    const objLen = pwr === 10 ? 0.14 : pwr === 45 ? 0.2 : 0.25;
    const obj = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.02, objLen, 16),
      i === 0 ? materials.brass : i === 1 ? materials.brushedSteel : materials.copper
    );
    obj.position.set(Math.sin(ang) * 0.065, -objLen / 2 - 0.02, Math.cos(ang) * 0.065);
    nosepieceGroup.add(obj);
  });
  bodyTubeGroup.add(nosepieceGroup);
  scopeGroup.add(bodyTubeGroup);

  // Coarse & Fine Focus Knobs
  const coarsePivot = new THREE.Group();
  coarsePivot.position.set(0, 1.05, -0.24);
  coarsePivot.rotation.z = Math.PI / 2;
  const coarseKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.26, 24), materials.brass);
  coarsePivot.add(coarseKnob);
  scopeGroup.add(coarsePivot);

  const finePivot = new THREE.Group();
  finePivot.position.set(0, 0.88, -0.26);
  finePivot.rotation.z = Math.PI / 2;
  const fineKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.31, 24), materials.brushedSteel);
  finePivot.add(fineKnob);
  scopeGroup.add(finePivot);

  group.add(scopeGroup);

  dragTargets.push({
    mesh: coarseKnob,
    label: 'Coarse Focus Knob (drag to adjust focus)',
    onDrag: (dx, _dy, state, onPatch) => {
      const next = THREE.MathUtils.clamp(state.coarseFocus + dx * 0.8, 0, 1);
      onPatch({ coarseFocus: Number(next.toFixed(3)) });
    },
  });

  dragTargets.push({
    mesh: fineKnob,
    label: 'Fine Focus Knob (drag for razor-sharp focus)',
    onDrag: (dx, _dy, state, onPatch) => {
      const next = THREE.MathUtils.clamp(state.fineFocus + dx * 0.8, 0, 1);
      onPatch({ fineFocus: Number(next.toFixed(3)) });
    },
  });

  dragTargets.push({
    mesh: nosepieceGroup,
    label: 'Revolving Objective Nosepiece (click to switch 10x / 45x / 100x)',
    onClick: (state, onPatch) => {
      labAudio.playMetallicTick(3200, 0.65);
      const next = state.objectivePower === 10 ? 45 : state.objectivePower === 45 ? 100 : 10;
      onPatch({ objectivePower: next });
    },
  });

  dragTargets.push({
    mesh: mirrorGroup,
    label: 'Substage Mirror (click to adjust light field)',
    onClick: (state, onPatch) => {
      labAudio.playMetallicTick(1800, 0.35);
      onPatch({ mirrorAngle: state.mirrorAngle > 0.2 ? 0 : 0.45 });
    },
  });

  dragTargets.push({
    mesh: stage,
    label: 'Microscope Stage & Slide (click to place/stain slide)',
    onClick: (_state, onPatch) => {
      labAudio.playMetallicTick(2100, 0.45);
      onPatch({ slidePlaced: true, stainAdded: true, coverslipPlaced: true });
    },
  });

  // Bench-side 3D physiological / dissection props
  let sugarCol: THREE.Mesh | null = null;
  let respWaterCol: THREE.Mesh | null = null;
  let jointBoneLower: THREE.Group | null = null;
  const spotWells: THREE.MeshStandardMaterial[] = [];
  const swellingSeeds: THREE.Mesh[] = [];
  let transpirationBubble: THREE.Mesh | null = null;
  let cobaltLowerMat: THREE.MeshStandardMaterial | null = null;
  let cobaltUpperMat: THREE.MeshStandardMaterial | null = null;
  const pigmentBands: THREE.Mesh[] = [];

  if (subMode === 'osmoscope') {
    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.65, 28), materials.borosilicateGlass);
    beaker.position.set(0.62, 0.33, 0);
    beaker.renderOrder = 3;
    group.add(beaker);

    // Pure Water inside outer beaker
    const pureWaterMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.42 });
    disposables.push(pureWaterMat);
    const pureWater = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.31, 0.36, 24), pureWaterMat);
    pureWater.position.set(0.62, 0.2, 0);
    group.add(pureWater);

    const potatoMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.85 });
    disposables.push(potatoMat);
    const potato = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.52, 20), potatoMat);
    potato.position.set(0.62, 0.28, 0);
    group.add(potato);

    // Pin Marker on potato cavity rim
    const pinMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), materials.brass);
    pinMarker.rotation.z = Math.PI / 2;
    pinMarker.position.set(0.76, 0.46, 0.08);
    group.add(pinMarker);

    const sugarMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.88 });
    disposables.push(sugarMat);
    sugarCol = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 16), sugarMat);
    sugarCol.position.set(0.62, 0.38, 0);
    group.add(sugarCol);

    const sugarBottle = makeLabeledBottle({
      formula: 'Sugar Soln',
      name: 'Conc. Sucrose',
      liquidColor: 0xfef3c7,
      bandColor: '#d97706',
      dropperCap: true,
      pos: [1.18, 0, 0.18],
      materials,
      maxAniso,
      disposables,
    });
    group.add(sugarBottle);

    dragTargets.push({
      mesh: sugarBottle,
      label: 'Conc. Sugar Bottle (click to fill potato cavity & mark pin)',
      onClick: (_state, onPatch) => {
        labAudio.playLiquidPour(0.35);
        onPatch({ slidePlaced: true });
      },
    });
    dragTargets.push({
      mesh: potato,
      label: 'Potato Osmoscope (click to advance osmosis)',
      onClick: (state, onPatch) => {
        labAudio.playLiquidPour(0.3);
        onPatch({ slidePlaced: true, osmosisTimeHr: Math.min(2.5, state.osmosisTimeHr + 0.8) });
      },
    });
  } else if (subMode === 'imbibition' || subMode === 'plasmolysis') {
    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.58, 28), materials.borosilicateGlass);
    beaker.position.set(0.62, 0.3, 0);
    beaker.renderOrder = 3;
    group.add(beaker);

    const waterMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.45 });
    disposables.push(waterMat);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.28, 0.4, 24), waterMat);
    water.position.set(0.62, 0.22, 0);
    group.add(water);

    const seedMat = new THREE.MeshStandardMaterial({
      color: subMode === 'plasmolysis' ? 0x9333ea : 0xd97706,
      roughness: 0.6,
    });
    disposables.push(seedMat);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), seedMat);
      seed.position.set(0.62 + Math.cos(ang) * 0.12, 0.08, Math.sin(ang) * 0.12);
      swellingSeeds.push(seed);
      group.add(seed);
    }

    if (subMode === 'plasmolysis') {
      const naclBottle = makeLabeledBottle({
        formula: '5% NaCl',
        name: 'Hypertonic Soln',
        liquidColor: 0xe0f2fe,
        bandColor: '#7c3aed',
        dropperCap: true,
        pos: [1.14, 0, 0.18],
        materials,
        maxAniso,
        disposables,
      });
      group.add(naclBottle);
      dragTargets.push({
        mesh: naclBottle,
        label: '5% NaCl Bottle (click to mount Rhoeo peel & advance plasmolysis)',
        onClick: (state, onPatch) => {
          labAudio.playDroplet();
          onPatch({ slidePlaced: true, stainAdded: true, osmosisTimeHr: Math.min(2.0, state.osmosisTimeHr + 0.6) });
        },
      });
    } else {
      // Filter Paper Blot Sheet & Compact Digital Balance
      const blotPaper = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.28), materials.ceramicWhite);
      blotPaper.position.set(1.16, 0.006, 0.22);
      const balanceBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.34), materials.darkAnodized);
      balanceBody.position.set(1.16, 0.035, -0.22);
      const balancePan = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 20), materials.brushedSteel);
      balancePan.position.set(1.16, 0.078, -0.22);
      group.add(blotPaper, balanceBody, balancePan);
      group.add(makeBenchPlaque('10.0g → 18.5g', 'Digital Balance', '#d97706', [1.16, 0.08, -0.45], materials, maxAniso, disposables, 0.82));
    }

    dragTargets.push({
      mesh: beaker,
      label: subMode === 'plasmolysis' ? 'Hypertonic Beaker (click to advance plasmolysis)' : 'Imbibition Beaker (click to soak raisins)',
      onClick: (state, onPatch) => {
        labAudio.playLiquidPour(0.3);
        onPatch({ slidePlaced: true, osmosisTimeHr: Math.min(2.5, state.osmosisTimeHr + 0.8) });
      },
    });
  } else if (subMode === 'transpiration') {
    const potBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.4), materials.wood);
    potBase.position.set(0.68, 0.025, 0);
    group.add(potBase);

    const capTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 14), materials.borosilicateGlass);
    capTube.rotation.z = Math.PI / 2;
    capTube.position.set(0.68, 0.25, 0);
    group.add(capTube);

    const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
    disposables.push(bubbleMat);
    transpirationBubble = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), bubbleMat);
    transpirationBubble.position.set(0.95, 0.25, 0);
    group.add(transpirationBubble);

    const twigMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
    disposables.push(twigMat);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.48, 12), twigMat);
    stem.position.set(0.36, 0.45, 0);
    const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), twigMat);
    leaf1.scale.set(1.5, 0.16, 0.85);
    leaf1.position.set(0.48, 0.65, 0.06);
    const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), twigMat);
    leaf2.scale.set(1.3, 0.16, 0.75);
    leaf2.position.set(0.26, 0.58, -0.05);
    group.add(stem, leaf1, leaf2);

    // Upper & Lower CoCl2 Strips with Glass Slides & Clips
    cobaltUpperMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 });
    cobaltLowerMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 });
    disposables.push(cobaltUpperMat, cobaltLowerMat);

    const upperStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.08), cobaltUpperMat);
    upperStrip.position.set(0.5, 0.685, 0.06);
    const lowerStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.08), cobaltLowerMat);
    lowerStrip.position.set(0.5, 0.618, 0.06);
    const glassClip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.1), materials.borosilicateGlass);
    glassClip.position.set(0.5, 0.7, 0.06);
    group.add(upperStrip, lowerStrip, glassClip);

    // 3D Stop-Clock beside potometer
    const swGroup = new THREE.Group();
    swGroup.position.set(1.18, 0.04, 0.25);
    const swBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.3), materials.darkAnodized);
    const swTex = createStopwatchDialTexture('CoCl₂ TIME', '4m / 14m', maxAniso);
    const swMat = new THREE.MeshStandardMaterial({ map: swTex, roughness: 0.35 });
    disposables.push(swTex, swMat);
    const swFace = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), swMat);
    swFace.rotation.x = -Math.PI / 2;
    swFace.position.y = 0.038;
    swGroup.add(swBody, swFace);
    group.add(swGroup);

    dragTargets.push({
      mesh: upperStrip,
      label: 'Cobalt Chloride Strips (click to clip onto leaf)',
      onClick: (_state, onPatch) => {
        labAudio.playMetallicTick(2100, 0.45);
        onPatch({ cobaltBlueTested: true });
      },
    });
    dragTargets.push({
      mesh: swGroup,
      label: 'Transpiration Stop-Clock (click to advance moisture exposure)',
      onClick: (state, onPatch) => {
        labAudio.playMetallicTick(2300, 0.4);
        onPatch({ cobaltBlueTested: true, osmosisTimeHr: Math.min(2.0, state.osmosisTimeHr + 0.5) });
      },
    });
  } else if (subMode === 'chromatography') {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.95, 28), materials.borosilicateGlass);
    jar.position.set(0.62, 0.48, 0);
    jar.renderOrder = 3;
    group.add(jar);

    // Rubber Cork Stopper at jar top holding strip
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.09, 24), materials.rubberBlack);
    cork.position.set(0.62, 0.95, 0);
    group.add(cork);

    // Solvent pool (Pet. Ether : Acetone 9:1)
    const solvMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.5 });
    disposables.push(solvMat);
    const solvPool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 24), solvMat);
    solvPool.position.set(0.62, 0.08, 0);
    group.add(solvPool);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.01), materials.ceramicWhite);
    strip.position.set(0.62, 0.5, 0);
    group.add(strip);

    // 4 Ascending Plant Pigment Bands (Chl-b, Chl-a, Xanthophyll, Carotene)
    const bandColors = [0x65a30d, 0x059669, 0xfacc15, 0xf97316];
    bandColors.forEach((hex) => {
      const bMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5 });
      disposables.push(bMat);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.162, 0.045, 0.014), bMat);
      band.position.set(0.62, 0.2, 0);
      pigmentBands.push(band);
      group.add(band);
    });

    const extractBottle = makeLabeledBottle({
      formula: 'Spinach',
      name: 'Pigment Extract',
      liquidColor: 0x15803d,
      bandColor: '#16a34a',
      dropperCap: true,
      pos: [1.15, 0, 0.18],
      materials,
      maxAniso,
      disposables,
    });
    const etherBottle = makeLabeledBottle({
      formula: 'Pet. Ether',
      name: 'Acetone 9:1',
      liquidColor: 0xe0f2fe,
      bandColor: '#0284c7',
      dropperCap: false,
      pos: [1.15, 0, -0.22],
      materials,
      maxAniso,
      disposables,
    });
    group.add(extractBottle, etherBottle);

    dragTargets.push({
      mesh: extractBottle,
      label: 'Spinach Extract Dropper (click to spot pigment & suspend strip)',
      onClick: (_state, onPatch) => {
        labAudio.playDroplet();
        onPatch({ slidePlaced: true });
      },
    });
    dragTargets.push({
      mesh: jar,
      label: 'Chromatography Jar (click to run solvent separation)',
      onClick: (_state, onPatch) => {
        labAudio.playLiquidPour(0.35);
        onPatch({ slidePlaced: true, chromatographyProgress: 1 });
      },
    });
  } else if (subMode === 'respiration') {
    const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.65, 24), materials.borosilicateGlass);
    flask.position.set(0.5, 0.33, 0);
    flask.renderOrder = 3;
    group.add(flask);

    // Rubber Cork Stopper
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.105, 0.08, 20), materials.rubberBlack);
    cork.position.set(0.5, 0.66, 0);
    group.add(cork);

    // Germinating Gram Seeds inside flask base
    const gramMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    disposables.push(gramMat);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), gramMat);
      seed.position.set(0.5 + Math.cos(a) * 0.13, 0.06, Math.sin(a) * 0.13);
      group.add(seed);
    }

    // Suspended KOH Vial inside flask neck
    const kohVial = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 14), materials.borosilicateGlass);
    kohVial.position.set(0.5, 0.44, 0.02);
    const kohPellets = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.06, 12), materials.ceramicWhite);
    kohPellets.position.set(0.5, 0.4, 0.02);
    group.add(kohVial, kohPellets);

    const tubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.5, 0.68, 0),
      new THREE.Vector3(0.5, 0.92, 0),
      new THREE.Vector3(1.05, 0.92, 0),
      new THREE.Vector3(1.05, 0.25, 0),
    ]);
    const tubeGeo = new THREE.TubeGeometry(tubeCurve, 24, 0.02, 10, false);
    disposables.push(tubeGeo);
    const bentTube = new THREE.Mesh(tubeGeo, materials.borosilicateGlass);
    group.add(bentTube);

    // Beaker of Red-Colored Water beneath delivery tube tip
    const waterBeaker = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.36, 22), materials.borosilicateGlass);
    waterBeaker.position.set(1.05, 0.18, 0);
    waterBeaker.renderOrder = 3;
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.72 });
    disposables.push(redMat);
    const beakerRed = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.145, 0.22, 20), redMat);
    beakerRed.position.set(1.05, 0.12, 0);
    group.add(waterBeaker, beakerRed);

    const respMat = new THREE.MeshStandardMaterial({ color: 0xe11d48 });
    disposables.push(respMat);
    respWaterCol = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 10), respMat);
    respWaterCol.position.set(1.05, 0.32, 0);
    group.add(respWaterCol);

    dragTargets.push({
      mesh: flask,
      label: 'Respiration Flask & KOH Vial (click to seal & advance CO₂ absorption)',
      onClick: (state, onPatch) => {
        labAudio.playLiquidPour(0.3);
        onPatch({ slidePlaced: true, osmosisTimeHr: Math.min(2.5, state.osmosisTimeHr + 1.0) });
      },
    });
  } else if (subMode === 'amylase' || subMode === 'food_test') {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.55), materials.ceramicWhite);
    tile.position.set(0.62, 0.025, 0.18);
    group.add(tile);

    for (let i = 0; i < 4; i++) {
      const wMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
      disposables.push(wMat);
      spotWells.push(wMat);
      const well = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), wMat);
      well.position.set(0.39 + i * 0.15, 0.052, 0.18);
      group.add(well);
    }

    const iodineBottle = makeLabeledBottle({
      formula: 'I₂ / KI',
      name: 'Iodine Reagent',
      liquidColor: 0xb45309,
      bandColor: '#d97706',
      amber: true,
      dropperCap: true,
      pos: [1.18, 0, -0.22],
      materials,
      maxAniso,
      disposables,
    });
    group.add(iodineBottle);

    if (subMode === 'food_test') {
      const benedictBottle = makeLabeledBottle({
        formula: "Benedict's",
        name: 'Reducing Sugar',
        liquidColor: 0x0284c7,
        bandColor: '#0284c7',
        dropperCap: true,
        pos: [0.42, 0, -0.26],
        materials,
        maxAniso,
        disposables,
      });
      const biuretBottle = makeLabeledBottle({
        formula: 'Biuret',
        name: 'NaOH + CuSO₄',
        liquidColor: 0x38bdf8,
        bandColor: '#7c3aed',
        dropperCap: true,
        pos: [0.78, 0, -0.26],
        materials,
        maxAniso,
        disposables,
      });
      // Filter Paper Grease Spot sheet
      const greasePaper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.22), materials.ceramicWhite);
      greasePaper.position.set(1.18, 0.004, 0.22);
      const greaseMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, transparent: true, opacity: 0.7 });
      disposables.push(greaseMat);
      const greaseSpot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), greaseMat);
      greaseSpot.rotation.x = -Math.PI / 2;
      greaseSpot.position.set(1.18, 0.01, 0.22);
      group.add(benedictBottle, biuretBottle, greasePaper, greaseSpot);
    } else {
      // Amylase: 37 °C Water Bath Beaker holding Tube A (Saliva+Starch) & Tube B (Control)
      const bathBeaker = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.38, 24), materials.borosilicateGlass);
      bathBeaker.position.set(0.62, 0.19, -0.26);
      bathBeaker.renderOrder = 3;
      const bathWaterMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.45 });
      disposables.push(bathWaterMat);
      const bathWater = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.185, 0.25, 22), bathWaterMat);
      bathWater.position.set(0.62, 0.14, -0.26);
      const tubeA = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.48, 16), materials.borosilicateGlass);
      tubeA.position.set(0.56, 0.28, -0.26);
      const tubeB = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.48, 16), materials.borosilicateGlass);
      tubeB.position.set(0.68, 0.28, -0.26);
      group.add(bathBeaker, bathWater, tubeA, tubeB);
      group.add(makeBenchPlaque('37°C BATH', 'Tube A & B Assay', '#10b981', [0.22, 0.04, -0.26], materials, maxAniso, disposables, 0.78));

      dragTargets.push({
        mesh: bathBeaker,
        label: '37 °C Water Bath (click to mix saliva + 1% starch)',
        onClick: (_state, onPatch) => {
          labAudio.playSwirl();
          onPatch({ slidePlaced: true });
        },
      });
    }

    const triggerWellTest = (state: RigState, onPatch: (p: Partial<RigState>) => void) => {
      labAudio.playDroplet();
      onPatch({ spotTileTested: Math.min(5, state.spotTileTested + 1) });
    };
    dragTargets.push({
      mesh: tile,
      label: 'Spotting Tile (click to perform next reagent test)',
      onClick: triggerWellTest,
    });
    dragTargets.push({
      mesh: iodineBottle,
      label: 'Iodine Dropper Bottle (click to add indicator drop)',
      onClick: triggerWellTest,
    });
  } else if (subMode === 'skeleton') {
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xf1f5e9, roughness: 0.52 });
    const cartMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.55, roughness: 0.2 });
    disposables.push(boneMat, cartMat);

    // Humerus shaft + distal condyles
    const upperBone = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.65, 16), boneMat);
    upperBone.position.set(0.62, 0.85, 0);
    const condyleL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), boneMat);
    condyleL.position.set(0.58, 0.53, 0);
    const condyleR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), boneMat);
    condyleR.position.set(0.66, 0.53, 0);
    group.add(upperBone, condyleL, condyleR);

    jointBoneLower = new THREE.Group();
    jointBoneLower.position.set(0.62, 0.52, 0);
    const hingeBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 18), boneMat);
    const capsuleRing = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.015, 10, 22), cartMat);
    capsuleRing.rotation.x = Math.PI / 2;
    // Paired Radius & Ulna bones
    const radiusBone = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.56, 14), boneMat);
    radiusBone.position.set(-0.045, -0.28, 0);
    const ulnaBone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.58, 14), boneMat);
    ulnaBone.position.set(0.045, -0.28, 0);
    jointBoneLower.add(hingeBall, capsuleRing, radiusBone, ulnaBone);
    group.add(jointBoneLower);

    const skelPlaque = makeBenchPlaque('206 BONES', 'Axial + Appendicular', '#0284c7', [1.14, 0.05, 0.22], materials, maxAniso, disposables, 0.92);
    group.add(skelPlaque);

    dragTargets.push({
      mesh: skelPlaque,
      label: 'Skeleton Atlas Plaque (click to inspect osteology)',
      onClick: (_state, onPatch) => {
        labAudio.playMetallicTick(2100, 0.4);
        onPatch({ slidePlaced: true });
      },
    });
    dragTargets.push({
      mesh: jointBoneLower,
      label: 'Articulated Skeleton Joint (drag to flex/extend)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.jointAngleDeg + dx * 60, -20, 90);
        onPatch({ jointAngleDeg: Math.round(next) });
      },
    });
  } else {
    // All Microscopy & Botanical Prep Modes (bio-1, 2, 4-14, 18, 24-30):
    // Preparation & Dissection Tray with Stain Bottle, Glycerine Bottle, Coverslip Box, Forceps, & SubMode Specimen!
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.62), materials.ceramicWhite);
    tray.position.set(0.68, 0.02, 0.14);
    group.add(tray);

    // Stain Selection by SubMode
    const stainSpec: Record<string, { f: string; n: string; c: number; b: string }> = {
      mitosis: { f: 'Acetocarm.', n: 'Nuclear Stain', c: 0x9f1239, b: '#be123c' },
      nucleic_acid: { f: 'Acetocarm.', n: 'DNA/RNA Stain', c: 0x9f1239, b: '#be123c' },
      pollen_tube: { f: 'Cotton Blue', n: 'Lactophenol', c: 0x2563eb, b: '#2563eb' },
      microbes: { f: 'Cotton Blue', n: 'Fungal Stain', c: 0x2563eb, b: '#2563eb' },
      animal_tissues: { f: 'Meth. Blue', n: 'Tissue Stain', c: 0x1d4ed8, b: '#1d4ed8' },
      blastula: { f: 'H&E Stain', n: 'Histology Stain', c: 0xdb2777, b: '#db2777' },
      pollen_germ: { f: '10% Sucrose', n: '+ Boric Acid', c: 0xfef3c7, b: '#d97706' },
    };
    const st = stainSpec[subMode] || { f: 'Safranin', n: 'Plant Stain', c: 0xe11d48, b: '#e11d48' };

    const stainBottle = makeLabeledBottle({
      formula: st.f,
      name: st.n,
      liquidColor: st.c,
      bandColor: st.b,
      dropperCap: true,
      pos: [1.18, 0, -0.22],
      materials,
      maxAniso,
      disposables,
    });
    const glycerineBottle = makeLabeledBottle({
      formula: 'Glycerine',
      name: 'Mounting Medium',
      liquidColor: 0xf8fafc,
      bandColor: '#0ea5e9',
      dropperCap: true,
      pos: [0.85, 0, -0.26],
      materials,
      maxAniso,
      disposables,
    });
    group.add(stainBottle, glycerineBottle);

    // Coverslip & Glass Slide Box + Forceps on Tray
    const covBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), materials.darkAnodized);
    covBox.position.set(0.45, 0.06, 0.34);
    const forceps = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.025), materials.brushedSteel);
    forceps.rotation.y = 0.35;
    forceps.position.set(0.75, 0.046, 0.34);
    group.add(covBox, forceps);

    // Distinct Watch Glass / Specimen Prop per subMode
    if (subMode === 'root_mod') {
      const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.65 });
      disposables.push(carrotMat);
      const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.36, 16), carrotMat);
      carrot.rotation.z = Math.PI / 2;
      carrot.position.set(0.68, 0.09, 0.12);
      group.add(carrot);
    } else if (subMode === 'stem_mod') {
      const tuberMat = new THREE.MeshStandardMaterial({ color: 0xb48a5a, roughness: 0.85 });
      disposables.push(tuberMat);
      const tuber = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), tuberMat);
      tuber.scale.set(1.4, 0.75, 0.95);
      tuber.position.set(0.68, 0.12, 0.12);
      group.add(tuber);
    } else if (subMode === 'herbarium') {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.015, 0.42), materials.ceramicWhite);
      sheet.position.set(0.68, 0.05, 0.12);
      const twigMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      disposables.push(twigMat);
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.34, 10), twigMat);
      twig.rotation.z = Math.PI / 2.3;
      twig.position.set(0.68, 0.065, 0.12);
      group.add(sheet, twig);
      group.add(makeBenchPlaque('41 × 29 cm', 'Herbarium Sheet', '#16a34a', [1.18, 0.04, 0.24], materials, maxAniso, disposables, 0.85));
    } else if (subMode === 'mitosis') {
      // Sprouting Onion Bulb over Water Beaker + 1N HCl
      const oBeaker = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.28, 20), materials.borosilicateGlass);
      oBeaker.position.set(0.68, 0.18, 0.12);
      oBeaker.renderOrder = 3;
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.6 });
      disposables.push(bulbMat);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), bulbMat);
      bulb.position.set(0.68, 0.34, 0.12);
      group.add(oBeaker, bulb);
    } else if (
      subMode === 'inflorescence' ||
      subMode === 'plant_families' ||
      subMode === 'pollen_germ' ||
      subMode === 'pollen_tube' ||
      subMode === 'ovary_ts'
    ) {
      const specMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
      const petalMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
      disposables.push(specMat, petalMat);
      const specStem = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.32, 14), specMat);
      specStem.rotation.z = Math.PI / 2;
      specStem.position.set(0.64, 0.08, 0.12);
      const blossom = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.034, 10, 18), petalMat);
      blossom.rotation.x = Math.PI / 2;
      blossom.position.set(0.8, 0.09, 0.12);
      group.add(specStem, blossom);
    } else if (subMode === 'stomata' || subMode === 'stomata_dist' || subMode === 'leaf_mod' || subMode === 'ts_dicot_monocot') {
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
      disposables.push(leafMat);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10), leafMat);
      leaf.scale.set(1.5, 0.14, 0.85);
      leaf.position.set(0.68, 0.065, 0.12);
      group.add(leaf);
    } else {
      // Petri Dish / Prepared Specimen Dish (microscope_intro, microbes, animal_specimens, animal_tissues, nucleic_acid, blastula, pathogens)
      const petri = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 24), materials.borosilicateGlass);
      petri.position.set(0.68, 0.065, 0.12);
      petri.renderOrder = 3;
      const agarMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, transparent: true, opacity: 0.72 });
      disposables.push(agarMat);
      const agar = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.025, 22), agarMat);
      agar.position.set(0.68, 0.055, 0.12);
      group.add(petri, agar);
    }

    const mountAction = (_state: RigState, onPatch: (p: Partial<RigState>) => void) => {
      labAudio.playDroplet();
      onPatch({ slidePlaced: true, stainAdded: true, coverslipPlaced: true });
    };
    dragTargets.push({
      mesh: stainBottle,
      label: `${st.f} Dropper Bottle (click to stain & mount slide)`,
      onClick: mountAction,
    });
    dragTargets.push({
      mesh: tray,
      label: 'Dissection & Slide Prep Tray (click to prepare & place slide)',
      onClick: mountAction,
    });
  }

  return {
    group,
    dragTargets,
    update: (dt: number, state: RigState, _exp: ExperimentConfig) => {
      if (state.slidePlaced && !prevSlidePlaced) {
        slidePlaceAnim = 1.0;
        prevSlidePlaced = true;
      } else if (!state.slidePlaced) {
        prevSlidePlaced = false;
      }

      const targetRot =
        state.objectivePower === 10 ? 0 : state.objectivePower === 45 ? (Math.PI * 2) / 3 : (Math.PI * 4) / 3;
      nosepieceGroup.rotation.y = THREE.MathUtils.damp(nosepieceGroup.rotation.y, targetRot, 12, dt);

      const targetY = 1.05 + state.coarseFocus * 0.14 + (state.fineFocus - 0.5) * 0.04;
      bodyTubeGroup.position.y = THREE.MathUtils.damp(bodyTubeGroup.position.y, targetY, 14, dt);
      coarseKnob.rotation.y = state.coarseFocus * Math.PI * 4;
      fineKnob.rotation.y = state.fineFocus * Math.PI * 8;

      mirrorGroup.rotation.x = THREE.MathUtils.damp(mirrorGroup.rotation.x, state.mirrorAngle, 10, dt);

      slideGroup.visible = state.slidePlaced;
      if (slidePlaceAnim > 0.01) {
        slidePlaceAnim *= Math.exp(-2.8 * dt);
        slideGroup.position.x = THREE.MathUtils.lerp(0, 0.45, slidePlaceAnim);
        if (slidePlaceAnim > 0.2 && slidePlaceAnim < 0.75) {
          stainDrop.visible = true;
          const t = (0.75 - slidePlaceAnim) / 0.55;
          stainDrop.position.y = THREE.MathUtils.lerp(0.85, 0.66, t);
        } else {
          stainDrop.visible = false;
        }
      } else {
        slideGroup.position.x = 0;
        stainDrop.visible = false;
      }

      if (sugarCol) {
        const s = 1 + state.osmosisTimeHr * 0.38;
        sugarCol.scale.y = THREE.MathUtils.damp(sugarCol.scale.y, s, 6, dt);
      }
      if (swellingSeeds.length > 0) {
        const s = subMode === 'plasmolysis' ? 1 - state.osmosisTimeHr * 0.2 : 1 + state.osmosisTimeHr * 0.28;
        swellingSeeds.forEach((seed) => {
          seed.scale.setScalar(THREE.MathUtils.damp(seed.scale.x, Math.max(0.45, s), 6, dt));
        });
      }
      if (transpirationBubble && cobaltLowerMat && cobaltUpperMat) {
        const bx = 0.95 - (state.osmosisTimeHr / 2.5) * 0.48;
        transpirationBubble.position.x = THREE.MathUtils.damp(transpirationBubble.position.x, bx, 6, dt);
        const lowerPink = state.cobaltBlueTested && state.osmosisTimeHr >= 0.5;
        const upperPink = state.cobaltBlueTested && state.osmosisTimeHr >= 1.5;
        cobaltLowerMat.color.setHex(lowerPink ? 0xf472b6 : 0x2563eb);
        cobaltUpperMat.color.setHex(upperPink ? 0xf472b6 : 0x2563eb);
      }
      if (pigmentBands.length === 4) {
        // Chl-b (Rf 0.42), Chl-a (Rf 0.60), Xanthophyll (Rf 0.76), Carotene (Rf 0.95)
        const targets = [0.42, 0.6, 0.76, 0.95];
        pigmentBands.forEach((band, idx) => {
          const py = 0.16 + state.chromatographyProgress * targets[idx] * 0.64;
          band.position.y = THREE.MathUtils.damp(band.position.y, py, 5, dt);
        });
      }
      if (respWaterCol) {
        const s = 1 + state.osmosisTimeHr * 0.45;
        respWaterCol.scale.y = THREE.MathUtils.damp(respWaterCol.scale.y, s, 6, dt);
      }
      if (jointBoneLower) {
        jointBoneLower.rotation.z = THREE.MathUtils.damp(
          jointBoneLower.rotation.z,
          THREE.MathUtils.degToRad(state.jointAngleDeg),
          10,
          dt
        );
      }
      spotWells.forEach((mat, idx) => {
        if (idx < state.spotTileTested) {
          if (subMode === 'food_test') {
            const foodColors = [0x1e3a8a, 0xb91c1c, 0x7c3aed, 0xf59e0b];
            mat.color.setHex(foodColors[idx] ?? 0x1e3a8a);
          } else {
            // Amylase: 0,1 deep blue-black, 2 violet-brown, 3+ achromic amber
            mat.color.setHex(idx <= 1 ? 0x1e3a8a : idx === 2 ? 0x78350f : 0xf59e0b);
          }
        } else {
          mat.color.setHex(0xe2e8f0);
        }
      });
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
