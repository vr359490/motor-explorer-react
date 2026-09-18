import type { ParameterDescriptor } from '../simulation/Parameters'
import { DCMotor, dcMechanicalDefaults, saturatingFlux, type DCParameters } from './DCMotor'
import type { MotorKind } from './Motor'

export type SeriesParameters = DCParameters & {
  /** Series field winding resistance, Ω. */
  seriesFieldResistance: number
  /** Series field winding inductance, H. */
  seriesFieldInductance: number
  /** Flux the magnetic circuit approaches once fully saturated, per unit. */
  saturationFlux: number
  /** Armature current at which the magnetic circuit begins to saturate, A. */
  saturationCurrent: number
}

/**
 * DC series motor.
 *
 * Field and armature carry the same current, so flux grows with load. Below
 * saturation Φ ∝ I_A, and since T = kΦI_A the torque goes as the square of
 * current. That is the whole explanation for the starting torque.
 *
 * The same relationship running backwards is why a series motor must not be
 * left unloaded: as load falls, current and flux fall with it, and the speed
 * needed to generate back EMF climbs sharply. The model shows this rather than
 * preventing it, so the behaviour can be demonstrated.
 */
export class DCSeriesMotor extends DCMotor<SeriesParameters> {
  readonly kind: MotorKind = 'series'
  readonly label = 'DC series motor'
  readonly description =
    'Field and armature share one current path, which produces exceptional starting torque and a speed that depends strongly on load.'
  readonly equation = '\\Phi \\propto I_A \\qquad T_e = k\\Phi I_A \\propto I_A^2'

  readonly defaultParameters: SeriesParameters = {
    ...dcMechanicalDefaults,
    loadTorque: 14,
    supplyVoltage: 240,
    armatureResistance: 0.4,
    armatureInductance: 0.02,
    machineConstant: 1.25,
    seriesFieldResistance: 0.2,
    seriesFieldInductance: 0.03,
    saturationFlux: 1.2,
    saturationCurrent: 18,
  }

  readonly controls: readonly ParameterDescriptor<SeriesParameters>[] = [
    {
      key: 'supplyVoltage',
      label: 'Supply voltage',
      unit: 'V',
      min: 60,
      max: 280,
      step: 1,
      description: 'Raises current, flux, and torque together.',
    },
    {
      key: 'loadTorque',
      label: 'Mechanical load',
      unit: 'N·m',
      min: 0.5,
      max: 40,
      step: 0.1,
      description: 'Take the load close to zero and watch the speed climb away.',
    },
    {
      key: 'saturationCurrent',
      label: 'Saturation knee',
      unit: 'A',
      min: 8,
      max: 40,
      step: 0.5,
      description: 'Where flux stops following current, and T ∝ I² stops holding.',
    },
    {
      key: 'armatureResistance',
      label: 'Armature resistance',
      unit: 'Ω',
      min: 0.1,
      max: 1.5,
      step: 0.01,
      description: 'Limits the current the machine draws at standstill.',
    },
  ]

  protected flux(current: number, parameters: SeriesParameters) {
    // tanh is odd, so reversing the supply reverses flux and current together
    // and the torque comes out positive either way. A series motor really does
    // turn the same direction on either polarity.
    return saturatingFlux(current, parameters.saturationCurrent, parameters.saturationFlux)
  }

  protected fieldCurrent() {
    return 0
  }

  protected circuitResistance(parameters: SeriesParameters) {
    return parameters.armatureResistance + parameters.seriesFieldResistance
  }

  protected circuitInductance(parameters: SeriesParameters) {
    return parameters.armatureInductance + parameters.seriesFieldInductance
  }
}

export const seriesMotor = new DCSeriesMotor()
