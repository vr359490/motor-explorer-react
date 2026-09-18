import type { ConstructionSequence } from './ConstructionStep'

/**
 * Everything a basic DC machine consists of, once this sequence has built it.
 *
 * The series and compound sequences begin with all of it already present, which
 * is what spec section 9 asks for: change the field connection rather than
 * rebuild the machine.
 */
export const dcFoundation = [
  'stator',
  'field-winding',
  'armature',
  'rotor',
  'commutator',
  'brushes',
  'field-flux',
  'armature-current',
  'torque',
  'back-emf',
]

/**
 * Building a DC shunt motor, following spec section 8.
 *
 * The machine is assembled cold and stationary first, then energised one
 * circuit at a time: field, then armature. That ordering matters. Torque needs
 * both a field and a current in it, so introducing them separately makes the
 * product visible rather than assumed.
 */
export const dcShuntConstruction: ConstructionSequence = {
  motor: 'shunt',
  title: 'Building a DC shunt motor',
  summary:
    'Two current paths that barely interfere with each other. That separation is why the machine holds its speed.',
  steps: [
    {
      id: 'stator',
      index: 1,
      title: 'The field structure',
      component: {
        id: 'stator',
        name: 'Field structure',
        nature: 'physical',
        location: 'The stationary frame and the poles projecting inwards from it.',
        purpose: 'Carries the field winding and gives the magnetic field a path through steel rather than air.',
      },
      requires: [],
      activates: ['stator', 'field-winding'],
      introduction: {
        body:
          'Begin with the part that stays still: a steel frame with poles projecting inwards, and a coil of many turns wound around each pole. Nothing is connected yet, so there is no field. This is only the structure that will produce one.',
        highlight: ['stator'],
      },
      contribution: {
        body:
          'The poles are shaped to sit close to where the rotating part will go, leaving a small air gap. Steel carries magnetic field far more readily than air, so the shape of this structure decides where the field will go before any current exists.',
        highlight: ['stator', 'field-winding'],
        action: 'Note the many fine turns on each pole. That matters shortly.',
      },
      integration: {
        body:
          'On its own it does nothing. It is the magnetic frame everything else will work inside.',
        highlight: ['stator'],
      },
      equations: [],
      visualization: { scene: 'stator-only', overlays: [], rotorFree: false },
    },

    {
      id: 'armature',
      index: 2,
      title: 'The armature',
      component: {
        id: 'armature',
        name: 'Armature',
        nature: 'physical',
        location: 'On the shaft, inside the poles, separated from them by the air gap.',
        purpose: 'Carries the conductors that the magnetic field will push on.',
      },
      requires: ['stator'],
      activates: ['armature', 'rotor'],
      introduction: {
        body:
          'Mount a laminated steel cylinder on the shaft, with conductors set into slots along its surface. This is the part that will turn. Hold it still for now.',
        highlight: ['armature'],
      },
      contribution: {
        body:
          'The conductors are wound into coils and every coil is connected into one continuous winding, so current entering the armature has a path all the way through and out again. What it does not yet have is a way of getting in.',
        highlight: ['armature'],
        action: 'Follow a conductor along the surface. It disappears into the winding and returns.',
      },
      integration: {
        body:
          'A rotating winding inside a magnetic structure. The obvious problem is that the supply does not rotate, and the next two steps exist entirely to solve it.',
        highlight: ['stator', 'armature'],
      },
      equations: [],
      visualization: { scene: 'stator-and-rotor', overlays: [], rotorFree: false },
    },

    {
      id: 'commutator',
      index: 3,
      title: 'The commutator',
      component: {
        id: 'commutator',
        name: 'Commutator',
        nature: 'physical',
        location: 'A ring of insulated copper segments on the shaft, at one end of the armature.',
        purpose: 'Reverses the connection to each coil as it turns, so torque keeps acting the same way round.',
      },
      requires: ['armature'],
      activates: ['commutator'],
      introduction: {
        body:
          'Fit a ring of copper segments to the shaft, insulated from one another, with the ends of the armature coils soldered to them. It turns with the armature.',
        highlight: ['commutator'],
      },
      contribution: {
        body:
          'Think about what would happen without it. A conductor under a north pole is pushed one way; half a turn later the same conductor is under a south pole and would be pushed back. The machine would rock rather than rotate. The commutator swaps the connections to each coil at exactly that moment, so the current in a conductor reverses as it passes between poles and the force on it keeps pointing the same way.',
        highlight: ['commutator', 'armature'],
        chain: [
          'A coil rotates towards the gap between poles',
          'Its segments leave one contact and meet the next',
          'The current through that coil reverses',
          'It emerges under the opposite pole with the current already flipped',
          'The force on it still drives rotation the same way',
        ],
      },
      integration: {
        body:
          'The commutator is a mechanical switch, running at the speed of the shaft, doing the job that electronics would do in a modern drive. It is also the part that wears.',
        highlight: ['armature', 'commutator'],
      },
      equations: [],
      visualization: { scene: 'stator-and-rotor', overlays: [], rotorFree: false },
    },

    {
      id: 'brushes',
      index: 4,
      title: 'The brushes',
      component: {
        id: 'brushes',
        name: 'Brushes',
        nature: 'physical',
        location: 'Fixed blocks of carbon held against the turning commutator.',
        purpose: 'Carry current from the stationary supply into the rotating winding.',
      },
      requires: ['commutator'],
      activates: ['brushes'],
      introduction: {
        body:
          'Press two carbon blocks against the commutator, held by springs, and wire them to the outside world. They do not turn. The commutator turns underneath them.',
        highlight: ['brushes'],
      },
      contribution: {
        body:
          'This completes the circuit. Current now flows from the supply, through a brush, into whichever segments happen to be under it, through the armature winding, out through the other brush, and back. The path through the copper keeps changing as the shaft turns, but from outside it looks like one steady circuit.',
        highlight: ['brushes', 'commutator'],
        action: 'Switch to the Circuit view and trace the path in and out of the armature.',
      },
      integration: {
        body:
          'Brushes and commutator together solve the problem set in step 2: a stationary supply feeding a rotating winding. Everything electrical is now in place, and nothing has been switched on.',
        highlight: ['stator', 'armature', 'commutator', 'brushes'],
      },
      equations: [],
      visualization: { scene: 'complete', overlays: [], rotorFree: false },
    },

    {
      id: 'field-flux',
      index: 5,
      title: 'The magnetic field',
      component: {
        id: 'field-flux',
        name: 'Field flux',
        nature: 'phenomenon',
        location: 'Crossing the air gap from pole to armature and back.',
        purpose: 'One of the two ingredients of torque.',
      },
      requires: ['stator', 'field-winding'],
      activates: ['field-flux'],
      introduction: {
        body:
          'Connect the field winding across the supply. Current flows through its many turns and a magnetic field appears, crossing the air gap from one pole, through the armature, and back into the other.',
        highlight: ['field-flux'],
      },
      contribution: {
        body:
          'This is where the name comes from. The field winding sits in parallel with the armature, across the same supply, on its own path. Because it has many turns of fine wire it needs only a small current to produce a strong field, and because that current depends on the supply rather than on the load, the flux stays very nearly constant no matter what the machine is asked to do.',
        highlight: ['field-flux', 'field-winding'],
        action: 'Move the field strength control and watch the flux change while nothing else does.',
      },
      integration: {
        body:
          'There is now a steady magnetic field across the air gap, and an armature sitting in it doing nothing, because no current is flowing through it yet.',
        highlight: ['stator', 'field-flux', 'armature'],
      },
      equations: [
        {
          expression: '\\Phi \\propto I_f = \\frac{V}{R_f}',
          meaning: 'Field flux follows the field current, which the supply sets and the load does not.',
        },
      ],
      interaction: {
        parameters: ['fieldStrength'],
        prompt: 'Weaken the field and watch the flux fall. Remember what that does; it returns in step 8.',
        simulate: false,
      },
      visualization: { scene: 'complete', overlays: ['field-flux'], rotorFree: false },
    },

    {
      id: 'armature-current',
      index: 6,
      title: 'Armature current',
      component: {
        id: 'armature-current',
        name: 'Armature current',
        nature: 'phenomenon',
        location: 'In the conductors on the armature surface.',
        purpose: 'The other ingredient of torque.',
      },
      requires: ['brushes', 'field-flux'],
      activates: ['armature-current'],
      introduction: {
        body:
          'Now connect the armature. Current flows in through a brush, around the winding, and out through the other, and every conductor on the surface is carrying it.',
        highlight: ['armature-current'],
      },
      contribution: {
        body:
          'At this instant the armature is still stationary, and only its own resistance limits the current. That resistance is small, so the current is very large: far more than the machine draws when it is running. This is the starting current, and it is why large DC machines are not simply switched on across full voltage.',
        highlight: ['armature-current', 'brushes'],
        action: 'Look at the armature current now, and compare it after the machine is running in step 8.',
      },
      integration: {
        body:
          'Both ingredients are present at once for the first time: a magnetic field across the gap, and a current in conductors sitting in it.',
        highlight: ['field-flux', 'armature-current'],
      },
      equations: [
        {
          expression: 'I_A = \\frac{V}{R_A}',
          meaning: 'At standstill there is nothing but resistance to limit the current.',
        },
      ],
      visualization: { scene: 'complete', overlays: ['field-flux', 'armature-current'], rotorFree: false },
    },

    {
      id: 'torque',
      index: 7,
      title: 'Torque',
      component: {
        id: 'torque',
        name: 'Electromagnetic torque',
        nature: 'phenomenon',
        location: 'On every current-carrying conductor in the air gap.',
        purpose: 'Turns the shaft.',
      },
      requires: ['field-flux', 'armature-current'],
      activates: ['torque'],
      introduction: {
        body:
          'A conductor carrying current across a magnetic field has a force on it. Every armature conductor is doing both, and each force acts at a radius from the shaft, so together they are a torque. Release the shaft and the machine turns.',
        highlight: ['torque'],
      },
      contribution: {
        body:
          'Torque is the product of the two things just introduced, which means neither alone is worth anything. Cut the field and the machine produces nothing however much current flows. Cut the armature current and the same is true with a full field.',
        highlight: ['torque', 'field-flux', 'armature-current'],
        action: 'The armature is now free and accelerating.',
      },
      integration: {
        body:
          'The machine works. What it does not yet do is regulate itself, and the next step is what gives it that.',
        highlight: ['field-flux', 'armature-current', 'torque'],
      },
      equations: [
        {
          expression: 'T_e = k\\Phi I_A',
          meaning: 'Torque is flux times armature current. Both are needed; either one at zero gives nothing.',
        },
      ],
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'torque'],
        rotorFree: true,
      },
    },

    {
      id: 'back-emf',
      index: 8,
      title: 'Back EMF',
      component: {
        id: 'back-emf',
        name: 'Back EMF',
        nature: 'phenomenon',
        location: 'Generated in the same armature conductors that are carrying the current.',
        purpose: 'Opposes the supply, and is what limits the current once the machine is running.',
      },
      requires: ['torque', 'rotor'],
      activates: ['back-emf'],
      introduction: {
        body:
          'As soon as the armature moves, its conductors are cutting across the field, and conductors moving through a field generate a voltage. The armature is acting as a generator at the same time as it acts as a motor, and the voltage it generates opposes the supply driving it.',
        highlight: ['back-emf'],
      },
      contribution: {
        body:
          'This is what tames the starting current. The faster the machine turns, the more back EMF it generates, and the less of the supply voltage is left over to push current through the armature resistance. The machine accelerates until the current has fallen to just what is needed for the load. It stops accelerating because it has run out of the difference.',
        highlight: ['back-emf', 'armature-current'],
        chain: [
          'The armature accelerates',
          'Its conductors cut the field faster',
          'Back EMF rises',
          'Less voltage is left across the armature resistance',
          'Armature current falls, and so does torque',
          'Acceleration stops where torque matches the load',
        ],
      },
      integration: {
        body:
          'Speed is now set by how much back EMF the machine must generate to balance the supply, which is why raising the voltage raises the speed and weakening the field does too: a weaker field needs more speed to generate the same EMF.',
        highlight: ['field-flux', 'back-emf'],
      },
      equations: [
        {
          expression: 'E_A = k\\Phi\\omega',
          meaning: 'Back EMF rises with both flux and speed.',
        },
        {
          expression: 'I_A = \\frac{V - k\\Phi\\omega}{R_A}',
          meaning: 'Current is driven by whatever is left of the supply after back EMF, across a small resistance.',
        },
      ],
      interaction: {
        parameters: ['supplyVoltage', 'fieldStrength'],
        prompt: 'Raise the voltage and the speed rises. Then weaken the field, and it rises too.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'torque', 'back-emf'],
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
        purpose: 'Opposes the machine and forces it to find a new balance.',
      },
      requires: ['back-emf', 'torque'],
      activates: ['mechanical-load'],
      introduction: {
        body:
          'Couple something to the shaft that resists turning. The machine slows a little, and everything else follows from that.',
        highlight: ['mechanical-load'],
      },
      contribution: {
        body:
          'Each link forces the next, and the loop closes on itself. This is the DC motor regulating its own torque with no control system of any kind.',
        highlight: ['mechanical-load', 'back-emf', 'armature-current', 'torque'],
        chain: [
          'Load torque increases',
          'The armature slows slightly',
          'Back EMF falls with the speed',
          'More supply voltage is left across the armature resistance',
          'Armature current rises',
          'Electromagnetic torque rises to meet the load',
          'The machine settles at a slightly lower speed',
        ],
      },
      integration: {
        body:
          'Now notice how little the speed actually moved. Flux is held steady by its own separate circuit, so the only thing that had to change was current, and a small change in speed produces a large change in current. That is the whole reason a shunt motor is used where speed needs to stay put.',
        highlight: ['field-flux', 'back-emf', 'torque', 'mechanical-load'],
      },
      equations: [
        {
          expression:
            'T_L \\uparrow \\;\\Rightarrow\\; \\omega \\downarrow \\;\\Rightarrow\\; E_A \\downarrow \\;\\Rightarrow\\; I_A \\uparrow \\;\\Rightarrow\\; T_e \\uparrow',
          meaning: 'The load response as a chain, each step forced by the one before it.',
        },
      ],
      interaction: {
        parameters: ['loadTorque'],
        prompt: 'Step the load from light to heavy. Watch the current move a great deal and the speed barely at all.',
        simulate: true,
      },
      visualization: {
        scene: 'complete',
        overlays: ['field-flux', 'armature-current', 'torque', 'back-emf', 'load'],
        rotorFree: true,
      },
    },
  ],
}
