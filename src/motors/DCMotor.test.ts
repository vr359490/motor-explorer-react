import { describe, expect, it } from 'vitest'
import type { MechanicalParameters } from '../simulation/Parameters'
import { SimulationEngine, steadyState } from '../simulation/SimulationEngine'
import { compoundMotor } from './DCCompoundMotor'
import { seriesMotor } from './DCSeriesMotor'
import { shuntMotor } from './DCShuntMotor'
import type { Motor } from './Motor'

/** Fractional speed drop between a light and a heavy load, for any machine. */
const speedDroop = <P extends MechanicalParameters>(motor: Motor<P>, light = 5, heavy = 20) => {
  const speedAt = (loadTorque: number) => steadyState(motor, { loadTorque } as Partial<P>).speed
  const lightSpeed = speedAt(light)
  return (lightSpeed - speedAt(heavy)) / lightSpeed
}

describe('DC shunt motor', () => {
  it('satisfies I_A = (V - kPhi*omega) / R_A once settled', () => {
    // The relationship spec section 22 asks to verify, checked against the
    // converged state rather than assumed by construction.
    const p = shuntMotor.defaultParameters
    const engine = new SimulationEngine(shuntMotor)
    // Settle harder than the default: the circuit equation only holds exactly
    // once dI/dt has actually reached zero, and the default tolerance leaves
    // L*dI/dt worth of residual voltage behind.
    engine.settle({ omegaTolerance: 1e-6, currentTolerance: 1e-6 })
    const { armatureCurrent, omega, flux } = engine.outputs()
    const expected = (p.supplyVoltage - p.machineConstant * flux * omega) / p.armatureResistance
    expect(armatureCurrent).toBeCloseTo(expected, 6)
  })

  it('balances electromagnetic torque against load and friction once settled', () => {
    const p = shuntMotor.defaultParameters
    const { torque, loadTorque, omega } = steadyState(shuntMotor)
    expect(torque).toBeCloseTo(loadTorque + p.viscousFriction * omega, 4)
  })

  it('holds speed nearly constant as load changes', () => {
    const noLoad = steadyState(shuntMotor, { loadTorque: 0 })
    const loaded = steadyState(shuntMotor, { loadTorque: 24 })
    const regulation = (noLoad.speed - loaded.speed) / noLoad.speed
    expect(regulation).toBeGreaterThan(0)
    expect(regulation).toBeLessThan(0.1)
  })

  it('draws more armature current under load while barely slowing', () => {
    const light = steadyState(shuntMotor, { loadTorque: 2 })
    const heavy = steadyState(shuntMotor, { loadTorque: 20 })
    expect(heavy.armatureCurrent).toBeGreaterThan(light.armatureCurrent * 3)
    expect(heavy.speed).toBeLessThan(light.speed)
    expect(heavy.backEmf).toBeLessThan(light.backEmf)
  })

  it('raises speed when the field is weakened', () => {
    const full = steadyState(shuntMotor, { fieldStrength: 1 })
    const weakened = steadyState(shuntMotor, { fieldStrength: 0.7 })
    expect(weakened.speed).toBeGreaterThan(full.speed)
    expect(weakened.armatureCurrent).toBeGreaterThan(full.armatureCurrent)
  })

  it('starts from rest and accelerates towards its operating point', () => {
    const engine = new SimulationEngine(shuntMotor)
    expect(engine.outputs().speed).toBe(0)
    engine.advance(0.01)
    const early = engine.outputs()
    expect(early.speed).toBeGreaterThan(0)
    expect(engine.settle().speed).toBeGreaterThan(early.speed)
  })

  it('draws far more current at standstill than when running', () => {
    // Starting current: at rest there is no back EMF, so only resistance limits it.
    const engine = new SimulationEngine(shuntMotor)
    engine.advance(0.02)
    const starting = engine.outputs().armatureCurrent
    expect(starting).toBeGreaterThan(engine.settle().armatureCurrent * 5)
  })
})

describe('DC series motor', () => {
  it('produces torque proportional to current squared below saturation', () => {
    const p = seriesMotor.defaultParameters
    const at = (current: number) => seriesMotor.outputs({ omega: 0, current }, p).torque
    // Well below the 18 A knee, doubling current should very nearly quadruple torque.
    const ratio = at(4) / at(2)
    expect(ratio).toBeGreaterThan(3.8)
    expect(ratio).toBeLessThan(4)
  })

  it('falls away from the square law above the saturation knee', () => {
    const p = seriesMotor.defaultParameters
    const at = (current: number) => seriesMotor.outputs({ omega: 0, current }, p).torque
    expect(at(60) / at(30)).toBeLessThan(2.5)
  })

  it('develops more starting torque than a shunt motor at the same current', () => {
    const current = 30
    const series = seriesMotor.outputs({ omega: 0, current }, seriesMotor.defaultParameters).torque
    const shunt = shuntMotor.outputs({ omega: 0, current }, shuntMotor.defaultParameters).torque
    expect(series).toBeGreaterThan(shunt)
  })

  it('runs away as load approaches zero', () => {
    const rated = steadyState(seriesMotor, { loadTorque: 14 })
    const light = steadyState(seriesMotor, { loadTorque: 1 })
    expect(light.speed).toBeGreaterThan(rated.speed * 2)
    expect(light.flux).toBeLessThan(rated.flux)
  })

  it('changes speed far more with load than a shunt motor does', () => {
    expect(speedDroop(seriesMotor)).toBeGreaterThan(speedDroop(shuntMotor) * 5)
  })

  it('turns the same direction on either supply polarity', () => {
    const forward = steadyState(seriesMotor)
    const reversed = steadyState(seriesMotor, { supplyVoltage: -240 })
    expect(reversed.speed).toBeCloseTo(forward.speed, 3)
    expect(reversed.armatureCurrent).toBeLessThan(0)
  })
})

describe('DC compound motor', () => {
  it('adds the two field contributions when cumulatively connected', () => {
    const p = compoundMotor.defaultParameters
    const { flux } = compoundMotor.outputs({ omega: 0, current: 20 }, p)
    expect(flux).toBeGreaterThan(p.shuntFieldStrength)
  })

  it('subtracts them when differentially connected', () => {
    const p = { ...compoundMotor.defaultParameters, connection: 'differential' as const }
    const { flux } = compoundMotor.outputs({ omega: 0, current: 20 }, p)
    expect(flux).toBeLessThan(p.shuntFieldStrength)
  })

  it('sits between the shunt and series characteristics for speed droop', () => {
    const compound = speedDroop(compoundMotor)
    expect(compound).toBeGreaterThan(speedDroop(shuntMotor))
    expect(compound).toBeLessThan(speedDroop(seriesMotor))
  })

  it('droops more when cumulative and less when differential', () => {
    const speedAt = (connection: 'cumulative' | 'differential', loadTorque: number) =>
      steadyState(compoundMotor, { connection, loadTorque }).speed
    const cumulativeDroop = speedAt('cumulative', 2) - speedAt('cumulative', 20)
    const differentialDroop = speedAt('differential', 2) - speedAt('differential', 20)
    expect(cumulativeDroop).toBeGreaterThan(differentialDroop)
  })
})
