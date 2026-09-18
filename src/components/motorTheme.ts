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

/**
 * Every component and overlay the visualizations know how to draw.
 *
 * The laboratory shows all of them; a construction step shows only what it has
 * introduced so far. The DC-specific ids at the end are drawn by the circuit
 * diagram rather than the p5 sketch, since brushes and a commutator are
 * electrical parts with no magnetic story to tell.
 */
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
  'field-winding',
  'armature',
  'commutator',
  'brushes',
])
