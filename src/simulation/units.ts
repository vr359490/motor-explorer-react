/** Unit conversions and small numeric helpers shared by the simulation layer. */

const RPM_PER_RAD_PER_S = 60 / (2 * Math.PI)

/** Angular velocity in rad/s to shaft speed in rpm. */
export const toRpm = (radiansPerSecond: number) => radiansPerSecond * RPM_PER_RAD_PER_S

/** Shaft speed in rpm to angular velocity in rad/s. */
export const toRadPerSecond = (rpm: number) => rpm / RPM_PER_RAD_PER_S

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/**
 * Synchronous speed in rpm, n_s = 120f / P.
 *
 * This is the textbook form the application quotes to the user, so it is kept
 * here verbatim rather than folded into the induction motor's internals.
 */
export const synchronousSpeedRpm = (frequency: number, poles: number) => (120 * frequency) / poles

/** Synchronous angular velocity in rad/s, which is 4Pi f / P. */
export const synchronousOmega = (frequency: number, poles: number) => (4 * Math.PI * frequency) / poles

/** Slip, s = (n_s - n_r) / n_s. Works in any consistent speed unit. */
export const slipFrom = (synchronous: number, rotor: number) =>
  synchronous === 0 ? 0 : (synchronous - rotor) / synchronous
