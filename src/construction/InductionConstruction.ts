import type { ConstructionSequence } from './ConstructionStep'

/**
 * Building a three-phase squirrel-cage induction motor, one piece at a time.
 *
 * The spec describes this sequence in three places that do not quite agree:
 * section 5 lists seven generic steps, section 7 gives eight and folds the
 * squirrel cage into the rotor step, and section 28 names eight but ends at
 * torque rather than load. This sequence is the union of the three: the cage
 * gets its own step, because the bars and end rings being a closed circuit with
 * no external connection is the point on which the whole machine turns, and
 * load stays as the final step, because the causal chain it produces is what
 * the section 29 success criteria actually ask the user to be able to recite.
 */
export const inductionConstruction: ConstructionSequence = {
  motor: 'induction',
  title: 'Building a three-phase induction motor',
  summary:
    'Nothing in this machine is connected to the rotor. Everything the rotor does, it does because the stator field is moving past it.',
  steps: [
    {
      id: 'stator',
      index: 1,
      title: 'The stator',
      component: {
        id: 'stator',
        name: 'Stator',
        nature: 'physical',
        location: 'The stationary outer ring of the machine.',
        purpose: 'Carries the windings and provides a low-reluctance path for the magnetic field.',
      },
      requires: [],
      activates: ['stator'],
      introduction: {
        body:
          'Start with the part that never moves. The stator is a ring of laminated steel with slots cut around its inner face. The laminations are stacked and insulated from one another, which is why it is built from sheets rather than a solid block.',
        highlight: ['stator'],
      },
      contribution: {
        body:
          'Steel carries magnetic field far more readily than air does, so the stator decides where the field can go. The slots are where the windings will sit, and the thin air gap at the centre is the only place the field has to cross.',
        highlight: ['stator'],
        action: 'Look at the slots. Nothing is in them yet.',
      },
      integration: {
        body:
          'On its own the stator does nothing at all. It is the magnetic environment everything else will operate inside.',
        highlight: ['stator'],
      },
      equations: [],
      visualization: { scene: 'stator-only', overlays: [], rotorFree: false },
    },

    {
      id: 'stator-windings',
      index: 2,
      title: 'The stator windings',
      component: {
        id: 'stator-windings',
        name: 'Three-phase stator windings',
        nature: 'physical',
        location: 'Seated in the stator slots, in three groups spaced 120 degrees apart.',
        purpose: 'Carry the three supply currents that together produce a moving magnetic field.',
      },
      requires: ['stator'],
      activates: ['stator-windings'],
      introduction: {
        body:
          'Three separate windings go into the slots, spaced a third of the way around from each other. They are usually called phases A, B and C. Each one, by itself, is an ordinary electromagnet.',
        highlight: ['stator-windings'],
      },
      contribution: {
        body:
          'Energise one winding and it produces a field pointing in one fixed direction, growing and shrinking and reversing as its current alternates. It pulses, but it does not go anywhere. One winding alone cannot make anything rotate.',
        highlight: ['stator-windings'],
        action: 'Energise phase A alone and watch its field pulse in place.',
      },
      integration: {
        body:
          'Now supply all three, from a three-phase supply where each current peaks a third of a cycle after the one before it. Three stationary pulsing fields, offset in space and offset in time, are about to add up to something none of them does alone.',
        highlight: ['stator', 'stator-windings'],
        chain: [
          'Phase A peaks, and the field points towards winding A',
          'A third of a cycle later, phase B peaks',
          'The combined field now points towards winding B',
          'Then phase C, and the field points there instead',
          'The peak has moved around the stator without anything moving',
        ],
      },
      equations: [
        {
          expression: 'i_A = I\\cos(\\omega t) \\quad i_B = I\\cos(\\omega t - 120^\\circ) \\quad i_C = I\\cos(\\omega t - 240^\\circ)',
          meaning: 'Three currents of the same size, each a third of a cycle behind the last.',
        },
      ],
      visualization: { scene: 'stator-windings', overlays: ['phase-currents'], rotorFree: false },
    },

    {
      id: 'rotating-field',
      index: 3,
      title: 'The rotating magnetic field',
      component: {
        id: 'rotating-field',
        name: 'Rotating magnetic field',
        nature: 'phenomenon',
        location: 'In the air gap, sweeping around the inside of the stator.',
        purpose: 'Provides the moving magnetic field everything else in the machine responds to.',
      },
      requires: ['stator', 'stator-windings'],
      activates: ['rotating-field'],
      introduction: {
        body:
          'The three pulsing fields add to one field of nearly constant strength that sweeps steadily around the stator. This is the central idea of the machine, and it is worth being clear about what is happening: no part of the stator is moving. Only the field is.',
        highlight: ['rotating-field'],
      },
      contribution: {
        body:
          'Its speed is set by two things only: how fast the supply alternates, and how many magnetic poles the windings are arranged into. It is not set by anything mechanical, which is why it is called the synchronous speed.',
        highlight: ['rotating-field'],
        action: 'Change the frequency and the pole count, and watch the field speed change.',
      },
      integration: {
        body:
          'There is now a magnetic field sweeping around an empty air gap at a speed you control. Nothing is there to notice it yet.',
        highlight: ['stator', 'stator-windings', 'rotating-field'],
      },
      equations: [
        {
          expression: 'n_s = \\frac{120f}{P}',
          meaning:
            'Synchronous speed in rpm, from supply frequency and pole count. Doubling the poles halves the speed.',
        },
      ],
      interaction: {
        parameters: ['frequency', 'poles'],
        prompt: 'Halve the frequency, then double the pole count. Both halve the speed of the field, for different reasons.',
        simulate: false,
      },
      visualization: { scene: 'stator-windings', overlays: ['rotating-field'], rotorFree: false },
    },

    {
      id: 'rotor',
      index: 4,
      title: 'The rotor',
      component: {
        id: 'rotor',
        name: 'Rotor',
        nature: 'physical',
        location: 'Inside the stator, separated from it by a small air gap.',
        purpose: 'The rotating member, carrying the conductors in which current will be induced.',
      },
      requires: ['stator', 'rotating-field'],
      activates: ['rotor'],
      introduction: {
        body:
          'Place a laminated steel cylinder in the middle, mounted on the shaft, with a small air gap between it and the stator. For now, hold it still.',
        highlight: ['rotor'],
      },
      contribution: {
        body:
          'Notice what is not here. There are no brushes, no slip rings, and no wires running to the rotor from anywhere. It has no electrical connection to the supply or to anything else.',
        highlight: ['rotor'],
        action: 'Look for a connection to the rotor. There is not one.',
      },
      integration: {
        body:
          'The rotor now sits inside a field that is sweeping past it. That raises the question the rest of the sequence answers: how does a part with no electrical connection end up carrying current?',
        highlight: ['rotor', 'rotating-field'],
      },
      equations: [],
      visualization: { scene: 'stator-and-rotor', overlays: ['rotating-field'], rotorFree: false },
    },

    {
      id: 'squirrel-cage',
      index: 5,
      title: 'The squirrel cage',
      component: {
        id: 'squirrel-cage',
        name: 'Squirrel-cage winding',
        nature: 'physical',
        location: 'Conducting bars running the length of the rotor, joined at both ends by rings.',
        purpose: 'Forms closed conducting loops in which the stator field can drive a current.',
      },
      requires: ['rotor'],
      activates: ['squirrel-cage'],
      introduction: {
        body:
          'Set conducting bars into slots along the rotor, running parallel to the shaft, and join every bar to every other at both ends with a solid ring. Stripped of its steel, the shape is a cage, which is where the name comes from.',
        highlight: ['squirrel-cage'],
      },
      contribution: {
        body:
          'Each bar, the end rings, and the bar on the far side together make a closed loop. The loop is complete, it has very low resistance, and it is not connected to anything outside the rotor. A current can circulate in it, but only something inside the machine can start one.',
        highlight: ['squirrel-cage'],
        action: 'Trace one loop: up a bar, round the end ring, back down the opposite bar.',
      },
      integration: {
        body:
          'The rotor is now a set of closed circuits sitting in a moving magnetic field. Every condition needed to induce a current is in place.',
        highlight: ['rotor', 'squirrel-cage', 'rotating-field'],
      },
      equations: [],
      visualization: { scene: 'squirrel-cage', overlays: ['rotating-field'], rotorFree: false },
    },

    {
      id: 'rotor-current',
      index: 6,
      title: 'Induced rotor current',
      component: {
        id: 'rotor-current',
        name: 'Induced rotor current',
        nature: 'phenomenon',
        location: 'Circulating in the cage bars and end rings.',
        purpose: 'Supplies the current that the magnetic field will push on to make torque.',
      },
      requires: ['rotating-field', 'squirrel-cage'],
      activates: ['rotor-current'],
      introduction: {
        body:
          'Release the field and hold the rotor still. The field sweeps past the bars, so the flux through each cage loop is changing, and a changing flux through a closed loop drives a current around it. The rotor is now carrying current that no one connected to it.',
        highlight: ['rotor-current'],
      },
      contribution: {
        body:
          'What matters is not the speed of the field on its own but the speed of the field relative to the bars. Hold the rotor still and that difference is the full synchronous speed, so the induced EMF is at its largest and the rotor current is very high.',
        highlight: ['rotor-current', 'rotating-field'],
        chain: [
          'The field sweeps past a cage loop',
          'The flux through that loop changes',
          'An EMF is induced around the loop',
          'The loop is closed, so a current flows',
          'The current is largest when the relative speed is largest',
        ],
      },
      integration: {
        body:
          'Two things now exist in the same air gap: a magnetic field from the stator, and a current in the rotor that the field itself created. They are about to act on each other.',
        highlight: ['rotating-field', 'squirrel-cage', 'rotor-current'],
      },
      equations: [
        {
          expression: 'e = -N\\frac{d\\Phi}{dt}',
          meaning: 'A changing flux through a loop induces an EMF around it. The faster the change, the larger the EMF.',
        },
        {
          expression: 'I_R = \\frac{sE}{\\sqrt{R_R^2 + (sX_R)^2}}',
          meaning: 'Rotor current rises with relative speed, limited by the resistance and reactance of the cage.',
        },
      ],
      visualization: { scene: 'squirrel-cage', overlays: ['rotating-field', 'rotor-current'], rotorFree: false },
    },

    {
      id: 'slip',
      index: 7,
      title: 'Slip',
      component: {
        id: 'slip',
        name: 'Slip',
        nature: 'phenomenon',
        location: 'The difference between the speed of the field and the speed of the rotor.',
        purpose: 'The relative motion that keeps rotor current, and therefore torque, being produced.',
      },
      requires: ['rotating-field', 'rotor', 'rotor-current'],
      activates: ['slip'],
      introduction: {
        body:
          'Let the rotor turn. As it speeds up it chases the field, and the difference between the two shrinks. That difference, measured as a fraction of synchronous speed, is called slip.',
        highlight: ['slip'],
      },
      contribution: {
        body:
          'Now follow it to its conclusion. If the rotor ever reached synchronous speed, the field would no longer be moving past the bars at all. The flux through each loop would stop changing, the induced EMF would fall to zero, the rotor current would disappear, and there would be no torque to hold the rotor there. It would immediately fall back.',
        highlight: ['slip', 'rotor-current'],
        chain: [
          'The rotor accelerates towards synchronous speed',
          'The relative speed between field and bars falls',
          'The induced EMF falls with it',
          'Rotor current falls, and so does torque',
          'The rotor settles just below synchronous speed, where torque matches load',
        ],
      },
      integration: {
        body:
          'This is why an induction motor is called asynchronous. It never runs at the speed of its own field, and it cannot, because the gap between them is the very thing producing its torque.',
        highlight: ['rotating-field', 'rotor', 'slip'],
      },
      equations: [
        {
          expression: 's = \\frac{n_s - n_r}{n_s}',
          meaning: 'Slip as a fraction of synchronous speed. It is 1 at standstill and would be 0 at synchronous speed.',
        },
      ],
      interaction: {
        parameters: ['loadTorque'],
        prompt: 'Lower the load towards zero. Slip gets very small, but watch it never quite reach zero.',
        simulate: true,
      },
      visualization: { scene: 'squirrel-cage', overlays: ['rotating-field', 'rotor-current', 'slip'], rotorFree: true },
    },

    {
      id: 'torque',
      index: 8,
      title: 'Torque',
      component: {
        id: 'torque',
        name: 'Electromagnetic torque',
        nature: 'phenomenon',
        location: 'On the cage bars, transmitted through the rotor to the shaft.',
        purpose: 'Turns the shaft, and balances whatever load is applied to it.',
      },
      requires: ['rotating-field', 'rotor-current', 'slip'],
      activates: ['torque'],
      introduction: {
        body:
          'A current-carrying conductor in a magnetic field has a force on it. Every cage bar is carrying induced current, and every cage bar is sitting in the stator field, so every bar has a force on it. Acting at a radius from the shaft, those forces are a torque.',
        highlight: ['torque'],
      },
      contribution: {
        body:
          'The direction is worth checking, because it is not arbitrary. The force always acts to drag the rotor along in the direction the field is sweeping, which is to say it acts to reduce the relative motion that caused it. The machine is trying to eliminate the very condition it needs.',
        highlight: ['torque', 'rotor-current'],
        action: 'Raise the supply voltage and watch how sharply torque responds.',
      },
      integration: {
        body:
          'The whole machine is now present and doing what it was built to do. The field is made by the stator, the current in the rotor is made by the field, and the torque is made by the two acting together.',
        highlight: ['rotating-field', 'rotor-current', 'slip', 'torque'],
        chain: [
          'The stator windings make a rotating field',
          'Relative motion induces current in the cage',
          'Field and rotor current produce force on each bar',
          'The forces add to a torque on the shaft',
          'The rotor turns',
        ],
      },
      equations: [
        {
          expression: 'F = BIl',
          meaning: 'Force on one bar, from the field it sits in and the current it carries.',
        },
        {
          expression: 'T_e \\propto \\frac{s}{R_R^2 + (sX_R)^2}',
          meaning:
            'Torque against slip. It rises from zero, peaks where rotor resistance and reactance match, then falls away again.',
        },
      ],
      interaction: {
        parameters: ['supplyVoltage'],
        prompt: 'Halve the supply voltage. Torque falls to a quarter, because it follows the square of the voltage.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['rotating-field', 'rotor-current', 'slip', 'torque'],
        rotorFree: true,
      },
    },

    {
      id: 'load',
      index: 9,
      title: 'Applying a load',
      component: {
        id: 'mechanical-load',
        name: 'Mechanical load',
        nature: 'physical',
        location: 'Coupled to the shaft.',
        purpose: 'Opposes the rotor, and forces the machine to find a new operating point.',
      },
      requires: ['torque', 'slip'],
      activates: ['mechanical-load'],
      introduction: {
        body:
          'Couple something to the shaft that resists being turned. The motor is running, so the first thing that happens is that it slows down slightly.',
        highlight: ['mechanical-load'],
      },
      contribution: {
        body:
          'Follow what that small loss of speed sets off. The machine is not deciding to produce more torque. Each step forces the next, and the result is that it does.',
        highlight: ['mechanical-load', 'slip', 'rotor-current', 'torque'],
        chain: [
          'Load torque increases',
          'The rotor slows slightly',
          'Slip increases',
          'Relative motion past the bars increases',
          'Induced EMF and rotor current increase',
          'Electromagnetic torque increases',
          'The rotor settles at a new speed where torque matches the load again',
        ],
      },
      integration: {
        body:
          'That chain is the machine regulating itself, and every link in it is something introduced earlier in this sequence. Nothing new was needed to explain it.',
        highlight: ['rotating-field', 'rotor-current', 'slip', 'torque', 'mechanical-load'],
      },
      equations: [
        {
          expression: 'T_L \\uparrow \\;\\Rightarrow\\; n_r \\downarrow \\;\\Rightarrow\\; s \\uparrow \\;\\Rightarrow\\; I_R \\uparrow \\;\\Rightarrow\\; T_e \\uparrow',
          meaning: 'The load response, as a chain. Each increase is forced by the one before it.',
        },
      ],
      interaction: {
        parameters: ['loadTorque'],
        prompt: 'Step the load up and watch speed, slip, rotor current and torque settle in that order.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['rotating-field', 'rotor-current', 'slip', 'torque', 'load'],
        rotorFree: true,
      },
    },
  ],
}
