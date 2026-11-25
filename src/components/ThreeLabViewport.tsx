import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { recomputeElectricalMetrics } from '../data/experiments';
import {
  createLabMaterials,
  detectSoftwareWebGL,
  LabEnvironmentHandles,
  LabMaterials,
  setupLabSceneEnvironment,
} from '../three/labEnvironment';
import { drawEquationBoardCanvas } from '../three/proceduralTextures';
import { createBiologyRig } from '../three/rigs/BiologyRig';
import { createMechanicsRig } from '../three/rigs/MechanicsRig';
import { createOpticsRig } from '../three/rigs/OpticsRig';
import { createQualitativeAnalysisRig } from '../three/rigs/QualitativeAnalysisRig';
import { DragTarget, LabRig } from '../three/rigs/rigTypes';
import { createThermalElectricalRig } from '../three/rigs/ThermalElectricalRig';
import { createWetChemistryRig } from '../three/rigs/WetChemistryRig';
import { CameraPreset, ExperimentConfig, LabMode, RigState } from '../types/lab';
import { evaluateLiveEquation } from '../utils/liveEquationEngine';

export interface ThreeLabViewportHandle {
  toggleVR: () => Promise<void>;
}

interface ThreeLabViewportProps {
  experiment: ExperimentConfig;
  rigState: RigState;
  labMode?: LabMode;
  activePreset: CameraPreset;
  presetTrigger: number;
  safetyFlash: boolean;
  introOrbit?: boolean;
  onPatchState: (patch: Partial<RigState>) => void;
  onXrSupportChange?: (supported: boolean) => void;
  onXrActiveChange?: (active: boolean) => void;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _xrTempMat = new THREE.Matrix4();
const _xrRayOrigin = new THREE.Vector3();
const _xrRayDir = new THREE.Vector3();

// Position VR standing rig relative to the bench top (bench top y=0, front edge z=1.8)
const VR_BENCH_ORIGIN = new THREE.Vector3(0, -1.05, 2.45);

export const ThreeLabViewport = forwardRef<ThreeLabViewportHandle, ThreeLabViewportProps>(({
  experiment,
  rigState,
  labMode = 'practice',
  activePreset,
  presetTrigger,
  safetyFlash,
  introOrbit = false,
  onPatchState,
  onXrSupportChange,
  onXrActiveChange,
}, ref) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoverHint, setHoverHint] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [xrActive, setXrActive] = useState(false);
  const [xrError, setXrError] = useState<string | null>(null);

  // Refs synced without recreating WebGLRenderer
  const stateRef = useRef(rigState);
  stateRef.current = rigState;

  const expRef = useRef(experiment);
  expRef.current = experiment;

  const labModeRef = useRef(labMode);
  labModeRef.current = labMode;

  const onPatchRef = useRef(onPatchState);
  onPatchRef.current = onPatchState;

  const safetyRef = useRef(safetyFlash);
  safetyRef.current = safetyFlash;

  const introOrbitRef = useRef(introOrbit);
  introOrbitRef.current = introOrbit;

  const onXrSupportRef = useRef(onXrSupportChange);
  onXrSupportRef.current = onXrSupportChange;

  const onXrActiveRef = useRef(onXrActiveChange);
  onXrActiveRef.current = onXrActiveChange;

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const camTransitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    look: THREE.Vector3;
  }>({
    active: true,
    pos: new THREE.Vector3(...activePreset.position),
    look: new THREE.Vector3(...activePreset.target),
  });

  // Update target camera preset smoothly when preset changes or login completes
  useEffect(() => {
    camTransitionRef.current = {
      active: true,
      pos: new THREE.Vector3(...activePreset.position),
      look: new THREE.Vector3(...activePreset.target),
    };
  }, [activePreset, presetTrigger, introOrbit]);

  // Check WebXR VR headset support & report to TopNavHeader
  useEffect(() => {
    let active = true;
    const nav = navigator as Navigator & {
      xr?: { isSessionSupported: (mode: string) => Promise<boolean> };
    };
    if (!nav.xr || typeof nav.xr.isSessionSupported !== 'function') {
      onXrSupportRef.current?.(false);
      return;
    }
    nav.xr
      .isSessionSupported('immersive-vr')
      .then((ok) => {
        if (active) onXrSupportRef.current?.(Boolean(ok));
      })
      .catch(() => {
        if (active) onXrSupportRef.current?.(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Refs for scene & active rig
  const sceneRef = useRef<THREE.Scene | null>(null);
  const materialsRef = useRef<LabMaterials | null>(null);
  const maxAnisoRef = useRef<number>(4);
  const activeRigRef = useRef<LabRig | null>(null);

  const handleToggleVR = async () => {
    setXrError(null);
    const renderer = rendererRef.current;
    if (!renderer) return;

    const currentSession = renderer.xr.getSession();
    if (currentSession) {
      await currentSession.end();
      return;
    }

    const nav = navigator as Navigator & {
      xr?: {
        requestSession: (mode: string, init?: Record<string, unknown>) => Promise<XRSession>;
      };
    };
    if (!nav.xr) {
      setXrError('WebXR is not available in this browser.');
      return;
    }

    try {
      const session = await nav.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      await renderer.xr.setSession(session);
    } catch {
      setXrError('Could not start VR session. Ensure headset is connected & allowed.');
    }
  };

  useImperativeHandle(ref, () => ({
    toggleVR: handleToggleVR,
  }));

  // Initialize WebGLRenderer & Lab Scene ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    maxAnisoRef.current = maxAniso;

    const materials = createLabMaterials(isSoftwareGl, maxAniso);
    materialsRef.current = materials;

    const envHandles: LabEnvironmentHandles = setupLabSceneEnvironment(
      scene,
      renderer,
      materials,
      maxAniso
    );

    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      60
    );
    camera.position.set(...activePreset.position);

    // VR Player Rig positioned relative to the lab workbench
    const xrPlayerRig = new THREE.Group();
    xrPlayerRig.position.copy(VR_BENCH_ORIGIN);
    scene.add(xrPlayerRig);

    const controllerModelFactory = new XRControllerModelFactory();
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -4),
    ]);
    const beamMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.75 });

    const xrRaycaster = new THREE.Raycaster();

    const setupVrController = (idx: number) => {
      const ctrl = renderer.xr.getController(idx);
      const beam = new THREE.Line(beamGeo, beamMat);
      ctrl.add(beam);
      xrPlayerRig.add(ctrl);

      const grip = renderer.xr.getControllerGrip(idx);
      grip.add(controllerModelFactory.createControllerModel(grip));
      xrPlayerRig.add(grip);

      const onSelectStart = () => {
        _xrTempMat.identity().extractRotation(ctrl.matrixWorld);
        _xrRayOrigin.setFromMatrixPosition(ctrl.matrixWorld);
        _xrRayDir.set(0, 0, -1).applyMatrix4(_xrTempMat);
        xrRaycaster.set(_xrRayOrigin, _xrRayDir);

        const rig = activeRigRef.current;
        if (rig && rig.dragTargets.length > 0) {
          const hits = xrRaycaster.intersectObjects(
            rig.dragTargets.map((t) => t.mesh),
            true
          );
          if (hits.length > 0) {
            let hitObj: THREE.Object3D | null = hits[0].object;
            while (hitObj) {
              const match = rig.dragTargets.find((t) => t.mesh === hitObj);
              if (match) {
                if (match.onClick) {
                  match.onClick(stateRef.current, (patch) => {
                    const merged = { ...stateRef.current, ...patch };
                    const elec = recomputeElectricalMetrics(merged);
                    onPatchRef.current({ ...patch, ...elec });
                  });
                } else if (match.onDrag) {
                  match.onDrag(0.04, 0, stateRef.current, (patch) => {
                    const merged = { ...stateRef.current, ...patch };
                    const elec = recomputeElectricalMetrics(merged);
                    onPatchRef.current({ ...patch, ...elec });
                  });
                }
                return;
              }
              hitObj = hitObj.parent;
            }
          }
        }

        // Teleport relative to bench & room bounds when aiming at lab floor
        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.2);
        const hitPt = new THREE.Vector3();
        if (xrRaycaster.ray.intersectPlane(floorPlane, hitPt)) {
          xrPlayerRig.position.x = Math.max(-5.2, Math.min(5.2, hitPt.x));
          xrPlayerRig.position.z = Math.max(-2.1, Math.min(4.8, hitPt.z));
        }
      };

      ctrl.addEventListener('selectstart', onSelectStart);
    };

    setupVrController(0);
    setupVrController(1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.7;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.target.set(...activePreset.target);
    controls.update();

    controls.addEventListener('start', () => {
      camTransitionRef.current.active = false;
    });

    // Raycaster & Dragging State
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let activeDrag: DragTarget | null = null;
    let lastClientX = 0;
    let lastClientY = 0;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastHoverCheck = 0;

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findHitTarget = (): DragTarget | null => {
      const rig = activeRigRef.current;
      if (!rig || rig.dragTargets.length === 0) return null;
      raycaster.setFromCamera(pointer, camera);
      const roots = rig.dragTargets.map((t) => t.mesh);
      const hits = raycaster.intersectObjects(roots, true);
      if (hits.length === 0) return null;
      let hitObj: THREE.Object3D | null = hits[0].object;
      while (hitObj) {
        const match = rig.dragTargets.find((t) => t.mesh === hitObj);
        if (match) return match;
        hitObj = hitObj.parent;
      }
      return null;
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (renderer.xr.isPresenting) return;
      updatePointer(ev);
      const target = findHitTarget();
      if (target) {
        activeDrag = target;
        controls.enabled = false;
        lastClientX = ev.clientX;
        lastClientY = ev.clientY;
        pointerDownX = ev.clientX;
        pointerDownY = ev.clientY;
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (renderer.xr.isPresenting) return;
      if (activeDrag) {
        const dx = (ev.clientX - lastClientX) / Math.max(200, renderer.domElement.clientWidth);
        const dy = (ev.clientY - lastClientY) / Math.max(200, renderer.domElement.clientHeight);
        lastClientX = ev.clientX;
        lastClientY = ev.clientY;
        if (activeDrag.onDrag) {
          activeDrag.onDrag(dx, dy, stateRef.current, (patch) => {
            const merged = { ...stateRef.current, ...patch };
            const elec = recomputeElectricalMetrics(merged);
            onPatchRef.current({ ...patch, ...elec });
          });
        }
        return;
      }

      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;
      updatePointer(ev);
      const target = findHitTarget();
      if (target) {
        renderer.domElement.style.cursor = target.onDrag ? 'grab' : 'pointer';
        setHoverHint(target.label);
      } else {
        renderer.domElement.style.cursor = 'default';
        setHoverHint(null);
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (activeDrag) {
        const moved = Math.hypot(ev.clientX - pointerDownX, ev.clientY - pointerDownY);
        if (moved < 6 && activeDrag.onClick) {
          activeDrag.onClick(stateRef.current, (patch) => {
            const merged = { ...stateRef.current, ...patch };
            const elec = recomputeElectricalMetrics(merged);
            onPatchRef.current({ ...patch, ...elec });
          });
        }
        activeDrag = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = 'default';
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container || renderer.xr.isPresenting) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Build initial rig before shader pre-warm
    const buildRigForExp = (exp: ExperimentConfig) => {
      if (activeRigRef.current) {
        scene.remove(activeRigRef.current.group);
        activeRigRef.current.dispose();
        activeRigRef.current = null;
      }
      let rig: LabRig;
      switch (exp.rigType) {
        case 'mechanics':
          rig = createMechanicsRig(exp.subMode, materials, maxAniso);
          break;
        case 'thermal_electrical':
          rig = createThermalElectricalRig(exp.subMode, materials, maxAniso);
          break;
        case 'optics':
          rig = createOpticsRig(exp.subMode, materials, maxAniso);
          break;
        case 'wet_chemistry':
          rig = createWetChemistryRig(exp.subMode, materials, maxAniso);
          break;
        case 'qualitative_analysis':
          rig = createQualitativeAnalysisRig(exp.subMode, materials, maxAniso);
          break;
        case 'biology_microscopy':
          rig = createBiologyRig(exp.subMode, materials, maxAniso);
          break;
      }
      activeRigRef.current = rig;
      scene.add(rig.group);
    };
    buildRigForExp(expRef.current);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation loop with Software WebGL afterDraw pacing & WebXR session support
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsedAccum = 0;
    let gasAccum = 0;
    let lastEqKey = '';
    let eqPopAnim = 0;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed || renderer.xr.isPresenting) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const stepSimulationAndRender = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      elapsedAccum += dt;

      if (!renderer.xr.isPresenting) {
        if (introOrbitRef.current) {
          controls.enabled = false;
          const angle = elapsedAccum * 0.16;
          camera.position.set(Math.sin(angle) * 4.4, 2.25, Math.cos(angle) * 4.4 + 0.6);
          controls.target.set(0, 0.85, -0.45);
        } else {
          if (!activeDrag) {
            controls.enabled = true;
          }
          if (camTransitionRef.current.active) {
            const k = 1 - Math.exp(-6.5 * dt);
            _camTargetPos.copy(camTransitionRef.current.pos);
            _camTargetLook.copy(camTransitionRef.current.look);
            camera.position.lerp(_camTargetPos, k);
            controls.target.lerp(_camTargetLook, k);
            if (
              camera.position.distanceTo(_camTargetPos) < 0.015 &&
              controls.target.distanceTo(_camTargetLook) < 0.015
            ) {
              camTransitionRef.current.active = false;
            }
          }
        }
        controls.update();
      }

      // Ticking wall clock second hand
      const secNow = (Date.now() / 1000) % 60;
      envHandles.clockSecondHand.rotation.z = -secNow * (Math.PI / 30);

      // Safety red warning light flash
      envHandles.warningLight.intensity = safetyRef.current
        ? 2.8 + Math.sin(elapsedAccum * 14) * 1.4
        : 0;

      // Update active rig
      const st = stateRef.current;
      st.elapsedTime = elapsedAccum;

      // Sync & animate 3D benchtop Equation Display Board
      const curExp = expRef.current;
      const eq = evaluateLiveEquation(curExp, st, labModeRef.current);
      const eqKey = `${curExp.id}|${eq.stage}|${eq.equation}`;
      if (eqKey !== lastEqKey) {
        lastEqKey = eqKey;
        const eb = envHandles.equationBoard;
        drawEquationBoardCanvas(
          eb.ctx,
          eb.canvas.width,
          eb.canvas.height,
          curExp.discipline,
          eq.badge,
          eq.equation,
          eq.phenomenon,
          eq.accentHex,
          eq.stage
        );
        eb.texture.needsUpdate = true;
        eqPopAnim = eq.stage === 'formed' ? 1.0 : 0.45;
      }

      if (eqPopAnim > 0.005) {
        eqPopAnim *= Math.exp(-3.4 * dt);
        const sPop = 1 + Math.sin(eqPopAnim * Math.PI) * (eq.stage === 'formed' ? 0.14 : 0.06);
        envHandles.equationBoard.group.scale.setScalar(sPop);
        envHandles.equationBoard.group.position.y = Math.sin(eqPopAnim * Math.PI) * 0.035;
        envHandles.equationBoard.screenMat.emissiveIntensity =
          0.72 + Math.sin(eqPopAnim * Math.PI) * 0.85;
      } else {
        envHandles.equationBoard.group.scale.setScalar(1);
        envHandles.equationBoard.group.position.y =
          eq.stage === 'formed' ? Math.sin(elapsedAccum * 2.2) * 0.006 : 0;
        envHandles.equationBoard.screenMat.emissiveIntensity =
          eq.stage === 'formed' ? 0.92 + Math.sin(elapsedAccum * 3.0) * 0.12 : 0.65;
      }

      // Auto-advance electrolysis gas if battery is on
      if (st.subMode === 'electrolysis' && st.electrolysisCurrentOn && st.gasCollectedMl < 24) {
        gasAccum += dt;
        if (gasAccum >= 0.45) {
          gasAccum = 0;
          onPatchRef.current({ gasCollectedMl: Number(Math.min(24, st.gasCollectedMl + 1.2).toFixed(1)) });
        }
      }

      if (activeRigRef.current) {
        activeRigRef.current.update(dt, st, expRef.current, onPatchRef.current);
      }

      renderer.render(scene, camera);
    };

    const tick = () => {
      if (disposed || renderer.xr.isPresenting) return;
      stepSimulationAndRender();
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    const onSessionStart = () => {
      setXrActive(true);
      onXrActiveRef.current?.(true);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.enabled = false;
      // Place camera relative to the bench via xrPlayerRig in front of center workspace
      xrPlayerRig.position.copy(VR_BENCH_ORIGIN);
      xrPlayerRig.rotation.set(0, 0, 0);
      camera.position.set(0, 0, 0);
      camera.rotation.set(0, 0, 0);
      xrPlayerRig.add(camera);
      renderer.setAnimationLoop(stepSimulationAndRender);
    };

    const onSessionEnd = () => {
      setXrActive(false);
      onXrActiveRef.current?.(false);
      renderer.setAnimationLoop(null);
      scene.add(camera);
      camera.position.copy(camTransitionRef.current.pos);
      controls.target.copy(camTransitionRef.current.look);
      controls.enabled = true;
      controls.update();
      if (isSoftwareGl) frameId = window.setTimeout(tick, 16);
      else frameId = requestAnimationFrame(tick);
    };

    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    if (isSoftwareGl) frameId = window.setTimeout(tick, 16);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.setAnimationLoop(null);
      renderer.xr.removeEventListener('sessionstart', onSessionStart);
      renderer.xr.removeEventListener('sessionend', onSessionEnd);
      void renderer.xr.getSession()?.end();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      beamGeo.dispose();
      beamMat.dispose();
      if (activeRigRef.current) activeRigRef.current.dispose();
      envHandles.dispose();
      Object.values(materials).forEach((m) => m.dispose());
      controls.dispose();
      renderer.dispose();
      rendererRef.current = null;
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const mountedExpIdRef = useRef<string>(experiment.id);

  // Swap active 3D rig whenever experiment changes
  useEffect(() => {
    setHoverHint(null);
    if (mountedExpIdRef.current === experiment.id && activeRigRef.current) {
      return;
    }
    mountedExpIdRef.current = experiment.id;

    const scene = sceneRef.current;
    const materials = materialsRef.current;
    if (!scene || !materials) return;

    if (activeRigRef.current) {
      scene.remove(activeRigRef.current.group);
      activeRigRef.current.dispose();
      activeRigRef.current = null;
    }

    let rig: LabRig;
    switch (experiment.rigType) {
      case 'mechanics':
        rig = createMechanicsRig(experiment.subMode, materials, maxAnisoRef.current);
        break;
      case 'thermal_electrical':
        rig = createThermalElectricalRig(experiment.subMode, materials, maxAnisoRef.current);
        break;
      case 'optics':
        rig = createOpticsRig(experiment.subMode, materials, maxAnisoRef.current);
        break;
      case 'wet_chemistry':
        rig = createWetChemistryRig(experiment.subMode, materials, maxAnisoRef.current);
        break;
      case 'qualitative_analysis':
        rig = createQualitativeAnalysisRig(experiment.subMode, materials, maxAnisoRef.current);
        break;
      case 'biology_microscopy':
        rig = createBiologyRig(experiment.subMode, materials, maxAnisoRef.current);
        break;
    }
    activeRigRef.current = rig;
    scene.add(rig.group);
  }, [experiment.id, experiment.rigType, experiment.subMode]);

  return (
    <div className="no-print relative w-full h-full overflow-hidden select-none">
      {/* Isolated WebGL / WebXR mount container */}
      <div ref={mountRef} className="w-full h-full" />

      {xrError && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded bg-rose-950/95 border border-rose-600/80 text-xs text-rose-200 shadow-lg">
          {xrError}
        </div>
      )}

      {/* Raycaster hover tooltip */}
      {hoverHint && !xrActive && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-md bg-slate-950/92 border border-cyan-500/40 text-xs font-medium text-cyan-200 whitespace-nowrap">
          {hoverHint}
        </div>
      )}

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/95 text-slate-200 text-sm">
          WebGL rendering context paused. Restoring 3D laboratory bench...
        </div>
      )}
    </div>
  );
});

ThreeLabViewport.displayName = 'ThreeLabViewport';
