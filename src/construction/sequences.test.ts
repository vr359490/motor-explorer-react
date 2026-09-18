import { describe, expect, it } from 'vitest'
import { motorRegistry, type AnyMotor } from '../motors'
import type { MotorKind } from '../motors/Motor'
import {
  componentCatalogue,
  componentsActiveAt,
  phaseOrder,
  stepAt,
  validateSequence,
} from './ConstructionStep'
import { constructionSequences } from './index'

const entries = Object.entries(constructionSequences) as [MotorKind, (typeof constructionSequences)[MotorKind]][]

describe('every motor has a construction sequence', () => {
  it('covers all four machines', () => {
    expect(Object.keys(constructionSequences).sort()).toEqual(['compound', 'induction', 'series', 'shunt'])
  })

  it('declares the motor it belongs to', () => {
    for (const [kind, sequence] of entries) expect(sequence.motor).toBe(kind)
  })
})

describe.each(entries)('%s sequence', (kind, sequence) => {
  // Widened, because `options` is optional on the interface and the concrete
  // classes that have no discrete choices simply do not declare it.
  const motor: AnyMotor = motorRegistry[kind]

  it('is structurally sound', () => {
    expect(validateSequence(sequence)).toEqual([])
  })

  it('numbers its steps contiguously from one', () => {
    expect(sequence.steps.map((step) => step.index)).toEqual(
      sequence.steps.map((_, position) => position + 1),
    )
  })

  it('introduces every component exactly once', () => {
    const ids = componentCatalogue(sequence).map((component) => component.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tells the user what each component is, where it is, and what it does', () => {
    for (const component of componentCatalogue(sequence)) {
      expect(component.name.length, component.id).toBeGreaterThan(0)
      expect(component.location.length, component.id).toBeGreaterThan(0)
      expect(component.purpose.length, component.id).toBeGreaterThan(0)
    }
  })

  it('gives every step all three phases with something to say', () => {
    for (const step of sequence.steps) {
      for (const phase of phaseOrder) {
        expect(step[phase].body.length, `${step.id}.${phase}`).toBeGreaterThan(40)
      }
    }
  })

  it('never requires a component that does not exist yet', () => {
    for (const step of sequence.steps) {
      const built = componentsActiveAt(sequence, step.index - 1)
      for (const required of step.requires) {
        expect(built, `${step.id} requires ${required}`).toContain(required)
      }
    }
  })

  it('highlights the new component in its introduction phase', () => {
    for (const step of sequence.steps) {
      expect(step.introduction.highlight, step.id).toContain(step.component.id)
    }
  })

  it('never highlights something that does not exist yet', () => {
    for (const step of sequence.steps) {
      const available = componentsActiveAt(sequence, step.index)
      for (const phase of phaseOrder) {
        for (const id of step[phase].highlight) {
          expect(available, `${step.id}.${phase} highlights ${id}`).toContain(id)
        }
      }
    }
  })

  it('only offers parameters the motor actually exposes to the user', () => {
    // Sliders and discrete options both count; both are adjustable.
    const adjustable = [
      ...motor.controls.map((control) => control.key),
      ...(motor.options?.map((option) => option.key) ?? []),
    ]
    for (const step of sequence.steps) {
      for (const parameter of step.interaction?.parameters ?? []) {
        expect(adjustable, `${step.id} offers ${parameter}`).toContain(parameter)
      }
    }
  })

  it('does not run the simulation before the rotor is free to turn', () => {
    for (const step of sequence.steps) {
      if (step.interaction?.simulate) expect(step.visualization.rotorFree, step.id).toBe(true)
    }
  })

  it('gives every equation a plain-language reading', () => {
    for (const step of sequence.steps) {
      for (const equation of step.equations) {
        expect(equation.meaning.length, `${step.id}: ${equation.expression}`).toBeGreaterThan(0)
      }
    }
  })

  it('ends on a step that ties the machine together', () => {
    const final = stepAt(sequence, sequence.steps.length)
    expect(final).toBeDefined()
    expect(final?.integration.body.length).toBeGreaterThan(40)
  })
})

describe('DC sequences build on the shunt machine rather than restating it', () => {
  it('assembles the DC machine from nothing in the shunt sequence', () => {
    const shunt = constructionSequences.shunt
    // Nothing exists before step 1.
    expect(componentsActiveAt(shunt, 0).size).toBe(0)
    expect(stepAt(shunt, 1)?.component.id).toBe('stator')
  })

  it('starts the series and compound sequences with that machine already present', () => {
    for (const kind of ['series', 'compound'] as const) {
      const built = componentsActiveAt(constructionSequences[kind], 1)
      for (const part of ['stator', 'armature', 'commutator', 'brushes', 'back-emf']) {
        expect(built, `${kind} should open with ${part} present`).toContain(part)
      }
    }
  })

  it('keeps the series and compound sequences much shorter than the shunt one', () => {
    const shuntLength = constructionSequences.shunt.steps.length
    expect(constructionSequences.series.steps.length).toBeLessThan(shuntLength)
    expect(constructionSequences.compound.steps.length).toBeLessThan(shuntLength)
  })

  it('introduces the commutator before the brushes that ride on it', () => {
    const shunt = constructionSequences.shunt
    const commutator = shunt.steps.findIndex((step) => step.component.id === 'commutator')
    const brushes = shunt.steps.findIndex((step) => step.component.id === 'brushes')
    expect(commutator).toBeGreaterThanOrEqual(0)
    expect(brushes).toBeGreaterThan(commutator)
  })

  it('establishes flux and armature current before torque, which is their product', () => {
    const shunt = constructionSequences.shunt
    const order = shunt.steps.map((step) => step.component.id)
    expect(order.indexOf('torque')).toBeGreaterThan(order.indexOf('field-flux'))
    expect(order.indexOf('torque')).toBeGreaterThan(order.indexOf('armature-current'))
  })

  it('holds back equations until the physical idea has been introduced', () => {
    // Construction before abstraction: no equations in the first two steps of
    // the sequence that builds a machine from nothing.
    const shunt = constructionSequences.shunt
    expect(stepAt(shunt, 1)?.equations).toEqual([])
    expect(stepAt(shunt, 2)?.equations).toEqual([])
  })
})
