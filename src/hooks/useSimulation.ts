import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { AnyMotor, MotorParameters } from '../motors'
import { SimulationEngine } from '../simulation/SimulationEngine'
import type { MotorOutputs } from '../simulation/State'

/**
 * How often the numeric readouts refresh, Hz.
 *
 * The canvas animates at full frame rate by sampling the engine directly. Text
 * does not need to, and re-rendering React sixty times a second to move a digit
 * is wasted work.
 */
const readoutHz = 12

export type Simulation = {
  /** Outputs for display. Derived during render, so it is never stale. */
  outputs: MotorOutputs
  /** Current outputs on demand, straight from the engine. For animation. */
  sample: () => MotorOutputs
  /** Simulated seconds since the machine was last reset. */
  elapsed: number
  reset: () => void
  /** Jump straight to the steady state, skipping the transient. */
  settle: () => void
}

/**
 * Drives a motor model from React without letting the simulation's step size
 * become a function of the browser's frame rate; the engine handles that.
 *
 * Outputs are computed during render rather than kept in state. The engine is a
 * mutable object that React does not own, so the hook re-renders on a counter
 * and reads through, which keeps a parameter change visible immediately without
 * a second render pass to catch up.
 */
export function useSimulation(motor: AnyMotor, parameters: MotorParameters, running: boolean): Simulation {
  // A new engine whenever the machine changes, which starts it from rest.
  const engine = useMemo(() => new SimulationEngine(motor), [motor])
  const [, refresh] = useReducer((count: number) => count + 1, 0)

  // Parameter changes apply to the running machine without disturbing its
  // state, so a load step is a step rather than a restart.
  useEffect(() => {
    engine.setParameters(parameters)
  }, [engine, parameters])

  useEffect(() => {
    if (!running) return
    let frame = 0
    let previous = performance.now()
    let lastRefresh = previous
    const tick = (now: number) => {
      engine.advance((now - previous) / 1000)
      previous = now
      if (now - lastRefresh >= 1000 / readoutHz) {
        lastRefresh = now
        refresh()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [engine, running, refresh])

  const sample = useCallback(() => engine.outputs(), [engine])

  const reset = useCallback(() => {
    engine.reset()
    refresh()
  }, [engine, refresh])

  const settle = useCallback(() => {
    engine.settle()
    refresh()
  }, [engine, refresh])

  // Read through to the engine, using the parameters this render was given
  // rather than the ones the effect above has applied, which lands one render
  // later.
  return { outputs: motor.outputs(engine.state, parameters), sample, elapsed: engine.time, reset, settle }
}
