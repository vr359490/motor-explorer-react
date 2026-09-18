export type MotorKind = 'shunt' | 'series' | 'induction'

export type ShuntParameters = { voltage: number; load: number; field: number; resistance: number }
export type SeriesParameters = { voltage: number; load: number; resistance: number; saturation: number }
export type InductionParameters = { frequency: number; poles: number; voltage: number; load: number }

export type ParametersByMotor = {
  shunt: ShuntParameters
  series: SeriesParameters
  induction: InductionParameters
}

export type MotorResult = {
  speed: number
  torque: number
  current: number
  flux: number
  backEmf: number
  power: number
  efficiency: number
  synchronousSpeed: number
  slip: number
}

export type ControlDefinition = { key: string; label: string; unit: string; min: number; max: number; step: number }

export const motorInfo: Record<MotorKind, { label: string; description: string; color: string; equation: string; concept: string }> = {
  shunt: { label: 'DC shunt motor', description: 'A parallel field holds flux nearly steady, producing dependable, nearly constant-speed behavior.', color: '#4ee1df', equation: 'I_a = \\frac{V - E}{R_a} \\qquad E = k\\Phi\\omega \\qquad T = k\\Phi I_a', concept: 'Its parallel field has its own current path, so flux changes very little as the load moves.' },
  series: { label: 'DC series motor', description: 'Armature and field carry the same current. At low speed this produces high current, strong flux, and exceptional starting torque.', color: '#f7b955', equation: '\\Phi \\approx kI_a \\qquad T = k\\Phi I_a \\approx kI_a^2 \\qquad E = k\\Phi\\omega', concept: 'A series motor should never run unloaded: as current and flux fall, speed can rise sharply.' },
  induction: { label: 'Three-phase induction motor', description: 'A rotating stator field induces rotor current only when the rotor trails it. That speed difference is slip.', color: '#ff708e', equation: 'n_s = \\frac{120f}{P} \\qquad s = \\frac{n_s - n_r}{n_s} \\qquad T \\propto \\frac{s}{R^2 + (sX)^2}', concept: 'Slip is necessary. At synchronous speed there is no relative motion, induced rotor current, or sustained torque.' },
}

export const controlDefinitions: Record<MotorKind, ControlDefinition[]> = {
  shunt: [
    { key: 'voltage', label: 'Supply voltage', unit: 'V', min: 160, max: 280, step: 1 },
    { key: 'load', label: 'Mechanical load', unit: 'N·m', min: 0, max: 24, step: 0.1 },
    { key: 'field', label: 'Field strength', unit: '%', min: 60, max: 125, step: 1 },
    { key: 'resistance', label: 'Armature resistance', unit: 'Ω', min: 0.2, max: 1.2, step: 0.01 },
  ],
  series: [
    { key: 'voltage', label: 'Supply voltage', unit: 'V', min: 160, max: 280, step: 1 },
    { key: 'load', label: 'Mechanical load', unit: 'N·m', min: 0, max: 34, step: 0.1 },
    { key: 'resistance', label: 'Series resistance', unit: 'Ω', min: 0.15, max: 1.2, step: 0.01 },
    { key: 'saturation', label: 'Magnetic saturation', unit: '%', min: 55, max: 115, step: 1 },
  ],
  induction: [
    { key: 'frequency', label: 'Supply frequency', unit: 'Hz', min: 30, max: 75, step: 1 },
    { key: 'poles', label: 'Pole count', unit: '', min: 2, max: 8, step: 2 },
    { key: 'voltage', label: 'Supply voltage', unit: 'V', min: 160, max: 280, step: 1 },
    { key: 'load', label: 'Mechanical load', unit: 'N·m', min: 0, max: 28, step: 0.1 },
  ],
}

export const defaultParameters: ParametersByMotor = {
  shunt: { voltage: 240, load: 12, field: 100, resistance: 0.6 },
  series: { voltage: 240, load: 14, resistance: 0.45, saturation: 82 },
  induction: { frequency: 60, poles: 4, voltage: 240, load: 12 },
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Simplified educational models; never use them for equipment design. */
export function calculateMotor(kind: MotorKind, parameters: ParametersByMotor[MotorKind]): MotorResult {
  if (kind === 'shunt') {
    const p = parameters as ShuntParameters, flux = p.field / 100, noLoad = (p.voltage * 8.15) / flux
    const speed = clamp(noLoad - (p.load * (22 + p.resistance * 8)) / flux, 0, noLoad), backEmf = (speed * flux) / 8.15
    const current = Math.max(0.1, (p.voltage - backEmf) / p.resistance), torque = p.load + 0.35, power = torque * speed * 0.10472
    return { speed, torque, current, flux, backEmf, power, efficiency: clamp((power / (p.voltage * current)) * 100, 0, 94), synchronousSpeed: noLoad, slip: 0 }
  }
  if (kind === 'series') {
    const p = parameters as SeriesParameters, noLoad = (p.voltage * 12.5) / (p.saturation / 100)
    const speed = clamp(noLoad / (1 + p.load * 0.35), 0, noLoad), current = clamp(4 + Math.sqrt(p.load + 0.1) * 8.6, 0, p.voltage / p.resistance)
    const flux = clamp(current / 35, 0.13, p.saturation / 100), torque = clamp(0.115 * current * current * flux, 0, 52), backEmf = p.voltage - current * p.resistance, power = torque * speed * 0.10472
    return { speed, torque, current, flux, backEmf, power, efficiency: clamp((power / (p.voltage * current)) * 100, 0, 92), synchronousSpeed: noLoad, slip: 0 }
  }
  const p = parameters as InductionParameters, synchronousSpeed = (120 * p.frequency) / p.poles, maximumTorque = 35 * (p.voltage / 240) ** 2, loadRatio = p.load / maximumTorque
  const slip = clamp(0.012 + loadRatio * 0.095 + loadRatio ** 2 * 0.07, 0.008, 0.23), speed = synchronousSpeed * (1 - slip), torque = p.load + 0.2, current = 2.2 + 13 * Math.sqrt(loadRatio) * (p.voltage / 240), power = torque * speed * 0.10472
  return { speed, torque, current, flux: p.voltage / 240, backEmf: 0, power, efficiency: clamp((power / (Math.sqrt(3) * p.voltage * current)) * 100, 0, 91), synchronousSpeed, slip }
}

export function effectChain(kind: MotorKind, changed: string): string[] {
  const chains: Record<MotorKind, Record<string, string[]>> = {
    shunt: { load: ['Load torque increases', 'Rotor speed decreases slightly', 'Back EMF falls', 'Armature current rises', 'Electromagnetic torque restores balance'], voltage: ['Supply voltage increases', 'Armature current rises', 'Electromagnetic torque rises', 'Motor accelerates', 'Back EMF rises to a new balance'], field: ['Field strength changes', 'Magnetic flux changes', 'Back EMF constant shifts', 'Speed adjusts', 'Torque per amp changes'] },
    series: { load: ['Mechanical load changes', 'Armature current responds', 'Series field flux changes', 'Torque changes strongly', 'Speed settles at a new point'], voltage: ['Supply voltage increases', 'Current rises at first', 'Flux and torque rise', 'Rotor accelerates', 'Back EMF grows'], saturation: ['Magnetic saturation changes', 'Flux response changes', 'Torque-current curve changes', 'Starting behavior shifts', 'Operating point moves'] },
    induction: { load: ['Mechanical load increases', 'Rotor slows slightly', 'Slip increases', 'Rotor current increases', 'Electromagnetic torque increases'], frequency: ['Frequency changes', 'Synchronous speed changes', 'Rotating field speed shifts', 'Rotor speed follows', 'Slip settles to make torque'], poles: ['Pole count changes', 'Synchronous speed changes', 'Rotor operating speed shifts', 'Slip adjusts', 'Torque equilibrium returns'] },
  }
  return chains[kind][changed] ?? chains[kind].load
}
