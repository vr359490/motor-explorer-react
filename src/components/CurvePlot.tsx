import { useId, useMemo } from 'react'
import type { AnyMotor, MotorParameters } from '../motors'
import { suggestedMaxSpeed, torqueSpeedCurve } from '../simulation/curves'
import type { MotorOutputs } from '../simulation/State'

type Props = {
  motor: AnyMotor
  parameters: MotorParameters
  outputs: MotorOutputs
  accent: string
}

const width = 640
const height = 250
const pad = { top: 16, right: 16, bottom: 34, left: 48 }
const plotWidth = width - pad.left - pad.right
const plotHeight = height - pad.top - pad.bottom

/**
 * Torque against speed, with the load drawn across it.
 *
 * The characteristic is what the machine can offer at each speed; the load line
 * is what is being asked of it. Where they cross is the operating point, and
 * seeing that crossing move is the clearest way to show why a machine settles
 * where it does.
 */
export function CurvePlot({ motor, parameters, outputs, accent }: Props) {
  const clipId = useId()

  // Recomputed only when the machine or its parameters change, never per frame.
  const { curve, maxSpeed } = useMemo(() => {
    const maxSpeed = suggestedMaxSpeed(motor, parameters)
    return { curve: torqueSpeedCurve(motor, parameters, { maxSpeed }), maxSpeed }
  }, [motor, parameters])

  const loadTorque = outputs.loadTorque

  // A DC machine develops enormous torque at standstill, so plotting the full
  // range would squash the working region into the bottom pixel. The view is
  // framed on where the machine actually operates and the curve is allowed to
  // run off the top, which is labelled rather than hidden.
  const peak = curve.reduce((most, point) => Math.max(most, point.torque), 0)
  const focus = Math.max(loadTorque, outputs.torque, 1)
  const maxTorque = Math.max(Math.min(peak * 1.1, focus * 3.5), focus * 1.4)
  const clipped = peak > maxTorque

  const x = (speed: number) => pad.left + (speed / maxSpeed) * plotWidth
  const y = (torque: number) => pad.top + plotHeight - (torque / maxTorque) * plotHeight

  const path = curve
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.speed).toFixed(2)},${y(point.torque).toFixed(2)}`)
    .join(' ')

  const speedTicks = ticks(maxSpeed, 4)
  const torqueTicks = ticks(maxTorque, 4)

  return (
    <section className="panel">
      <h2 className="panel-title">
        Torque–speed characteristic
        {clipped ? <span className="panel-meta">peak {peak.toFixed(0)} N·m, above view</span> : null}
      </h2>

      <svg className="plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Torque against speed">
        <defs>
          <clipPath id={clipId}>
            <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} />
          </clipPath>
        </defs>

        {torqueTicks.map((value) => (
          <g key={`t${value}`}>
            <line
              x1={pad.left}
              x2={pad.left + plotWidth}
              y1={y(value)}
              y2={y(value)}
              className="plot-grid"
            />
            <text x={pad.left - 8} y={y(value) + 3.5} className="plot-label end">
              {value.toFixed(0)}
            </text>
          </g>
        ))}

        {speedTicks.map((value) => (
          <text key={`s${value}`} x={x(value)} y={height - 14} className="plot-label middle">
            {value.toFixed(0)}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          <path d={path} className="plot-curve" style={{ stroke: accent }} />

          <line
            x1={pad.left}
            x2={pad.left + plotWidth}
            y1={y(loadTorque)}
            y2={y(loadTorque)}
            className="plot-load"
          />

          <circle cx={x(outputs.speed)} cy={y(outputs.torque)} r={5} className="plot-point" />
          <line
            x1={x(outputs.speed)}
            x2={x(outputs.speed)}
            y1={pad.top}
            y2={pad.top + plotHeight}
            className="plot-crosshair"
          />
        </g>

        <line
          x1={pad.left}
          x2={pad.left + plotWidth}
          y1={pad.top + plotHeight}
          y2={pad.top + plotHeight}
          className="plot-axis"
        />
        <text x={pad.left + plotWidth / 2} y={height - 2} className="plot-label middle dim">
          speed (rpm)
        </text>
        <text x={12} y={pad.top + plotHeight / 2} className="plot-label dim vertical">
          torque (N·m)
        </text>
      </svg>

      <ul className="plot-legend">
        <li>
          <span className="swatch" style={{ background: accent }} /> characteristic
        </li>
        <li>
          <span className="swatch dashed" /> load
        </li>
        <li>
          <span className="swatch dot" /> operating point
        </li>
      </ul>
    </section>
  )
}

/** Round tick values that land on something a person would choose. */
function ticks(max: number, count: number): number[] {
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ?? magnitude * 10
  const values: number[] = []
  for (let value = step; value < max; value += step) values.push(value)
  return values
}
