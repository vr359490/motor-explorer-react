import { describe, expect, it } from 'vitest'
import { inductionMotor } from '../motors/InductionMotor'
import {
  componentCatalogue,
  componentsActiveAt,
  phaseOrder,
  stepAt,
  stepById,
  validateSequence,
  type ConstructionSequence,
} from './ConstructionStep'
import { inductionConstruction } from './InductionConstruction'

const sequence = inductionConstruction

describe('sequence structure', () => {
  it('is structurally sound', () => {
    expect(validateSequence(sequence)).toEqual([])
  })

  it('numbers its steps contiguously from one', () => {
    expect(sequence.steps.map((step) => step.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('builds the machine in the order the spec sets out', () => {
    expect(sequence.steps.map((step) => step.id)).toEqual([
      'stator',
      'stator-windings',
      'rotating-field',
      'rotor',
      'squirrel-cage',
      'rotor-current',
      'slip',
      'torque',
      'load',
    ])
  })

  it('introduces every component exactly once', () => {
    const ids = componentCatalogue(sequence).map((component) => component.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every component the three things a user is meant to be told', () => {
    for (const component of componentCatalogue(sequence)) {
      expect(component.name.length).toBeGreaterThan(0)
      expect(component.location.length).toBeGreaterThan(0)
      expect(component.purpose.length).toBeGreaterThan(0)
    }
  })

  it('gives every step all three phases with something to say', () => {
    for (const step of sequence.steps) {
      for (const phase of phaseOrder) {
        expect(step[phase].body.length, `${step.id}.${phase}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('components become active at the right stage', () => {
  it('starts with nothing built', () => {
    expect(componentsActiveAt(sequence, 0).size).toBe(0)
  })

  it('accumulates the machine as the user advances', () => {
    expect([...componentsActiveAt(sequence, 1)]).toEqual(['stator'])
    expect(componentsActiveAt(sequence, 3)).toContain('rotating-field')
    expect(componentsActiveAt(sequence, 3)).not.toContain('rotor')
    expect(componentsActiveAt(sequence, 9).size).toBe(sequence.steps.length)
  })

  it('never requires a component that does not exist yet', () => {
    for (const step of sequence.steps) {
      const alreadyBuilt = componentsActiveAt(sequence, step.index - 1)
      for (const required of step.requires) {
        expect(alreadyBuilt, `${step.id} requires ${required}`).toContain(required)
      }
    }
  })

  it('has the rotor still until slip is introduced', () => {
    // The rotor is deliberately held stationary while current and its cause are
    // established, so the user sees induction before they see rotation.
    const free = sequence.steps.filter((step) => step.visualization.rotorFree).map((step) => step.id)
    expect(free).toEqual(['slip', 'torque', 'load'])
  })

  it('does not run the simulation before the rotor is free to turn', () => {
    for (const step of sequence.steps) {
      if (step.interaction?.simulate) expect(step.visualization.rotorFree, step.id).toBe(true)
    }
  })
})

describe('explanations match the component being introduced', () => {
  it('highlights the new component in its introduction phase', () => {
    for (const step of sequence.steps) {
      expect(step.introduction.highlight, step.id).toContain(step.component.id)
    }
  })

  it('never highlights something that has not been introduced', () => {
    for (const step of sequence.steps) {
      const available = componentsActiveAt(sequence, step.index)
      for (const phase of phaseOrder) {
        for (const id of step[phase].highlight) {
          expect(available, `${step.id}.${phase} highlights ${id}`).toContain(id)
        }
      }
    }
  })
})

describe('equations follow the concepts they describe', () => {
  it('holds back the synchronous speed relation until the field is rotating', () => {
    const introducedBefore = sequence.steps
      .filter((step) => step.index < 3)
      .flatMap((step) => step.equations.map((equation) => equation.expression))
    expect(introducedBefore.join(' ')).not.toContain('n_s')
    expect(stepById(sequence, 'rotating-field')?.equations[0]?.expression).toContain('\\frac{120f}{P}')
  })

  it('introduces slip only once slip has been established', () => {
    const slipStep = sequence.steps.find((step) =>
      step.equations.some((equation) => equation.expression.includes('n_s - n_r')),
    )
    expect(slipStep?.id).toBe('slip')
  })

  it('gives every equation a plain-language reading', () => {
    for (const step of sequence.steps) {
      for (const equation of step.equations) {
        expect(equation.meaning.length, `${step.id}: ${equation.expression}`).toBeGreaterThan(0)
      }
    }
  })

  it('opens with no equations at all', () => {
    // Construction before abstraction: the first two steps are physical only.
    expect(stepAt(sequence, 1)?.equations).toEqual([])
    expect(stepAt(sequence, 2)?.equations.length).toBeLessThanOrEqual(1)
  })
})

describe('interactions line up with the physics model', () => {
  it('only offers parameters the induction motor actually has', () => {
    const available = Object.keys(inductionMotor.defaultParameters)
    for (const step of sequence.steps) {
      for (const parameter of step.interaction?.parameters ?? []) {
        expect(available, `${step.id} offers ${parameter}`).toContain(parameter)
      }
    }
  })

  it('only offers parameters the motor exposes as user controls', () => {
    const controls = inductionMotor.controls.map((control) => control.key)
    for (const step of sequence.steps) {
      for (const parameter of step.interaction?.parameters ?? []) {
        expect(controls, `${step.id} offers ${parameter}`).toContain(parameter)
      }
    }
  })

  it('lets the user drive synchronous speed at the rotating-field step', () => {
    expect(stepById(sequence, 'rotating-field')?.interaction?.parameters).toEqual(['frequency', 'poles'])
  })

  it('ends on the load response, which is the chain the spec asks for', () => {
    const final = stepAt(sequence, sequence.steps.length)
    expect(final?.id).toBe('load')
    expect(final?.contribution.chain?.length).toBeGreaterThanOrEqual(5)
  })
})

describe('validateSequence catches authoring mistakes', () => {
  const broken = (mutate: (sequence: ConstructionSequence) => ConstructionSequence) =>
    validateSequence(mutate(structuredClone(sequence) as ConstructionSequence))

  it('rejects a step that requires something built later', () => {
    const issues = broken((s) => {
      const steps = [...s.steps]
      steps[0] = { ...steps[0], requires: ['torque'] }
      return { ...s, steps }
    })
    expect(issues.join(' ')).toContain('requires "torque"')
  })

  it('rejects a step that does not highlight what it introduces', () => {
    const issues = broken((s) => {
      const steps = [...s.steps]
      steps[0] = { ...steps[0], introduction: { ...steps[0].introduction, highlight: [] } }
      return { ...s, steps }
    })
    expect(issues.join(' ')).toContain('does not highlight')
  })

  it('rejects steps numbered out of order', () => {
    const issues = broken((s) => {
      const steps = [...s.steps]
      steps[0] = { ...steps[0], index: 5 }
      return { ...s, steps }
    })
    expect(issues.length).toBeGreaterThan(0)
  })
})
