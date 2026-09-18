import type { MotorState } from './State'

/** Time derivative of each state variable, evaluated at a point in the trajectory. */
export type Derivative = (state: MotorState, time: number) => MotorState

export type Solver = (state: MotorState, time: number, dt: number, f: Derivative) => MotorState

/** state + rate * dt, componentwise. */
const advance = (base: MotorState, rate: MotorState, dt: number): MotorState => ({
  omega: base.omega + rate.omega * dt,
  current: base.current + rate.current * dt,
})

/**
 * Forward Euler. Kept because it is the method the user is most likely to have
 * seen, which makes it useful for showing why step size matters.
 */
export const euler: Solver = (state, time, dt, f) => advance(state, f(state, time), dt)

/**
 * Classical fourth-order Runge-Kutta, the default.
 *
 * A DC machine's electrical time constant (L_A / R_A, a few milliseconds) is far
 * shorter than its mechanical one (J / B, often seconds). Euler needs a very
 * small step to stay stable across that spread; RK4 tolerates a step roughly an
 * order of magnitude larger for the same accuracy.
 */
export const rk4: Solver = (state, time, dt, f) => {
  const half = dt / 2
  const k1 = f(state, time)
  const k2 = f(advance(state, k1, half), time + half)
  const k3 = f(advance(state, k2, half), time + half)
  const k4 = f(advance(state, k3, dt), time + dt)
  return {
    omega: state.omega + (dt / 6) * (k1.omega + 2 * k2.omega + 2 * k3.omega + k4.omega),
    current: state.current + (dt / 6) * (k1.current + 2 * k2.current + 2 * k3.current + k4.current),
  }
}
