import * as THREE from 'three';
import { labAudio } from '../../audio/LabAudioEngine';
import { ExperimentConfig, RigState } from '../../types/lab';
import { addContactShadow, LabMaterials } from '../labEnvironment';
import {
  createMeterDialTexture,
  createRulerTexture,
  createStopwatchDialTexture,
} from '../proceduralTextures';
import { makeBenchPlaque, makeLabeledBottle } from './rigHelpers';
import { DragTarget, LabRig } from './rigTypes';

/**
 * 3D Thermal & Electrical Rig (Physics 13-22, 30)
 * Complete 3D apparatus parity:
 * - Calorimeter: Water Beaker (25°C) + Steam Heater Sleeve + Brass Solid + Copper Stirrer + Thermometer
 * - Cooling Curve: Hot Water Kettle/Beaker (80°C) + Copper Calorimeter + 3D Digital Stopwatch
 * - Sonometer: Wooden Resonance Box + Meter Scale + Movable Bridge + Paper Rider + AC Electromagnet
 *   + Right-End Pulley Wheel & 1.5 kg Hanging Slotted Weights (T = 14.7 N)
 * - Electrical Boards: 6V DC Supply + Knife Switch K1 (+ K2 for Galv) + Rheostat + Binding Posts
 *   + Submode-specific hardware: 100cm Meter Wire Bridge (phy-17/18), Screw Gauge Prop (phy-18),
 *     Series/Parallel Load Resistors (phy-16), High Resistance Box R (phy-19/21),
 *     Shunt Resistance Box S (phy-19/20), 1N4007 Diode + Polarity Reversing Switch (phy-30)
 */
export function createThermalElectricalRig(
  subMode: string,
  materials: LabMaterials,
  maxAniso: number
): LabRig {
  const group = new THREE.Group();
  const dragTargets: DragTarget[] = [];
  const disposables: { dispose: () => void }[] = [];

  addContactShadow(group, materials.contactShadow, 1.5, 0.002);

  let prevStirrerCount = 0;
  let stirAnim = 0;

  let knifeBlade: THREE.Group | null = null;
  let knifeBlade2: THREE.Group | null = null;
  let rheostatSlider: THREE.Group | null = null;
  let polarityLever: THREE.Mesh | null = null;
  let needleA: THREE.Mesh | null = null;
  let needleV: THREE.Mesh | null = null;
  let needleG: THREE.Mesh | null = null;
  const wireMeshes: THREE.Mesh[] = [];
  let mercuryCol: THREE.Mesh | null = null;
  let stirrerRod: THREE.Mesh | null = null;
  let solidBlock: THREE.Mesh | null = null;
  let calWaterMesh: THREE.Mesh | null = null;
  let sonometerWire: THREE.Mesh | null = null;
  let bridgeRight: THREE.Mesh | null = null;
  let paperRider: THREE.Mesh | null = null;
  let diodeLedMat: THREE.MeshStandardMaterial | null = null;
  let resistor2Mesh: THREE.Mesh | null = null;
  let emGlowMat: THREE.MeshStandardMaterial | null = null;

  if (subMode === 'calorimeter' || subMode === 'cooling_curve') {
    const outerBox = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.72, 32), materials.wood);
    outerBox.position.set(0, 0.36, 0);
    outerBox.castShadow = true;
    group.add(outerBox);

    const copperVessel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.64, 32), materials.copper);
    copperVessel.position.set(0, 0.42, 0);
    group.add(copperVessel);

    const waterMat = new THREE.MeshStandardMaterial({
      color: subMode === 'cooling_curve' ? 0xfca5a5 : 0x7dd3fc,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
    });
    disposables.push(waterMat);
    calWaterMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.04, 28), waterMat);
    calWaterMesh.position.set(0, 0.72, 0);
    calWaterMesh.visible = false;
    group.add(calWaterMesh);

    stirrerRod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 12), materials.copper);
    stirrerRod.position.set(0.12, 0.62, 0);
    group.add(stirrerRod);

    const thermTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.15, 16), materials.borosilicateGlass);
    thermTube.position.set(-0.08, 0.78, 0);
    group.add(thermTube);

    const hgMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.4 });
    disposables.push(hgMat);
    mercuryCol = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.65, 12), hgMat);
    mercuryCol.position.set(-0.08, 0.56, 0);
    group.add(mercuryCol);

    if (subMode === 'calorimeter') {
      // Steam Heater Sleeve & Heated Brass Solid on Left
      const steamHeater = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.24, 24), materials.darkAnodized);
      steamHeater.position.set(-0.85, 0.12, 0);
      group.add(steamHeater);
      group.add(makeBenchPlaque('98°C STEAM', 'Solid Heater', '#dc2626', [-0.85, 0.02, 0.34], materials, maxAniso, disposables, 0.9));

      solidBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 24), materials.brass);
      solidBlock.position.set(-0.85, 0.36, 0);
      solidBlock.castShadow = true;
      group.add(solidBlock);

      // Cold Water Beaker (25 °C) on Right
      const waterBeaker = makeLabeledBottle({
        formula: 'H₂O 25°C',
        name: 'Calorimeter Water',
        liquidColor: 0x7dd3fc,
        bandColor: '#0284c7',
        dropperCap: false,
        scale: 1.25,
        pos: [0.82, 0, 0.12],
        materials,
        maxAniso,
        disposables,
      });
      group.add(waterBeaker);

      dragTargets.push({
        mesh: waterBeaker,
        label: 'Water Supply (25 °C) (click to fill calorimeter)',
        onClick: (_state, onPatch) => {
          labAudio.playLiquidPour(0.45);
          onPatch({ calorimeterWaterAdded: true, tempC: 25.0 });
        },
      });

      dragTargets.push({
        mesh: solidBlock,
        label: 'Heated Metal Solid (98 °C) (click to transfer into calorimeter)',
        onClick: (state, onPatch) => {
          labAudio.playLiquidPour(0.35);
          onPatch({
            solidTransferred: true,
            solidHeated: true,
            tempC: state.calorimeterWaterAdded ? 36.4 : state.tempC,
          });
        },
      });
    } else {
      // Cooling Curve: 80 °C Hot Water Kettle/Beaker on Left + Digital Stopwatch on Right
      const hotKettle = makeLabeledBottle({
        formula: 'H₂O 80°C',
        name: 'Hot Water Source',
        liquidColor: 0xfca5a5,
        bandColor: '#dc2626',
        dropperCap: false,
        scale: 1.35,
        pos: [-0.82, 0, 0.12],
        materials,
        maxAniso,
        disposables,
      });
      group.add(hotKettle);

      const swGroup = new THREE.Group();
      swGroup.position.set(0.84, 0.05, 0.18);
      const swBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.34), materials.darkAnodized);
      const swTex = createStopwatchDialTexture('COOLING', '2 MIN LAP', maxAniso);
      const swMat = new THREE.MeshStandardMaterial({ map: swTex, roughness: 0.35 });
      disposables.push(swTex, swMat);
      const swFace = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), swMat);
      swFace.rotation.x = -Math.PI / 2;
      swFace.position.y = 0.042;
      swGroup.add(swBody, swFace);
      group.add(swGroup);

      dragTargets.push({
        mesh: hotKettle,
        label: 'Hot Water Vessel (80 °C) (click to pour into calorimeter)',
        onClick: (_state, onPatch) => {
          labAudio.playLiquidPour(0.5);
          onPatch({ calorimeterWaterAdded: true, tempC: 80.0 });
        },
      });
      dragTargets.push({
        mesh: swGroup,
        label: 'Cooling Timer Stopwatch (click to stir & record +2 min)',
        onClick: (state, onPatch) => {
          labAudio.playSwirl();
          onPatch({
            stirrerCount: state.stirrerCount + 1,
            tempC: Number((25 + (state.tempC - 25) * 0.78).toFixed(1)),
          });
        },
      });
    }

    dragTargets.push({
      mesh: stirrerRod,
      label: 'Copper Stirrer (click to stir mixture)',
      onClick: (state, onPatch) => {
        labAudio.playSwirl();
        if (state.subMode === 'cooling_curve') {
          onPatch({
            stirrerCount: state.stirrerCount + 1,
            tempC: Number((25 + (state.tempC - 25) * 0.78).toFixed(1)),
          });
        } else {
          onPatch({ stirrerCount: state.stirrerCount + 1 });
        }
      },
    });
  } else if (subMode === 'sonometer') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.28, 0.48), materials.wood);
    box.position.set(-0.08, 0.14, 0);
    box.castShadow = true;
    group.add(box);

    const bridgeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.44), materials.brass);
    bridgeL.position.set(-1.02, 0.34, 0);
    group.add(bridgeL);

    bridgeRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.44), materials.brass);
    bridgeRight.position.set(0.3, 0.34, 0);
    group.add(bridgeRight);

    const rulerTex = createRulerTexture(100, maxAniso);
    disposables.push(rulerTex);
    const rulerMat = new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.4 });
    disposables.push(rulerMat);
    const ruler = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.12), rulerMat);
    ruler.rotation.x = -Math.PI / 2;
    ruler.position.set(-0.08, 0.282, 0.15);
    group.add(ruler);

    sonometerWire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.55, 10), materials.brushedSteel);
    sonometerWire.rotation.z = Math.PI / 2;
    sonometerWire.position.set(-0.02, 0.405, 0);
    group.add(sonometerWire);

    // Right-end Pulley + Hanging 1.5 kg Tension Weights (T = 14.7 N)
    const endPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.036, 22), materials.brass);
    endPulley.rotation.x = Math.PI / 2;
    endPulley.position.set(1.24, 0.34, 0);
    group.add(endPulley);

    const hangCord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 8), materials.brushedSteel);
    hangCord.position.set(1.31, 0.22, 0);
    const hangMass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 20), materials.darkAnodized);
    hangMass.position.set(1.31, 0.09, 0);
    group.add(hangCord, hangMass);
    group.add(makeBenchPlaque('1.5 kg', 'T = 14.7 N', '#0284c7', [1.31, 0.01, 0.34], materials, maxAniso, disposables, 0.88));

    // Paper Rider perched at midpoint of wire
    paperRider = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.055, 4), materials.ceramicWhite);
    paperRider.position.set(-0.35, 0.43, 0);
    group.add(paperRider);

    const emGroup = new THREE.Group();
    emGroup.position.set(-0.32, 0.58, -0.14);
    const magnetBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.18), materials.darkAnodized);
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 20), materials.copper);
    coil.position.set(0, -0.02, 0.09);
    coil.rotation.x = Math.PI / 2;
    emGlowMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0 });
    disposables.push(emGlowMat);
    const emLed = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), emGlowMat);
    emLed.position.set(0, 0.15, 0.05);
    emGroup.add(magnetBase, coil, emLed);
    group.add(emGroup);

    dragTargets.push({
      mesh: emGroup,
      label: 'AC Electromagnet (click to toggle 50 Hz AC power)',
      onClick: (state, onPatch) => {
        labAudio.playSwitchClack();
        const nextOn = !state.electromagnetOn;
        labAudio.setTransformerHum(nextOn);
        onPatch({ electromagnetOn: nextOn });
      },
    });

    dragTargets.push({
      mesh: bridgeRight,
      label: 'Movable Sonometer Bridge (drag horizontally for resonance)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.bridgeDistanceCm + dx * 35, 15, 85);
        onPatch({ bridgeDistanceCm: Number(next.toFixed(1)) });
      },
    });
  } else {
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.95), materials.wood);
    board.position.set(0, 0.04, 0);
    board.receiveShadow = true;
    group.add(board);

    const battery = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.42), materials.darkAnodized);
    battery.position.set(-1.12, 0.25, -0.56);
    battery.castShadow = true;
    group.add(battery);
    group.add(makeBenchPlaque('6V DC', 'Battery Eliminator', '#dc2626', [-1.12, 0.42, -0.56], materials, maxAniso, disposables, 0.85));

    const switchBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.22), materials.ceramicWhite);
    switchBase.position.set(-0.42, 0.11, -0.58);
    group.add(switchBase);

    knifeBlade = new THREE.Group();
    knifeBlade.position.set(-0.53, 0.15, -0.58);
    const bladeBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.03), materials.copper);
    bladeBar.position.set(0.12, 0, 0);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 14), materials.rubberBlack);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.26, 0.02, 0);
    knifeBlade.add(bladeBar, handle);
    group.add(knifeBlade);

    const rheoBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.95, 24), materials.darkAnodized);
    rheoBody.rotation.z = Math.PI / 2;
    rheoBody.position.set(0.62, 0.24, -0.56);
    rheoBody.castShadow = true;
    group.add(rheoBody);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 12), materials.brushedSteel);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0.62, 0.42, -0.56);
    group.add(rod);

    rheostatSlider = new THREE.Group();
    rheostatSlider.position.set(0.62, 0.42, -0.56);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), materials.rubberBlack);
    rheostatSlider.add(knob);
    group.add(rheostatSlider);

    // Distinct Submode Load Hardware
    if (subMode === 'diode') {
      const diodeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 20), materials.rubberBlack);
      diodeBody.rotation.z = Math.PI / 2;
      diodeBody.position.set(0.68, 0.15, 0.35);
      group.add(diodeBody);

      diodeLedMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0,
      });
      disposables.push(diodeLedMat);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), diodeLedMat);
      led.position.set(0.92, 0.2, 0.35);
      group.add(led);

      // Polarity Reversing Commutator Switch
      const revSwitch = new THREE.Group();
      revSwitch.position.set(1.18, 0.12, 0.02);
      const revBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.28), materials.darkAnodized);
      polarityLever = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), materials.copper);
      polarityLever.position.set(0, 0.055, 0);
      revSwitch.add(revBase, polarityLever);
      group.add(revSwitch);
      group.add(makeBenchPlaque('1N4007', 'Fwd ↔ Rev Polarity', '#7c3aed', [1.18, 0.08, 0.36], materials, maxAniso, disposables, 0.88));

      dragTargets.push({
        mesh: revSwitch,
        label: 'Polarity Reversing Switch (click to toggle Forward / Reverse bias)',
        onClick: (state, onPatch) => {
          labAudio.playSwitchClack();
          onPatch({ reverseBias: !state.reverseBias });
        },
      });
    } else if (subMode === 'series_parallel') {
      const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.36, 16), materials.copper);
      r1.rotation.z = Math.PI / 2;
      r1.position.set(0.7, 0.14, 0.25);
      resistor2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.36, 16), materials.brass);
      resistor2Mesh.rotation.z = Math.PI / 2;
      resistor2Mesh.position.set(1.12, 0.14, 0.25);
      group.add(r1, resistor2Mesh);
      group.add(makeBenchPlaque('R₁=4Ω R₂=6Ω', 'Click to Swap Ser/Par', '#0284c7', [0.92, 0.08, 0.62], materials, maxAniso, disposables, 0.92));

      const toggleCircuit = (state: RigState, onPatch: (p: Partial<RigState>) => void) => {
        labAudio.playSwitchClack();
        onPatch({ circuitMode: state.circuitMode === 'series' ? 'parallel' : 'series' });
      };
      dragTargets.push({
        mesh: r1,
        label: 'Resistors R₁ / R₂ (click to switch Series / Parallel)',
        onClick: toggleCircuit,
      });
      dragTargets.push({
        mesh: resistor2Mesh,
        label: 'Resistors R₁ / R₂ (click to switch Series / Parallel)',
        onClick: toggleCircuit,
      });
    } else if (subMode === 'resistance_length' || subMode === 'resistivity') {
      // 100 cm Meter Scale Wooden Bridge + 1.00 m Stretched Wire along front
      const meterRulerTex = createRulerTexture(100, maxAniso);
      const meterRulerMat = new THREE.MeshStandardMaterial({ map: meterRulerTex, roughness: 0.4 });
      disposables.push(meterRulerTex, meterRulerMat);
      const bridgeBoard = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.04, 0.24), materials.wood);
      bridgeBoard.position.set(0.0, 0.1, 0.78);
      const scalePlane = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.11), meterRulerMat);
      scalePlane.rotation.x = -Math.PI / 2;
      scalePlane.position.set(0.0, 0.122, 0.82);
      const testWire = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 2.1, 10), materials.copper);
      testWire.rotation.z = Math.PI / 2;
      testWire.position.set(0.0, 0.135, 0.72);
      group.add(bridgeBoard, scalePlane, testWire);

      if (subMode === 'resistivity') {
        // Bench Micrometer Screw Gauge prop for r = 0.39 mm
        const gaugePlaque = makeBenchPlaque('r = 0.39 mm', 'Screw Gauge Measured', '#d97706', [1.18, 0.08, 0.35], materials, maxAniso, disposables, 0.92);
        const gaugeRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 10, 20, Math.PI), materials.darkAnodized);
        gaugeRing.rotation.z = Math.PI;
        gaugeRing.position.set(1.18, 0.24, 0.02);
        const gaugeBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 14), materials.brushedSteel);
        gaugeBarrel.rotation.z = Math.PI / 2;
        gaugeBarrel.position.set(1.26, 0.25, 0.02);
        group.add(gaugePlaque, gaugeRing, gaugeBarrel);
      }
    } else if (subMode === 'galvanometer' || subMode === 'galv_ammeter' || subMode === 'galv_voltmeter') {
      // High Resistance Box R (for galvanometer & galv_voltmeter)
      if (subMode === 'galvanometer' || subMode === 'galv_voltmeter') {
        const rBox = new THREE.Group();
        rBox.position.set(1.22, 0.18, -0.1);
        const boxCase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.32), materials.wood);
        const topPanel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), materials.darkAnodized);
        topPanel.position.y = 0.105;
        rBox.add(boxCase, topPanel);
        for (let p = -1; p <= 1; p++) {
          const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.06, 12), materials.brass);
          plug.position.set(p * 0.11, 0.14, 0);
          rBox.add(plug);
        }
        group.add(rBox);
        group.add(makeBenchPlaque('HIGH R BOX', 'Click to Step Ω', '#dc2626', [1.22, 0.08, 0.18], materials, maxAniso, disposables, 0.85));

        dragTargets.push({
          mesh: rBox,
          label: 'High Resistance Box R (click to cycle Ω)',
          onClick: (state, onPatch) => {
            labAudio.playMetallicTick(2600, 0.45);
            const vals = subMode === 'galv_voltmeter' ? [1200, 2400, 3600] : [2000, 5000, 7500, 10000];
            const idx = vals.indexOf(state.resistanceBoxR);
            onPatch({ resistanceBoxR: vals[(idx + 1) % vals.length] });
          },
        });
      }

      // Shunt Resistance Box / Wire S (for galvanometer & galv_ammeter)
      if (subMode === 'galvanometer' || subMode === 'galv_ammeter') {
        const sBox = new THREE.Group();
        sBox.position.set(1.22, 0.16, 0.52);
        const sCase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.26), materials.darkAnodized);
        const sWire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 12), materials.copper);
        sWire.rotation.z = Math.PI / 2;
        sWire.position.y = 0.1;
        sBox.add(sCase, sWire);
        group.add(sBox);
        group.add(makeBenchPlaque('SHUNT S', subMode === 'galv_ammeter' ? '0.067 Ω Wire' : 'Click to Step S', '#0284c7', [1.22, 0.08, 0.78], materials, maxAniso, disposables, 0.85));

        dragTargets.push({
          mesh: sBox,
          label: 'Shunt Resistance S (click to adjust S)',
          onClick: (state, onPatch) => {
            labAudio.playMetallicTick(2600, 0.45);
            const vals = [50, 100, 150];
            const idx = vals.indexOf(state.shuntBoxS);
            onPatch({ shuntBoxS: vals[(idx + 1) % vals.length] });
          },
        });
      }

      // Second Key K₂ for Half-Deflection Galvanometer (phy-19)
      if (subMode === 'galvanometer') {
        const sw2Base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.2), materials.ceramicWhite);
        sw2Base.position.set(-0.42, 0.11, -0.18);
        group.add(sw2Base);
        knifeBlade2 = new THREE.Group();
        knifeBlade2.position.set(-0.52, 0.15, -0.18);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.03), materials.brass);
        b2.position.set(0.11, 0, 0);
        const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 12), materials.rubberBlack);
        h2.rotation.z = Math.PI / 2;
        h2.position.set(0.24, 0.02, 0);
        knifeBlade2.add(b2, h2);
        group.add(knifeBlade2);
        group.add(makeBenchPlaque('KEY K₂', 'Shunt Key', '#059669', [-0.42, 0.08, 0.02], materials, maxAniso, disposables, 0.78));

        dragTargets.push({
          mesh: knifeBlade2,
          label: 'Shunt Key K₂ (click to open/close shunt)',
          onClick: (state, onPatch) => {
            labAudio.playSwitchClack();
            onPatch({ key2Closed: !state.key2Closed });
          },
        });
      }
    }

    const makeMeter = (
      x: number,
      z: number,
      sym: 'A' | 'V' | 'G' | 'mA',
      maxVal: number
    ): THREE.Mesh => {
      const mGroup = new THREE.Group();
      mGroup.position.set(x, 0.24, z);
      const caseBox = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.4), materials.darkAnodized);
      caseBox.castShadow = true;
      mGroup.add(caseBox);

      const dialTex = createMeterDialTexture(sym, maxVal, maxAniso);
      disposables.push(dialTex);
      const faceMat = new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.35 });
      disposables.push(faceMat);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.34), faceMat);
      face.position.set(0, 0.02, 0.205);
      mGroup.add(face);

      const needleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      disposables.push(needleMat);
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.22, 0.01), needleMat);
      needle.position.set(0, -0.06, 0.212);
      needle.geometry.translate(0, 0.1, 0);
      mGroup.add(needle);

      group.add(mGroup);
      return needle;
    };

    const isGalv = subMode === 'galvanometer' || subMode === 'galv_ammeter' || subMode === 'galv_voltmeter';
    needleA = makeMeter(-0.72, 0.34, subMode === 'diode' ? 'mA' : 'A', subMode === 'diode' ? 30 : 3);
    needleV = makeMeter(-0.04, 0.34, 'V', 5);
    if (isGalv) {
      needleG = makeMeter(0.64, 0.34, 'G', 30);
    }

    const termPositions: [number, number, number][] = [
      [-1.12, 0.12, -0.26],
      [-0.52, 0.12, -0.4],
      [0.2, 0.12, -0.4],
      [0.64, 0.12, 0.08],
      [-0.72, 0.12, 0.08],
    ];

    termPositions.forEach((p, idx) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 14), materials.brass);
      post.position.set(p[0], p[1], p[2]);
      group.add(post);

      if (idx < termPositions.length - 1) {
        const next = termPositions[idx + 1];
        const mid = new THREE.Vector3(
          (p[0] + next[0]) / 2,
          0.16,
          (p[2] + next[2]) / 2 + (idx % 2 === 0 ? 0.14 : -0.14)
        );
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(p[0], p[1] + 0.04, p[2]),
          mid,
          new THREE.Vector3(next[0], next[1] + 0.04, next[2]),
        ]);
        const wireGeo = new THREE.TubeGeometry(curve, 24, 0.014, 8, false);
        const wireMat = new THREE.MeshStandardMaterial({
          color: idx % 2 === 0 ? 0xdc2626 : 0x2563eb,
          roughness: 0.5,
        });
        disposables.push(wireGeo, wireMat);
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.visible = false;
        group.add(wire);
        wireMeshes.push(wire);
      }

      dragTargets.push({
        mesh: post,
        label: `Binding Terminal ${idx + 1} (click to connect circuit wire)`,
        onClick: (state, onPatch) => {
          labAudio.playMetallicTick(2100, 0.5);
          onPatch({ wiresConnected: Math.min(4, state.wiresConnected + 1) });
        },
      });
    });

    dragTargets.push({
      mesh: knifeBlade,
      label: 'Main Knife Switch K₁ (click to open/close circuit)',
      onClick: (state, onPatch) => {
        labAudio.playSwitchClack();
        onPatch({ keyClosed: !state.keyClosed });
      },
    });

    dragTargets.push({
      mesh: rheostatSlider,
      label: 'Rheostat Jockey (drag horizontally to vary resistance)',
      onDrag: (dx, _dy, state, onPatch) => {
        const next = THREE.MathUtils.clamp(state.rheostatPos + dx * 0.85, 0, 1);
        onPatch({ rheostatPos: Number(next.toFixed(2)) });
      },
    });
  }

  return {
    group,
    dragTargets,
    update: (dt: number, state: RigState, _exp: ExperimentConfig) => {
      if (state.stirrerCount > prevStirrerCount) {
        stirAnim = 1.0;
        prevStirrerCount = state.stirrerCount;
      }

      if (knifeBlade) {
        const targetRot = state.keyClosed ? 0 : -Math.PI / 3;
        knifeBlade.rotation.z = THREE.MathUtils.damp(knifeBlade.rotation.z, targetRot, 14, dt);
      }
      if (knifeBlade2) {
        const targetRot2 = state.key2Closed ? 0 : -Math.PI / 3;
        knifeBlade2.rotation.z = THREE.MathUtils.damp(knifeBlade2.rotation.z, targetRot2, 14, dt);
      }
      if (polarityLever) {
        polarityLever.rotation.y = THREE.MathUtils.damp(polarityLever.rotation.y, state.reverseBias ? -0.5 : 0.5, 12, dt);
      }
      if (rheostatSlider) {
        const targetX = 0.2 + state.rheostatPos * 0.84;
        rheostatSlider.position.x = THREE.MathUtils.damp(rheostatSlider.position.x, targetX, 14, dt);
      }
      wireMeshes.forEach((w, idx) => {
        w.visible = idx < state.wiresConnected;
      });
      if (diodeLedMat) {
        const active = state.keyClosed && state.wiresConnected >= 4 && !state.reverseBias && state.ammeterA > 1;
        diodeLedMat.emissiveIntensity = active ? Math.min(3.0, state.ammeterA / 8) : 0;
      }
      if (resistor2Mesh) {
        const isPar = state.circuitMode === 'parallel';
        resistor2Mesh.position.x = THREE.MathUtils.damp(resistor2Mesh.position.x, isPar ? 0.7 : 1.12, 10, dt);
        resistor2Mesh.position.z = THREE.MathUtils.damp(resistor2Mesh.position.z, isPar ? 0.45 : 0.25, 10, dt);
      }
      if (needleA) {
        const normA =
          state.keyClosed && state.wiresConnected >= 4
            ? THREE.MathUtils.clamp(state.ammeterA / (state.subMode === 'diode' ? 30 : 3), 0, 1)
            : 0;
        const angA = THREE.MathUtils.lerp(Math.PI / 3, -Math.PI / 3, normA);
        needleA.rotation.z = THREE.MathUtils.damp(needleA.rotation.z, angA, 10, dt);
      }
      if (needleV) {
        const normV =
          state.keyClosed && state.wiresConnected >= 4
            ? THREE.MathUtils.clamp(state.voltmeterV / 5, 0, 1)
            : 0;
        const angV = THREE.MathUtils.lerp(Math.PI / 3, -Math.PI / 3, normV);
        needleV.rotation.z = THREE.MathUtils.damp(needleV.rotation.z, angV, 10, dt);
      }
      if (needleG) {
        const normG =
          state.keyClosed && state.wiresConnected >= 4
            ? THREE.MathUtils.clamp(state.galvDeflection / 30, -1, 1)
            : 0;
        const angG = -normG * (Math.PI / 3);
        needleG.rotation.z = THREE.MathUtils.damp(needleG.rotation.z, angG, 10, dt);
      }
      if (mercuryCol) {
        const normT = THREE.MathUtils.clamp((state.tempC - 20) / 70, 0.1, 1.1);
        mercuryCol.scale.y = THREE.MathUtils.damp(mercuryCol.scale.y, normT, 8, dt);
      }
      if (calWaterMesh) {
        calWaterMesh.visible = state.calorimeterWaterAdded;
      }
      if (solidBlock) {
        const tx = state.solidTransferred ? 0.04 : -0.85;
        const ty = state.solidTransferred ? 0.34 : 0.36;
        solidBlock.position.x = THREE.MathUtils.damp(solidBlock.position.x, tx, 8, dt);
        solidBlock.position.y = THREE.MathUtils.damp(solidBlock.position.y, ty, 8, dt);
      }
      if (stirrerRod) {
        if (stirAnim > 0.01) {
          stirAnim *= Math.exp(-2.5 * dt);
          stirrerRod.position.y = 0.62 + Math.sin(state.elapsedTime * 14) * 0.1 * stirAnim;
        } else {
          stirrerRod.position.y = THREE.MathUtils.damp(stirrerRod.position.y, 0.62, 10, dt);
        }
      }
      if (emGlowMat) {
        emGlowMat.emissiveIntensity = state.electromagnetOn ? 2.2 : 0;
      }
      if (bridgeRight && sonometerWire && paperRider) {
        const bx = -1.02 + (state.bridgeDistanceCm / 100) * 1.9;
        bridgeRight.position.x = THREE.MathUtils.damp(bridgeRight.position.x, bx, 12, dt);
        const midX = (-1.02 + bridgeRight.position.x) / 2;
        if (state.electromagnetOn) {
          const resonance = Math.max(0, 1 - Math.abs(state.bridgeDistanceCm - 44.5) / 8);
          sonometerWire.position.y = 0.405 + Math.sin(state.elapsedTime * 65) * (0.004 + resonance * 0.025);
          if (resonance > 0.6) {
            paperRider.position.set(midX + 0.08, 0.29, 0.12);
            paperRider.rotation.z = 1.1;
          } else {
            paperRider.position.set(midX, 0.43 + Math.abs(Math.sin(state.elapsedTime * 28)) * 0.015, 0);
            paperRider.rotation.z = 0;
          }
        } else {
          paperRider.position.set(midX, 0.43, 0);
          paperRider.rotation.z = 0;
        }
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
