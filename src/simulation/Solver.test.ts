import { describe, expect, it } from 'vitest'
import { SimulationEngine } from './SimulationEngine'
import { euler, rk4 } from './Solver'
import type { MotorState } from './State'

/** dy/dt = -y, whose solution is exp(-t). Carried in `omega`. */
const decay = (state: MotorState): MotorState => ({ omega: -state.omega, current: 0 })

const integrate = (solver: typeof rk4, dt: number, duration: number) => {
  let state: MotorState = { omega: 1, current: 0 }
  let time = 0
  for (let i = 0; i < Math.round(duration / dt); i++) {
    state = solver(state, time, dt, decay)
    time += dt
  }
  return state.omega
}

describe('solvers', () => {
  it('integrates a known exponential accurately', () => {
    expect(integrate(rk4, 0.01, 1)).toBeCloseTo(Math.exp(-1), 9)
  })

  it('is far more accurate than Euler at the same step size', () => {
    const exact = Math.exp(-1)
    const rk4Error = Math.abs(integrate(rk4, 0.1, 1) - exact)
    const eulerError = Math.abs(integrate(euler, 0.1, 1) - exact)
    expect(rk4Error).toBeLessThan(eulerError / 1000)
  })
})

describe('simulation engine', () => {
  const constantRate = {
    kind: 'shunt' as const,
    label: 'test',
    description: 'test',
    equation: '',
    defaultParameters: {},
    controls: [],
    initialState: () => ({ omega: 0, current: 0 }),
    derivatives: () => ({ omega: 1, current: 0 }),
    outputs: () => {
      throw new Error('not used')
    },
  }

  it('advances simulated time by exactly the interval requested', () => {
    const engine = new SimulationEngine(constantRate)
    engine.advance(0.05)
    expect(engine.time).toBeCloseTo(0.05, 12)
    expect(engine.state.omega).toBeCloseTo(0.05, 9)
  })

  it('subdivides an interval longer than the internal step', () => {
    // A 16 ms animation frame is 32 steps at the 0.5 ms default. Integrating it
    // in one leap is what would break a DC machine's electrical transient.
    const engine = new SimulationEngine(constantRate, undefined, { maxStep: 5e-4 })
    engine.advance(0.016)
    expect(engine.time).toBeCloseTo(0.016, 12)
  })

  it('clamps an implausibly long interval rather than integrating all of it', () => {
    const engine = new SimulationEngine(constantRate, undefined, { maxAdvance: 0.1 })
    engine.advance(60)
    expect(engine.time).toBeCloseTo(0.1, 12)
  })

  it('ignores zero and negative intervals', () => {
    const engine = new SimulationEngine(constantRate)
    engine.advance(0)
    engine.advance(-1)
    expect(engine.time).toBe(0)
  })
})
