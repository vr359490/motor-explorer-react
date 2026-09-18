import { useCallback, useMemo, useState } from 'react'
import './App.css'
import { CircuitDiagram } from './components/CircuitDiagram'
import { ConstructionPanel } from './components/ConstructionPanel'
import { CurvePlot } from './components/CurvePlot'
import { EquationPanel } from './components/EquationPanel'
import { MotorSelector } from './components/MotorSelector'
import { MotorSketch } from './components/MotorSketch'
import { allVisible, motorAccent } from './components/motorTheme'
import { ParameterPanel } from './components/ParameterPanel'
import { ReadoutPanel } from './components/ReadoutPanel'
import { componentsActiveAt, constructionSequences, stepAt, type PhaseName } from './construction'
import { useSimulation } from './hooks/useSimulation'
import { motorRegistry, type MotorParameters } from './motors'
import type { MotorKind } from './motors/Motor'

type Mode = 'lab' | 'construction'
type StageView = 'machine' | 'circuit'

export default function App() {
  const [kind, setKind] = useState<MotorKind>('induction')
  const [mode, setMode] = useState<Mode>('construction')
  const [running, setRunning] = useState(true)
  const [stepIndex, setStepIndex] = useState(1)
  const [phase, setPhase] = useState<PhaseName>('introduction')
  const [stageView, setStageView] = useState<StageView>('machine')

  const motor = motorRegistry[kind]
  const sequence = constructionSequences[kind]
  const accent = motorAccent[kind]

  const [parameters, setParameters] = useState<MotorParameters>(() => ({ ...motor.defaultParameters }))

  // Each machine has its own parameters, so switching motors starts fresh
  // rather than carrying a stale value into a control that does not exist.
  // Done here, in the event that causes it, so kind and parameters always
  // change in the same render and never disagree.
  const selectMotor = useCallback((next: MotorKind) => {
    setKind(next)
    setParameters({ ...motorRegistry[next].defaultParameters })
    setStepIndex(1)
    setPhase('introduction')
  }, [])

  // Only induction has a construction sequence so far; fall back to the lab.
  const effectiveMode: Mode = sequence ? mode : 'lab'
  const step = sequence ? stepAt(sequence, stepIndex) : undefined

  const construction = effectiveMode === 'construction' && sequence && step
  const visible = construction ? componentsActiveAt(sequence, stepIndex) : allVisible

  // In construction mode the step decides whether the rotor may turn; in the
  // lab the user does.
  const rotorRunning = construction ? step.visualization.rotorFree : running
  const fieldAnimating = construction ? visible.has('rotating-field') : running

  const simulation = useSimulation(motor, parameters, rotorRunning)

  const onParameterChange = useCallback((key: string, value: number | string) => {
    setParameters((current) => ({ ...current, [key]: value }))
  }, [])

  const enabledParameters = useMemo(
    () => (construction ? (step.interaction?.parameters ?? []) : undefined),
    [construction, step],
  )

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark" style={{ background: accent }} />
          <h1>Motor Explorer</h1>
        </div>

        <div className="mode-switch" role="group" aria-label="Mode">
          <button
            type="button"
            className={effectiveMode === 'construction' ? 'mode active' : 'mode'}
            disabled={!sequence}
            title={sequence ? undefined : 'No construction sequence for this machine yet'}
            onClick={() => setMode('construction')}
          >
            Construction
          </button>
          <button
            type="button"
            className={effectiveMode === 'lab' ? 'mode active' : 'mode'}
            onClick={() => setMode('lab')}
          >
            Laboratory
          </button>
        </div>
      </header>

      <MotorSelector selected={kind} onSelect={selectMotor} />

      <p className="motor-description">{motor.description}</p>

      <main className="layout">
        <aside className="column">
          {construction ? (
            <ConstructionPanel
              sequence={sequence}
              stepIndex={stepIndex}
              phase={phase}
              onStepChange={setStepIndex}
              onPhaseChange={setPhase}
            />
          ) : (
            <section className="panel">
              <h2 className="panel-title">
                Simulation
                <span className="panel-meta">{running ? 'running' : 'paused'}</span>
              </h2>
              <div className="step-nav">
                <button type="button" className="primary" onClick={() => setRunning((value) => !value)}>
                  {running ? 'Pause' : 'Run'}
                </button>
                <button type="button" onClick={simulation.reset}>
                  Reset
                </button>
                <button type="button" onClick={simulation.settle} title="Jump to the steady state">
                  Settle
                </button>
              </div>
              <p className="phase-body">
                Move a control and watch the machine find a new operating point. Reset returns it to
                standstill so you can see it start.
              </p>
            </section>
          )}

          <ParameterPanel
            motor={motor}
            parameters={parameters}
            onChange={onParameterChange}
            enabled={enabledParameters}
          />
        </aside>

        <div className="column stage">
          <div className="stage-tabs" role="group" aria-label="View">
            <button
              type="button"
              className={stageView === 'machine' ? 'stage-tab active' : 'stage-tab'}
              onClick={() => setStageView('machine')}
            >
              Machine
            </button>
            <button
              type="button"
              className={stageView === 'circuit' ? 'stage-tab active' : 'stage-tab'}
              onClick={() => setStageView('circuit')}
            >
              Circuit
            </button>
          </div>

          {stageView === 'machine' ? (
            <MotorSketch
              kind={kind}
              sample={simulation.sample}
              visible={visible}
              running={rotorRunning}
              fieldAnimating={fieldAnimating}
              accent={accent}
            />
          ) : (
            <CircuitDiagram
              kind={kind}
              outputs={simulation.outputs}
              supplyVoltage={Number(parameters.supplyVoltage ?? 0)}
              visible={visible}
              accent={accent}
              animated={rotorRunning || fieldAnimating}
            />
          )}

          <ReadoutPanel kind={kind} outputs={simulation.outputs} elapsed={simulation.elapsed} />

          {construction ? (
            <EquationPanel title="Relationships" equations={step.equations} />
          ) : (
            <>
              <CurvePlot
                motor={motor}
                parameters={parameters}
                outputs={simulation.outputs}
                accent={accent}
              />
              <EquationPanel title="Relationships" expression={motor.equation} />
            </>
          )}
        </div>
      </main>

      <footer className="disclaimer">
        Simplified educational models. Not suitable for equipment selection or design.
      </footer>
    </div>
  )
}
