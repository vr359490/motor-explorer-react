import { phaseOrder, stepAt, type ConstructionSequence, type PhaseName } from '../construction'

type Props = {
  sequence: ConstructionSequence
  stepIndex: number
  phase: PhaseName
  onStepChange: (index: number) => void
  onPhaseChange: (phase: PhaseName) => void
}

const phaseLabel: Record<PhaseName, string> = {
  introduction: 'What is it',
  contribution: 'What it does',
  integration: 'How it fits',
}

export function ConstructionPanel({ sequence, stepIndex, phase, onStepChange, onPhaseChange }: Props) {
  const step = stepAt(sequence, stepIndex)
  if (!step) return null

  const total = sequence.steps.length
  const body = step[phase]
  const phasePosition = phaseOrder.indexOf(phase)

  /** Advance through the three phases first, then on to the next step. */
  const next = () => {
    if (phasePosition < phaseOrder.length - 1) onPhaseChange(phaseOrder[phasePosition + 1])
    else if (stepIndex < total) {
      onStepChange(stepIndex + 1)
      onPhaseChange('introduction')
    }
  }

  const previous = () => {
    if (phasePosition > 0) onPhaseChange(phaseOrder[phasePosition - 1])
    else if (stepIndex > 1) {
      onStepChange(stepIndex - 1)
      onPhaseChange('integration')
    }
  }

  const atStart = stepIndex === 1 && phasePosition === 0
  const atEnd = stepIndex === total && phasePosition === phaseOrder.length - 1

  return (
    <section className="panel construction">
      <h2 className="panel-title">
        Step {stepIndex} of {total}
        <span className="panel-meta">{step.component.nature}</span>
      </h2>

      <h3 className="construction-title">{step.title}</h3>

      <ol className="step-track" aria-label="Construction steps">
        {sequence.steps.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={entry.index === stepIndex ? 'step-pip active' : entry.index < stepIndex ? 'step-pip done' : 'step-pip'}
              aria-label={`Step ${entry.index}: ${entry.title}`}
              aria-current={entry.index === stepIndex}
              onClick={() => {
                onStepChange(entry.index)
                onPhaseChange('introduction')
              }}
            />
          </li>
        ))}
      </ol>

      <div className="phase-tabs" role="tablist" aria-label="Phase">
        {phaseOrder.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={name === phase}
            className={name === phase ? 'phase-tab active' : 'phase-tab'}
            onClick={() => onPhaseChange(name)}
          >
            {phaseLabel[name]}
          </button>
        ))}
      </div>

      {phase === 'introduction' ? (
        <dl className="component-facts">
          <div>
            <dt>Component</dt>
            <dd>{step.component.name}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{step.component.location}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{step.component.purpose}</dd>
          </div>
        </dl>
      ) : null}

      <p className="phase-body">{body.body}</p>

      {body.chain ? (
        <ol className="chain">
          {body.chain.map((link) => (
            <li key={link}>{link}</li>
          ))}
        </ol>
      ) : null}

      {body.action ? <p className="phase-action">{body.action}</p> : null}

      {step.interaction ? <p className="phase-prompt">{step.interaction.prompt}</p> : null}

      <div className="step-nav">
        <button type="button" onClick={previous} disabled={atStart}>
          Back
        </button>
        <button type="button" className="primary" onClick={next} disabled={atEnd}>
          {phasePosition < phaseOrder.length - 1 ? 'Continue' : 'Next step'}
        </button>
      </div>
    </section>
  )
}
