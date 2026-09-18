import { describe, expect, it } from 'vitest'
import { SimulationEngine, steadyState } from '../simulation/SimulationEngine'
import { synchronousOmega } from '../simulation/units'
import { inductionMotor } from './InductionMotor'

const parameters = inductionMotor.defaultParameters
const outputsAtSlip = (slip: number, overrides: Partial<typeof parameters> = {}) => {
  const p = { ...parameters, ...overrides }
  const omega = synchronousOmega(p.frequency, p.poles) * (1 - slip)
  return inductionMotor.outputs({ omega, current: 0 }, p)
}

describe('induction motor speed relationships', () => {
  it('computes synchronous speed as 120f / P', () => {
    const cases = [
      { frequency: 60, poles: 2, expected: 3600 },
      { frequency: 60, poles: 4, expected: 1800 },
      { frequency: 60, poles: 6, expected: 1200 },
      { frequency: 50, poles: 4, expected: 1500 },
      { frequency: 30, poles: 8, expected: 450 },
    ]
    for (const { frequency, poles, expected } of cases) {
      expect(outputsAtSlip(0, { frequency, poles }).synchronousSpeed).toBeCloseTo(expected, 9)
    }
  })

  it('computes slip as (n_s - n_r) / n_s', () => {
    for (const slip of [0, 0.01, 0.05, 0.25, 1]) {
      const result = outputsAtSlip(slip)
      expect(result.slip).toBeCloseTo(slip, 9)
      expect(result.slip).toBeCloseTo((result.synchronousSpeed - result.speed) / result.synchronousSpeed, 9)
    }
  })
})

describe('induction motor torque production', () => {
  it('produces no torque at synchronous speed', () => {
    const atSync = outputsAtSlip(0)
    expect(atSync.torque).toBe(0)
    expect(atSync.armatureCurrent).toBe(0)
  })

  it('produces torque as soon as the rotor trails the field', () => {
    expect(outputsAtSlip(0.001).torque).toBeGreaterThan(0)
  })

  it('peaks at the slip where rotor resistance equals rotor reactance', () => {
    // Pull-out slip should be R_R / X_R, which is 0.25 for the default machine.
    let best = { slip: 0, torque: 0 }
    for (let slip = 0.001; slip <= 1; slip += 0.001) {
      const torque = outputsAtSlip(slip).torque
      if (torque > best.torque) best = { slip, torque }
    }
    expect(best.slip).toBeCloseTo(parameters.rotorResistance / parameters.rotorReactance, 2)
  })

  it('scales torque with the square of supply voltage', () => {
    const full = outputsAtSlip(0.05).torque
    const half = outputsAtSlip(0.05, { supplyVoltage: parameters.supplyVoltage / 2 }).torque
    expect(half).toBeCloseTo(full / 4, 6)
  })

  it('develops enough starting torque to accelerate its default load', () => {
    expect(outputsAtSlip(1).torque).toBeGreaterThan(parameters.loadTorque)
  })

  it('draws several times running current at standstill', () => {
    const starting = outputsAtSlip(1).armatureCurrent
    expect(starting).toBeGreaterThan(steadyState(inductionMotor).armatureCurrent * 4)
  })
})

describe('induction motor operating behaviour', () => {
  it('settles below synchronous speed at a small slip', () => {
    const result = steadyState(inductionMotor)
    expect(result.speed).toBeLessThan(result.synchronousSpeed)
    expect(result.slip).toBeGreaterThan(0)
    expect(result.slip).toBeLessThan(0.1)
  })

  it('follows the load chain: load up, speed down, slip up, rotor current up, torque up', () => {
    // The causal chain the construction sequence ends on, verified numerically.
    const light = steadyState(inductionMotor, { loadTorque: 8 })
    const heavy = steadyState(inductionMotor, { loadTorque: 30 })
    expect(heavy.speed).toBeLessThan(light.speed)
    expect(heavy.slip).toBeGreaterThan(light.slip)
    expect(heavy.armatureCurrent).toBeGreaterThan(light.armatureCurrent)
    expect(heavy.torque).toBeGreaterThan(light.torque)
  })

  it('moves synchronous speed and rotor speed together with frequency', () => {
    const low = steadyState(inductionMotor, { frequency: 30 })
    const high = steadyState(inductionMotor, { frequency: 60 })
    expect(low.synchronousSpeed).toBeCloseTo(high.synchronousSpeed / 2, 9)
    expect(low.speed).toBeLessThan(high.speed)
  })

  it('halves synchronous speed when the pole count doubles', () => {
    const four = steadyState(inductionMotor, { poles: 4 })
    const eight = steadyState(inductionMotor, { poles: 8 })
    expect(eight.synchronousSpeed).toBeCloseTo(four.synchronousSpeed / 2, 9)
  })

  it('still draws magnetising current with no load on the shaft', () => {
    const unloaded = steadyState(inductionMotor, { loadTorque: 0 })
    expect(unloaded.slip).toBeLessThan(0.01)
    expect(unloaded.lineCurrent).toBeGreaterThan(1)
  })

  it('holds flux constant when voltage and frequency are changed together', () => {
    const rated = outputsAtSlip(0.05)
    const halved = outputsAtSlip(0.05, { frequency: 30, supplyVoltage: 120 })
    expect(halved.flux).toBeCloseTo(rated.flux, 9)
  })

  it('accelerates from rest rather than appearing at speed', () => {
    const engine = new SimulationEngine(inductionMotor)
    expect(engine.outputs().slip).toBe(1)
    engine.advance(0.05)
    const early = engine.outputs()
    expect(early.slip).toBeLessThan(1)
    expect(early.slip).toBeGreaterThan(steadyState(inductionMotor).slip)
  })
})
