/* The Inner Beast weekly plan, as a copy. Used only while that app has not published its plan in this browser (an installed iPhone app, for example, keeps its own storage). */
import type { PlanSession } from '../logic/bridge.ts';

export const FALLBACK_WEEK: PlanSession[][] = [
  [{ id: 'mon-shadow', name: 'Shadow Boxing', kind: 'rounds', min: 25, focus: 'jab' }, { id: 'mon-bw', name: 'Bodyweight Workout', kind: 'amrap', min: 10 }, { id: 'mon-bag', name: 'Heavy Bag Training', kind: 'rounds', min: 19, focus: 'move' }],
  [{ id: 'tue-stretch', name: 'Full Body Stretching', kind: 'routine', min: 15 }, { id: 'tue-cal', name: 'Calisthenics', kind: 'workout', min: 60 }, { id: 'tue-easy', name: 'Easy Shadow Boxing', kind: 'rounds', min: 10, focus: 'slow' }],
  [{ id: 'wed-walk', name: 'Walk (10K Steps)', kind: 'walk', min: 75 }, { id: 'wed-shower', name: 'Cold & Warm Showers', kind: 'shower', min: 10 }, { id: 'wed-med', name: 'Meditation', kind: 'wimhof', min: 12 }],
  [{ id: 'thu-rope', name: 'Jumping Rope', kind: 'rounds', min: 25, focus: 'rope' }, { id: 'thu-shadow', name: 'Shadow Boxing', kind: 'rounds', min: 11, focus: 'combo' }, { id: 'thu-bag', name: 'Heavy Bag Training', kind: 'rounds', min: 39, focus: 'power' }],
  [{ id: 'fri-stretch', name: 'Full Body Stretching', kind: 'routine', min: 15 }, { id: 'fri-cal', name: 'Calisthenics', kind: 'workout', min: 60 }, { id: 'fri-easy', name: 'Easy Shadow Boxing', kind: 'rounds', min: 10, focus: 'distance' }],
  [{ id: 'sat-mob', name: 'Mobility Training', kind: 'routine', min: 30 }, { id: 'sat-med', name: 'Meditation', kind: 'wimhof', min: 10 }, { id: 'sat-breath', name: 'Breathing Exercises', kind: 'breath', min: 10 }],
  [{ id: 'sun-jog', name: 'Jogging', kind: 'run', min: 20 }, { id: 'sun-legs', name: 'Wall Sit', kind: 'rounds', min: 19, focus: 'legs' }, { id: 'sun-lunges', name: 'Lunges', kind: 'workout', min: 15 }],
];
