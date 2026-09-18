import type { StepEquation } from '../construction'
import { Equation } from './Equation'

type Props = {
  title?: string
  /** A single expression with no commentary, as the lab shows it. */
  expression?: string
  /** Expressions with their plain-language readings, as a construction step shows them. */
  equations?: readonly StepEquation[]
}

export function EquationPanel({ title = 'Relationships', expression, equations }: Props) {
  if (!expression && !equations?.length) return null

  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      {expression ? <Equation expression={expression} /> : null}
      {equations?.map((equation) => (
        <div key={equation.expression} className="equation-block">
          <Equation expression={equation.expression} />
          <p className="equation-meaning">{equation.meaning}</p>
        </div>
      ))}
    </section>
  )
}
