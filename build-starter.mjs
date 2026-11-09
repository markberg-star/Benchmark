import { writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { CATALOG } from '../app/catalog.mjs';
import { createState, addCatalogExercise, saveRoutine, validateState, exportBackup, parseBackup, startWorkout, previousForSet } from '../app/model.mjs';

// PRIVATE INPUT. Never copy this script, its JSON output, or source images into the public app folder.
const plans = [
  ['Cascade push day', 'push', [
    ['Chest Fly (Machine)', [[145, 9], [145, 8]]],
    ['Incline Smith Machine', [[90, 7], [90, 7]]],
    ['Single Arm Lateral Raise (Cable)', [[10, 5], [5, 12]]],
    ['Triceps Rope Pushdown', [[30, 4], [25, 8]]],
    ['Shoulder Press (Dumbbell)', [[55, 5]]],
    ['JM Press (Smith Machine)', [[70, 11]]],
  ]],
  ['Cascade pull day', 'pull', [
    ['Lat Pulldown (Cable)', [[130, 10], [130, 9]]],
    ['Seated Row (Machine)', [[175, 9], [175, 8]]],
    ['Machine Lat Row', [[175, 7]]],
    ['Preacher Curl (Machine)', [[115, 8], [115, 7]]],
    ['Hammer Curl (Dumbbell)', [[35, 7], [35, 6]]],
  ]],
  ['Leg day', 'legs', [
    ['Seated Leg Curl (Machine)', [[175, 8], [175, 7]]],
    ['Leg Extension (Machine)', [[175, 11], [175, 10]]],
    ['Calf Press (Machine)', [[235, 12], [235, 12]]],
    ['Hanging Knee Raise', [[null, 15], [null, 11]]],
  ]],
];

let state = createState(CATALOG);
if (!state.catalog.some(item => item.name === 'Calf Press (Machine)')) {
  state = addCatalogExercise(state, {
    id: 'custom-calf-press-machine', name: 'Calf Press (Machine)',
    equipment: 'Machine', group: 'Legs', weightMode: 'machine-total',
  });
}
for (const [name, key, exercises] of plans) {
  const routine = { id: `starter-${key}`, name, exercises: [] };
  exercises.forEach(([exerciseName, results], index) => {
    const item = state.catalog.find(exercise => exercise.name === exerciseName);
    assert.ok(item, `Missing catalog exercise: ${exerciseName}`);
    const slotId = `starter-${key}-exercise-${index + 1}`;
    const sets = results.map(([, reps], setIndex) => ({
      id: `${slotId}-set-${setIndex + 1}`, targetReps: reps + 1,
    }));
    routine.exercises.push({ slotId, exerciseId: item.id, sets });
    state.baselines.push({
      exerciseId: item.id, slotId, routineName: name,
      sets: results.map(([weight, reps], setIndex) => ({
        id: sets[setIndex].id, weight, reps, completed: true,
      })),
    });
  });
  state = saveRoutine(state, routine);
}
state = validateState(state);
assert.equal(state.routines.length, 3);
assert.equal(state.baselines.length, 15);
assert.deepEqual(state.routines.map(r => r.exercises.reduce((n, e) => n + e.sets.length, 0)), [10, 9, 8]);
assert.equal(state.history.length, 0);
assert.equal(state.active, null);

const output = new URL('./Benchmark_Private_Routines.json', import.meta.url);
writeFileSync(output, exportBackup(state) + '\n');
const restored = parseBackup(readFileSync(output, 'utf8'));
assert.deepEqual(restored, state);
for (const routine of restored.routines) {
  const started = startWorkout(restored, routine.id);
  for (const exercise of started.active.exercises) {
    exercise.sets.forEach((set, index) => {
      const reference = previousForSet(started, exercise.exerciseId, exercise.slotId, set.id, index);
      assert.ok(reference);
      assert.equal(set.targetReps, reference.reps + 1);
      assert.equal(set.weight, null);
      assert.equal(set.reps, null);
      assert.equal(set.completed, false);
    });
  }
}
console.log('Private starter verified: 3 routines, 15 exercises, 27 reference sets; targets are prior reps + 1; history empty; JSON export/import roundtrip exact.');
