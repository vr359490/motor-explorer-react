import type { AnyMotor, MotorParameters } from '../motors'

type Props = {
  motor: AnyMotor
  parameters: MotorParameters
  onChange: (key: string, value: number | string) => void
  /**
   * When present, only these keys may be moved. Construction mode uses it so a
   * step offers exactly the controls its lesson is about.
   */
  enabled?: readonly string[]
}

export function ParameterPanel({ motor, parameters, onChange, enabled }: Props) {
  const allowed = (key: string) => !enabled || enabled.includes(key)

  return (
    <section className="panel">
      <h2 className="panel-title">Parameters</h2>

      <div className="controls">
        {motor.controls.map((control) => {
          const value = Number(parameters[control.key] ?? 0)
          const disabled = !allowed(control.key)
          return (
            <label key={control.key} className={disabled ? 'control disabled' : 'control'}>
              <span className="control-head">
                <span className="control-label">{control.label}</span>
                <output className="control-value">
                  {formatValue(value, control.step)}
                  {control.unit ? <span className="control-unit"> {control.unit}</span> : null}
                </output>
              </span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(control.key, Number(event.target.value))}
              />
              <span className="control-hint">{control.description}</span>
            </label>
          )
        })}

        {motor.options?.map((option) => (
          <div key={option.key} className={allowed(option.key) ? 'control' : 'control disabled'}>
            <span className="control-head">
              <span className="control-label">{option.label}</span>
            </span>
            <div className="segmented" role="group" aria-label={option.label}>
              {option.choices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={parameters[option.key] === choice.value ? 'segment active' : 'segment'}
                  disabled={!allowed(option.key)}
                  onClick={() => onChange(option.key, choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <span className="control-hint">{option.description}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Show as many decimals as the control's step implies, and no more. */
function formatValue(value: number, step: number) {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2
  return value.toFixed(decimals)
}
