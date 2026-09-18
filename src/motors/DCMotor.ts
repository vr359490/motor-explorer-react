import type { MechanicalParameters, OptionDescriptor, ParameterDescriptor } from '../simulation/Parameters'
import type { MotorOutputs, MotorState } from '../simulation/State'
import { clamp, toRpm } from '../simulation/units'
import type { Motor, MotorKind } from './Motor'

export type DCParameters = MechanicalParameters & {
  /** Terminal voltage applied to the machine, V. */
  supplyVoltage: number
  /** Armature winding resistance, Ω. */
  armatureResistance: number
  /** Armature winding inductance, H. */
  armatureInductance: number
  /**
   * The lumped machine constant k in E = kΦω and T = kΦI_A, V·s/rad.
   *
   * Real machines have separate k_e and k_t that differ only by unit
   * conventions. Using one constant keeps the two equations visibly
   * symmetric, which is the point the application is trying to make.
   */
  machineConstant: number
}

/**
 * Everything common to a DC machine: one armature circuit, one magnetic field,
 * and one shaft.
 *
 *   V = R·I_A + L·dI_A/dt + kΦω      armature circuit
 *   T_e = kΦI_A                      torque production
 *   J·dω/dt = T_e - T_L - Bω         mechanical balance
 *
 * Shunt, series, and compound machines are identical here. They differ only in
 * where the flux comes from, which is exactly the distinction the construction
 * sequence is meant to teach.
 */
export abstract class DCMotor<P extends DCParameters> implements Motor<P> {
  abstract readonly kind: MotorKind
  abstract readonly label: string
  abstract readonly description: string
  abstract readonly equation: string
  abstract readonly defaultParameters: P
  abstract readonly controls: readonly ParameterDescriptor<P>[]
  readonly options?: readonly OptionDescriptor<P>[]

  /** Air-gap flux in per unit of rated flux, which may depend on armature current. */
  protected abstract flux(current: number, parameters: P): number

  /** Current in a separately-fed field winding, A. Zero for a pure series machine. */
  protected abstract fieldCurrent(parameters: P): number

  /** Total resistance around the armature circuit, Ω. */
  protected abstract circuitResistance(parameters: P): number

  /** Total inductance around the armature circuit, H. */
  protected abstract circuitInductance(parameters: P): number

  initialState(): MotorState {
    return { omega: 0, current: 0 }
  }

  derivatives(state: MotorState, parameters: P): MotorState {
    const flux = this.flux(state.current, parameters)
    const backEmf = parameters.machineConstant * flux * state.omega
    const torque = parameters.machineConstant * flux * state.current
    const resistiveDrop = state.current * this.circuitResistance(parameters)
    return {
      current: (parameters.supplyVoltage - resistiveDrop - backEmf) / this.circuitInductance(parameters),
      omega: (torque - parameters.loadTorque - parameters.viscousFriction * state.omega) / parameters.inertia,
    }
  }

  outputs(state: MotorState, parameters: P): MotorOutputs {
    const flux = this.flux(state.current, parameters)
    const backEmf = parameters.machineConstant * flux * state.omega
    const torque = parameters.machineConstant * flux * state.current
    const fieldCurrent = this.fieldCurrent(parameters)
    const lineCurrent = state.current + fieldCurrent
    const inputPower = parameters.supplyVoltage * lineCurrent
    const shaftPower = (torque - parameters.viscousFriction * state.omega) * state.omega

    // Ideal no-load speed: the speed at which back EMF alone would balance the
    // supply. The rotor always sits a little below it, and that gap is what the
    // shunt motor's near-constant speed is really about.
    const noLoadOmega = parameters.supplyVoltage / (parameters.machineConstant * Math.max(Math.abs(flux), 1e-6))

    return {
      speed: toRpm(state.omega),
      omega: state.omega,
      torque,
      loadTorque: parameters.loadTorque,
      lineCurrent,
      armatureCurrent: state.current,
      fieldCurrent,
      flux,
      backEmf,
      shaftPower,
      inputPower,
      efficiency: inputPower > 1 ? clamp((shaftPower / inputPower) * 100, 0, 100) : 0,
      synchronousSpeed: toRpm(noLoadOmega),
      slip: 0,
    }
  }
}

/** Mechanical parameters shared by the DC machines in this application. */
export const dcMechanicalDefaults: MechanicalParameters = {
  loadTorque: 12,
  inertia: 0.05,
  viscousFriction: 0.002,
}

/**
 * A smoothly saturating magnetisation curve, flux against current.
 *
 * Below the knee tanh is very nearly linear, giving Φ ∝ I_A and therefore
 * T ∝ I_A², which is where a series motor's starting torque comes from. Above
 * the knee flux levels off, which is why that relationship does not hold
 * forever. tanh is used rather than a piecewise curve so the derivative stays
 * continuous and the solver stays well behaved.
 */
export const saturatingFlux = (current: number, knee: number, ceiling: number) =>
  ceiling * Math.tanh(current / knee)
