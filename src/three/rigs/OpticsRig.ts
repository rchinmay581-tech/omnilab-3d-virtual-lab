import * as THREE from 'three';
import { labAudio } from '../../audio/LabAudioEngine';
import { ExperimentConfig, RigState } from '../../types/lab';
import { addContactShadow, LabMaterials } from '../labEnvironment';
import { createRulerTexture } from '../proceduralTextures';
import { makeBenchPlaque, makeLabeledBottle } from './rigHelpers';
import { DragTarget, LabRig } from './rigTypes';

/**
 * 3D Optics & Ray-Tracing Rig (Physics 23-29)
 * Complete 3D equipment parity:
 * - Graduated optical bench with draggable Object & Image pins, Mirrors/Lenses,
 *   corrected visibility for Convex Mirror (remove mirror at 75 cm) and
 *   Concave Lens (insert concave lens at 75 cm alongside auxiliary convex lens)
 * - Crown glass prism with 4 brass-headed optical pins (P1, P2 incident; P3, P4 emergent)
 * - Travelling microscope with resting Glass Slab Tray (clickable even before placement)
 *   and Lycopodium Powder sprinkler jar
 * - Liquid refractive index upward concave mirror with clickable Water Dropper Bottle
 */
export function createOpticsRig(
  subMode: string,
  materials: LabMaterials,
  maxAniso: number
): LabRig {
  const group = new THREE.Group();
  const dragTargets: DragTarget[] = [];
  const disposables: { dispose: () => void }[] = [];

  addContactShadow(group, materials.contactShadow, 1.65, 0.002);

  let objectUpright: THREE.Group | null = null;
  let opticalUpright: THREE.Group | null = null;
  let auxLensUpright: THREE.Group | null = null;
  let imageUpright: THREE.Group | null = null;
  let rayLine1: THREE.Line | null = null;
  let rayLine2: THREE.Line | null = null;
  let prismGroup: THREE.Group | null = null;
  let prismRayRed: THREE.Line | null = null;
  let prismRayCyan: THREE.Line | null = null;
  const emergentPins: THREE.Group[] = [];
  let scopeHead: THREE.Group | null = null;
  let glassSlabMesh: THREE.Mesh | null = null;
  let powderGroup: THREE.Group | null = null;
  let liquidLayer: THREE.Mesh | null = null;
  let pinHead: THREE.Group | null = null;

  if (subMode === 'prism') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 1.5), materials.wood);
    board.position.set(0, 0.035, 0);
    group.add(board);

    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.25), materials.ceramicWhite);
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set(0, 0.072, 0);
    group.add(sheet);

    prismGroup = new THREE.Group();
    prismGroup.position.set(0, 0.28, 0);
    const prismMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 3), materials.borosilicateGlass);
    prismMesh.renderOrder = 2;
    prismGroup.add(prismMesh);
    group.add(prismGroup);

    const makePin = (x: number, z: number, colorHex: number): THREE.Group => {
      const p = new THREE.Group();
      p.position.set(x, 0.072, z);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.24, 10), materials.brushedSteel);
      shaft.position.y = 0.12;
      const headMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.4, roughness: 0.3 });
      disposables.push(headMat);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), headMat);
      head.position.y = 0.245;
      p.add(shaft, head);
      return p;
    };

    // Incident Optical Pins P1, P2
    group.add(makePin(-0.72, 0.28, 0xf59e0b));
    group.add(makePin(-0.42, 0.16, 0xf59e0b));

    // Emergent Optical Pins P3, P4 (track emergent ray dynamically)
    const p3 = makePin(0.45, 0.18, 0x38bdf8);
    const p4 = makePin(0.75, 0.3, 0x38bdf8);
    emergentPins.push(p3, p4);
    group.add(p3, p4);

    const rayGeoRed = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.9, 0.24, 0.35),
      new THREE.Vector3(-0.14, 0.24, 0.04),
      new THREE.Vector3(0.14, 0.24, 0.04),
      new THREE.Vector3(0.9, 0.24, 0.36),
    ]);
    const rayGeoCyan = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.9, 0.24, 0.35),
      new THREE.Vector3(-0.14, 0.24, 0.04),
      new THREE.Vector3(0.14, 0.24, 0.04),
      new THREE.Vector3(0.9, 0.24, 0.48),
    ]);
    const matRed = new THREE.LineBasicMaterial({ color: 0xf97316 });
    const matCyan = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    disposables.push(rayGeoRed, rayGeoCyan, matRed, matCyan);
    prismRayRed = new THREE.Line(rayGeoRed, matRed);
    prismRayCyan = new THREE.Line(rayGeoCyan, matCyan);
    group.add(prismRayRed, prismRayCyan);

    dragTargets.push({
      mesh: prismGroup,
      label: 'Crown Glass Prism (drag to vary angle of incidence)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.prismAngleIncidence + dx * 35, 30, 65);
        onPatch({ prismAngleIncidence: Number(next.toFixed(1)) });
      },
    });
  } else if (subMode === 'travelling_microscope' || subMode === 'liquid_mirror') {
    if (subMode === 'travelling_microscope') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.15), materials.darkAnodized);
      base.position.set(-0.08, 0.05, 0);
      group.add(base);

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 20), materials.brushedSteel);
      col.position.set(-0.5, 0.8, 0);
      group.add(col);

      scopeHead = new THREE.Group();
      scopeHead.position.set(-0.08, 0.85, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.12), materials.darkAnodized);
      arm.position.set(-0.2, 0, 0);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.48, 24), materials.brass);
      tube.position.set(0.08, 0.06, 0);
      scopeHead.add(arm, tube);
      group.add(scopeHead);

      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 0.02), materials.rubberBlack);
      mark.position.set(0.0, 0.105, 0);
      group.add(mark);

      // Glass Slab Dock on right bench + Glass Slab moves smoothly from dock onto stage!
      const slabDock = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.38), materials.wood);
      slabDock.position.set(0.95, 0.015, 0.2);
      group.add(slabDock);

      glassSlabMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.35), materials.borosilicateGlass);
      glassSlabMesh.position.set(0.95, 0.1, 0.2);
      glassSlabMesh.renderOrder = 2;
      group.add(glassSlabMesh);

      // Lycopodium powder specks on top of the glass slab
      powderGroup = new THREE.Group();
      powderGroup.position.set(0.0, 0.252, 0);
      const pMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 });
      const pGeo = new THREE.SphereGeometry(0.011, 8, 8);
      disposables.push(pMat, pGeo);
      for (let i = 0; i < 18; i++) {
        const speck = new THREE.Mesh(pGeo, pMat);
        speck.position.set(Math.cos(i * 1.9) * 0.14, 0, Math.sin(i * 2.7) * 0.1);
        powderGroup.add(speck);
      }
      powderGroup.visible = false;
      group.add(powderGroup);

      // Lycopodium Powder Sprinkler Jar
      const powderJar = makeLabeledBottle({
        formula: 'Lycopodium',
        name: 'Fine Spores Powder',
        liquidColor: 0xfef08a,
        bandColor: '#eab308',
        dropperCap: false,
        scale: 0.95,
        pos: [0.95, 0, -0.28],
        materials,
        maxAniso,
        disposables,
      });
      group.add(powderJar);

      dragTargets.push({
        mesh: glassSlabMesh,
        label: 'Crown Glass Slab (click to place/remove over ink mark)',
        onClick: (state, onPatch) => {
          labAudio.playMetallicTick(1900, 0.45);
          onPatch({ slabPlaced: !state.slabPlaced });
        },
      });
      dragTargets.push({
        mesh: powderJar,
        label: 'Lycopodium Powder Jar (click to sprinkle on glass slab)',
        onClick: (_state, onPatch) => {
          labAudio.playFizz(0.25);
          onPatch({ powderSprinkled: true });
        },
      });
      dragTargets.push({
        mesh: scopeHead,
        label: 'Travelling Microscope Carriage (drag vertically to focus)',
        onDrag: (_dx, dy, state, onPatch) => {
          const next = THREE.MathUtils.clamp(state.microscopeHeightMm - dy * 35, 0, 45);
          onPatch({ microscopeHeightMm: Number(next.toFixed(2)) });
        },
      });
    } else {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 16), materials.brushedSteel);
      stand.position.set(-0.45, 0.9, 0);
      group.add(stand);

      const mirrorDish = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.09, 36), materials.brushedSteel);
      mirrorDish.position.set(0, 0.045, 0);
      group.add(mirrorDish);

      const liquidMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.48,
        roughness: 0.08,
      });
      disposables.push(liquidMat);
      liquidLayer = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 32), liquidMat);
      liquidLayer.position.set(0, 0.095, 0);
      liquidLayer.visible = false;
      group.add(liquidLayer);

      // Experimental Liquid (Water) Dropper Bottle
      const liquidBottle = makeLabeledBottle({
        formula: 'H₂O Liquid',
        name: 'Refractive Liquid',
        liquidColor: 0x38bdf8,
        bandColor: '#0284c7',
        dropperCap: true,
        scale: 1.05,
        pos: [0.68, 0, 0.14],
        materials,
        maxAniso,
        disposables,
      });
      group.add(liquidBottle);

      pinHead = new THREE.Group();
      pinHead.position.set(0, 1.15, 0);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.06), materials.brass);
      clamp.position.x = -0.22;
      const pinNeedle = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.25, 12), materials.copper);
      pinNeedle.rotation.z = -Math.PI / 2;
      pinNeedle.position.x = 0.02;
      pinHead.add(clamp, pinNeedle);
      group.add(pinHead);

      dragTargets.push({
        mesh: liquidBottle,
        label: 'Experimental Liquid Bottle (click to pour onto mirror)',
        onClick: (_state, onPatch) => {
          labAudio.playDroplet();
          onPatch({ liquidAdded: true });
        },
      });
      dragTargets.push({
        mesh: pinHead,
        label: 'Parallax Pin Clamp (drag vertically to remove parallax)',
        onDrag: (_dx, dy, state, onPatch) => {
          const next = THREE.MathUtils.clamp(state.imagePinPosCm - dy * 30, 10, 40);
          onPatch({ imagePinPosCm: Number(next.toFixed(1)) });
        },
      });
    }
  } else {
    // Optical Bench (Concave Mirror, Convex Mirror, Convex Lens, Concave Lens)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.22), materials.darkAnodized);
    rail.position.set(0, 0.05, 0);
    rail.receiveShadow = true;
    group.add(rail);

    const rulerTex = createRulerTexture(150, maxAniso);
    disposables.push(rulerTex);
    const scaleMat = new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.4 });
    disposables.push(scaleMat);
    const scaleStrip = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.12), scaleMat);
    scaleStrip.rotation.x = -Math.PI / 2;
    scaleStrip.position.set(0, 0.102, 0.04);
    group.add(scaleStrip);

    const makeUpright = (color: number, kind: 'pin' | 'mirror' | 'lens'): THREE.Group => {
      const u = new THREE.Group();
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), materials.brass);
      foot.position.y = 0.14;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 14), materials.brushedSteel);
      stem.position.y = 0.44;
      u.add(foot, stem);
      if (kind !== 'pin') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 12, 32), materials.brass);
        ring.rotation.y = Math.PI / 2;
        ring.position.y = 0.85;
        const glass = new THREE.Mesh(
          new THREE.CylinderGeometry(0.23, 0.23, 0.04, 32),
          kind === 'mirror' ? materials.brushedSteel : materials.borosilicateGlass
        );
        glass.rotation.z = Math.PI / 2;
        glass.position.y = 0.85;
        u.add(ring, glass);
      } else {
        const needleMat = new THREE.MeshStandardMaterial({ color });
        disposables.push(needleMat);
        const needle = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.34, 14), needleMat);
        needle.position.y = 0.84;
        u.add(needle);
      }
      return u;
    };

    objectUpright = makeUpright(0xf59e0b, 'pin');
    objectUpright.position.x = -1.0;
    group.add(objectUpright);

    opticalUpright = makeUpright(0x38bdf8, subMode.includes('mirror') ? 'mirror' : 'lens');
    opticalUpright.position.x = 0.0;
    group.add(opticalUpright);

    if (subMode === 'convex_mirror' || subMode === 'concave_lens') {
      auxLensUpright = makeUpright(0x38bdf8, 'lens');
      // Auxiliary convex lens sits between Object Pin and 75 cm upright
      auxLensUpright.position.x = subMode === 'convex_mirror' ? -0.58 : -0.42;
      group.add(auxLensUpright);

      const toggleLabel = subMode === 'convex_mirror' ? 'Remove Mirror' : 'Insert Concave Lens';
      const plaque = makeBenchPlaque(
        subMode === 'convex_mirror' ? 'CONVEX MIRROR' : 'CONCAVE LENS',
        `Click: ${toggleLabel}`,
        '#0284c7',
        [0.0, 0.0, 0.38],
        materials,
        maxAniso,
        disposables,
        0.9
      );
      group.add(plaque);
      dragTargets.push({
        mesh: plaque,
        label: `${toggleLabel} at 75 cm (click to mount/remove)`,
        onClick: (state, onPatch) => {
          labAudio.playMetallicTick(2000, 0.45);
          onPatch({ secondLensRemoved: !state.secondLensRemoved });
        },
      });
    }

    imageUpright = makeUpright(0x22d3ee, 'pin');
    imageUpright.position.x = 0.85;
    group.add(imageUpright);

    const r1Geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.0, 1.0, 0),
      new THREE.Vector3(0, 1.0, 0),
      new THREE.Vector3(0.85, 0.72, 0),
    ]);
    const r2Geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.0, 1.0, 0),
      new THREE.Vector3(0, 0.85, 0),
      new THREE.Vector3(0.85, 0.72, 0),
    ]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const rayMat2 = new THREE.LineBasicMaterial({ color: 0xfbbf24 });
    disposables.push(r1Geo, r2Geo, rayMat, rayMat2);
    rayLine1 = new THREE.Line(r1Geo, rayMat);
    rayLine2 = new THREE.Line(r2Geo, rayMat2);
    group.add(rayLine1, rayLine2);

    dragTargets.push({
      mesh: imageUpright,
      label: 'Image Pin Upright (drag horizontally to remove parallax)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.imagePinPosCm + dx * 40, 20, 140);
        onPatch({ imagePinPosCm: Number(next.toFixed(1)) });
      },
    });
    dragTargets.push({
      mesh: objectUpright,
      label: 'Object Pin Upright (drag horizontally)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.objectPosCm + dx * 40, 5, 75);
        onPatch({ objectPosCm: Number(next.toFixed(1)) });
      },
    });
  }

  return {
    group,
    dragTargets,
    update: (dt: number, state: RigState, _exp: ExperimentConfig) => {
      if (objectUpright && opticalUpright && imageUpright && rayLine1 && rayLine2) {
        const cmToWorld = (cm: number) => ((cm - 75) / 75) * 1.45;
        const ox = cmToWorld(state.objectPosCm);
        const lx = cmToWorld(state.lensOrMirrorPosCm);
        const ix = cmToWorld(state.imagePinPosCm);

        objectUpright.position.x = THREE.MathUtils.damp(objectUpright.position.x, ox, 14, dt);
        opticalUpright.position.x = THREE.MathUtils.damp(opticalUpright.position.x, lx, 14, dt);
        imageUpright.position.x = THREE.MathUtils.damp(imageUpright.position.x, ix, 14, dt);

        if (state.subMode === 'convex_mirror') {
          if (auxLensUpright) auxLensUpright.visible = true;
          opticalUpright.visible = !state.secondLensRemoved;
        } else if (state.subMode === 'concave_lens') {
          if (auxLensUpright) auxLensUpright.visible = true;
          opticalUpright.visible = state.secondLensRemoved;
        }

        const isConcaveMirror = state.subMode === 'concave_mirror';
        const isConvexMirrorMounted = state.subMode === 'convex_mirror' && !state.secondLensRemoved;
        const targetEndX = isConcaveMirror
          ? -Math.abs(ix)
          : isConvexMirrorMounted
          ? objectUpright.position.x
          : ix;

        const pivotX = auxLensUpright && !opticalUpright.visible ? auxLensUpright.position.x : opticalUpright.position.x;

        const pos1 = rayLine1.geometry.attributes.position as THREE.BufferAttribute;
        pos1.setXYZ(0, objectUpright.position.x, 1.0, 0);
        pos1.setXYZ(1, pivotX, 1.0, 0);
        pos1.setXYZ(2, targetEndX, 0.72, 0);
        pos1.needsUpdate = true;

        const pos2 = rayLine2.geometry.attributes.position as THREE.BufferAttribute;
        pos2.setXYZ(0, objectUpright.position.x, 1.0, 0);
        pos2.setXYZ(1, pivotX, 0.85, 0);
        pos2.setXYZ(2, targetEndX, 0.72, 0);
        pos2.needsUpdate = true;
      }

      if (prismGroup && prismRayRed && prismRayCyan) {
        const rot = THREE.MathUtils.degToRad(state.prismAngleIncidence - 45);
        prismGroup.rotation.y = THREE.MathUtils.damp(prismGroup.rotation.y, rot, 12, dt);
        const dev = 38 + Math.pow(state.prismAngleIncidence - 48, 2) * 0.04;
        const endZ = 0.1 + (dev - 35) * 0.022;
        const posR = prismRayRed.geometry.attributes.position as THREE.BufferAttribute;
        posR.setXYZ(3, 0.9, 0.24, endZ);
        posR.needsUpdate = true;
        const posC = prismRayCyan.geometry.attributes.position as THREE.BufferAttribute;
        posC.setXYZ(3, 0.9, 0.24, 0.18 + (dev - 35) * 0.028);
        posC.needsUpdate = true;

        if (emergentPins.length === 2) {
          emergentPins[0].position.set(0.45, 0.072, THREE.MathUtils.lerp(0.04, endZ, 0.42));
          emergentPins[1].position.set(0.75, 0.072, THREE.MathUtils.lerp(0.04, endZ, 0.8));
        }
      }

      if (scopeHead && glassSlabMesh) {
        scopeHead.position.y = THREE.MathUtils.damp(scopeHead.position.y, 0.65 + state.microscopeHeightMm * 0.015, 12, dt);
        const targetSlabX = state.slabPlaced ? 0.0 : 0.95;
        const targetSlabY = state.slabPlaced ? 0.175 : 0.1;
        const targetSlabZ = state.slabPlaced ? 0.0 : 0.2;
        glassSlabMesh.position.x = THREE.MathUtils.damp(glassSlabMesh.position.x, targetSlabX, 10, dt);
        glassSlabMesh.position.y = THREE.MathUtils.damp(glassSlabMesh.position.y, targetSlabY, 10, dt);
        glassSlabMesh.position.z = THREE.MathUtils.damp(glassSlabMesh.position.z, targetSlabZ, 10, dt);

        if (powderGroup) {
          powderGroup.visible = state.slabPlaced && state.powderSprinkled;
        }
      }

      if (pinHead && liquidLayer) {
        liquidLayer.visible = state.liquidAdded;
        pinHead.position.y = THREE.MathUtils.damp(pinHead.position.y, 0.45 + state.imagePinPosCm * 0.032, 12, dt);
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
