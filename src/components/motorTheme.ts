import type { MotorKind } from '../motors/Motor'

/**
 * Presentation-only colours, kept out of the physics layer so the motor
 * classes stay free of anything to do with how they are drawn.
 */
export const motorAccent: Record<MotorKind, string> = {
  shunt: '#4ee1df',
  series: '#f7b955',
  compound: '#a78bfa',
  induction: '#ff708e',
}

/** Every component and overlay the sketch knows how to draw. */
export const allVisible: ReadonlySet<string> = new Set([
  'stator',
  'stator-windings',
  'rotating-field',
  'rotor',
  'squirrel-cage',
  'rotor-current',
  'slip',
  'torque',
  'mechanical-load',
])
