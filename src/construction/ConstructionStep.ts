import type { MotorKind } from '../motors/Motor'

/**
 * The construction layer is data, not behaviour.
 *
 * A sequence describes what to introduce, in what order, and what to say about
 * it. It sits alongside the physics rather than inside it: nothing here
 * calculates anything, and nothing here knows how it will be drawn. A renderer
 * reads these descriptions and decides what to put on screen.
 */

/**
 * Whether a thing can be pointed at inside the machine, or only observed
 * happening in it. Renderers draw physical parts and overlay phenomena, so the
 * distinction is worth carrying in the data.
 */
export type ComponentNature = 'physical' | 'phenomenon'

/**
 * Something the sequence introduces. The three descriptive fields answer the
 * three questions the application is supposed to answer continuously: what is
 * this, what does it do, why does it matter.
 */
export type MotorComponent = {
  id: string
  name: string
  nature: ComponentNature
  /** Where it sits, or where it happens. */
  location: string
  /** Its electrical, magnetic, or mechanical role. */
  purpose: string
}

/**
 * One of the three phases a step moves through: the component is introduced,
 * then contributes something, then joins the system.
 */
export type Phase = {
  body: string
  /** Components drawn at full emphasis. Everything else is muted. */
  highlight: readonly string[]
  /** A causal sequence to reveal one line at a time, where the phase has one. */
  chain?: readonly string[]
  /** What the user does to advance, where the phase asks for something. */
  action?: string
}

/**
 * An equation belongs to the step whose physical idea it describes, never to an
 * earlier one. The application establishes the concept first and then shows the
 * relationship that captures it.
 */
export type StepEquation = {
  /** KaTeX source. */
  expression: string
  /** The same statement in plain language. */
  meaning: string
}

/** Parameters the user may move during a step, and what moving them shows. */
export type StepInteraction = {
  /** Keys that must exist on the motor's own parameters. */
  parameters: readonly string[]
  prompt: string
  /** Whether the simulation should be running during this step. */
  simulate: boolean
}

/** A declarative hint for whatever draws the machine. Deliberately not p5-specific. */
export type VisualizationCue = {
  /** Which arrangement to show. */
  scene: string
  /** Phenomena to overlay on it. */
  overlays: readonly string[]
  /** Whether the rotor is free to turn during this step. */
  rotorFree: boolean
}

export type ConstructionStep = {
  id: string
  /** Position in the sequence, starting at 1. */
  index: number
  title: string
  component: MotorComponent
  /** Components that must already be present for this step to make sense. */
  requires: readonly string[]
  /** Components present from the end of this step onwards. */
  activates: readonly string[]
  introduction: Phase
  contribution: Phase
  integration: Phase
  equations: readonly StepEquation[]
  interaction?: StepInteraction
  visualization: VisualizationCue
}

export type ConstructionSequence = {
  motor: MotorKind
  title: string
  summary: string
  steps: readonly ConstructionStep[]
}

export const phaseOrder = ['introduction', 'contribution', 'integration'] as const
export type PhaseName = (typeof phaseOrder)[number]

export const stepAt = (sequence: ConstructionSequence, index: number): ConstructionStep | undefined =>
  sequence.steps.find((step) => step.index === index)

export const stepById = (sequence: ConstructionSequence, id: string): ConstructionStep | undefined =>
  sequence.steps.find((step) => step.id === id)

/** Every component the sequence introduces, in the order it introduces them. */
export const componentCatalogue = (sequence: ConstructionSequence): readonly MotorComponent[] =>
  [...sequence.steps].sort((a, b) => a.index - b.index).map((step) => step.component)

/**
 * Components present by the end of a given step.
 *
 * This is what a renderer asks in order to decide what exists on screen: the
 * machine accumulates as the user moves through it.
 */
export const componentsActiveAt = (sequence: ConstructionSequence, index: number): ReadonlySet<string> => {
  const active = new Set<string>()
  for (const step of sequence.steps) {
    if (step.index <= index) for (const id of step.activates) active.add(id)
  }
  return active
}

/**
 * Structural problems with a sequence, as readable messages. Empty means sound.
 *
 * Spec section 22 asks that construction-mode tests verify steps occur in the
 * intended order, that components become active at the right stage, and that
 * the explanation matches the component being introduced. Those checks are the
 * same ones an author wants while writing a sequence, so they live here rather
 * than only in the test file.
 */
export const validateSequence = (sequence: ConstructionSequence): string[] => {
  const issues: string[] = []
  const steps = [...sequence.steps].sort((a, b) => a.index - b.index)

  steps.forEach((step, position) => {
    if (step.index !== position + 1) {
      issues.push(`step "${step.id}" has index ${step.index} but sits at position ${position + 1}`)
    }
  })

  const seenStepIds = new Set<string>()
  const introduced = new Set<string>()
  for (const step of steps) {
    if (seenStepIds.has(step.id)) issues.push(`duplicate step id "${step.id}"`)
    seenStepIds.add(step.id)

    if (introduced.has(step.component.id)) {
      issues.push(`component "${step.component.id}" is introduced more than once`)
    }

    for (const required of step.requires) {
      if (!introduced.has(required)) {
        issues.push(`step "${step.id}" requires "${required}", which no earlier step activates`)
      }
    }

    if (!step.activates.includes(step.component.id)) {
      issues.push(`step "${step.id}" introduces "${step.component.id}" without activating it`)
    }

    if (!step.introduction.highlight.includes(step.component.id)) {
      issues.push(`step "${step.id}" does not highlight the component it introduces`)
    }

    for (const phase of phaseOrder) {
      for (const id of step[phase].highlight) {
        if (!introduced.has(id) && id !== step.component.id) {
          issues.push(`step "${step.id}" highlights "${id}" in ${phase} before it exists`)
        }
      }
    }

    for (const id of step.activates) introduced.add(id)
  }

  return issues
}
