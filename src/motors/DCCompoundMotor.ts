import type { OptionDescriptor, ParameterDescriptor } from '../simulation/Parameters'
import { DCMotor, dcMechanicalDefaults, saturatingFlux, type DCParameters } from './DCMotor'
import type { MotorKind } from './Motor'

export type CompoundConnection = 'cumulative' | 'differential'

export type CompoundParameters = DCParameters & {
  fieldResistance: number
  /** Flux contributed by the shunt field alone, per unit. */
  shuntFieldStrength: number
  /** Flux the series field adds once fully saturated, per unit. */
  seriesFluxContribution: number
  saturationCurrent: number
  seriesFieldResistance: number
  seriesFieldInductance: number
  /**
   * Whether the series field aids the shunt field or opposes it:
   * Φ = Φ_sh + Φ_se, or Φ = Φ_sh - Φ_se.
   */
  connection: CompoundConnection
}

/**
 * DC compound motor.
 *
 * Both fields are present at once, so the machine sits between the shunt and
 * series characteristics. The connection decides which way the series field
 * points, and that single sign is the entire difference between the two
 * variants, which is why they are one model with a toggle rather than two
 * classes.
 *
 * Cumulative: the series field aids the shunt field. Load raises flux, so the
 * machine develops more torque per amp than a shunt motor and droops further.
 *
 * Differential: the series field opposes the shunt field. Load weakens flux and
 * the machine can speed up under load, which is unstable and is the reason the
 * connection is rarely used. The model reproduces that instead of hiding it, and
 * will let flux collapse towards zero under heavy load. That is the machine
 * behaving as it should, not a defect.
 */
export class DCCompoundMotor extends DCMotor<CompoundParameters> {
  readonly kind: MotorKind = 'compound'
  readonly label = 'DC compound motor'
  readonly description =
    'A shunt field and a series field act together. Whether they add or oppose changes the character of the machine completely.'
  readonly equation = '\\Phi = \\Phi_{sh} \\pm \\Phi_{se}(I_A) \\qquad T_e = k\\Phi I_A'

  readonly defaultParameters: CompoundParameters = {
    ...dcMechanicalDefaults,
    supplyVoltage: 240,
    armatureResistance: 0.4,
    armatureInductance: 0.02,
    machineConstant: 1.25,
    fieldResistance: 120,
    shuntFieldStrength: 0.75,
    seriesFluxContribution: 0.45,
    saturationCurrent: 18,
    seriesFieldResistance: 0.15,
    seriesFieldInductance: 0.02,
    connection: 'cumulative',
  }

  readonly controls: readonly ParameterDescriptor<CompoundParameters>[] = [
    {
      key: 'supplyVoltage',
      label: 'Supply voltage',
      unit: 'V',
      min: 60,
      max: 280,
      step: 1,
      description: 'Sets the speed the machine works towards.',
    },
    {
      key: 'loadTorque',
      label: 'Mechanical load',
      unit: 'N·m',
      min: 0,
      max: 34,
      step: 0.1,
      description: 'Compare the speed droop against a shunt motor carrying the same load.',
    },
    {
      key: 'shuntFieldStrength',
      label: 'Shunt field',
      unit: 'pu',
      min: 0.3,
      max: 1.1,
      step: 0.01,
      description: 'The flux that is there regardless of load.',
    },
    {
      key: 'seriesFluxContribution',
      label: 'Series field',
      unit: 'pu',
      min: 0,
      max: 0.8,
      step: 0.01,
      description: 'How much flux the load current adds, or removes.',
    },
  ]

  readonly options: readonly OptionDescriptor<CompoundParameters>[] = [
    {
      key: 'connection',
      label: 'Field connection',
      choices: [
        { value: 'cumulative', label: 'Cumulative' },
        { value: 'differential', label: 'Differential' },
      ],
      description: 'Whether the series field aids the shunt field or fights it.',
    },
  ]

  protected flux(current: number, parameters: CompoundParameters) {
    const sign = parameters.connection === 'differential' ? -1 : 1
    const series = saturatingFlux(current, parameters.saturationCurrent, parameters.seriesFluxContribution)
    return parameters.shuntFieldStrength + sign * series
  }

  protected fieldCurrent(parameters: CompoundParameters) {
    return parameters.supplyVoltage / parameters.fieldResistance
  }

  protected circuitResistance(parameters: CompoundParameters) {
    return parameters.armatureResistance + parameters.seriesFieldResistance
  }

  protected circuitInductance(parameters: CompoundParameters) {
    return parameters.armatureInductance + parameters.seriesFieldInductance
  }
}

export const compoundMotor = new DCCompoundMotor()
