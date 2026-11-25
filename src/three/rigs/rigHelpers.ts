import * as THREE from 'three';
import { LabMaterials } from '../labEnvironment';
import { createChemicalLabelTexture } from '../proceduralTextures';

export interface BottleOpts {
  formula: string;
  name: string;
  liquidColor: number;
  bandColor?: string;
  amber?: boolean;
  dropperCap?: boolean;
  scale?: number;
  pos: [number, number, number];
  materials: LabMaterials;
  maxAniso: number;
  disposables: { dispose: () => void }[];
}

export function makeLabeledBottle(opts: BottleOpts): THREE.Group {
  const {
    formula,
    name,
    liquidColor,
    bandColor = '#0284c7',
    amber = false,
    dropperCap = true,
    scale = 1,
    pos,
    materials,
    maxAniso,
    disposables,
  } = opts;

  const g = new THREE.Group();
  g.position.set(pos[0], pos[1], pos[2]);
  if (scale !== 1) g.scale.setScalar(scale);

  const bodyGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.27, 20);
  const neckGeo = new THREE.CylinderGeometry(0.032, 0.044, 0.075, 16);
  const capGeo = new THREE.CylinderGeometry(0.026, 0.036, 0.095, 14);
  const liqGeo = new THREE.CylinderGeometry(0.074, 0.074, 0.175, 18);
  const lblGeo = new THREE.CylinderGeometry(0.087, 0.087, 0.125, 20, 1, true, -0.95, 1.9);

  const glassMat = amber
    ? new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.16,
        metalness: 0.05,
        transparent: true,
        opacity: 0.88,
      })
    : materials.borosilicateGlass;

  const liqMat = new THREE.MeshStandardMaterial({
    color: liquidColor,
    transparent: true,
    opacity: amber ? 0.45 : 0.72,
    roughness: 0.12,
  });

  const lblTex = createChemicalLabelTexture(formula, name, maxAniso, bandColor);
  const lblMat = new THREE.MeshStandardMaterial({ map: lblTex, roughness: 0.55 });

  disposables.push(bodyGeo, neckGeo, capGeo, liqGeo, lblGeo, liqMat, lblTex, lblMat);
  if (amber) disposables.push(glassMat);

  const body = new THREE.Mesh(bodyGeo, glassMat);
  body.position.y = 0.135;
  body.renderOrder = 3;
  body.castShadow = true;

  const neck = new THREE.Mesh(neckGeo, glassMat);
  neck.position.y = 0.305;

  const cap = new THREE.Mesh(capGeo, dropperCap ? materials.rubberBlack : materials.ceramicWhite);
  cap.position.y = 0.38;

  const liq = new THREE.Mesh(liqGeo, liqMat);
  liq.position.y = 0.105;

  const lbl = new THREE.Mesh(lblGeo, lblMat);
  lbl.position.y = 0.145;

  g.add(liq, body, neck, cap, lbl);
  return g;
}

export interface SolidJarOpts {
  formula: string;
  name: string;
  powderColor: number;
  bandColor?: string;
  granules?: boolean;
  pos: [number, number, number];
  materials: LabMaterials;
  maxAniso: number;
  disposables: { dispose: () => void }[];
}

export function makeSolidJar(opts: SolidJarOpts): THREE.Group {
  const {
    formula,
    name,
    powderColor,
    bandColor = '#16a34a',
    granules = false,
    pos,
    materials,
    maxAniso,
    disposables,
  } = opts;

  const g = new THREE.Group();
  g.position.set(pos[0], pos[1], pos[2]);

  const jarGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.22, 20);
  const lidGeo = new THREE.CylinderGeometry(0.108, 0.108, 0.045, 20);
  const powderGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.11, 18);
  const lblGeo = new THREE.CylinderGeometry(0.107, 0.107, 0.115, 20, 1, true, -0.95, 1.9);

  const powderMat = new THREE.MeshStandardMaterial({
    color: powderColor,
    roughness: granules ? 0.38 : 0.85,
    metalness: granules ? 0.72 : 0.05,
  });

  const lblTex = createChemicalLabelTexture(formula, name, maxAniso, bandColor);
  const lblMat = new THREE.MeshStandardMaterial({ map: lblTex, roughness: 0.55 });

  const spatBladeGeo = new THREE.BoxGeometry(0.24, 0.008, 0.026);
  const spatHandleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10);

  disposables.push(
    jarGeo,
    lidGeo,
    powderGeo,
    lblGeo,
    powderMat,
    lblTex,
    lblMat,
    spatBladeGeo,
    spatHandleGeo
  );

  const jar = new THREE.Mesh(jarGeo, materials.borosilicateGlass);
  jar.position.y = 0.11;
  jar.renderOrder = 3;

  const lid = new THREE.Mesh(lidGeo, materials.darkAnodized);
  lid.position.set(0.16, 0.022, -0.06);

  const powder = new THREE.Mesh(powderGeo, powderMat);
  powder.position.y = 0.065;

  const lbl = new THREE.Mesh(lblGeo, lblMat);
  lbl.position.y = 0.115;

  // Stainless steel spatula resting angled over jar rim
  const spatula = new THREE.Group();
  spatula.position.set(0.04, 0.24, 0.02);
  spatula.rotation.z = -0.35;
  const blade = new THREE.Mesh(spatBladeGeo, materials.brushedSteel);
  const handle = new THREE.Mesh(spatHandleGeo, materials.wood);
  handle.rotation.z = Math.PI / 2;
  handle.position.x = 0.14;
  spatula.add(blade, handle);

  g.add(powder, jar, lid, lbl, spatula);
  return g;
}

export function makeBenchPlaque(
  formula: string,
  name: string,
  bandColor: string,
  pos: [number, number, number],
  materials: LabMaterials,
  maxAniso: number,
  disposables: { dispose: () => void }[],
  scale = 1
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(pos[0], pos[1], pos[2]);
  if (scale !== 1) g.scale.setScalar(scale);

  const backingGeo = new THREE.BoxGeometry(0.28, 0.14, 0.018);
  const faceGeo = new THREE.PlaneGeometry(0.26, 0.125);
  const tex = createChemicalLabelTexture(formula, name, maxAniso, bandColor);
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 });
  disposables.push(backingGeo, faceGeo, tex, faceMat);

  const stand = new THREE.Mesh(backingGeo, materials.darkAnodized);
  stand.rotation.x = -0.35;
  stand.position.y = 0.07;

  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = 0.01;
  stand.add(face);

  g.add(stand);
  return g;
}
