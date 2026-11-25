import * as THREE from 'three';
import { ExperimentConfig, RigState } from '../../types/lab';

export interface DragTarget {
  mesh: THREE.Object3D;
  label: string;
  onDrag?: (
    dx: number,
    dy: number,
    state: RigState,
    onPatch: (patch: Partial<RigState>) => void
  ) => void;
  onClick?: (state: RigState, onPatch: (patch: Partial<RigState>) => void) => void;
}

export interface LabRig {
  group: THREE.Group;
  dragTargets: DragTarget[];
  update: (
    dt: number,
    state: RigState,
    exp: ExperimentConfig,
    onPatch: (patch: Partial<RigState>) => void
  ) => void;
  dispose: () => void;
}
