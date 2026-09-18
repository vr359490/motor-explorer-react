/**
 * Descriptors let a motor publish which of its parameters a user may move, and
 * within what range, without the interface needing to know anything about the
 * machine. Ranges are constrained to physically meaningful values.
 */
export type ParameterDescriptor<P> = {
  key: Extract<keyof P, string>
  label: string
  /** Display unit. Empty for dimensionless quantities such as pole count. */
  unit: string
  min: number
  max: number
  step: number
  /** What moving this control demonstrates. */
  description: string
}

/** A parameter chosen from a fixed set rather than a range, such as a winding connection. */
export type OptionDescriptor<P> = {
  key: Extract<keyof P, string>
  label: string
  choices: readonly { value: string; label: string }[]
  description: string
}

/** Mechanical parameters every machine in the application shares. */
export type MechanicalParameters = {
  /** Mechanical load opposing the rotor, N·m. */
  loadTorque: number
  /** Rotor moment of inertia, kg·m². Sets how quickly the machine accelerates. */
  inertia: number
  /** Viscous friction and windage coefficient, N·m·s. */
  viscousFriction: number
}
