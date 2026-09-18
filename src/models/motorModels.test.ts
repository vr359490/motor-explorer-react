import { describe, expect, it } from 'vitest'
import { calculateMotor, defaultParameters } from './motorModels'

describe('simplified motor models', () => {
  it('keeps a shunt motor close to no-load speed under nominal load', () => {
    const result = calculateMotor('shunt', defaultParameters.shunt)
    expect(result.speed).toBeGreaterThan(1_500)
    expect(result.speed).toBeLessThan(result.synchronousSpeed)
  })
  it('raises induction slip when load rises', () => {
    const light = calculateMotor('induction', { ...defaultParameters.induction, load: 4 })
    const heavy = calculateMotor('induction', { ...defaultParameters.induction, load: 20 })
    expect(heavy.slip).toBeGreaterThan(light.slip)
    expect(heavy.speed).toBeLessThan(light.speed)
  })
  it('predicts higher series-motor speed at low load', () => {
    const lowLoad = calculateMotor('series', { ...defaultParameters.series, load: 1 })
    expect(lowLoad.speed).toBeGreaterThan(calculateMotor('series', defaultParameters.series).speed)
  })
})
