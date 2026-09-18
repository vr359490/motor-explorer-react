import p5 from 'p5'
import { useEffect, useRef } from 'react'
import type { MotorKind } from '../motors/Motor'
import type { MotorOutputs } from '../simulation/State'

type Props = {
  kind: MotorKind
  /** Reads current outputs straight from the engine, once per frame. */
  sample: () => MotorOutputs
  /** Component and overlay ids the sketch may draw. Construction mode narrows this. */
  visible: ReadonlySet<string>
  /** Whether the rotor turns. False while a construction step holds it still. */
  running: boolean
  /**
   * Whether the stator field sweeps. Independent of the rotor, because the
   * field rotates whether or not there is anything inside to notice.
   */
  fieldAnimating: boolean
  accent: string
}

/** Real machine speeds are far too fast to watch, so rotation is slowed to taste. */
const rotationScale = 0.05

const muted = '#5b6b7c'
const panel = '#10202b'

export function MotorSketch({ kind, sample, visible, running, fieldAnimating, accent }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ kind, sample, visible, running, fieldAnimating, accent })

  // Written in an effect, not during render: the sketch reads this from inside
  // p5's own draw loop, which is outside React's render entirely.
  useEffect(() => {
    latest.current = { kind, sample, visible, running, fieldAnimating, accent }
  }, [kind, sample, visible, running, fieldAnimating, accent])

  useEffect(() => {
    const node = host.current
    if (!node) return

    const sketch = new p5((p) => {
      let rotorAngle = 0
      let fieldAngle = 0

      const height = () => 420
      const width = () => node.clientWidth || 640

      p.setup = () => {
        p.createCanvas(width(), height())
        p.pixelDensity(Math.min(window.devicePixelRatio, 2))
        p.textFont('ui-monospace, Consolas, monospace')
      }

      p.windowResized = () => p.resizeCanvas(width(), height())

      p.draw = () => {
        const { kind, sample, visible, running, fieldAnimating, accent } = latest.current
        const out = sample()
        const dt = 1 / 60

        if (running) rotorAngle += out.omega * dt * rotationScale
        if (fieldAnimating) {
          fieldAngle += ((out.synchronousSpeed * 2 * Math.PI) / 60) * dt * rotationScale
        }

        p.clear()
        const cx = p.width / 2
        const cy = p.height / 2
        const r = Math.min(p.width, p.height) * 0.26

        p.push()
        p.translate(cx, cy)

        if (visible.has('stator')) drawStator(p, r, accent)
        if (visible.has('stator-windings')) {
          if (kind === 'induction') drawThreePhaseWindings(p, r, fieldAngle, visible.has('rotating-field'))
          else drawFieldPoles(p, r, out.flux, accent)
        }
        if (visible.has('rotating-field')) drawFieldVector(p, r, fieldAngle)
        if (visible.has('rotor')) drawRotor(p, r, rotorAngle, visible.has('squirrel-cage'), visible.has('rotor-current'), out)
        if (visible.has('torque')) drawTorqueArc(p, r, out)

        p.pop()

        drawLabels(p, cx, cy, r, kind, out, visible)
      }
    }, node)

    return () => sketch.remove()
  }, [])

  return <div className="sketch" ref={host} role="img" aria-label="Animated motor model" />
}

function drawStator(p: p5, r: number, accent: string) {
  p.noFill()
  p.stroke('rgba(120, 160, 185, 0.14)')
  p.strokeWeight(1)
  for (let i = 0; i < 5; i++) p.circle(0, 0, 2 * (r + 34 + i * 10))

  p.fill(panel)
  p.stroke(accent)
  p.strokeWeight(2)
  p.circle(0, 0, 2 * (r + 30))

  p.fill('#0a161e')
  p.noStroke()
  p.circle(0, 0, 2 * (r + 8))

  // Slots around the inner face.
  p.stroke('rgba(120, 160, 185, 0.35)')
  p.strokeWeight(3)
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12
    p.line(Math.cos(a) * (r + 10), Math.sin(a) * (r + 10), Math.cos(a) * (r + 22), Math.sin(a) * (r + 22))
  }
}

const phaseColours = ['#4ee1df', '#f7b955', '#ff708e']

function drawThreePhaseWindings(p: p5, r: number, fieldAngle: number, energised: boolean) {
  for (let phase = 0; phase < 3; phase++) {
    const base = (phase * 2 * Math.PI) / 3
    // Current in each phase peaks a third of a cycle after the last.
    const current = energised ? Math.cos(fieldAngle - base) : 0
    const strength = Math.abs(current)
    p.stroke(phaseColours[phase])
    p.strokeWeight(2 + strength * 5)
    for (const side of [0, Math.PI]) {
      const a = base + side
      p.line(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12), Math.cos(a) * (r + 28), Math.sin(a) * (r + 28))
    }
  }
}

function drawFieldPoles(p: p5, r: number, flux: number, accent: string) {
  // DC machines get two salient poles rather than three-phase windings.
  const strength = Math.min(Math.abs(flux), 1.4)
  p.noStroke()
  for (const side of [0, Math.PI]) {
    p.fill(accent)
    p.push()
    p.rotate(side)
    p.rect(-r * 0.34, -(r + 30), r * 0.68, 22, 4)
    p.pop()
  }
  p.noFill()
  p.stroke(accent)
  p.strokeWeight(1 + strength * 3)
  p.arc(0, 0, 2 * (r + 40), 2 * (r + 40), -0.35 * Math.PI, 0.35 * Math.PI)
  p.arc(0, 0, 2 * (r + 40), 2 * (r + 40), 0.65 * Math.PI, 1.35 * Math.PI)
}

function drawFieldVector(p: p5, r: number, fieldAngle: number) {
  const tip = r + 4
  p.push()
  p.rotate(fieldAngle)
  p.stroke('#7dd3fc')
  p.strokeWeight(3)
  p.line(0, 0, tip, 0)
  p.noStroke()
  p.fill('#7dd3fc')
  p.triangle(tip, 0, tip - 14, -7, tip - 14, 7)
  p.pop()

  p.noFill()
  p.stroke('rgba(125, 211, 252, 0.45)')
  p.strokeWeight(2)
  p.drawingContext.setLineDash([6, 8])
  p.circle(0, 0, 2 * (r + 4))
  p.drawingContext.setLineDash([])
}

function drawRotor(
  p: p5,
  r: number,
  rotorAngle: number,
  cage: boolean,
  current: boolean,
  out: MotorOutputs,
) {
  p.push()
  p.rotate(rotorAngle)

  p.fill('#1b2c3a')
  p.stroke(muted)
  p.strokeWeight(2)
  p.circle(0, 0, r * 1.5)

  if (cage) {
    const bars = 14
    for (let i = 0; i < bars; i++) {
      const a = (i * 2 * Math.PI) / bars
      const x = Math.cos(a) * r * 0.62
      const y = Math.sin(a) * r * 0.62
      if (current) {
        // Induced current is largest where the field sweeps past fastest, so
        // brightness follows slip rather than being constant.
        const intensity = Math.min(Math.abs(out.slip) * 4 + 0.15, 1)
        p.fill(`rgba(255, 210, 120, ${intensity})`)
        p.stroke('#f7b955')
      } else {
        p.fill('#2b3f50')
        p.stroke(muted)
      }
      p.strokeWeight(1)
      p.circle(x, y, 11)
    }
    // End ring.
    p.noFill()
    p.stroke(current ? 'rgba(247, 185, 85, 0.8)' : muted)
    p.strokeWeight(2)
    p.circle(0, 0, r * 1.24)
  } else {
    p.noStroke()
    p.fill('#2b3f50')
    for (let i = 0; i < 4; i++) {
      p.push()
      p.rotate((i * Math.PI) / 2)
      p.rect(-4, -r * 0.6, 8, r * 0.85, 2)
      p.pop()
    }
  }

  p.noStroke()
  p.fill('#8ea3b5')
  p.circle(0, 0, 18)
  p.pop()
}

function drawTorqueArc(p: p5, r: number, out: MotorOutputs) {
  const magnitude = Math.min(Math.abs(out.torque) / 40, 1)
  if (magnitude < 0.01) return
  p.noFill()
  p.stroke('#7ef0a8')
  p.strokeWeight(2 + magnitude * 3)
  const span = 0.15 * Math.PI + magnitude * 0.6 * Math.PI
  p.arc(0, 0, r * 1.05, r * 1.05, -span / 2, span / 2)
  const tipAngle = span / 2
  const tx = Math.cos(tipAngle) * r * 0.525
  const ty = Math.sin(tipAngle) * r * 0.525
  p.noStroke()
  p.fill('#7ef0a8')
  p.push()
  p.translate(tx, ty)
  p.rotate(tipAngle + Math.PI / 2)
  p.triangle(0, 0, -6, -11, 6, -11)
  p.pop()
}

function drawLabels(
  p: p5,
  cx: number,
  cy: number,
  r: number,
  kind: MotorKind,
  out: MotorOutputs,
  visible: ReadonlySet<string>,
) {
  p.noStroke()
  p.textAlign(p.CENTER)
  p.textSize(10)

  if (visible.has('stator')) {
    p.fill(muted)
    p.text('STATOR', cx, cy - r - 52)
  }
  if (visible.has('rotating-field')) {
    p.fill('#7dd3fc')
    p.text(`FIELD  ${out.synchronousSpeed.toFixed(0)} RPM`, cx, cy - r - 38)
  }
  if (visible.has('rotor')) {
    p.fill('#8ea3b5')
    p.text(`ROTOR  ${out.speed.toFixed(0)} RPM`, cx, cy + r + 46)
  }
  if (visible.has('slip') && kind === 'induction') {
    p.fill('#ff9bae')
    p.text(`SLIP  ${(out.slip * 100).toFixed(2)}%`, cx, cy + r + 62)
  }
  if (visible.has('torque')) {
    p.fill('#7ef0a8')
    p.text(`TORQUE  ${out.torque.toFixed(1)} N·m`, cx, cy + r + (kind === 'induction' ? 78 : 62))
  }
}
