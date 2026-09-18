/**
 * The simulation state is deliberately tiny: two numbers that evolve in time.
 * Everything the user is shown is derived from these plus the motor parameters,
 * which keeps the physics layer independent of any visualization.
 */
export type MotorState = {
  /** Rotor angular velocity, rad/s. Negative values mean reverse rotation. */
  omega: number
  /**
   * Armature current for DC machines, A.
   *
   * DC machines integrate this through their armature inductance. Induction
   * machines have no armature circuit to integrate, so they carry their rotor
   * current here and write it algebraically after each step; see
   * `Motor.project`.
   */
  current: number
}

/** Everything an interface, plot, or animation might want to display. */
export type MotorOutputs = {
  /** Rotor speed, rpm. */
  speed: number
  /** Rotor angular velocity, rad/s. */
  omega: number
  /** Electromagnetic torque developed by the machine, N·m. */
  torque: number
  /** Mechanical load opposing the rotor, N·m. */
  loadTorque: number
  /** Current drawn from the supply, A. */
  lineCurrent: number
  /** Armature current for DC machines, rotor current for induction machines, A. */
  armatureCurrent: number
  /** Current in a separately-fed field winding, A. Zero where there is none. */
  fieldCurrent: number
  /** Air-gap flux, per unit of the machine's rated flux. */
  flux: number
  /** Back EMF for DC machines, air-gap EMF per phase for induction machines, V. */
  backEmf: number
  /** Mechanical power delivered at the shaft, W. */
  shaftPower: number
  /** Electrical power drawn from the supply, W. */
  inputPower: number
  /** Shaft power as a percentage of input power. */
  efficiency: number
  /**
   * Reference speed the rotor is measured against, rpm: ideal no-load speed for
   * DC machines, synchronous speed for induction machines.
   */
  synchronousSpeed: number
  /** Slip. Always zero for DC machines, which have no slip. */
  slip: number
}
