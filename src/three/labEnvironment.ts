import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createAnatomyPosterTexture,
  createCheckeredFloorTexture,
  createChemicalLabelTexture,
  createClockFaceTexture,
  createContactShadowTexture,
  createGraniteTextures,
  createPeriodicTableTexture,
  createTiledWallTexture,
  drawEquationBoardCanvas,
} from './proceduralTextures';

export interface LabMaterials {
  granite: THREE.MeshStandardMaterial;
  brushedSteel: THREE.MeshPhysicalMaterial;
  brass: THREE.MeshPhysicalMaterial;
  darkAnodized: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  borosilicateGlass: THREE.MeshPhysicalMaterial;
  ceramicWhite: THREE.MeshStandardMaterial;
  rubberBlack: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
}

export function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function createLabMaterials(isSoftwareGl: boolean, maxAniso: number): LabMaterials {
  const { map: graniteMap, roughnessMap: graniteRough } = createGraniteTextures(maxAniso);
  const contactTex = createContactShadowTexture();

  return {
    granite: new THREE.MeshStandardMaterial({
      map: graniteMap,
      roughnessMap: graniteRough,
      roughness: 0.42,
      metalness: 0.08,
    }),
    brushedSteel: new THREE.MeshPhysicalMaterial({
      color: 0xd0d7e2,
      metalness: 0.92,
      roughness: 0.22,
      anisotropy: 0.75,
      clearcoat: 0.2,
    }),
    brass: new THREE.MeshPhysicalMaterial({
      color: 0xd4a64a,
      metalness: 0.9,
      roughness: 0.24,
      anisotropy: 0.65,
    }),
    darkAnodized: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.55,
      roughness: 0.48,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.72,
      metalness: 0.04,
    }),
    borosilicateGlass: new THREE.MeshPhysicalMaterial({
      color: 0xe6f7ff,
      metalness: 0.02,
      roughness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.36 : 1.0,
      ior: 1.47,
      thickness: 0.18,
      clearcoat: 1.0,
      depthWrite: false,
    }),
    ceramicWhite: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.05,
    }),
    rubberBlack: new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.88,
      metalness: 0.02,
    }),
    copper: new THREE.MeshStandardMaterial({
      color: 0xc86d44,
      metalness: 0.88,
      roughness: 0.26,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    }),
  };
}

export interface LabEnvironmentHandles {
  roomGroup: THREE.Group;
  warningLight: THREE.PointLight;
  clockSecondHand: THREE.Object3D;
  equationBoard: {
    group: THREE.Group;
    screenMat: THREE.MeshStandardMaterial;
    texture: THREE.CanvasTexture;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  };
  dispose: () => void;
}

export function setupLabSceneEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  materials: LabMaterials,
  maxAniso = 4
): LabEnvironmentHandles {
  // Studio IBL environment for realistic glass & metallic reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();

  scene.background = new THREE.Color(0x0b111e);
  scene.fog = new THREE.FogExp2(0x0b111e, 0.032);

  // Balanced studio + laboratory lighting
  const hemi = new THREE.HemisphereLight(0xcbe4ff, 0x1e293b, 0.8);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.05);
  keyLight.position.set(4.5, 7.5, 5.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 22;
  const d = 4.6;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.85);
  rimLight.position.set(-5, 4, -5);
  scene.add(rimLight);

  // Overhead cool fluorescent ceiling fill
  const benchPoint = new THREE.PointLight(0xe0f2fe, 1.45, 14, 1.6);
  benchPoint.position.set(0, 3.8, 0.8);
  scene.add(benchPoint);

  // Warm task lamp spot near right corner of workbench
  const taskLight = new THREE.PointLight(0xffdca8, 1.35, 6.5, 1.7);
  taskLight.position.set(2.95, 1.05, -0.85);
  scene.add(taskLight);

  // Red safety warning light (intensity 0 unless triggered)
  const warningLight = new THREE.PointLight(0xef4444, 0, 8, 1.5);
  warningLight.position.set(0, 2.2, 1.8);
  scene.add(warningLight);

  const roomGroup = new THREE.Group();
  const disposables: { dispose: () => void }[] = [envTex];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // =========================================================
  // 1. MAIN GRANITE WORKBENCH, BEVEL TRIM, UNDER-CABINETS
  // =========================================================
  const benchGeo = track(new THREE.BoxGeometry(7.6, 0.16, 3.6));
  const benchSlab = new THREE.Mesh(benchGeo, materials.granite);
  benchSlab.position.set(0, -0.08, 0);
  benchSlab.receiveShadow = true;
  roomGroup.add(benchSlab);

  // Bevelled front steel & dark slate edge trim
  const trimGeo = track(new THREE.BoxGeometry(7.66, 0.055, 0.05));
  const frontTrim = new THREE.Mesh(trimGeo, materials.brushedSteel);
  frontTrim.position.set(0, -0.028, 1.81);
  roomGroup.add(frontTrim);

  const sideTrimGeo = track(new THREE.BoxGeometry(0.05, 0.055, 3.66));
  for (const sx of [-3.81, 3.81]) {
    const sTrim = new THREE.Mesh(sideTrimGeo, materials.brushedSteel);
    sTrim.position.set(sx, -0.028, 0);
    roomGroup.add(sTrim);
  }

  // Wooden under-bench cabinets with recessed doors & steel handles
  const cabinetBodyGeo = track(new THREE.BoxGeometry(6.8, 1.98, 2.8));
  const cabinetBody = new THREE.Mesh(cabinetBodyGeo, materials.wood);
  cabinetBody.position.set(0, -1.16, -0.05);
  cabinetBody.receiveShadow = true;
  roomGroup.add(cabinetBody);

  const doorPanelMat = track(
    new THREE.MeshStandardMaterial({ color: 0x57361b, roughness: 0.68, metalness: 0.06 })
  );
  const doorGeo = track(new THREE.BoxGeometry(1.48, 1.56, 0.04));
  const handleGeo = track(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 10));
  for (let c = 0; c < 4; c++) {
    const dx = -2.475 + c * 1.65;
    const door = new THREE.Mesh(doorGeo, doorPanelMat);
    door.position.set(dx, -1.14, 1.36);
    roomGroup.add(door);

    const handle = new THREE.Mesh(handleGeo, materials.brushedSteel);
    handle.position.set(dx + (c % 2 === 0 ? 0.56 : -0.56), -1.06, 1.4);
    roomGroup.add(handle);
  }

  // Steel corner legs & rubber leveling feet
  const legGeo = track(new THREE.BoxGeometry(0.14, 2.04, 0.14));
  for (const lx of [-3.58, 3.58]) {
    for (const lz of [-1.55, 1.55]) {
      const leg = new THREE.Mesh(legGeo, materials.darkAnodized);
      leg.position.set(lx, -1.18, lz);
      roomGroup.add(leg);
    }
  }

  // Backsplash ledge
  const backsplashGeo = track(new THREE.BoxGeometry(7.6, 0.52, 0.12));
  const backsplash = new THREE.Mesh(backsplashGeo, materials.darkAnodized);
  backsplash.position.set(0, 0.26, -1.74);
  backsplash.receiveShadow = true;
  roomGroup.add(backsplash);

  // Brass gas taps mounted along left backsplash edge
  const gasBaseGeo = track(new THREE.CylinderGeometry(0.036, 0.044, 0.08, 14));
  const gasNozzleGeo = track(new THREE.CylinderGeometry(0.012, 0.016, 0.12, 10));
  const valveMat = track(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.2 }));
  const valveGeo = track(new THREE.BoxGeometry(0.07, 0.022, 0.022));
  for (const gx of [-3.05, -2.72]) {
    const tap = new THREE.Group();
    const base = new THREE.Mesh(gasBaseGeo, materials.brass);
    base.position.y = 0.04;
    const nozzle = new THREE.Mesh(gasNozzleGeo, materials.brass);
    nozzle.rotation.x = Math.PI / 3;
    nozzle.position.set(0, 0.09, 0.05);
    const valve = new THREE.Mesh(valveGeo, valveMat);
    valve.position.set(0, 0.1, 0);
    tap.add(base, nozzle, valve);
    tap.position.set(gx, 0.0, -1.62);
    roomGroup.add(tap);
  }

  // Electrical power sockets along right backsplash
  const plateGeo = track(new THREE.BoxGeometry(0.24, 0.18, 0.03));
  const pinHoleGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8));
  const ledOnMat = track(
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.4 })
  );
  const ledGeo = track(new THREE.BoxGeometry(0.024, 0.014, 0.014));
  for (const sx of [2.42, 2.9]) {
    const sock = new THREE.Group();
    const plate = new THREE.Mesh(plateGeo, materials.ceramicWhite);
    sock.add(plate);
    for (const px of [-0.045, 0.045]) {
      const hole = new THREE.Mesh(pinHoleGeo, materials.rubberBlack);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(px, 0.01, 0.014);
      sock.add(hole);
    }
    const groundHole = new THREE.Mesh(pinHoleGeo, materials.rubberBlack);
    groundHole.rotation.x = Math.PI / 2;
    groundHole.position.set(0, 0.045, 0.014);
    sock.add(groundHole);

    const led = new THREE.Mesh(ledGeo, ledOnMat);
    led.position.set(0.075, -0.05, 0.014);
    sock.add(led);
    sock.position.set(sx, 0.28, -1.67);
    roomGroup.add(sock);
  }

  // Warm articulated desk task lamp on back-right corner
  const lampGroup = new THREE.Group();
  const lampBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 18)), materials.darkAnodized);
  const lampArm1 = new THREE.Mesh(track(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 10)), materials.brushedSteel);
  lampArm1.position.set(0, 0.31, 0);
  lampArm1.rotation.z = 0.22;
  const lampArm2 = new THREE.Mesh(track(new THREE.CylinderGeometry(0.014, 0.014, 0.45, 10)), materials.brushedSteel);
  lampArm2.position.set(-0.22, 0.72, 0.08);
  lampArm2.rotation.z = 1.1;
  const lampShade = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.14, 0.2, 20, 1, true)),
    materials.darkAnodized
  );
  lampShade.position.set(-0.4, 0.78, 0.16);
  lampShade.rotation.z = 0.55;
  const bulbMat = track(
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfbbf24, emissiveIntensity: 2.2 })
  );
  const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.045, 12, 12)), bulbMat);
  bulb.position.set(-0.42, 0.73, 0.16);
  lampGroup.add(lampBase, lampArm1, lampArm2, lampShade, bulb);
  lampGroup.position.set(3.38, 0, -1.25);
  roomGroup.add(lampGroup);

  // =========================================================
  // 2. TILED LAB WALLS & CHECKERED FLOOR
  // =========================================================
  const wallTex = track(createTiledWallTexture(maxAniso));
  const wallMat = track(
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.78, metalness: 0.06 })
  );

  const backWall = new THREE.Mesh(track(new THREE.PlaneGeometry(24, 9)), wallMat);
  backWall.position.set(0, 2.3, -3.15);
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  const sideWallGeo = track(new THREE.PlaneGeometry(18, 9));
  const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
  leftWall.position.set(-6.4, 2.3, 1.5);
  leftWall.rotation.y = Math.PI / 2;
  roomGroup.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
  rightWall.position.set(6.4, 2.3, 1.5);
  rightWall.rotation.y = -Math.PI / 2;
  roomGroup.add(rightWall);

  const floorTex = track(createCheckeredFloorTexture(maxAniso));
  const floorMat = track(
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.72, metalness: 0.08 })
  );
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(24, 24)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.2;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  // Overhead fluorescent ceiling fixtures
  const tubeGeo = track(new THREE.BoxGeometry(2.8, 0.06, 0.24));
  const tubeGlowMat = track(
    new THREE.MeshStandardMaterial({ color: 0xf0f9ff, emissive: 0xbae6fd, emissiveIntensity: 1.8 })
  );
  for (const fz of [-1.2, 1.5]) {
    const fixture = new THREE.Mesh(tubeGeo, tubeGlowMat);
    fixture.position.set(0, 4.65, fz);
    roomGroup.add(fixture);
  }

  // =========================================================
  // 3. MULTI-TIER BACK-WALL REAGENT SHELVES & LABELED BOTTLES
  // =========================================================
  const shelfGeo = track(new THREE.BoxGeometry(5.6, 0.055, 0.44));
  const bracketGeo = track(new THREE.BoxGeometry(0.05, 0.24, 0.36));
  for (const sy of [1.45, 2.15]) {
    const shelf = new THREE.Mesh(shelfGeo, materials.wood);
    shelf.position.set(0, sy, -2.9);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    roomGroup.add(shelf);

    for (const bx of [-2.4, -0.9, 0.9, 2.4]) {
      const br = new THREE.Mesh(bracketGeo, materials.darkAnodized);
      br.position.set(bx, sy - 0.14, -2.94);
      roomGroup.add(br);
    }
  }

  const bottleGeo = track(new THREE.CylinderGeometry(0.082, 0.082, 0.3, 16));
  const neckGeo = track(new THREE.CylinderGeometry(0.032, 0.042, 0.09, 14));
  const capGeo = track(new THREE.CylinderGeometry(0.038, 0.038, 0.045, 14));
  const labelGeo = track(new THREE.CylinderGeometry(0.084, 0.084, 0.13, 16, 1, true, -0.75, 1.5));

  const amberMat = track(
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.88 })
  );
  const cobaltMat = track(
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.78 })
  );
  const permanganateMat = track(
    new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.84 })
  );

  const reagents: { x: number; y: number; formula: string; name: string; mat: THREE.Material }[] = [
    { x: -2.45, y: 1.48, formula: 'HCl', name: 'Hydrochloric Acid', mat: amberMat },
    { x: -1.95, y: 1.48, formula: 'H₂SO₄', name: 'Sulphuric Acid', mat: amberMat },
    { x: -1.45, y: 1.48, formula: 'NaOH', name: 'Sodium Hydroxide', mat: cobaltMat },
    { x: 1.45, y: 1.48, formula: 'KMnO₄', name: 'Permanganate', mat: permanganateMat },
    { x: 1.95, y: 1.48, formula: 'AgNO₃', name: 'Silver Nitrate', mat: amberMat },
    { x: 2.45, y: 1.48, formula: 'CuSO₄', name: 'Copper Sulphate', mat: cobaltMat },
    { x: -2.2, y: 2.18, formula: 'NH₄OH', name: 'Ammonia Sol.', mat: cobaltMat },
    { x: -1.65, y: 2.18, formula: 'FeSO₄', name: 'Ferrous Sulphate', mat: amberMat },
    { x: 1.65, y: 2.18, formula: 'HNO₃', name: 'Nitric Acid', mat: amberMat },
    { x: 2.2, y: 2.18, formula: 'KI', name: 'Potassium Iodide', mat: amberMat },
  ];

  reagents.forEach((r) => {
    const bottle = new THREE.Group();
    const body = new THREE.Mesh(bottleGeo, r.mat);
    body.position.y = 0.15;
    const neck = new THREE.Mesh(neckGeo, materials.borosilicateGlass);
    neck.position.y = 0.34;
    const cap = new THREE.Mesh(capGeo, materials.rubberBlack);
    cap.position.y = 0.4;

    const lblTex = track(createChemicalLabelTexture(r.formula, r.name, maxAniso));
    const lblMat = track(new THREE.MeshStandardMaterial({ map: lblTex, roughness: 0.6 }));
    const lbl = new THREE.Mesh(labelGeo, lblMat);
    lbl.position.y = 0.16;

    bottle.add(body, neck, cap, lbl);
    bottle.position.set(r.x, r.y, -2.88);
    roomGroup.add(bottle);
  });

  // Top-shelf volumetric flasks & wash bottle
  const volBulbGeo = track(new THREE.SphereGeometry(0.11, 16, 14));
  const volNeckGeo = track(new THREE.CylinderGeometry(0.022, 0.028, 0.24, 12));
  for (const vx of [-1.1, 1.1]) {
    const flask = new THREE.Group();
    const bulbMesh = new THREE.Mesh(volBulbGeo, materials.borosilicateGlass);
    bulbMesh.position.y = 0.11;
    const neckMesh = new THREE.Mesh(volNeckGeo, materials.borosilicateGlass);
    neckMesh.position.y = 0.28;
    flask.add(bulbMesh, neckMesh);
    flask.position.set(vx, 2.18, -2.86);
    roomGroup.add(flask);
  }

  // =========================================================
  // 4. WALL POSTERS & TICKING ANALOG WALL CLOCK
  // =========================================================
  const ptTex = track(createPeriodicTableTexture(maxAniso));
  const ptMat = track(new THREE.MeshStandardMaterial({ map: ptTex, roughness: 0.45 }));
  const ptFrame = new THREE.Mesh(track(new THREE.BoxGeometry(2.05, 1.32, 0.04)), materials.darkAnodized);
  const ptPoster = new THREE.Mesh(track(new THREE.PlaneGeometry(1.96, 1.24)), ptMat);
  ptPoster.position.z = 0.024;
  ptFrame.add(ptPoster);
  ptFrame.position.set(-2.35, 3.15, -3.11);
  roomGroup.add(ptFrame);

  const anatTex = track(createAnatomyPosterTexture(maxAniso));
  const anatMat = track(new THREE.MeshStandardMaterial({ map: anatTex, roughness: 0.45 }));
  const anatFrame = new THREE.Mesh(track(new THREE.BoxGeometry(1.36, 1.88, 0.04)), materials.darkAnodized);
  const anatPoster = new THREE.Mesh(track(new THREE.PlaneGeometry(1.28, 1.8)), anatMat);
  anatPoster.position.z = 0.024;
  anatFrame.add(anatPoster);
  anatFrame.position.set(2.45, 3.2, -3.11);
  roomGroup.add(anatFrame);

  // Analog Wall Clock
  const clockGroup = new THREE.Group();
  const clockBezel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 32)),
    materials.brushedSteel
  );
  clockBezel.rotation.x = Math.PI / 2;
  const clockTex = track(createClockFaceTexture(maxAniso));
  const clockFaceMat = track(new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.35 }));
  const clockFace = new THREE.Mesh(track(new THREE.CircleGeometry(0.32, 32)), clockFaceMat);
  clockFace.position.z = 0.032;

  const hourHand = new THREE.Mesh(track(new THREE.BoxGeometry(0.022, 0.16, 0.01)), materials.rubberBlack);
  hourHand.position.set(0.04, 0.05, 0.038);
  hourHand.rotation.z = -0.8;
  const minHand = new THREE.Mesh(track(new THREE.BoxGeometry(0.016, 0.24, 0.01)), materials.rubberBlack);
  minHand.position.set(-0.06, 0.08, 0.042);
  minHand.rotation.z = 0.65;

  const clockSecondHand = new THREE.Group();
  clockSecondHand.position.z = 0.046;
  const secNeedleMat = track(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }));
  const secNeedle = new THREE.Mesh(track(new THREE.BoxGeometry(0.008, 0.27, 0.008)), secNeedleMat);
  secNeedle.position.y = 0.11;
  clockSecondHand.add(secNeedle);

  clockGroup.add(clockBezel, clockFace, hourHand, minHand, clockSecondHand);
  clockGroup.position.set(0, 3.38, -3.1);
  roomGroup.add(clockGroup);

  // =========================================================
  // 5. GLASS-FRONTED FUME HOOD (LEFT) & SINK / EYEWASH (RIGHT)
  // =========================================================
  const fumeHood = new THREE.Group();
  const fhCabinet = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 1.98, 1.15)), materials.darkAnodized);
  fhCabinet.position.set(0, -1.21, 0);
  const fhDeck = new THREE.Mesh(track(new THREE.BoxGeometry(1.74, 0.1, 1.2)), materials.granite);
  fhDeck.position.set(0, -0.17, 0);
  const fhBack = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 2.25, 0.1)), materials.darkAnodized);
  fhBack.position.set(0, 1.0, -0.52);
  const fhSideGeo = track(new THREE.BoxGeometry(0.08, 2.25, 1.15));
  for (const sx of [-0.81, 0.81]) {
    const s = new THREE.Mesh(fhSideGeo, materials.darkAnodized);
    s.position.set(sx, 1.0, 0);
    fumeHood.add(s);
  }
  const fhTop = new THREE.Mesh(track(new THREE.BoxGeometry(1.72, 0.38, 1.18)), materials.darkAnodized);
  fhTop.position.set(0, 2.24, 0);
  const fhDuct = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 16)), materials.brushedSteel);
  fhDuct.position.set(0, 3.3, -0.15);
  const fhSash = new THREE.Mesh(track(new THREE.BoxGeometry(1.54, 1.2, 0.025)), materials.borosilicateGlass);
  fhSash.position.set(0, 1.12, 0.54);
  const fhLight = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 0.04, 0.1)), tubeGlowMat);
  fhLight.position.set(0, 2.02, 0);
  fumeHood.add(fhCabinet, fhDeck, fhBack, fhTop, fhDuct, fhSash, fhLight);
  fumeHood.position.set(-5.05, 0, -2.32);
  fumeHood.rotation.y = 0.24;
  roomGroup.add(fumeHood);

  const sinkStation = new THREE.Group();
  const sinkCab = new THREE.Mesh(track(new THREE.BoxGeometry(1.65, 1.98, 1.1)), materials.wood);
  sinkCab.position.set(0, -1.21, 0);
  const sinkCounter = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.1, 1.16)), materials.ceramicWhite);
  sinkCounter.position.set(0, -0.17, 0);
  const basinWall = new THREE.Mesh(track(new THREE.BoxGeometry(0.84, 0.22, 0.62)), materials.ceramicWhite);
  basinWall.position.set(-0.22, -0.02, 0);
  const faucetPipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.022, 0.024, 0.42, 12)), materials.brushedSteel);
  faucetPipe.position.set(-0.22, 0.28, -0.25);
  const faucetSpout = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 12)), materials.brushedSteel);
  faucetSpout.rotation.x = Math.PI / 2;
  faucetSpout.position.set(-0.22, 0.47, -0.15);

  // Eyewash green bowl & twin nozzles
  const ewMat = track(new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35 }));
  const ewBowl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.12, 0.1, 18)), ewMat);
  ewBowl.position.set(0.45, 0.06, 0.12);
  const ewPost = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 12)), materials.brass);
  ewPost.position.set(0.45, -0.05, 0.12);
  sinkStation.add(sinkCab, sinkCounter, basinWall, faucetPipe, faucetSpout, ewBowl, ewPost);
  sinkStation.position.set(5.05, 0, -2.32);
  sinkStation.rotation.y = -0.24;
  roomGroup.add(sinkStation);

  // =========================================================
  // 6. 3D ANIMATED DIGITAL EQUATION DISPLAY BOARD ON BENCH
  // =========================================================
  const eqCanvas = document.createElement('canvas');
  eqCanvas.width = 640;
  eqCanvas.height = 264;
  const eqCtx = eqCanvas.getContext('2d')!;
  drawEquationBoardCanvas(
    eqCtx,
    640,
    264,
    'Laboratory',
    'Reactants Ready',
    'Mix reagents or adjust controls to form live equations',
    'Live Chemistry, Physics & Biology equation readout active.',
    '#38bdf8',
    'ready'
  );
  const eqTex = track(new THREE.CanvasTexture(eqCanvas));
  eqTex.colorSpace = THREE.SRGBColorSpace;
  eqTex.anisotropy = maxAniso;

  const eqScreenMat = track(
    new THREE.MeshStandardMaterial({
      map: eqTex,
      emissiveMap: eqTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.65,
      roughness: 0.22,
      metalness: 0.08,
    })
  );

  const eqGroup = new THREE.Group();
  const eqStandBase = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.035, 0.24)),
    materials.darkAnodized
  );
  eqStandBase.position.y = 0.0175;
  const eqNeck = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.024, 0.032, 0.24, 14)),
    materials.brushedSteel
  );
  eqNeck.position.set(0, 0.14, -0.04);

  const eqFrameGroup = new THREE.Group();
  eqFrameGroup.position.set(0, 0.38, 0.02);
  eqFrameGroup.rotation.x = -0.18;
  const eqBezel = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.08, 0.48, 0.04)),
    materials.darkAnodized
  );
  const eqScreen = new THREE.Mesh(track(new THREE.PlaneGeometry(1.02, 0.42)), eqScreenMat);
  eqScreen.position.z = 0.022;
  eqFrameGroup.add(eqBezel, eqScreen);

  eqGroup.add(eqStandBase, eqNeck, eqFrameGroup);
  eqGroup.position.set(-2.15, 0, -1.02);
  eqGroup.rotation.y = 0.38;
  roomGroup.add(eqGroup);

  scene.add(roomGroup);

  return {
    roomGroup,
    warningLight,
    clockSecondHand,
    equationBoard: {
      group: eqGroup,
      screenMat: eqScreenMat,
      texture: eqTex,
      canvas: eqCanvas,
      ctx: eqCtx,
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function addContactShadow(parent: THREE.Object3D, mat: THREE.MeshBasicMaterial, radius = 0.5, y = 0.002): THREE.Mesh {
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = y;
  parent.add(shadow);
  return shadow;
}
