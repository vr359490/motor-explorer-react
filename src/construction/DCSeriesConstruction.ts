import type { ConstructionSequence } from './ConstructionStep'
import { dcFoundation } from './DCShuntConstruction'

/**
 * Turning the DC machine into a series motor, following spec section 9.
 *
 * This sequence deliberately does not rebuild anything. The armature,
 * commutator, brushes and frame are the same parts in the same places; only one
 * wire moves. Everything that makes a series motor behave the way it does
 * follows from that single change, and the point of the sequence is to make
 * that chain of consequences visible.
 */
export const dcSeriesConstruction: ConstructionSequence = {
  motor: 'series',
  title: 'Changing the field connection: the series motor',
  summary:
    'The same machine with one wire moved. Field and armature now share a current, and everything else follows.',
  steps: [
    {
      id: 'series-field',
      index: 1,
      title: 'One path instead of two',
      component: {
        id: 'series-field',
        name: 'Series field winding',
        nature: 'physical',
        location: 'On the same poles, but wired in line with the armature rather than across the supply.',
        purpose: 'Produces the field using the current the armature is already drawing.',
      },
      requires: [],
      activates: ['series-field', ...dcFoundation],
      introduction: {
        body:
          'You already have a working DC machine: frame and poles, armature, commutator, brushes. Keep all of it. Move one connection so the field winding is no longer across the supply but in line with the armature, and rewind it with fewer turns of much thicker wire, because it now has to carry the full armature current.',
        highlight: ['series-field'],
      },
      contribution: {
        body:
          'Trace the circuit and there is only one path: supply, field, armature, return. The same current passes through both. There is no longer a separate field current to speak of, because the field current is the armature current.',
        highlight: ['series-field', 'armature-current'],
        chain: [
          'Supply',
          'Through the series field winding',
          'Through a brush into the armature',
          'Out through the other brush',
          'Back to the supply',
        ],
        action: 'Open the Circuit view and compare it with the shunt machine.',
      },
      integration: {
        body:
          'Nothing else about the machine has changed. Torque is still flux times armature current, and back EMF is still flux times speed. What has changed is that flux is no longer independent of load, and the rest of this sequence is the consequence.',
        highlight: ['series-field', 'field-flux', 'armature-current'],
      },
      equations: [],
      visualization: { scene: 'complete', overlays: ['field-flux', 'armature-current'], rotorFree: true },
    },

    {
      id: 'series-flux',
      index: 2,
      title: 'Flux now follows the load',
      component: {
        id: 'series-flux',
        name: 'Load-dependent flux',
        nature: 'phenomenon',
        location: 'Across the air gap, rising and falling with the armature current.',
        purpose: 'Couples the magnetic field to how hard the machine is working.',
      },
      requires: ['series-field'],
      activates: ['series-flux'],
      introduction: {
        body:
          'In the shunt machine, flux was set by the supply and held nearly constant. Here it is produced by the armature current, so it changes whenever the load does.',
        highlight: ['series-flux'],
      },
      contribution: {
        body:
          'Load the machine and the current rises, so the flux rises with it. Unload it and both fall away together. Below the point where the iron begins to saturate the relationship is very nearly proportional, which is the assumption the next step rests on.',
        highlight: ['series-flux', 'armature-current'],
        action: 'Move the load and watch flux track the current rather than sitting still.',
      },
      integration: {
        body:
          'The two quantities that multiply to make torque are no longer independent. They now rise and fall together, and that is what gives this machine its character.',
        highlight: ['series-flux', 'field-flux'],
      },
      equations: [
        {
          expression: '\\Phi \\propto I_A',
          meaning: 'Below saturation, flux follows armature current almost proportionally.',
        },
      ],
      interaction: {
        parameters: ['loadTorque'],
        prompt: 'Raise the load and watch the flux readout climb with the current.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'series-flux'],
        rotorFree: true,
      },
    },

    {
      id: 'square-law',
      index: 3,
      title: 'Torque against the square of current',
      component: {
        id: 'square-law-torque',
        name: 'Square-law torque',
        nature: 'phenomenon',
        location: 'In the product of flux and current, both of which now rise together.',
        purpose: 'Explains why this machine develops so much more torque as it is pushed harder.',
      },
      requires: ['series-flux'],
      activates: ['square-law-torque'],
      introduction: {
        body:
          'Torque has not changed its definition. It is still flux times armature current. What has changed is that flux is now proportional to that same current, so substituting one into the other gives a square rather than a straight line.',
        highlight: ['square-law-torque'],
      },
      contribution: {
        body:
          'Double the current in a shunt machine and torque doubles, because flux did not move. Double it here and torque roughly quadruples, because both terms in the product doubled. The whole reputation of the series motor comes from this one substitution.',
        highlight: ['square-law-torque', 'series-flux'],
        chain: [
          'Torque is flux times armature current',
          'Flux is itself proportional to armature current',
          'So torque goes as current squared',
          'Doubling the current roughly quadruples the torque',
        ],
      },
      integration: {
        body:
          'The relationship does not hold forever. As current rises the iron saturates, flux stops following it, and torque falls back towards being merely proportional to current. The square law is a low-current approximation, not a law of the machine.',
        highlight: ['square-law-torque'],
        action: 'Move the saturation knee and watch where the curve stops bending.',
      },
      equations: [
        {
          expression: 'T_e = k\\Phi I_A \\quad\\text{and}\\quad \\Phi \\propto I_A \\;\\Rightarrow\\; T_e \\propto I_A^2',
          meaning: 'Two proportionalities multiplied. This is the entire derivation.',
        },
      ],
      interaction: {
        parameters: ['saturationCurrent', 'loadTorque'],
        prompt: 'Lower the saturation knee and the square law gives out sooner.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'series-flux', 'torque'],
        rotorFree: true,
      },
    },

    {
      id: 'starting-torque',
      index: 4,
      title: 'Why it starts so well',
      component: {
        id: 'starting-torque',
        name: 'Starting torque',
        nature: 'phenomenon',
        location: 'At standstill, where current is highest.',
        purpose: 'The reason series motors are used for traction and hoists.',
      },
      requires: ['square-law-torque'],
      activates: ['starting-torque'],
      introduction: {
        body:
          'At standstill there is no back EMF, so the current is limited only by resistance and is very large. In a shunt machine that large current meets a normal field. Here it produces the field as well.',
        highlight: ['starting-torque'],
      },
      contribution: {
        body:
          'The moment the machine most needs torque is the moment it draws the most current, and in this machine those are the same event. That is why series motors were the natural choice for trams, cranes and locomotives: the harder the start, the harder the machine pushes.',
        highlight: ['starting-torque', 'square-law-torque'],
        action: 'Load the machine heavily and watch how much torque it still develops.',
      },
      integration: {
        body:
          'The same coupling that makes it excellent at starting is about to make it dangerous when there is nothing to start.',
        highlight: ['starting-torque', 'series-flux'],
      },
      equations: [],
      interaction: {
        parameters: ['loadTorque'],
        prompt: 'Take the load to its maximum. The machine keeps pulling rather than stalling.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'torque'],
        rotorFree: true,
      },
    },

    {
      id: 'runaway',
      index: 5,
      title: 'Why it must not run unloaded',
      component: {
        id: 'runaway',
        name: 'No-load runaway',
        nature: 'phenomenon',
        location: 'At the light-load end of the speed range.',
        purpose: 'The cost of tying flux to load current.',
      },
      requires: ['series-flux'],
      activates: ['runaway'],
      introduction: {
        body:
          'Now take the load away. Current falls, and because flux is made by that current, flux falls too.',
        highlight: ['runaway'],
      },
      contribution: {
        body:
          'Speed is set by how much back EMF is needed to balance the supply, and back EMF is flux times speed. If flux collapses, the only way to generate the same EMF is to turn faster. So removing the load does not settle the machine down, it winds it up, and the process feeds itself.',
        highlight: ['runaway', 'back-emf', 'series-flux'],
        chain: [
          'Load falls away',
          'Armature current falls',
          'Flux falls with it',
          'Less EMF is generated at the same speed',
          'The machine accelerates to make up the difference',
          'Which reduces the current further',
        ],
      },
      integration: {
        body:
          'In this simulation the speed is held finite only by friction and windage. In a real machine it is held by nothing useful, which is why series motors are coupled directly to their load through gears rather than belts. A belt that slips off leaves the machine with nothing to hold it back.',
        highlight: ['runaway'],
      },
      equations: [
        {
          expression: '\\omega = \\frac{V - I_A R}{k\\Phi} \\quad\\text{with}\\quad \\Phi \\propto I_A',
          meaning: 'As current falls, the denominator falls with it, and speed climbs.',
        },
      ],
      interaction: {
        parameters: ['loadTorque'],
        prompt: 'Take the load towards its minimum and watch the speed climb away from anything reasonable.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'series-flux', 'back-emf'],
        rotorFree: true,
      },
    },
  ],
}
