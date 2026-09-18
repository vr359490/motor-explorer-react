export type { Motor, MotorKind } from './Motor'
export { DCMotor, type DCParameters } from './DCMotor'
export { DCShuntMotor, shuntMotor, type ShuntParameters } from './DCShuntMotor'
export { DCSeriesMotor, seriesMotor, type SeriesParameters } from './DCSeriesMotor'
export {
  DCCompoundMotor,
  compoundMotor,
  type CompoundConnection,
  type CompoundParameters,
} from './DCCompoundMotor'
export { InductionMotor, inductionMotor, type InductionParameters } from './InductionMotor'

import { compoundMotor } from './DCCompoundMotor'
import { seriesMotor } from './DCSeriesMotor'
import { shuntMotor } from './DCShuntMotor'
import { inductionMotor } from './InductionMotor'
import type { Motor } from './Motor'

/**
 * A parameter bag at the interface boundary, where the concrete motor type is
 * not statically known.
 */
export type MotorParameters = Record<string, number | string>

/**
 * A motor with its parameter type erased.
 *
 * The physics layer stays precisely typed. Only this boundary widens, because a
 * motor selector has to hold any one of four machines with four different
 * parameter shapes in a single variable, and no amount of generics makes that
 * pleasant. The trade is contained: parameter keys are still validated against
 * each motor's own `controls` at runtime, and the construction tests check them
 * at build time.
 */
export type AnyMotor = Motor<any>

/** Every machine the application can simulate, keyed by kind. */
export const motorRegistry = {
  shunt: shuntMotor,
  series: seriesMotor,
  compound: compoundMotor,
  induction: inductionMotor,
} as const
