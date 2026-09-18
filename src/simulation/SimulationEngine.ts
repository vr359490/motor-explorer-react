import type { Motor } from '../motors/Motor'
import { rk4, type Solver } from './Solver'
import type { MotorOutputs, MotorState } from './State'

export type EngineOptions = {
  /**
   * Fixed internal integration step, seconds.
   *
   * This is independent of how often anything asks the engine to advance. A
   * browser animation frame is about 16 ms, which is far too coarse for a DC
   * machine's few-millisecond electrical time constant, so `advance` subdivides
   * whatever interval it is given into steps no longer than this.
   */
  maxStep: number
  /**
   * Longest interval accepted in a single `advance` call, seconds.
   *
   * Guards against a tab that was backgrounded for a minute returning with an
   * enormous elapsed time and locking the page up while it integrates all of it.
   */
  maxAdvance: number
  solver: Solver
}

export const defaultEngineOptions: EngineOptions = {
  maxStep: 5e-4,
  maxAdvance: 0.1,
  solver: rk4,
}

export type SettleOptions = {
  /** Give up after this much simulated time, seconds. */
  timeout: number
  /** Treat the machine as settled below this angular acceleration, rad/s². */
  omegaTolerance: number
  /** Treat the machine as settled below this rate of current change, A/s. */
  currentTolerance: number
}

const defaultSettleOptions: SettleOptions = {
  timeout: 30,
  omegaTolerance: 1e-3,
  currentTolerance: 1e-2,
}

/**
 * Drives a motor model forward in time.
 *
 * The engine owns time, step size, and integration. The motor owns the physics.
 * Nothing here knows how the result will be displayed.
 */
export class SimulationEngine<P extends object> {
  readonly motor: Motor<P>
  readonly options: EngineOptions
  parameters: P
  state: MotorState
  /** Simulated time since the last reset, seconds. */
  time = 0

  private derivative = (state: MotorState) => this.motor.derivatives(state, this.parameters)

  constructor(motor: Motor<P>, parameters?: Partial<P>, options?: Partial<EngineOptions>) {
    this.motor = motor
    this.options = { ...defaultEngineOptions, ...options }
    this.parameters = { ...motor.defaultParameters, ...parameters }
    this.state = motor.initialState(this.parameters)
  }

  /** Integrate forward by `dt` seconds of simulated time. */
  advance(dt: number): void {
    const span = Math.min(Math.max(dt, 0), this.options.maxAdvance)
    if (span === 0) return
    const steps = Math.ceil(span / this.options.maxStep)
    const h = span / steps
    for (let i = 0; i < steps; i++) {
      this.state = this.options.solver(this.state, this.time, h, this.derivative)
      if (this.motor.project) this.state = this.motor.project(this.state, this.parameters)
      this.time += h
    }
  }

  /**
   * Run until the machine stops changing, then report where it landed.
   *
   * Useful for tests, for torque-speed curves, and for showing an operating
   * point without making the user wait for the transient.
   */
  settle(options?: Partial<SettleOptions>): MotorOutputs {
    const { timeout, omegaTolerance, currentTolerance } = { ...defaultSettleOptions, ...options }
    const deadline = this.time + timeout
    while (this.time < deadline) {
      this.advance(this.options.maxStep)
      const rate = this.motor.derivatives(this.state, this.parameters)
      if (Math.abs(rate.omega) < omegaTolerance && Math.abs(rate.current) < currentTolerance) break
    }
    return this.outputs()
  }

  /** Change parameters without disturbing the state, so load steps stay continuous. */
  setParameters(patch: Partial<P>): void {
    this.parameters = { ...this.parameters, ...patch }
  }

  /** Return to rest, optionally with new parameters. */
  reset(parameters?: Partial<P>): void {
    if (parameters) this.setParameters(parameters)
    this.state = this.motor.initialState(this.parameters)
    this.time = 0
  }

  outputs(): MotorOutputs {
    return this.motor.outputs(this.state, this.parameters)
  }
}

/**
 * Steady-state operating point for a set of parameters, from rest.
 *
 * Convenience wrapper for tests and for plotting characteristic curves.
 */
export const steadyState = <P extends object>(motor: Motor<P>, parameters?: Partial<P>): MotorOutputs =>
  new SimulationEngine(motor, parameters).settle()
