import * as THREE from 'three';
import { labAudio } from '../../audio/LabAudioEngine';
import { ExperimentConfig, RigState } from '../../types/lab';
import { addContactShadow, LabMaterials } from '../labEnvironment';
import { makeBenchPlaque, makeLabeledBottle, makeSolidJar } from './rigHelpers';
import { DragTarget, LabRig } from './rigTypes';

const _dummy = new THREE.Object3D();

interface QualSubSpec {
  priFormula: string;
  priName: string;
  priColor: number;
  priAmber?: boolean;
  confFormula: string;
  confName: string;
  confColor: number;
  confAmber?: boolean;
  thirdFormula?: string;
  thirdName?: string;
  thirdColor?: number;
  thirdAmber?: boolean;
}

const QUAL_SPECS: Record<string, QualSubSpec> = {
  carbonate: {
    priFormula: 'Dil. H₂SO₄',
    priName: 'Evolves CO₂',
    priColor: 0xbae6fd,
    confFormula: 'MgSO₄',
    confName: 'Cold MgCO₃ Ppt',
    confColor: 0xe0f2fe,
  },
  halide: {
    priFormula: 'Conc. H₂SO₄',
    priName: 'Halide Acid',
    priColor: 0xfef3c7,
    priAmber: true,
    confFormula: 'AgNO₃',
    confName: 'Silver Halide',
    confColor: 0xe2e8f0,
    confAmber: true,
    thirdFormula: 'NH₄OH',
    thirdName: 'Layer / Solub.',
    thirdColor: 0xdbeafe,
  },
  nitrate: {
    priFormula: 'Fresh FeSO₄',
    priName: 'Freshly Prep.',
    priColor: 0x86efac,
    confFormula: 'Conc. H₂SO₄',
    confName: 'Brown Ring',
    confColor: 0xfef3c7,
    priAmber: false,
    confAmber: true,
  },
  sulphate: {
    priFormula: 'Orig. Soln',
    priName: 'Aqueous Salt',
    priColor: 0xdbeafe,
    confFormula: 'BaCl₂',
    confName: 'White BaSO₄',
    confColor: 0xe0f2fe,
    thirdFormula: 'Conc. HCl',
    thirdName: 'Insoluble Test',
    thirdColor: 0xfef9c3,
    thirdAmber: true,
  },
  ammonium: {
    priFormula: 'Conc. NaOH',
    priName: 'Evolves NH₃',
    priColor: 0xe0f2fe,
    confFormula: "Nessler's",
    confName: 'K₂HgI₄ Reagent',
    confColor: 0xfef08a,
    confAmber: true,
    thirdFormula: 'Conc. HCl',
    thirdName: 'Glass Rod Dip',
    thirdColor: 0xbae6fd,
  },
  cations_123: {
    priFormula: 'HCl + H₂S',
    priName: 'Group I–II',
    priColor: 0xfef08a,
    confFormula: 'NH₄OH+KSCN',
    confName: 'Group III Confirm',
    confColor: 0xdbeafe,
    thirdFormula: 'KI',
    thirdName: 'PbI₂ Confirm',
    thirdColor: 0xfef3c7,
    thirdAmber: true,
  },
  cations_456: {
    priFormula: 'Group IV/V',
    priName: '(NH₄)₂CO₃+H₂S',
    priColor: 0xe0f2fe,
    confFormula: 'Na₂HPO₄',
    confName: 'Group VI Mg²⁺',
    confColor: 0xdbeafe,
  },
  unsaturation: {
    priFormula: 'Br₂ Water',
    priName: 'Orange Reagent',
    priColor: 0xf97316,
    priAmber: true,
    confFormula: 'Baeyer KMnO₄',
    confName: 'Alk. Permang.',
    confColor: 0x7e22ce,
  },
  phenol_alcohol: {
    priFormula: 'Neut. FeCl₃',
    priName: 'Violet Phenol',
    priColor: 0xf59e0b,
    confFormula: 'Dil. NaOH',
    confName: 'Phthalein Pink',
    confColor: 0xe0f2fe,
    thirdFormula: 'H₂SO₄+Phth.',
    thirdName: 'Phthalein Mix',
    thirdColor: 0xfef3c7,
    thirdAmber: true,
  },
  aldehyde_ketone: {
    priFormula: '2,4-DNP',
    priName: 'Carbonyl Test',
    priColor: 0xf97316,
    confFormula: "Tollen's",
    confName: 'AgNO₃ + NH₃',
    confColor: 0xe2e8f0,
    confAmber: true,
    thirdFormula: "Fehling A+B",
    thirdName: 'Cu₂O Brick-Red',
    thirdColor: 0x0284c7,
  },
  carboxylic: {
    priFormula: 'NaHCO₃',
    priName: 'CO₂ Efferv.',
    priColor: 0xf8fafc,
    confFormula: 'EtOH+H₂SO₄',
    confName: 'Fruity Ester',
    confColor: 0xe0f2fe,
  },
  amine: {
    priFormula: 'Cold NaNO₂',
    priName: '0–5 °C Diazo',
    priColor: 0xbae6fd,
    confFormula: 'β-Naphthol',
    confName: 'Scarlet Azo Dye',
    confColor: 0xfde68a,
    thirdFormula: 'CHCl₃+KOH',
    thirdName: 'Carbylamine',
    thirdColor: 0xe0f2fe,
  },
};

/**
 * 3D Qualitative Salt & Organic Analysis Rig (Chemistry 16-27)
 * Every subMode displays its specific labeled reagents, test-tube rack, Bunsen burner,
 * test-tube holder, and special hardware (delivery tube, Cu turnings, HCl rod fumes,
 * platinum flame loop, ice bath, NaHCO3 jar + litmus).
 */
export function createQualitativeAnalysisRig(
  subMode: string,
  materials: LabMaterials,
  maxAniso: number
): LabRig {
  const group = new THREE.Group();
  const dragTargets: DragTarget[] = [];
  const disposables: { dispose: () => void }[] = [];

  addContactShadow(group, materials.contactShadow, 1.6, 0.002);

  const spec = QUAL_SPECS[subMode] || QUAL_SPECS.carbonate;

  // Wooden 4-slot test-tube rack
  const rackGroup = new THREE.Group();
  rackGroup.position.set(-0.5, 0, -0.1);
  const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.06, 0.34), materials.wood);
  rackBase.position.y = 0.03;
  const rackTop = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.04, 0.34), materials.wood);
  rackTop.position.y = 0.52;
  const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12), materials.wood);
  pillarL.position.set(-0.58, 0.28, 0);
  const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12), materials.wood);
  pillarR.position.set(0.58, 0.28, 0);
  rackGroup.add(rackBase, rackTop, pillarL, pillarR);

  const tubeFluidMats: THREE.MeshStandardMaterial[] = [];
  const tubeGlassMats: THREE.MeshPhysicalMaterial[] = [];
  const tubeMeshes: THREE.Group[] = [];

  for (let i = 0; i < 4; i++) {
    const tx = -0.36 + i * 0.24;
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0, 0);

    const gMat = materials.borosilicateGlass.clone();
    disposables.push(gMat);
    tubeGlassMats.push(gMat);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.72, 20), gMat);
    tube.position.set(0, 0.44, 0);
    tube.renderOrder = 3;
    tGroup.add(tube);

    const fMat = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0xdbeafe : 0xe2e8f0,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
    });
    disposables.push(fMat);
    tubeFluidMats.push(fMat);

    const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.32, 18), fMat);
    fluid.position.set(0, 0.25, 0);
    tGroup.add(fluid);

    tubeMeshes.push(tGroup);
    rackGroup.add(tGroup);
  }

  // Test-Tube Holder clipped to Tube 0 (clickable to warm over Bunsen flame!)
  const holderGroup = new THREE.Group();
  holderGroup.position.set(0, 0.62, -0.02);
  const clampBand = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 18), materials.brushedSteel);
  clampBand.rotation.x = Math.PI / 2;
  const holderHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 10), materials.wood);
  holderHandle.rotation.x = Math.PI / 2;
  holderHandle.position.z = -0.18;
  holderGroup.add(clampBand, holderHandle);
  tubeMeshes[0].add(holderGroup);

  // Special Brown-Ring interface disc in Tube 0
  const brownRingMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.3 });
  disposables.push(brownRingMat);
  const brownRing = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.024, 18), brownRingMat);
  brownRing.position.set(0, 0.26, 0);
  brownRing.visible = false;
  tubeMeshes[0].add(brownRing);

  // Carbonate CO2 delivery tube into Limewater Tube 1
  if (subMode === 'carbonate') {
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.06, 14), materials.rubberBlack);
    cork.position.set(-0.36, 0.79, 0);
    rackGroup.add(cork);
    const dCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.36, 0.8, 0),
      new THREE.Vector3(-0.36, 0.96, 0),
      new THREE.Vector3(-0.12, 0.96, 0),
      new THREE.Vector3(-0.12, 0.34, 0),
    ]);
    const dGeo = new THREE.TubeGeometry(dCurve, 24, 0.012, 8, false);
    disposables.push(dGeo);
    rackGroup.add(new THREE.Mesh(dGeo, materials.borosilicateGlass));
    rackGroup.add(makeBenchPlaque('Limewater', 'Ca(OH)₂ Tube', '#0284c7', [-0.12, 0.03, 0.3], materials, maxAniso, disposables, 0.75));
  }

  // Amine Ice Bath (0–5 °C) around Tube 1
  if (subMode === 'amine') {
    const iceCup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.36, 20), materials.borosilicateGlass);
    iceCup.position.set(-0.12, 0.24, 0);
    iceCup.renderOrder = 4;
    rackGroup.add(iceCup);
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.78 });
    const iceGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    disposables.push(iceMat, iceGeo);
    for (let k = 0; k < 5; k++) {
      const cube = new THREE.Mesh(iceGeo, iceMat);
      const a = (k / 5) * Math.PI * 2;
      cube.position.set(-0.12 + Math.cos(a) * 0.08, 0.36, Math.sin(a) * 0.08);
      cube.rotation.set(k, k * 0.6, 0);
      rackGroup.add(cube);
    }
    rackGroup.add(makeBenchPlaque('0–5 °C', 'Ice Bath', '#06b6d4', [-0.12, 0.03, 0.3], materials, maxAniso, disposables, 0.75));
  }

  // Rising gas bubbles inside Tube 0 & Tube 1
  const gasGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const gasMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.75 });
  disposables.push(gasGeo, gasMat);
  const tubeBubbles = new THREE.InstancedMesh(gasGeo, gasMat, 24);
  tubeBubbles.frustumCulled = false;
  const bubblePhases = new Float32Array(24);
  for (let i = 0; i < 24; i++) bubblePhases[i] = Math.random();
  rackGroup.add(tubeBubbles);

  group.add(rackGroup);

  // Bunsen Burner with custom GLSL shader flame
  const burnerGroup = new THREE.Group();
  burnerGroup.position.set(0.68, 0, 0.15);

  const burnerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 24), materials.darkAnodized);
  burnerBase.position.y = 0.03;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 20), materials.brass);
  collar.position.y = 0.1;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.36, 20), materials.brushedSteel);
  barrel.position.y = 0.32;
  burnerGroup.add(burnerBase, collar, barrel);

  const flameUniforms = {
    uTime: { value: 0 },
    uColorOuter: { value: new THREE.Color(0x38bdf8) },
    uColorInner: { value: new THREE.Color(0x93c5fd) },
  };

  const flameMat = new THREE.ShaderMaterial({
    uniforms: flameUniforms,
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
        float sway = sin(uTime * 11.0 + p.y * 8.0) * 0.015 * uv.y;
        p.x += sway;
        p.z += cos(uTime * 9.0 + p.y * 6.0) * 0.012 * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColorOuter;
      uniform vec3 uColorInner;
      void main() {
        float core = smoothstep(0.45, 0.0, vUv.y);
        vec3 col = mix(uColorOuter, uColorInner, core);
        float alpha = (1.0 - vUv.y) * 0.9;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  disposables.push(flameMat);

  const flameCone = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.26, 20, 8, true), flameMat);
  flameCone.position.y = 0.62;
  flameCone.visible = false;
  burnerGroup.add(flameCone);

  const flameLight = new THREE.PointLight(0x38bdf8, 0, 3.5);
  flameLight.position.set(0, 0.65, 0);
  burnerGroup.add(flameLight);
  group.add(burnerGroup);

  // Matchstick
  const matchstick = new THREE.Group();
  matchstick.position.set(1.08, 0.04, 0.36);
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.015), materials.wood);
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c });
  disposables.push(tipMat);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), tipMat);
  tip.position.x = -0.14;
  matchstick.add(stick, tip);
  group.add(matchstick);

  // Primary & Confirmatory Reagent Containers (labeled!)
  const dropperPrimary =
    subMode === 'carboxylic'
      ? makeSolidJar({
          formula: spec.priFormula,
          name: spec.priName,
          powderColor: spec.priColor,
          bandColor: '#0d9488',
          pos: [0.22, 0, 0.55],
          materials,
          maxAniso,
          disposables,
        })
      : makeLabeledBottle({
          formula: spec.priFormula,
          name: spec.priName,
          liquidColor: spec.priColor,
          amber: spec.priAmber,
          bandColor: '#0284c7',
          pos: [0.22, 0, 0.55],
          materials,
          maxAniso,
          disposables,
        });
  group.add(dropperPrimary);

  const dropperConfirm = makeLabeledBottle({
    formula: spec.confFormula,
    name: spec.confName,
    liquidColor: spec.confColor,
    amber: spec.confAmber,
    bandColor: '#dc2626',
    pos: [0.55, 0, 0.55],
    materials,
    maxAniso,
    disposables,
  });
  group.add(dropperConfirm);

  // Optional 3rd Reagent Bottle (Conc. HCl, Fehling's A+B, NH4OH, KI, CHCl3+KOH, etc.)
  let thirdBottle: THREE.Group | null = null;
  if (spec.thirdFormula && spec.thirdName) {
    thirdBottle = makeLabeledBottle({
      formula: spec.thirdFormula,
      name: spec.thirdName,
      liquidColor: spec.thirdColor ?? 0xdbeafe,
      amber: spec.thirdAmber,
      bandColor: '#7c3aed',
      pos: [0.88, 0, 0.55],
      materials,
      maxAniso,
      disposables,
    });
    group.add(thirdBottle);

    dragTargets.push({
      mesh: thirdBottle,
      label: `${spec.thirdFormula} (${spec.thirdName}) — click to perform test`,
      onClick: (state, onPatch) => {
        if (subMode === 'amine') {
          labAudio.playFizz(0.45);
          onPatch({ tubeWarmed: true, flameTestDone: true });
        } else {
          labAudio.playDroplet();
          onPatch({ measurementCount: state.measurementCount + 1 });
        }
      },
    });
  }

  // Submode special interactive props:
  // 1) Nitrate Copper Turnings watch glass; 2) Cations IV-VI Platinum Flame Loop;
  // 3) Phenol Dry Sodium watch glass; 4) Carboxylic Blue Litmus Strip; 5) Ammonium HCl Glass Rod + White Fumes
  let flameWireGroup: THREE.Group | null = null;
  let hclRodGroup: THREE.Group | null = null;
  let whiteFumePuff: THREE.Mesh | null = null;

  if (subMode === 'nitrate') {
    const cuDish = new THREE.Group();
    cuDish.position.set(1.02, 0.02, -0.12);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.025, 20), materials.borosilicateGlass);
    const cuShavings = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), materials.copper);
    cuShavings.position.y = 0.03;
    cuDish.add(dish, cuShavings);
    group.add(cuDish);
    group.add(makeBenchPlaque('Cu Turnings', 'NO₂ Fume Test', '#c86d44', [1.02, 0.03, 0.12], materials, maxAniso, disposables, 0.78));
    dragTargets.push({
      mesh: cuDish,
      label: 'Copper Turnings Dish (click to warm with nitrate for NO₂ fumes)',
      onClick: (_state, onPatch) => {
        labAudio.playFizz(0.5);
        onPatch({ tubeWarmed: true });
      },
    });
  } else if (subMode === 'cations_456') {
    flameWireGroup = new THREE.Group();
    flameWireGroup.position.set(1.02, 0.04, -0.15);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 10), materials.borosilicateGlass);
    handle.rotation.z = Math.PI / 2;
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 8), materials.brushedSteel);
    wire.rotation.z = Math.PI / 2;
    wire.position.x = -0.18;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 16), materials.brushedSteel);
    loop.position.x = -0.26;
    flameWireGroup.add(handle, wire, loop);
    group.add(flameWireGroup);
    group.add(makeBenchPlaque('Pt Wire', 'Ba²⁺ Flame Test', '#16a34a', [1.02, 0.03, 0.08], materials, maxAniso, disposables, 0.78));
    dragTargets.push({
      mesh: flameWireGroup,
      label: 'Platinum Flame Wire Loop (click to perform apple-green Ba²⁺ flame test)',
      onClick: (_state, onPatch) => {
        labAudio.playFlameIgnite();
        onPatch({ burnerLit: true, tubeWarmed: true, flameTestDone: true });
      },
    });
  } else if (subMode === 'ammonium') {
    hclRodGroup = new THREE.Group();
    hclRodGroup.position.set(1.0, 0.04, -0.12);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.36, 10), materials.borosilicateGlass);
    rod.rotation.z = Math.PI / 2;
    hclRodGroup.add(rod);
    group.add(hclRodGroup);

    const fumeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.65 });
    disposables.push(fumeMat);
    whiteFumePuff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), fumeMat);
    whiteFumePuff.position.set(-0.86, 0.88, -0.1);
    whiteFumePuff.visible = false;
    group.add(whiteFumePuff);

    dragTargets.push({
      mesh: hclRodGroup,
      label: 'Conc. HCl Glass Rod (click to hold near tube mouth for NH₄Cl fumes)',
      onClick: (state, onPatch) => {
        labAudio.playFizz(0.4);
        onPatch({ measurementCount: state.measurementCount + 1 });
      },
    });
  } else if (subMode === 'carboxylic') {
    const litMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8 });
    disposables.push(litMat);
    const litStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.28), litMat);
    litStrip.position.set(1.02, 0.03, -0.12);
    group.add(litStrip);
    group.add(makeBenchPlaque('Blue Litmus', 'Turns Red', '#2563eb', [1.02, 0.03, 0.1], materials, maxAniso, disposables, 0.78));
    dragTargets.push({
      mesh: litStrip,
      label: 'Blue Litmus Strip (click to test -COOH acidity)',
      onClick: (state, onPatch) => {
        labAudio.playDroplet();
        litMat.color.setHex(0xef4444);
        onPatch({ litmusTested: true, measurementCount: state.measurementCount + 1 });
      },
    });
  } else if (subMode === 'phenol_alcohol') {
    const naDish = new THREE.Group();
    naDish.position.set(1.02, 0.02, -0.12);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.024, 18), materials.borosilicateGlass);
    const naChunk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), materials.brushedSteel);
    naChunk.position.y = 0.035;
    naDish.add(dish, naChunk);
    group.add(naDish);
    group.add(makeBenchPlaque('Dry Na', 'Alcohol H₂ Fizz', '#64748b', [1.02, 0.03, 0.12], materials, maxAniso, disposables, 0.78));
  }

  // Falling reagent droplet inside Tube 0
  const fallingDropMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
  disposables.push(fallingDropMat);
  const fallingDrop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), fallingDropMat);
  fallingDrop.visible = false;
  group.add(fallingDrop);

  let tiltTimer1 = 0;
  let tiltTimer2 = 0;
  let warmTimer = 0;
  let matchTimer = 0;

  let prevPrimary = false;
  let prevConfirm = false;
  let prevWarmed = false;
  let prevBurner = false;

  dragTargets.push({
    mesh: matchstick,
    label: 'Matchstick & Bunsen Burner (click to light burner)',
    onClick: (state, onPatch) => {
      if (!state.burnerLit) {
        labAudio.playFlameIgnite();
        labAudio.setBurnerLoop(true);
        onPatch({ burnerLit: true, gasValveOpen: true, matchDragged: true });
      } else {
        labAudio.setBurnerLoop(false);
        onPatch({ burnerLit: false });
      }
    },
  });

  dragTargets.push({
    mesh: dropperPrimary,
    label: `${spec.priFormula} Bottle (click to add primary reagent)`,
    onClick: (state, onPatch) => {
      labAudio.playDroplet();
      if (subMode === 'carbonate' || subMode === 'carboxylic') labAudio.playFizz(0.8);
      onPatch({
        primaryReagentAdded: true,
        reagentAddedCount: state.reagentAddedCount + 1,
      });
    },
  });

  dragTargets.push({
    mesh: dropperConfirm,
    label: `${spec.confFormula} Bottle (click for confirmatory test)`,
    onClick: (_state, onPatch) => {
      labAudio.playDroplet();
      onPatch({
        confirmatoryReagentAdded: true,
        brownRingFormed: subMode === 'nitrate',
        silverMirrorFormed: subMode === 'aldehyde_ketone',
      });
    },
  });

  dragTargets.push({
    mesh: holderGroup,
    label: 'Test-Tube Holder (click to warm Tube 0 over Bunsen flame)',
    onClick: (_state, onPatch) => {
      labAudio.playFizz(0.45);
      onPatch({ tubeWarmed: true, flameTestDone: true });
    },
  });

  dragTargets.push({
    mesh: burnerGroup,
    label: 'Bunsen Burner Collar (click to ignite or heat test tube)',
    onClick: (state, onPatch) => {
      if (!state.burnerLit) {
        labAudio.playFlameIgnite();
        labAudio.setBurnerLoop(true);
        onPatch({ burnerLit: true, gasValveOpen: true });
      } else {
        labAudio.playFizz(0.45);
        onPatch({ tubeWarmed: true, flameTestDone: true });
      }
    },
  });

  return {
    group,
    dragTargets,
    update: (dt: number, state: RigState, _exp: ExperimentConfig) => {
      if (state.primaryReagentAdded && !prevPrimary) {
        tiltTimer1 = 1.0;
        prevPrimary = true;
      } else if (!state.primaryReagentAdded) prevPrimary = false;

      if (state.confirmatoryReagentAdded && !prevConfirm) {
        tiltTimer2 = 1.0;
        prevConfirm = true;
      } else if (!state.confirmatoryReagentAdded) prevConfirm = false;

      if (state.tubeWarmed && !prevWarmed) {
        warmTimer = 1.0;
        prevWarmed = true;
      } else if (!state.tubeWarmed) prevWarmed = false;

      if (state.burnerLit && !prevBurner) {
        matchTimer = 1.0;
        prevBurner = true;
      } else if (!state.burnerLit) prevBurner = false;

      flameUniforms.uTime.value = state.elapsedTime;
      flameCone.visible = state.burnerLit;
      flameLight.intensity = state.burnerLit ? 1.8 + Math.sin(state.elapsedTime * 15) * 0.25 : 0;

      if (state.flameTestDone && subMode === 'cations_456') {
        flameUniforms.uColorOuter.value.setHex(0x22c55e);
        flameUniforms.uColorInner.value.setHex(0x86efac);
      } else {
        flameUniforms.uColorOuter.value.setHex(0x2563eb);
        flameUniforms.uColorInner.value.setHex(0x60a5fa);
      }

      if (flameWireGroup) {
        if (state.flameTestDone && state.burnerLit) {
          flameWireGroup.position.set(0.92, 0.58, 0.15);
        } else {
          flameWireGroup.position.set(1.02, 0.04, -0.15);
        }
      }

      if (hclRodGroup && whiteFumePuff) {
        const showFumes = state.measurementCount >= 1 && state.primaryReagentAdded;
        whiteFumePuff.visible = showFumes;
        hclRodGroup.position.set(showFumes ? -0.66 : 1.0, showFumes ? 0.85 : 0.04, showFumes ? -0.1 : -0.12);
      }

      if (matchTimer > 0.01) {
        matchTimer *= Math.exp(-2.8 * dt);
        const arc = Math.sin(matchTimer * Math.PI);
        matchstick.position.set(
          THREE.MathUtils.lerp(1.08, 0.78, arc),
          0.04 + arc * 0.48,
          THREE.MathUtils.lerp(0.36, 0.15, arc)
        );
      } else {
        matchstick.position.set(1.08, 0.04, 0.36);
      }

      let dropActive = false;
      if (tiltTimer1 > 0.01) {
        tiltTimer1 *= Math.exp(-2.2 * dt);
        const arc = Math.sin(tiltTimer1 * Math.PI);
        dropperPrimary.position.set(
          THREE.MathUtils.lerp(0.22, -0.72, arc),
          arc * 0.85,
          THREE.MathUtils.lerp(0.55, -0.05, arc)
        );
        dropperPrimary.rotation.z = arc * 0.85;
        if (tiltTimer1 > 0.3 && tiltTimer1 < 0.75) {
          dropActive = true;
          const t = (0.75 - tiltTimer1) / 0.45;
          fallingDrop.position.set(-0.86, THREE.MathUtils.lerp(0.84, 0.35, t), -0.1);
        }
      } else {
        dropperPrimary.position.set(0.22, 0, 0.55);
        dropperPrimary.rotation.z = THREE.MathUtils.damp(dropperPrimary.rotation.z, 0, 10, dt);
      }

      if (tiltTimer2 > 0.01) {
        tiltTimer2 *= Math.exp(-2.2 * dt);
        const arc = Math.sin(tiltTimer2 * Math.PI);
        dropperConfirm.position.set(
          THREE.MathUtils.lerp(0.55, -0.72, arc),
          arc * 0.85,
          THREE.MathUtils.lerp(0.55, -0.05, arc)
        );
        dropperConfirm.rotation.z = arc * 0.85;
        if (tiltTimer2 > 0.3 && tiltTimer2 < 0.75) {
          dropActive = true;
          const t = (0.75 - tiltTimer2) / 0.45;
          fallingDrop.position.set(-0.86, THREE.MathUtils.lerp(0.84, 0.35, t), -0.1);
        }
      } else {
        dropperConfirm.position.set(0.55, 0, 0.55);
        dropperConfirm.rotation.z = THREE.MathUtils.damp(dropperConfirm.rotation.z, 0, 10, dt);
      }
      fallingDrop.visible = dropActive;

      if (warmTimer > 0.01) {
        warmTimer *= Math.exp(-1.8 * dt);
        const arc = Math.sin(warmTimer * Math.PI);
        tubeMeshes[0].position.x = THREE.MathUtils.lerp(-0.36, 0.96, arc);
        tubeMeshes[0].position.y = arc * 0.45;
        tubeMeshes[0].rotation.z = -arc * 0.25;
      } else {
        tubeMeshes[0].position.set(-0.36, 0, 0);
        tubeMeshes[0].rotation.z = 0;
      }

      const gasActive = state.primaryReagentAdded || state.tubeWarmed;
      for (let i = 0; i < 24; i++) {
        if (gasActive) {
          bubblePhases[i] = (bubblePhases[i] + dt * (0.65 + (i % 4) * 0.15)) % 1;
        }
        const tx = i < 16 ? -0.36 : -0.12;
        _dummy.position.set(
          tx + Math.sin(i * 4.1) * 0.022,
          0.16 + bubblePhases[i] * 0.48,
          Math.cos(i * 3.7) * 0.02
        );
        _dummy.scale.setScalar(gasActive ? 1 : 0.001);
        _dummy.updateMatrix();
        tubeBubbles.setMatrixAt(i, _dummy.matrix);
      }
      tubeBubbles.instanceMatrix.needsUpdate = true;

      if (state.primaryReagentAdded) {
        if (subMode === 'carbonate') {
          tubeFluidMats[1].color.setHex(0xf8fafc);
          tubeFluidMats[1].opacity = 0.92;
        } else if (subMode === 'halide') {
          tubeFluidMats[0].color.setHex(0xfef08a);
          tubeFluidMats[0].opacity = 0.9;
        } else if (subMode === 'cations_123') {
          tubeFluidMats[0].color.setHex(0x1d4ed8);
          tubeFluidMats[1].color.setHex(0xb91c1c);
        } else if (subMode === 'unsaturation') {
          tubeFluidMats[0].color.setHex(0xe0f2fe);
        } else if (subMode === 'phenol_alcohol') {
          tubeFluidMats[0].color.setHex(0x7c3aed);
        } else if (subMode === 'aldehyde_ketone') {
          tubeFluidMats[0].color.setHex(0xf97316);
          tubeFluidMats[0].opacity = 0.92;
        } else if (subMode === 'amine') {
          tubeFluidMats[1].color.setHex(0xfef08a);
        } else if (subMode === 'carboxylic') {
          tubeFluidMats[0].color.setHex(0xf1f5f9);
        }
      }

      if (state.confirmatoryReagentAdded) {
        brownRing.visible = subMode === 'nitrate';
        if (subMode === 'sulphate') {
          tubeFluidMats[0].color.setHex(0xf8fafc);
          tubeFluidMats[0].opacity = 0.95;
        } else if (subMode === 'ammonium') {
          tubeFluidMats[0].color.setHex(0xb45309);
          tubeFluidMats[0].opacity = 0.9;
        } else if (subMode === 'amine') {
          tubeFluidMats[1].color.setHex(0xdc2626);
          tubeFluidMats[1].opacity = 0.92;
        } else if (subMode === 'phenol_alcohol') {
          tubeFluidMats[1].color.setHex(0xec4899);
          tubeFluidMats[1].opacity = 0.88;
        } else if (subMode === 'aldehyde_ketone') {
          tubeGlassMats[0].metalness = 0.95;
          tubeGlassMats[0].roughness = 0.08;
          tubeGlassMats[0].transmission = 0;
          tubeGlassMats[0].opacity = 1;
          tubeGlassMats[0].color.setHex(0xe2e8f0);
        }
      }
    },
    dispose: () => {
      labAudio.setBurnerLoop(false);
      disposables.forEach((d) => d.dispose());
    },
  };
}
