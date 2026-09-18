import type { Motor } from '../motors/Motor'
import type { MotorState } from './State'
import { toRadPerSecond, toRpm } from './units'

export type CurvePoint = {
  /** Rotor speed, rpm. */
  speed: number
  /** Electromagnetic torque the machine would develop at that speed, N·m. */
  torque: number
  /** Current it would draw there, A. */
  current: number
}

/**
 * The state a machine settles into electrically when its rotor is held at a
 * given speed.
 *
 * A torque-speed characteristic asks what torque a machine develops at each
 * speed, holding everything electrical at equilibrium. For an induction machine
 * that is a direct calculation from slip, which is what `project` does. For a
 * DC machine the armature current has to satisfy V = RI + kPhi(I)w, and for
 * series and compound machines flux depends on the very current being solved
 * for, so it is found numerically rather than rearranged.
 */
export function steadyStateAt<P extends object>(motor: Motor<P>, parameters: P, omega: number): MotorState {
  // Induction machines fix rotor current algebraically from slip.
  if (motor.project) return motor.project({ omega, current: 0 }, parameters)

  // Otherwise find the current at which dI/dt vanishes. The residual falls as
  // current rises (more resistive drop, more back EMF), so it is bracketed and
  // bisected rather than iterated, which stays stable even where flux saturates.
  const rate = (current: number) => motor.derivatives({ omega, current }, parameters).current

  let low = -1
  let high = 1
  for (let i = 0; i < 60 && rate(low) < 0; i++) low *= 2
  for (let i = 0; i < 60 && rate(high) > 0; i++) high *= 2
  if (rate(low) < 0 || rate(high) > 0) return { omega, current: 0 }

  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2
    if (rate(mid) > 0) low = mid
    else high = mid
  }
  return { omega, current: (low + high) / 2 }
}

export type CurveOptions = {
  /** Highest speed to plot, rpm. */
  maxSpeed: number
  /** How many samples across the range. */
  points?: number
}

/**
 * Torque against speed, from standstill up to `maxSpeed`.
 *
 * Every point is an independent equilibrium, not a trajectory: this is the
 * characteristic the machine offers, and where it actually sits is wherever
 * that curve meets the load.
 */
export function torqueSpeedCurve<P extends object>(
  motor: Motor<P>,
  parameters: P,
  { maxSpeed, points = 160 }: CurveOptions,
): CurvePoint[] {
  const curve: CurvePoint[] = []
  for (let i = 0; i <= points; i++) {
    const speed = (maxSpeed * i) / points
    const state = steadyStateAt(motor, parameters, toRadPerSecond(speed))
    const outputs = motor.outputs(state, parameters)
    curve.push({ speed, torque: outputs.torque, current: outputs.lineCurrent })
  }
  return curve
}

/**
 * The speed at which the machine develops no net shaft torque, rpm.
 *
 * With nothing coupled to it, a machine accelerates until what it develops is
 * entirely consumed by its own friction and windage. For an induction machine
 * that is just below synchronous speed; for a shunt machine just below the
 * ideal no-load speed; for a series machine it is the runaway speed, which is
 * finite only because friction rises with speed.
 *
 * Net shaft torque is read as shaft power over speed, so this needs nothing
 * from a machine beyond the common outputs every motor already reports.
 */
export function noLoadSpeed<P extends object>(motor: Motor<P>, parameters: P): number {
  const netTorque = (omega: number) => {
    const state = steadyStateAt(motor, parameters, omega)
    return motor.outputs(state, parameters).shaftPower / omega
  }

  let low = toRadPerSecond(1)
  if (netTorque(low) <= 0) return toRpm(low)

  let high = toRadPerSecond(100)
  for (let i = 0; i < 40 && netTorque(high) > 0; i++) high *= 2
  if (netTorque(high) > 0) return toRpm(high)

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    if (netTorque(mid) > 0) low = mid
    else high = mid
  }
  return toRpm((low + high) / 2)
}

/**
 * A stable upper speed for plotting.
 *
 * Derived from the parameters rather than from the live operating point, so the
 * axis holds still while the machine runs.
 */
export function suggestedMaxSpeed<P extends object>(motor: Motor<P>, parameters: P): number {
  return Math.max(noLoadSpeed(motor, parameters) * 1.08, 1)
}

/**
 * The speed at which the characteristic crosses a constant load torque.
 *
 * Returned in rpm, or null where the curve never reaches the load, which is the
 * honest answer for a machine that cannot start against it.
 */
export function operatingSpeed(curve: CurvePoint[], loadTorque: number): number | null {
  for (let i = 1; i < curve.length; i++) {
    const previous = curve[i - 1]
    const current = curve[i]
    const before = previous.torque - loadTorque
    const after = current.torque - loadTorque
    if (before === 0) return previous.speed
    if (before > 0 && after <= 0) {
      const t = before / (before - after)
      return previous.speed + t * (current.speed - previous.speed)
    }
  }
  return null
}

