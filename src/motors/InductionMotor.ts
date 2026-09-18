import type { MechanicalParameters, ParameterDescriptor } from '../simulation/Parameters'
import type { MotorOutputs, MotorState } from '../simulation/State'
import { clamp, slipFrom, synchronousOmega, synchronousSpeedRpm, toRpm } from '../simulation/units'
import type { Motor, MotorKind } from './Motor'

export type InductionParameters = MechanicalParameters & {
  /** Line-to-line supply voltage, V. */
  supplyVoltage: number
  /** Supply frequency, Hz. */
  frequency: number
  /** Number of stator poles. Always even. */
  poles: number
  /** Nameplate voltage, used as the reference for the V/f ratio, V. */
  ratedVoltage: number
  /** Nameplate frequency, at which the reactances below are quoted, Hz. */
  ratedFrequency: number
  /** Stator winding resistance per phase, Ω. */
  statorResistance: number
  /** Rotor resistance referred to the stator, Ω. */
  rotorResistance: number
  /** Rotor leakage reactance referred to the stator, at rated frequency, Ω. */
  rotorReactance: number
  /** Magnetising reactance at rated frequency, Ω. Sets the no-load current. */
  magnetisingReactance: number
}

/**
 * Three-phase squirrel-cage induction motor.
 *
 * The stator produces a field rotating at synchronous speed. The rotor trails
 * it, and only that difference induces rotor current. No slip means no relative
 * motion, no induced current, and no torque, which is why the rotor approaches
 * synchronous speed but never sits on it.
 *
 * Torque comes from the standard rotor branch of the equivalent circuit:
 *
 *   I_R = sE / sqrt(R_R² + (sX_R)²)
 *   T_e = 3 I_R² R_R / (s ω_s) = 3E² s R_R / (ω_s (R_R² + (sX_R)²))
 *
 * The second form is what the code uses, because it never divides by slip and
 * so behaves correctly at and around synchronous speed.
 *
 * The mechanical equation is integrated as it is for the DC machines, so
 * run-up, load steps, and slip settling are all real transients. The rotor
 * current is not integrated: with the rotor treated as a steady-state circuit
 * it follows algebraically from slip, so it is written after each step by
 * `project` rather than carried through the solver.
 *
 * Known limitation: rotor resistance is constant, so the model understates
 * starting torque. Real cage rotors rely on skin effect to raise rotor
 * resistance at high slip, which is what gives a deep-bar or double-cage
 * machine its genuinely high starting torque. That belongs with the Phase 2
 * refinements.
 */
export class InductionMotor implements Motor<InductionParameters> {
  readonly kind: MotorKind = 'induction'
  readonly label = 'Three-phase induction motor'
  readonly description =
    'A rotating stator field drags a rotor that never quite catches it. The gap between them is slip, and slip is what makes the torque.'
  readonly equation = 'n_s = \\frac{120f}{P} \\qquad s = \\frac{n_s - n_r}{n_s} \\qquad T_e \\propto \\frac{s}{R_R^2 + (sX_R)^2}'

  readonly defaultParameters: InductionParameters = {
    loadTorque: 24,
    inertia: 0.1,
    viscousFriction: 0.004,
    supplyVoltage: 240,
    frequency: 60,
    poles: 4,
    ratedVoltage: 240,
    ratedFrequency: 60,
    statorResistance: 0.3,
    rotorResistance: 0.5,
    rotorReactance: 2,
    magnetisingReactance: 30,
  }

  readonly controls: readonly ParameterDescriptor<InductionParameters>[] = [
    {
      key: 'frequency',
      label: 'Supply frequency',
      unit: 'Hz',
      min: 10,
      max: 90,
      step: 1,
      description: 'Moves synchronous speed directly, since n_s = 120f / P.',
    },
    {
      key: 'poles',
      label: 'Pole count',
      unit: '',
      min: 2,
      max: 8,
      step: 2,
      description: 'More poles means a slower rotating field for the same frequency.',
    },
    {
      key: 'supplyVoltage',
      label: 'Supply voltage',
      unit: 'V',
      min: 60,
      max: 280,
      step: 1,
      description: 'Torque follows voltage squared, so this matters more than it looks.',
    },
    {
      key: 'loadTorque',
      label: 'Mechanical load',
      unit: 'N·m',
      min: 0,
      max: 45,
      step: 0.1,
      description: 'More load means more slip, more rotor current, and more torque.',
    },
  ]

  initialState(): MotorState {
    return { omega: 0, current: 0 }
  }

  /** Air-gap EMF per phase, V. Stator impedance drop is neglected. */
  private airGapEmf(parameters: InductionParameters) {
    return parameters.supplyVoltage / Math.sqrt(3)
  }

  /** Reactances scale with supply frequency, since X = 2Pi f L. */
  private rotorReactanceAt(parameters: InductionParameters) {
    return parameters.rotorReactance * (parameters.frequency / parameters.ratedFrequency)
  }

  private slip(omega: number, parameters: InductionParameters) {
    return slipFrom(synchronousOmega(parameters.frequency, parameters.poles), omega)
  }

  /** Rotor current referred to the stator, A. */
  private rotorCurrent(slip: number, parameters: InductionParameters) {
    const resistance = parameters.rotorResistance
    const reactance = this.rotorReactanceAt(parameters)
    const impedance = Math.hypot(resistance, slip * reactance)
    return impedance === 0 ? 0 : (this.airGapEmf(parameters) * Math.abs(slip)) / impedance
  }

  private torque(slip: number, parameters: InductionParameters) {
    const omegaSync = synchronousOmega(parameters.frequency, parameters.poles)
    if (omegaSync === 0) return 0
    const resistance = parameters.rotorResistance
    const reactance = this.rotorReactanceAt(parameters)
    const emf = this.airGapEmf(parameters)
    const denominator = resistance * resistance + (slip * reactance) ** 2
    return (3 * emf * emf * slip * resistance) / (omegaSync * denominator)
  }

  derivatives(state: MotorState, parameters: InductionParameters): MotorState {
    const torque = this.torque(this.slip(state.omega, parameters), parameters)
    return {
      // Rotor current is algebraic, not integrated. See `project`.
      current: 0,
      omega: (torque - parameters.loadTorque - parameters.viscousFriction * state.omega) / parameters.inertia,
    }
  }

  project(state: MotorState, parameters: InductionParameters): MotorState {
    return { omega: state.omega, current: this.rotorCurrent(this.slip(state.omega, parameters), parameters) }
  }

  outputs(state: MotorState, parameters: InductionParameters): MotorOutputs {
    const slip = this.slip(state.omega, parameters)
    const omegaSync = synchronousOmega(parameters.frequency, parameters.poles)
    const rotorCurrent = this.rotorCurrent(slip, parameters)
    const torque = this.torque(slip, parameters)

    // Magnetising current flows whether or not the machine is loaded, which is
    // why an unloaded induction motor still draws a noticeable line current.
    const magnetisingCurrent =
      this.airGapEmf(parameters) /
      (parameters.magnetisingReactance * (parameters.frequency / parameters.ratedFrequency))
    const lineCurrent = Math.hypot(rotorCurrent, magnetisingCurrent)

    // Power crossing the air gap splits into rotor copper loss (the fraction s)
    // and mechanical power (the fraction 1 - s). That split is the clearest
    // reason to keep slip small.
    const airGapPower = torque * omegaSync
    const statorLoss = 3 * rotorCurrent * rotorCurrent * parameters.statorResistance
    const inputPower = airGapPower + statorLoss
    const shaftPower = (torque - parameters.viscousFriction * state.omega) * state.omega

    return {
      speed: toRpm(state.omega),
      omega: state.omega,
      torque,
      loadTorque: parameters.loadTorque,
      lineCurrent,
      armatureCurrent: rotorCurrent,
      fieldCurrent: 0,
      // Flux follows the V/f ratio. Holding that ratio constant while frequency
      // changes is the whole idea behind variable-frequency drive control.
      flux:
        (parameters.supplyVoltage / parameters.ratedVoltage) *
        (parameters.ratedFrequency / Math.max(parameters.frequency, 1e-6)),
      backEmf: this.airGapEmf(parameters),
      shaftPower,
      inputPower,
      efficiency: inputPower > 1 ? clamp((shaftPower / inputPower) * 100, 0, 100) : 0,
      synchronousSpeed: synchronousSpeedRpm(parameters.frequency, parameters.poles),
      slip,
    }
  }
}

export const inductionMotor = new InductionMotor()
