export type {
  ComponentNature,
  ConstructionSequence,
  ConstructionStep,
  MotorComponent,
  Phase,
  PhaseName,
  StepEquation,
  StepInteraction,
  VisualizationCue,
} from './ConstructionStep'
export {
  componentCatalogue,
  componentsActiveAt,
  phaseOrder,
  stepAt,
  stepById,
  validateSequence,
} from './ConstructionStep'
export { dcFoundation, dcShuntConstruction } from './DCShuntConstruction'
export { dcSeriesConstruction } from './DCSeriesConstruction'
export { dcCompoundConstruction } from './DCCompoundConstruction'
export { inductionConstruction } from './InductionConstruction'

import type { MotorKind } from '../motors/Motor'
import type { ConstructionSequence } from './ConstructionStep'
import { dcCompoundConstruction } from './DCCompoundConstruction'
import { dcSeriesConstruction } from './DCSeriesConstruction'
import { dcShuntConstruction } from './DCShuntConstruction'
import { inductionConstruction } from './InductionConstruction'

/**
 * Construction sequences by motor kind.
 *
 * The shunt sequence builds a DC machine from nothing; series and compound
 * start with that machine already assembled and change only the field
 * connection, which is what spec section 9 asks for.
 */
export const constructionSequences: Record<MotorKind, ConstructionSequence> = {
  shunt: dcShuntConstruction,
  series: dcSeriesConstruction,
  compound: dcCompoundConstruction,
  induction: inductionConstruction,
}
