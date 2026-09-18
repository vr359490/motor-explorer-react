import type { ConstructionSequence } from './ConstructionStep'
import { dcFoundation } from './DCShuntConstruction'

/**
 * Combining both field connections, following spec section 9.
 *
 * Having seen a field that ignores load and a field that follows it, the
 * compound machine puts one of each on the same poles. The only remaining
 * question is whether they add or oppose, and that single sign is the whole
 * difference between a useful machine and an unstable one.
 */
export const dcCompoundConstruction: ConstructionSequence = {
  motor: 'compound',
  title: 'Combining both fields: the compound motor',
  summary:
    'One field that ignores the load and one that follows it, on the same poles. Everything depends on which way the second one points.',
  steps: [
    {
      id: 'compound-fields',
      index: 1,
      title: 'Two windings on the same poles',
      component: {
        id: 'compound-fields',
        name: 'Compound field windings',
        nature: 'physical',
        location: 'Both wound on the same field poles: many fine turns across the supply, few thick turns in line with the armature.',
        purpose: 'Produces part of the flux regardless of load, and part of it in proportion to load.',
      },
      requires: [],
      activates: ['compound-fields', 'series-field', ...dcFoundation],
      introduction: {
        body:
          'Take the same machine again and wind both fields onto the poles at once: the shunt winding across the supply, and the series winding in line with the armature. Neither is new. You have already built each of them separately.',
        highlight: ['compound-fields'],
      },
      contribution: {
        body:
          'The shunt winding produces flux that depends only on the supply. The series winding adds flux that depends on how hard the machine is working. The total flux in the air gap is whatever the two of them come to together.',
        highlight: ['compound-fields', 'field-flux'],
        action: 'Open the Circuit view: one winding across the supply, one in the main line.',
      },
      integration: {
        body:
          'That leaves exactly one thing undecided, and it is not a matter of degree. The series winding can be connected either way round.',
        highlight: ['compound-fields', 'series-field'],
      },
      equations: [
        {
          expression: '\\Phi = \\Phi_{sh} \\pm \\Phi_{se}(I_A)',
          meaning: 'Total flux is the steady part plus or minus the load-dependent part.',
        },
      ],
      visualization: { scene: 'complete', overlays: ['field-flux', 'armature-current'], rotorFree: true },
    },

    {
      id: 'cumulative',
      index: 2,
      title: 'Cumulative: the fields add',
      component: {
        id: 'cumulative',
        name: 'Cumulative connection',
        nature: 'phenomenon',
        location: 'In the sign of the series winding relative to the shunt winding.',
        purpose: 'Gives the machine some of the series motor’s pulling power without its runaway.',
      },
      requires: ['compound-fields'],
      activates: ['cumulative'],
      introduction: {
        body:
          'Connect the series winding so that its flux points the same way as the shunt winding’s. Now load current strengthens the field rather than leaving it alone.',
        highlight: ['cumulative'],
      },
      contribution: {
        body:
          'Under load the machine behaves partly like a series motor: more current means more flux means more torque per amp than a shunt machine would manage. It also droops further, because a stronger field needs less speed to generate the same back EMF.',
        highlight: ['cumulative', 'field-flux'],
        chain: [
          'Load increases',
          'Armature current rises',
          'Series flux rises and adds to the shunt flux',
          'Torque per amp increases',
          'Speed falls further than a shunt machine would',
        ],
      },
      integration: {
        body:
          'Crucially, unloading it does not run it away. The series contribution falls to nothing, but the shunt winding is still there holding a floor under the flux. That floor is exactly what the series motor lacked.',
        highlight: ['cumulative', 'compound-fields'],
      },
      equations: [
        {
          expression: '\\Phi = \\Phi_{sh} + \\Phi_{se}(I_A)',
          meaning: 'The load-dependent flux reinforces the steady flux.',
        },
      ],
      interaction: {
        parameters: ['seriesFluxContribution', 'loadTorque'],
        prompt: 'Increase the series field and load the machine. Compare the droop with the shunt motor.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'torque'],
        rotorFree: true,
      },
    },

    {
      id: 'differential',
      index: 3,
      title: 'Differential: the fields oppose',
      component: {
        id: 'differential',
        name: 'Differential connection',
        nature: 'phenomenon',
        location: 'The same winding, reversed.',
        purpose: 'Shows why the other connection is the one that gets used.',
      },
      requires: ['cumulative'],
      activates: ['differential'],
      introduction: {
        body:
          'Reverse the series winding. Its flux now opposes the shunt winding’s, so load current weakens the field instead of strengthening it.',
        highlight: ['differential'],
      },
      contribution: {
        body:
          'Follow it through and the result is genuinely strange: load the machine and it can speed up. A weaker field means less back EMF at a given speed, so the machine turns faster to compensate. For a narrow range this looks like the flat speed characteristic an engineer might want.',
        highlight: ['differential', 'back-emf'],
        chain: [
          'Load increases',
          'Armature current rises',
          'Series flux rises but subtracts from the shunt flux',
          'Total flux falls',
          'Less back EMF at the same speed, so the machine speeds up',
          'Which it cannot keep doing indefinitely',
        ],
      },
      integration: {
        body:
          'It cannot keep doing it because the effect feeds itself. Weaker flux means less torque per amp, so more current is needed, which weakens the flux further. Under heavy load the field can collapse towards nothing and the machine loses control of itself. The simulation will show this rather than protect you from it; that is the behaviour, not a fault.',
        highlight: ['differential'],
        action: 'Switch the connection to differential and load it heavily.',
      },
      equations: [
        {
          expression: '\\Phi = \\Phi_{sh} - \\Phi_{se}(I_A)',
          meaning: 'The load-dependent flux fights the steady flux, and can overcome it.',
        },
      ],
      interaction: {
        parameters: ['connection', 'loadTorque'],
        prompt: 'Toggle between the two connections under the same load and watch the speed move opposite ways.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'back-emf'],
        rotorFree: true,
      },
    },

    {
      id: 'character',
      index: 4,
      title: 'Where the compound motor sits',
      component: {
        id: 'compound-character',
        name: 'Compound characteristic',
        nature: 'phenomenon',
        location: 'Between the shunt and series characteristics.',
        purpose: 'Places the machine among the others you have built.',
      },
      requires: ['cumulative', 'differential'],
      activates: ['compound-character'],
      introduction: {
        body:
          'Put the three DC machines side by side. A shunt motor holds its speed and starts modestly. A series motor starts magnificently and will not hold any speed at all. The cumulative compound motor sits between them.',
        highlight: ['compound-character'],
      },
      contribution: {
        body:
          'It gets that position honestly, because it physically contains both machines. How far along the range it sits is set by how much of the flux comes from each winding, which is a design choice rather than a fixed property.',
        highlight: ['compound-character', 'compound-fields'],
        action: 'Take the series field to zero and the machine becomes a shunt motor. Take the shunt field down and it approaches a series motor.',
      },
      integration: {
        body:
          'That is the real lesson of the DC machines: they are not three different inventions. They are one machine with its field connected three ways, and every difference in how they behave follows from where the field current comes from.',
        highlight: ['compound-character', 'field-flux', 'torque'],
      },
      equations: [],
      interaction: {
        parameters: ['shuntFieldStrength', 'seriesFluxContribution'],
        prompt: 'Slide the balance between the two windings and watch the characteristic move between the two machines.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'torque', 'back-emf'],
        rotorFree: true,
      },
    },
  ],
}
