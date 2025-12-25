import * as THREE from 'three';

export enum AppMode {
  TREE = 'TREE',       // Fist: Coalesce to tree
  SCATTER = 'SCATTER', // Open Hand: Explode
  PHOTO = 'PHOTO'      // Pinch: Zoom into photo
}

export interface ParticleData {
  id: string;
  type: 'sphere' | 'box' | 'candy' | 'photo';
  position: THREE.Vector3; // Current position
  targetTree: THREE.Vector3; // Target position in Tree mode
  targetScatter: THREE.Vector3; // Target position in Scatter mode
  rotation: THREE.Euler;
  color: string;
  textureUrl?: string; // For photos
  scale: number;
}

export interface GestureState {
  isHandDetected: boolean;
  gesture: 'FIST' | 'OPEN' | 'PINCH' | 'NONE';
  handPosition: { x: number; y: number }; // Normalized 0-1
  rotation: number; // Rotation value derived from hand movement
}