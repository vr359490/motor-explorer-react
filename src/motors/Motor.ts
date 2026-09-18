import type { OptionDescriptor, ParameterDescriptor } from '../simulation/Parameters'
import type { MotorOutputs, MotorState } from '../simulation/State'

export type MotorKind = 'shunt' | 'series' | 'compound' | 'induction'

/**
 * A motor is a physics model and nothing else. It knows how its state changes
 * and how to report what it is doing; it knows nothing about React, p5, or how
 * any of it will be drawn.
 *
 * These are simplified educational models. They are not suitable for equipment
 * selection or design.
 */
export interface Motor<P extends object> {
  readonly kind: MotorKind
  readonly label: string
  readonly description: string
  /** The relationship this machine is built around, as a KaTeX expression. */
  readonly equation: string
  readonly defaultParameters: P
  readonly controls: readonly ParameterDescriptor<P>[]
  /** Discrete choices, such as a compound machine's winding connection. */
  readonly options?: readonly OptionDescriptor<P>[]

  /** State the machine starts from, normally at rest. */
  initialState(parameters: P): MotorState

  /** Time derivative of the state. The heart of the model. */
  derivatives(state: MotorState, parameters: P): MotorState

  /**
   * Applied after each integration step, for state that is fixed algebraically
   * rather than integrated. Induction machines use it to write rotor current.
   */
  project?(state: MotorState, parameters: P): MotorState

  /** Everything derived from the state for display. */
  outputs(state: MotorState, parameters: P): MotorOutputs
}
