import type { MotorKind } from '../motors/Motor'
import type { MotorOutputs } from '../simulation/State'

type Props = {
  kind: MotorKind
  outputs: MotorOutputs
  /** Terminal voltage, V. Taken from the parameters rather than inferred. */
  supplyVoltage: number
  /** Component ids the diagram may draw. Construction mode narrows this. */
  visible: ReadonlySet<string>
  accent: string
  /** Whether current is shown flowing. */
  animated: boolean
}

/**
 * The electrical view of the machine.
 *
 * Spec section 18 names p5 for visualization, but this is drawn in SVG. A
 * schematic is fixed topology with labels rather than an animation: SVG keeps
 * the lines crisp at any size, makes the text real text, and animates current
 * with a dash offset. The p5 sketch remains the magnetic and mechanical view.
 *
 * What it is for: section 10 asks for current paths, voltage polarity, winding
 * connections, brushes and commutator, and section 9 explains the series motor
 * purely as a change of current path. None of that is visible in a magnetic
 * view, so the DC construction sequences need this.
 */
export function CircuitDiagram({ kind, outputs, supplyVoltage, visible, accent, animated }: Props) {
  return (
    <section className="panel">
      <h2 className="panel-title">
        Circuit
        <span className="panel-meta">{kind === 'induction' ? 'three-phase' : 'dc'}</span>
      </h2>
      <svg className="circuit" viewBox="0 0 640 290" role="img" aria-label="Circuit diagram">
        {kind === 'induction' ? (
          <InductionCircuit
            outputs={outputs}
            supplyVoltage={supplyVoltage}
            visible={visible}
            accent={accent}
            animated={animated}
          />
        ) : (
          <DCCircuit
            kind={kind}
            outputs={outputs}
            supplyVoltage={supplyVoltage}
            visible={visible}
            accent={accent}
            animated={animated}
          />
        )}
      </svg>
    </section>
  )
}

/* ---------- shared pieces ---------- */

/**
 * A length of wire, optionally carrying current.
 *
 * Drawn twice: a dull solid line for the conductor, and a moving dashed line on
 * top for the current in it. Animation speed follows the current, so a machine
 * drawing 5 A visibly differs from one drawing 80 A.
 */
function Wire({ d, current = 0, accent, animated }: { d: string; current?: number; accent: string; animated: boolean }) {
  const magnitude = Math.abs(current)
  const live = animated && magnitude > 0.05
  // Faster at higher current, but clamped so it never becomes a blur.
  const duration = Math.max(0.25, 3 / Math.max(magnitude, 0.5))
  return (
    <>
      <path d={d} className="wire" />
      {live ? (
        <path
          d={d}
          className="wire-current"
          style={{
            stroke: accent,
            animationDuration: `${duration}s`,
            animationDirection: current < 0 ? 'reverse' : 'normal',
            opacity: Math.min(0.35 + magnitude / 30, 1),
          }}
        />
      ) : null}
    </>
  )
}

/** A winding, drawn as loops along a line. */
function Coil({
  x,
  y,
  length,
  vertical = false,
  label,
}: {
  x: number
  y: number
  length: number
  vertical?: boolean
  label: string
}) {
  const bump = 9
  const count = Math.floor(length / (bump * 2))
  const arcs = Array.from({ length: count }, () =>
    vertical ? `a ${bump},${bump} 0 0 1 0,${bump * 2}` : `a ${bump},${bump} 0 0 1 ${bump * 2},0`,
  ).join(' ')
  return (
    <g>
      <path d={`M${x},${y} ${arcs}`} className="coil" />
      <text
        x={vertical ? x + 20 : x + length / 2}
        y={vertical ? y + length / 2 : y - 18}
        className={vertical ? 'circuit-label' : 'circuit-label middle'}
      >
        {label}
      </text>
    </g>
  )
}

/** The armature: a rotating winding reached through brushes on a commutator. */
function Armature({
  cx,
  cy,
  outputs,
  visible,
}: {
  cx: number
  cy: number
  outputs: MotorOutputs
  visible: ReadonlySet<string>
}) {
  const r = 34
  const showBrushes = visible.has('brushes')
  const showCommutator = visible.has('commutator')
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="armature" />
      {showCommutator ? (
        <>
          <circle cx={cx} cy={cy} r={13} className="commutator" />
          <line x1={cx} y1={cy - 13} x2={cx} y2={cy + 13} className="commutator-gap" />
        </>
      ) : null}
      {showBrushes ? (
        <>
          <rect x={cx - r - 11} y={cy - 9} width={9} height={18} rx={2} className="brush" />
          <rect x={cx + r + 2} y={cy - 9} width={9} height={18} rx={2} className="brush" />
        </>
      ) : null}
      <text x={cx} y={cy + r + 20} className="circuit-label middle">
        Armature
      </text>
      <text x={cx} y={cy + r + 34} className="circuit-value middle">
        E = {outputs.backEmf.toFixed(0)} V
      </text>
    </g>
  )
}

/** The supply, with its polarity marked. */
function Supply({ x, top, bottom, volts }: { x: number; top: number; bottom: number; volts: number }) {
  const mid = (top + bottom) / 2
  return (
    <g>
      <line x1={x - 14} y1={mid - 11} x2={x + 14} y2={mid - 11} className="cell-long" />
      <line x1={x - 7} y1={mid - 3} x2={x + 7} y2={mid - 3} className="cell-short" />
      <line x1={x - 14} y1={mid + 5} x2={x + 14} y2={mid + 5} className="cell-long" />
      <line x1={x - 7} y1={mid + 13} x2={x + 7} y2={mid + 13} className="cell-short" />
      <text x={x - 24} y={top + 16} className="circuit-polarity">
        +
      </text>
      <text x={x - 24} y={bottom - 6} className="circuit-polarity">
        −
      </text>
      <text x={x} y={bottom + 22} className="circuit-value middle">
        {volts.toFixed(0)} V
      </text>
    </g>
  )
}

/* ---------- DC machines ---------- */

function DCCircuit({
  kind,
  outputs,
  supplyVoltage,
  visible,
  accent,
  animated,
}: {
  kind: MotorKind
  outputs: MotorOutputs
  supplyVoltage: number
  visible: ReadonlySet<string>
  accent: string
  animated: boolean
}) {
  const top = 60
  const bottom = 240
  const supplyX = 70
  const armatureX = kind === 'compound' ? 500 : 460
  const armatureY = (top + bottom) / 2

  const series = kind === 'series' || kind === 'compound'
  const shunt = kind === 'shunt' || kind === 'compound'
  const showField = visible.has('field-winding') || visible.has('stator-windings')
  const showArmature = visible.has('armature') || visible.has('rotor')

  // Where the series field sits in the main line, before the armature.
  const seriesX = 210
  const seriesLength = 72
  // Where a shunt field taps across the supply.
  const shuntX = kind === 'compound' ? 380 : 260

  const wires: { d: string; current: number }[] = []

  // Top rail, broken where the series field interrupts it.
  if (series && showField) {
    wires.push({ d: `M${supplyX},${top} H${seriesX}`, current: outputs.lineCurrent })
    wires.push({ d: `M${seriesX + seriesLength},${top} H${armatureX}`, current: outputs.lineCurrent })
  } else {
    wires.push({ d: `M${supplyX},${top} H${armatureX}`, current: outputs.lineCurrent })
  }

  // Down into the armature and back out to the bottom rail.
  if (showArmature) {
    wires.push({ d: `M${armatureX},${top} V${armatureY - 34}`, current: outputs.armatureCurrent })
    wires.push({ d: `M${armatureX},${armatureY + 34} V${bottom}`, current: outputs.armatureCurrent })
  }
  wires.push({ d: `M${supplyX},${bottom} H${armatureX}`, current: outputs.lineCurrent })

  // The shunt field's own path across the supply.
  if (shunt && showField) {
    wires.push({ d: `M${shuntX},${top} V${top + 34}`, current: outputs.fieldCurrent })
    wires.push({ d: `M${shuntX},${bottom - 34} V${bottom}`, current: outputs.fieldCurrent })
  }

  return (
    <g>
      {wires.map((wire) => (
        <Wire key={wire.d} d={wire.d} current={wire.current} accent={accent} animated={animated} />
      ))}

      <Supply x={supplyX} top={top} bottom={bottom} volts={supplyVoltage} />

      {series && showField ? (
        <Coil x={seriesX} y={top} length={seriesLength} label="Series field" />
      ) : null}

      {shunt && showField ? (
        <>
          <Coil x={shuntX} y={top + 34} length={bottom - top - 68} vertical label="Shunt field" />
          <text x={shuntX + 20} y={bottom - 30} className="circuit-value">
            {outputs.fieldCurrent.toFixed(2)} A
          </text>
        </>
      ) : null}

      {showArmature ? <Armature cx={armatureX} cy={armatureY} outputs={outputs} visible={visible} /> : null}

      <text x={supplyX + 40} y={top - 14} className="circuit-value">
        I = {outputs.lineCurrent.toFixed(1)} A
      </text>

      {kind === 'series' ? (
        <text x={320} y={bottom + 34} className="circuit-note middle">
          One path: supply → field → armature → return. Field current is the armature current.
        </text>
      ) : null}
      {kind === 'shunt' ? (
        <text x={320} y={bottom + 34} className="circuit-note middle">
          Two paths. The field has its own, so flux barely moves when the load does.
        </text>
      ) : null}
      {kind === 'compound' ? (
        <text x={320} y={bottom + 34} className="circuit-note middle">
          Both fields at once: one carries the load current, one does not.
        </text>
      ) : null}
    </g>
  )
}

/* ---------- induction machine ---------- */

function InductionCircuit({
  outputs,
  supplyVoltage,
  visible,
  accent,
  animated,
}: {
  outputs: MotorOutputs
  supplyVoltage: number
  visible: ReadonlySet<string>
  accent: string
  animated: boolean
}) {
  const phases = [
    { label: 'A', y: 70, colour: '#4ee1df' },
    { label: 'B', y: 140, colour: '#f7b955' },
    { label: 'C', y: 210, colour: '#ff708e' },
  ]
  const coilX = 210
  const coilLength = 72
  const starX = 360
  const showWindings = visible.has('stator-windings')
  const showCage = visible.has('squirrel-cage') || visible.has('rotor')
  const cageLive = visible.has('rotor-current')

  return (
    <g>
      {phases.map((phase) => (
        <g key={phase.label}>
          <text x={36} y={phase.y + 4} className="circuit-label end">
            {phase.label}
          </text>
          <Wire
            d={`M46,${phase.y} H${coilX}`}
            current={showWindings ? outputs.lineCurrent : 0}
            accent={phase.colour}
            animated={animated}
          />
          {showWindings ? (
            <>
              <Coil x={coilX} y={phase.y} length={coilLength} label="" />
              <Wire
                d={`M${coilX + coilLength},${phase.y} H${starX}`}
                current={outputs.lineCurrent}
                accent={phase.colour}
                animated={animated}
              />
            </>
          ) : null}
        </g>
      ))}

      {showWindings ? (
        <>
          <path d={`M${starX},70 V210`} className="wire" />
          <circle cx={starX} cy={140} r={4} className="node" />
          <text x={starX + 12} y={144} className="circuit-label">
            Star point
          </text>
          <text x={128} y={36} className="circuit-value middle">
            {supplyVoltage.toFixed(0)} V line, {outputs.lineCurrent.toFixed(1)} A per phase
          </text>
        </>
      ) : null}

      {/* The air gap, drawn as a real break, because the absence of a
          connection to the rotor is the point of the machine. */}
      <line x1={430} y1={40} x2={430} y2={250} className="air-gap" />
      <text x={430} y={32} className="circuit-label middle">
        air gap
      </text>

      {showCage ? (
        <g>
          <rect x={462} y={70} width={140} height={140} rx={8} className="cage" />
          {[0, 1, 2, 3, 4].map((index) => {
            const x = 482 + index * 25
            return (
              <Wire
                key={x}
                d={`M${x},78 V202`}
                current={cageLive ? outputs.armatureCurrent : 0}
                accent={accent}
                animated={animated}
              />
            )
          })}
          <path d="M482,78 H582" className="wire" />
          <path d="M482,202 H582" className="wire" />
          <text x={532} y={234} className="circuit-label middle">
            Squirrel cage
          </text>
          <text x={532} y={248} className="circuit-value middle">
            {cageLive ? `${outputs.armatureCurrent.toFixed(1)} A induced` : 'no connection'}
          </text>
        </g>
      ) : null}

      <text x={320} y={278} className="circuit-note middle">
        Nothing crosses the gap. Rotor current is induced, never supplied.
      </text>
    </g>
  )
}
