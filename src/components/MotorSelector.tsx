import { motorRegistry } from '../motors'
import type { MotorKind } from '../motors/Motor'
import { motorAccent } from './motorTheme'

type Props = {
  selected: MotorKind
  onSelect: (kind: MotorKind) => void
}

const order: MotorKind[] = ['shunt', 'series', 'compound', 'induction']

export function MotorSelector({ selected, onSelect }: Props) {
  return (
    <nav className="selector" aria-label="Motor type">
      {order.map((kind) => {
        const motor = motorRegistry[kind]
        const active = kind === selected
        return (
          <button
            key={kind}
            type="button"
            className={active ? 'selector-item active' : 'selector-item'}
            style={active ? { borderColor: motorAccent[kind], color: motorAccent[kind] } : undefined}
            aria-current={active}
            onClick={() => onSelect(kind)}
          >
            <span className="selector-dot" style={{ background: motorAccent[kind] }} />
            {motor.label}
          </button>
        )
      })}
    </nav>
  )
}
