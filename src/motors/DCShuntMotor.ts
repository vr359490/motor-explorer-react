import type { ParameterDescriptor } from '../simulation/Parameters'
import { DCMotor, dcMechanicalDefaults, type DCParameters } from './DCMotor'
import type { MotorKind } from './Motor'

export type ShuntParameters = DCParameters & {
  /** Shunt field winding resistance, Ω. */
  fieldResistance: number
  /** Field rheostat setting, per unit of rated flux. */
  fieldStrength: number
}

/**
 * DC shunt motor.
 *
 * The field winding sits across the supply on its own current path, so flux is
 * essentially independent of load. Speed then depends only on how much back EMF
 * the machine needs to produce, and it changes very little as load moves.
 *
 * Simplification: the field is modelled as separately excited, so flux follows
 * the rheostat setting alone and does not rise with supply voltage. A real
 * shunt field would draw more current at higher voltage, but its iron saturates,
 * so flux rises far less than proportionally. Modelling that coupling properly
 * needs the saturation work listed for Phase 2; until then, holding flux
 * independent keeps the voltage control meaningful and the speed equation
 * honest.
 */
export class DCShuntMotor extends DCMotor<ShuntParameters> {
  readonly kind: MotorKind = 'shunt'
  readonly label = 'DC shunt motor'
  readonly description =
    'A parallel field holds flux nearly steady, so the machine keeps close to one speed as load changes.'
  readonly equation = 'I_A = \\frac{V - k\\Phi\\omega}{R_A} \\qquad T_e = k\\Phi I_A'

  readonly defaultParameters: ShuntParameters = {
    ...dcMechanicalDefaults,
    supplyVoltage: 240,
    armatureResistance: 0.5,
    armatureInductance: 0.02,
    machineConstant: 1.25,
    fieldResistance: 120,
    fieldStrength: 1,
  }

  readonly controls: readonly ParameterDescriptor<ShuntParameters>[] = [
    {
      key: 'supplyVoltage',
      label: 'Supply voltage',
      unit: 'V',
      min: 60,
      max: 280,
      step: 1,
      description: 'Sets the speed the machine settles at, because back EMF must rise to meet it.',
    },
    {
      key: 'loadTorque',
      label: 'Mechanical load',
      unit: 'N·m',
      min: 0,
      max: 30,
      step: 0.1,
      description: 'Watch how little the speed moves, and how much the armature current does.',
    },
    {
      key: 'fieldStrength',
      label: 'Field strength',
      unit: 'pu',
      min: 0.5,
      max: 1.25,
      step: 0.01,
      description: 'Weakening the field raises speed and lowers torque per amp.',
    },
    {
      key: 'armatureResistance',
      label: 'Armature resistance',
      unit: 'Ω',
      min: 0.2,
      max: 1.5,
      step: 0.01,
      description: 'Larger resistance means a bigger voltage drop and more droop under load.',
    },
  ]

  protected flux(_current: number, parameters: ShuntParameters) {
    return parameters.fieldStrength
  }

  protected fieldCurrent(parameters: ShuntParameters) {
    return parameters.supplyVoltage / parameters.fieldResistance
  }

  protected circuitResistance(parameters: ShuntParameters) {
    return parameters.armatureResistance
  }

  protected circuitInductance(parameters: ShuntParameters) {
    return parameters.armatureInductance
  }
}

export const shuntMotor = new DCShuntMotor()
