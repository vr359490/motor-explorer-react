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
export { inductionConstruction } from './InductionConstruction'

import type { MotorKind } from '../motors/Motor'
import type { ConstructionSequence } from './ConstructionStep'
import { inductionConstruction } from './InductionConstruction'

/**
 * Construction sequences by motor kind.
 *
 * Induction comes first because spec section 28 nominates it as the sequence
 * that establishes the framework. The DC sequences follow in Sprint 4.
 */
export const constructionSequences: Partial<Record<MotorKind, ConstructionSequence>> = {
  induction: inductionConstruction,
}
