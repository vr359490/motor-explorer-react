import { describe, expect, it } from 'vitest'
import { compoundMotor } from '../motors/DCCompoundMotor'
import { seriesMotor } from '../motors/DCSeriesMotor'
import { shuntMotor } from '../motors/DCShuntMotor'
import { inductionMotor } from '../motors/InductionMotor'
import { noLoadSpeed, operatingSpeed, steadyStateAt, torqueSpeedCurve } from './curves'
import { steadyState } from './SimulationEngine'
import { toRadPerSecond } from './units'

describe('steady state at a held speed', () => {
  it('solves the DC armature circuit exactly', () => {
    const p = shuntMotor.defaultParameters
    const omega = toRadPerSecond(1500)
    const { current } = steadyStateAt(shuntMotor, p, omega)
    const expected = (p.supplyVoltage - p.machineConstant * p.fieldStrength * omega) / p.armatureResistance
    expect(current).toBeCloseTo(expected, 6)
  })

  it('handles the series machine, where flux depends on the current being solved for', () => {
    const p = seriesMotor.defaultParameters
    const omega = toRadPerSecond(2000)
    const { current } = steadyStateAt(seriesMotor, p, omega)
    // The residual of V = RI + kPhi(I)w should vanish at the solution.
    expect(seriesMotor.derivatives({ omega, current }, p).current).toBeCloseTo(0, 6)
  })

  it('agrees with the settled simulation at its operating point', () => {
    const settled = steadyState(shuntMotor)
    const held = steadyStateAt(shuntMotor, shuntMotor.defaultParameters, settled.omega)
    expect(held.current).toBeCloseTo(settled.armatureCurrent, 3)
  })

  it('reads induction rotor current straight from slip', () => {
    const p = inductionMotor.defaultParameters
    const omega = toRadPerSecond(1700)
    const { current } = steadyStateAt(inductionMotor, p, omega)
    expect(current).toBeCloseTo(inductionMotor.outputs({ omega, current: 0 }, p).armatureCurrent, 9)
  })
})

describe('torque-speed characteristics', () => {
  const curveFor = <P extends object>(motor: Parameters<typeof torqueSpeedCurve<P>>[0], parameters: P, maxSpeed: number) =>
    torqueSpeedCurve(motor, parameters, { maxSpeed, points: 200 })

  it('returns the requested number of samples across the range', () => {
    const curve = curveFor(shuntMotor, shuntMotor.defaultParameters, 2000)
    expect(curve).toHaveLength(201)
    expect(curve[0].speed).toBe(0)
    expect(curve[curve.length - 1].speed).toBeCloseTo(2000, 9)
  })

  it('peaks the induction machine near its pull-out slip', () => {
    const p = inductionMotor.defaultParameters
    const curve = curveFor(inductionMotor, p, 1800)
    const peak = curve.reduce((best, point) => (point.torque > best.torque ? point : best))
    const slipAtPeak = (1800 - peak.speed) / 1800
    expect(slipAtPeak).toBeCloseTo(p.rotorResistance / p.rotorReactance, 1)
  })

  it('falls to zero torque at synchronous speed', () => {
    const curve = curveFor(inductionMotor, inductionMotor.defaultParameters, 1800)
    expect(curve[curve.length - 1].torque).toBeCloseTo(0, 6)
  })

  it('gives the shunt machine a nearly straight, falling characteristic', () => {
    const curve = curveFor(shuntMotor, shuntMotor.defaultParameters, 1800)
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].torque).toBeLessThan(curve[i - 1].torque)
    }
    // Evenly spaced speeds should give near-evenly spaced torques.
    const firstDrop = curve[1].torque - curve[0].torque
    const lastDrop = curve[curve.length - 1].torque - curve[curve.length - 2].torque
    expect(lastDrop).toBeCloseTo(firstDrop, 6)
  })

  it('develops many times its running torque at standstill', () => {
    // Standstill torque is set by V/R and the flux that current produces, so
    // comparing two machines' raw starting torque mostly compares their circuit
    // resistances. The series machine's real advantage is torque per amp, which
    // is asserted against the shunt machine at equal current in DCMotor.test.ts.
    const curve = curveFor(seriesMotor, seriesMotor.defaultParameters, 2200)
    expect(curve[0].torque).toBeGreaterThan(steadyState(seriesMotor).torque * 10)
  })

  it('curves the series machine rather than straightening it', () => {
    // A series characteristic is hyperbolic, so the torque drop per unit speed
    // is far steeper near standstill than near the top of the range.
    const curve = curveFor(seriesMotor, seriesMotor.defaultParameters, 2200)
    const early = curve[1].torque - curve[20].torque
    const late = curve[curve.length - 20].torque - curve[curve.length - 1].torque
    expect(early).toBeGreaterThan(late * 5)
  })

  it('produces a curve for the compound machine in both connections', () => {
    for (const connection of ['cumulative', 'differential'] as const) {
      const curve = curveFor(compoundMotor, { ...compoundMotor.defaultParameters, connection }, 2000)
      expect(curve.every((point) => Number.isFinite(point.torque))).toBe(true)
    }
  })
})

describe('no-load speed', () => {
  it('sits just below synchronous speed for an induction machine', () => {
    const speed = noLoadSpeed(inductionMotor, inductionMotor.defaultParameters)
    expect(speed).toBeLessThan(1800)
    expect(speed).toBeGreaterThan(1790)
  })

  it('sits just below the ideal no-load speed for a shunt machine', () => {
    const p = shuntMotor.defaultParameters
    const ideal = steadyState(shuntMotor, { loadTorque: 0 }).synchronousSpeed
    const speed = noLoadSpeed(shuntMotor, p)
    expect(speed).toBeLessThan(ideal)
    expect(speed).toBeGreaterThan(ideal * 0.98)
  })

  it('is far above rated speed for a series machine, and still finite', () => {
    const speed = noLoadSpeed(seriesMotor, seriesMotor.defaultParameters)
    expect(Number.isFinite(speed)).toBe(true)
    expect(speed).toBeGreaterThan(steadyState(seriesMotor).speed * 2)
  })

  it('agrees with what the simulation settles to when unloaded', () => {
    const settled = steadyState(shuntMotor, { loadTorque: 0 })
    expect(noLoadSpeed(shuntMotor, { ...shuntMotor.defaultParameters, loadTorque: 0 })).toBeCloseTo(
      settled.speed,
      0,
    )
  })
})

describe('operating point', () => {
  it('finds where the characteristic crosses the load', () => {
    const p = inductionMotor.defaultParameters
    const curve = torqueSpeedCurve(inductionMotor, p, { maxSpeed: 1800, points: 400 })
    // The machine balances against load plus friction, not load alone.
    const settled = steadyState(inductionMotor)
    const crossing = operatingSpeed(curve, p.loadTorque + p.viscousFriction * settled.omega)
    expect(crossing).not.toBeNull()
    // Should land on the same speed the simulation settles to.
    expect(crossing as number).toBeCloseTo(settled.speed, 0)
  })

  it('agrees with the settled shunt machine', () => {
    const p = shuntMotor.defaultParameters
    const curve = torqueSpeedCurve(shuntMotor, p, { maxSpeed: 2000, points: 400 })
    const crossing = operatingSpeed(curve, p.loadTorque + p.viscousFriction * steadyState(shuntMotor).omega)
    expect(crossing as number).toBeCloseTo(steadyState(shuntMotor).speed, 0)
  })

  it('reports no crossing when the machine cannot start against the load', () => {
    const curve = torqueSpeedCurve(inductionMotor, inductionMotor.defaultParameters, {
      maxSpeed: 1800,
      points: 200,
    })
    expect(operatingSpeed(curve, 10_000)).toBeNull()
  })
})
