import type { MotorKind } from '../motors/Motor'
import type { MotorOutputs } from '../simulation/State'

type Props = {
  kind: MotorKind
  outputs: MotorOutputs
  elapsed: number
}

export function ReadoutPanel({ kind, outputs, elapsed }: Props) {
  const induction = kind === 'induction'

  const rows: { label: string; value: string; unit: string }[] = [
    { label: 'Speed', value: outputs.speed.toFixed(0), unit: 'rpm' },
    {
      label: induction ? 'Synchronous speed' : 'No-load speed',
      value: outputs.synchronousSpeed.toFixed(0),
      unit: 'rpm',
    },
    { label: 'Torque', value: outputs.torque.toFixed(1), unit: 'N·m' },
    { label: 'Line current', value: outputs.lineCurrent.toFixed(1), unit: 'A' },
    {
      label: induction ? 'Rotor current' : 'Armature current',
      value: outputs.armatureCurrent.toFixed(1),
      unit: 'A',
    },
    { label: 'Flux', value: outputs.flux.toFixed(2), unit: 'pu' },
    {
      label: induction ? 'Air-gap EMF' : 'Back EMF',
      value: outputs.backEmf.toFixed(1),
      unit: 'V',
    },
    { label: 'Shaft power', value: (outputs.shaftPower / 1000).toFixed(2), unit: 'kW' },
    { label: 'Efficiency', value: outputs.efficiency.toFixed(0), unit: '%' },
  ]

  if (induction) rows.splice(2, 0, { label: 'Slip', value: (outputs.slip * 100).toFixed(2), unit: '%' })
  if (!induction && outputs.fieldCurrent > 0) {
    rows.splice(5, 0, { label: 'Field current', value: outputs.fieldCurrent.toFixed(2), unit: 'A' })
  }

  return (
    <section className="panel">
      <h2 className="panel-title">
        Machine state
        <span className="panel-meta">t = {elapsed.toFixed(2)} s</span>
      </h2>
      <dl className="readout">
        {rows.map((row) => (
          <div key={row.label} className="readout-row">
            <dt>{row.label}</dt>
            <dd>
              <span className="readout-value">{row.value}</span>
              <span className="readout-unit">{row.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
