import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../app/model.mjs';
import { CATALOG, EXERCISE_ALIASES } from '../app/catalog.mjs';

const catalog = [
  { id: 'bench', name: 'Dumbbell bench press', equipment: 'Dumbbell', group: 'Chest', weightMode: 'per-dumbbell' },
  { id: 'row', name: 'Machine lat row', equipment: 'Machine', group: 'Back', weightMode: 'machine-total' },
  { id: 'pullup', name: 'Pull-up', equipment: 'Bodyweight', group: 'Back', weightMode: 'bodyweight' },
];
function setup() {
  let state = M.createState(catalog);
  const routine = M.createRoutine('Push');
  routine.exercises.push(M.createRoutineExercise('bench', [10, 8, 6]));
  routine.exercises.push(M.createRoutineExercise('row', [12, 10]));
  state = M.saveRoutine(state, routine);
  return { state, routine };
}
function logSet(state, exerciseIndex = 0, setIndex = 0, weight = 50, reps = 10) {
  const exercise = state.active.exercises[exerciseIndex], set = exercise.sets[setIndex];
  return M.setActiveSet(state, exercise.slotId, set.id, { weight, reps, completed: true });
}
function completedFixture() {
  let { state, routine } = setup();
  state = M.startWorkout(state, routine.id);
  state = logSet(state, 0, 0, 50, 10);
  state = logSet(state, 0, 2, 60, 6);
  state = logSet(state, 1, 0, 175, 12);
  return { state: M.finishWorkout(state), routine };
}

test('Starting a routine targets one more rep than previous actual reps and leaves all actual results blank', () => {
  const { state, routine } = completedFixture();
  const started = M.startWorkout(state, routine.id);
  assert.deepEqual(started.active.exercises[0].sets.map(set => set.targetReps), [11, 8, 7]);
  assert.ok(started.active.exercises.every(exercise => exercise.sets.every(set => set.weight === null && set.reps === null && !set.completed)));
  assert.equal(state.active, null);
  assert.equal(started.active.exercises[0].weightMode, 'per-dumbbell');
});

test('Comparison finds latest exact exercise anywhere and keeps skipped set positions', () => {
  let { state } = completedFixture();
  const other = M.createRoutine('Full body');
  other.exercises.push(M.createRoutineExercise('bench', [8, 8, 8]));
  state = M.saveRoutine(state, other);
  state = M.startWorkout(state, other.id);
  const exercise = state.active.exercises[0];
  assert.equal(M.previousForSet(state, 'bench', exercise.slotId, exercise.sets[0].id, 0).weight, 50);
  assert.equal(M.previousForSet(state, 'bench', exercise.slotId, exercise.sets[1].id, 1), null);
  assert.equal(M.previousForSet(state, 'bench', exercise.slotId, exercise.sets[2].id, 2).weight, 60);
});

test('Reordering exercises and sets preserves logged results and stable comparisons', () => {
  let { state, routine } = completedFixture();
  state = M.startWorkout(state, routine.id);
  state = logSet(state, 0, 0, 55, 11);
  const originalSlot = state.active.exercises[0].slotId;
  const originalSet = state.active.exercises[0].sets[0].id;
  state = M.moveActiveExercise(state, originalSlot, 1);
  state = M.moveActiveSet(state, originalSlot, originalSet, 2);
  const moved = state.active.exercises[1].sets[2];
  assert.equal(moved.id, originalSet);
  assert.equal(moved.weight, 55);
  assert.equal(moved.reps, 11);
  assert.equal(M.previousForSet(state, 'bench', originalSlot, originalSet, 2).weight, 50);
});

test('A newly added set does not inherit another removed set’s comparison', () => {
  let { state, routine } = completedFixture();
  state = M.startWorkout(state, routine.id);
  const exercise = state.active.exercises[0];
  state = M.removeActiveSet(state, exercise.slotId, exercise.sets[0].id);
  state = M.addActiveSet(state, exercise.slotId, 8);
  const newSet = state.active.exercises[0].sets[2];
  assert.equal(M.previousForSet(state, 'bench', exercise.slotId, newSet.id, 2), null);
});

test('Replacing an unlogged exercise resets identity and never transfers actual values', () => {
  let { state, routine } = setup();
  state = M.startWorkout(state, routine.id);
  const original = state.active.exercises[0];
  state = M.replaceActiveExercise(state, original.slotId, 'row');
  const replacement = state.active.exercises[0];
  assert.equal(replacement.exerciseId, 'row');
  assert.notEqual(replacement.slotId, original.slotId);
  assert.notEqual(replacement.sets[0].id, original.sets[0].id);
  assert.ok(replacement.sets.every(set => set.weight === null && set.reps === null && !set.completed));
});

test('Replacing a logged exercise retains its results but excludes it from future routine', () => {
  let { state, routine } = setup();
  state = M.startWorkout(state, routine.id);
  state = logSet(state);
  const original = state.active.exercises[0];
  state = M.replaceActiveExercise(state, original.slotId, 'pullup');
  assert.equal(state.active.exercises[0].exerciseId, 'bench');
  assert.equal(state.active.exercises[0].retained, true);
  assert.equal(state.active.exercises[0].sets[0].weight, 50);
  assert.equal(state.active.exercises[1].exerciseId, 'pullup');
  state = M.updateSavedRoutine(state);
  assert.deepEqual(state.routines[0].exercises.map(item => item.exerciseId), ['pullup', 'row']);
  state = M.finishWorkout(state);
  assert.equal(state.history[0].exercises[0].exerciseId, 'bench');
  assert.equal(state.history[0].exercises[0].sets[0].weight, 50);
});

test('Workout-only edits leave templates alone; explicitly saving changes never rewrites history', () => {
  let { state, routine } = completedFixture();
  const oldHistory = JSON.stringify(state.history);
  state = M.startWorkout(state, routine.id);
  const exercise = state.active.exercises[0];
  state = M.setActiveSet(state, exercise.slotId, exercise.sets[0].id, { targetReps: 15 });
  state = M.addActiveExercise(state, 'pullup', [7, 6]);
  assert.equal(state.routines[0].exercises[0].sets[0].targetReps, 10);
  assert.equal(state.routines[0].exercises.length, 2);
  state = M.updateSavedRoutine(state);
  assert.equal(state.routines[0].exercises[0].sets[0].targetReps, 15);
  assert.equal(state.routines[0].exercises.length, 3);
  assert.equal(JSON.stringify(state.history), oldHistory);
});

test('Completion requires today’s values and rejects invalid numeric entries', () => {
  let { state, routine } = setup();
  state = M.startWorkout(state, routine.id);
  const exercise = state.active.exercises[0], set = exercise.sets[0];
  assert.throws(() => M.setCompleted(state, exercise.slotId, set.id, true), /Enter today/);
  assert.throws(() => M.setActiveSet(state, exercise.slotId, set.id, { reps: 1.5 }), /whole number/);
  assert.throws(() => M.setActiveSet(state, exercise.slotId, set.id, { weight: -1 }), /Weight/);
  assert.throws(() => M.setActiveSet(state, exercise.slotId, set.id, { weight: Infinity }), /Weight/);
  state = M.setActiveSet(state, exercise.slotId, set.id, { weight: 52.5, reps: 0, completed: true });
  assert.equal(state.active.exercises[0].sets[0].completed, true);
  state = M.setActiveSet(state, exercise.slotId, set.id, { reps: null });
  assert.equal(state.active.exercises[0].sets[0].completed, false);
});

test('Bodyweight sets require reps but do not require an invented external weight', () => {
  let state = M.createState(catalog);
  const routine = M.createRoutine('Pull-ups');
  routine.exercises.push(M.createRoutineExercise('pullup', [10]));
  state = M.startWorkout(M.saveRoutine(state, routine), routine.id);
  const exercise = state.active.exercises[0], set = exercise.sets[0];
  state = M.setActiveSet(state, exercise.slotId, set.id, { reps: 8, completed: true });
  assert.equal(state.active.exercises[0].sets[0].weight, null);
  assert.equal(M.finishWorkout(state).history.length, 1);
});

test('Assisted machines require nonnegative assistance and preserve its convention through backups', () => {
  let state = M.createState(CATALOG);
  const routine = M.createRoutine('Assisted pull');
  routine.exercises.push(M.createRoutineExercise('builtin-assisted-pull-up-machine', [8]));
  state = M.startWorkout(M.saveRoutine(state, routine), routine.id);
  const exercise = state.active.exercises[0], set = exercise.sets[0];
  assert.equal(exercise.weightMode, 'assistance');
  assert.equal(set.weight, null);
  assert.throws(() => M.setActiveSet(state, exercise.slotId, set.id, { reps: 8, completed: true }), /weight/i);
  assert.throws(() => M.setActiveSet(state, exercise.slotId, set.id, { weight: -40 }), /from 0/);
  state = M.setActiveSet(state, exercise.slotId, set.id, { weight: 40, reps: 8, completed: true });
  assert.deepEqual(M.parseBackup(M.exportBackup(state)), state);
  const invalid = JSON.parse(M.exportBackup(state));
  invalid.data.active.exercises[0].sets[0].weight = -40;
  assert.throws(() => M.parseBackup(JSON.stringify(invalid)), /from 0/);
  const unassistedSetting = M.setActiveSet(state, exercise.slotId, set.id, { weight: 0 });
  assert.equal(unassistedSetting.active.exercises[0].sets[0].completed, true);
  state = M.finishWorkout(state);
  assert.equal(state.history[0].exercises[0].weightMode, 'assistance');
  assert.equal(state.history[0].exercises[0].sets[0].weight, 40);
  assert.deepEqual(M.parseBackup(M.exportBackup(state)), state);
});

test('Assisted comparisons cross routines without borrowing unassisted exercise results', () => {
  let state = M.createState(CATALOG);
  const first = M.createRoutine('First pull');
  first.exercises.push(M.createRoutineExercise('builtin-assisted-pull-up-machine', [8]));
  state = M.startWorkout(M.saveRoutine(state, first), first.id);
  state = M.finishWorkout(logSet(state, 0, 0, 40, 8));
  const other = M.createRoutine('Second pull');
  other.exercises.push(M.createRoutineExercise('builtin-assisted-pull-up-machine', [6]));
  other.exercises.push(M.createRoutineExercise('builtin-pull-up', [6]));
  state = M.startWorkout(M.saveRoutine(state, other), other.id);
  const assisted = state.active.exercises[0];
  assert.equal(assisted.sets[0].targetReps, 9);
  assert.equal(assisted.sets[0].weight, null);
  assert.equal(M.previousForSet(state, assisted.exerciseId, assisted.slotId, assisted.sets[0].id, 0).weight, 40);
  assert.equal(state.active.exercises[1].sets[0].targetReps, 6);
  assert.equal(M.previousForExercise(state, 'builtin-pull-up'), null);
});

test('Common gym presets retain distinct variation identities and correct weight conventions', () => {
  assert.equal(CATALOG.length, 145);
  assert.equal(new Set(CATALOG.map(item => item.id)).size, CATALOG.length);
  const expected = {
    'builtin-leg-press-machine': 'machine-total',
    'builtin-seated-leg-press-machine': 'machine-total',
    'builtin-45-degree-leg-press-machine': 'machine-total',
    'builtin-single-leg-press-machine': 'machine-total',
    'builtin-seated-dip-machine': 'machine-total',
    'builtin-back-extension-machine': 'machine-total',
    'builtin-biceps-curl-machine': 'machine-total',
    'builtin-rotary-torso-machine': 'machine-total',
    'builtin-glute-kickback-machine': 'machine-total',
    'builtin-assisted-pull-up-machine': 'assistance',
    'builtin-assisted-chin-up-machine': 'assistance',
    'builtin-assisted-dip-machine': 'assistance',
    'builtin-bench-press-dumbbell': 'per-dumbbell',
    'builtin-pull-up': 'bodyweight',
  };
  for (const [id, mode] of Object.entries(expected)) assert.equal(CATALOG.find(item => item.id === id)?.weightMode, mode, id);
  assert.doesNotThrow(() => M.createState(CATALOG));
  const catalogIds = new Set(CATALOG.map(item => item.id));
  for (const [id, aliases] of Object.entries(EXERCISE_ALIASES)) {
    assert.ok(catalogIds.has(id), `Orphan search alias: ${id}`);
    assert.ok(aliases.length && aliases.every(alias => typeof alias === 'string' && alias.trim()));
  }
  assert.ok(EXERCISE_ALIASES['builtin-chest-fly-machine'].includes('pec deck'));
  assert.ok(EXERCISE_ALIASES['builtin-rear-delt-fly-machine'].includes('reverse pec deck'));
  assert.ok(EXERCISE_ALIASES['builtin-chest-fly-cable'].includes('cable crossover'));
});

test('Export then import restores routines, completed history, active entries, custom library, settings', () => {
  let { state, routine } = completedFixture();
  state = M.addCatalogExercise(state, { id: 'custom', name: 'My custom machine', equipment: 'Machine', group: 'Back', weightMode: 'machine-total' });
  state = M.startWorkout(state, routine.id);
  state = logSet(state, 0, 0, 57.5, 8);
  state.lastExportAt = '2026-11-09T12:00:00.000Z';
  const restored = M.parseBackup(M.exportBackup(state));
  assert.deepEqual(restored, state);
  restored.routines[0].name = 'Changed after restore';
  assert.equal(state.routines[0].name, 'Push');
});

test('Version 1 Setline backups still restore after the Benchmark rename and export under the new name', () => {
  let { state, routine } = completedFixture();
  state = M.startWorkout(state, routine.id);
  state = logSet(state, 0, 0, 55, 11);
  const legacy = JSON.parse(M.exportBackup(state));
  legacy.format = 'setline-backup';
  const restored = M.parseBackup(JSON.stringify(legacy));
  assert.deepEqual(restored, state);
  const current = JSON.parse(M.exportBackup(restored));
  assert.equal(current.format, 'benchmark-backup');
  assert.equal(current.version, 1);
  assert.equal(current.data.schemaVersion, 1);
  assert.deepEqual(current.data.routines, legacy.data.routines);
  assert.deepEqual(current.data.history, legacy.data.history);
  assert.throws(() => M.parseBackup(JSON.stringify({ ...legacy, format: 'unrelated-backup' })), /not a supported Benchmark backup/);
});

test('Invalid backups are rejected without touching the original records', () => {
  const { state } = completedFixture();
  const before = JSON.stringify(state);
  const valid = JSON.parse(M.exportBackup(state));
  const invalidCases = [
    '{bad json',
    JSON.stringify({ ...valid, version: 999 }),
    JSON.stringify({ ...valid, data: { ...valid.data, schemaVersion: 2 } }),
    JSON.stringify({ ...valid, data: { ...valid.data, settings: { unit: 'kg' } } }),
  ];
  const missingExercise = structuredClone(valid);
  missingExercise.data.catalog = [];
  invalidCases.push(JSON.stringify(missingExercise));
  const invalidCompleted = structuredClone(valid);
  invalidCompleted.data.history[0].exercises[0].sets[0].weight = null;
  invalidCases.push(JSON.stringify(invalidCompleted));
  const duplicateIds = structuredClone(valid);
  duplicateIds.data.history.push(duplicateIds.data.history[0]);
  invalidCases.push(JSON.stringify(duplicateIds));
  for (const invalid of invalidCases) assert.throws(() => M.parseBackup(invalid));
  assert.equal(JSON.stringify(state), before);
});

test('Malformed or oversized backups and prototype fields are rejected', () => {
  assert.throws(() => M.parseBackup(' '.repeat(M.MAX_BACKUP_BYTES + 1)), /25 MB/);
  const state = M.createState(catalog);
  const json = M.exportBackup(state).replace('"settings": {', '"settings": { "__proto__": {},');
  assert.throws(() => M.parseBackup(json), /unsupported fields/);
});

test('An unfinished workout survives a complete serialization round trip', () => {
  let { state, routine } = setup();
  state = M.startWorkout(state, routine.id);
  state = logSet(state);
  const saved = M.validateState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(saved.active, state.active);
  assert.throws(() => M.startWorkout(saved, routine.id), /Resume or finish/);
});

test('Removing a routine preserves completed history and unfinished workout snapshots', () => {
  let { state, routine } = completedFixture();
  state = M.startWorkout(state, routine.id);
  state = M.removeRoutine(state, routine.id);
  assert.equal(state.routines.length, 0);
  assert.equal(state.history.length, 1);
  assert.equal(state.active.routineName, 'Push');
  assert.throws(() => M.updateSavedRoutine(state), /deleted/);
  assert.doesNotThrow(() => M.validateState(state));
});

test('Comparison uses the latest date, never an active or uncompleted entry', () => {
  let { state, routine } = completedFixture();
  state.history[0].startedAt = '2026-11-01T10:00:00Z';
  state.history[0].completedAt = '2026-11-01T11:00:00Z';
  state = M.startWorkout(state, routine.id);
  state = logSet(state, 0, 0, 65, 9);
  assert.equal(M.previousForExercise(state, 'bench').sets[0].weight, 50);
  state = M.finishWorkout(state);
  assert.equal(M.previousForExercise(state, 'bench').sets[0].weight, 65);
  assert.equal(M.exerciseHistory(state, 'bench').length, 2);
});

test('Domain mutations leave their input state unchanged', () => {
  const { state, routine } = setup();
  const before = JSON.stringify(state);
  const started = M.startWorkout(state, routine.id);
  const startedBefore = JSON.stringify(started);
  logSet(started);
  M.replaceActiveExercise(started, started.active.exercises[0].slotId, 'row');
  M.moveActiveExercise(started, started.active.exercises[0].slotId, 1);
  assert.equal(JSON.stringify(started), startedBefore);
  assert.equal(JSON.stringify(state), before);
});

test('Undated imported references supply comparisons and targets without fabricating history', () => {
  let { state, routine } = setup();
  const exercise = routine.exercises[0];
  state.baselines = [{ exerciseId: 'bench', slotId: exercise.slotId, routineName: routine.name, sets: exercise.sets.map((set, index) => ({ id: set.id, weight: 45 + index * 5, reps: [9, 7, 5][index], completed: true })) }];
  state = M.validateState(state);
  state = M.startWorkout(state, routine.id);
  assert.deepEqual(state.active.exercises[0].sets.map(set => set.targetReps), [10, 8, 6]);
  const previous = M.previousForSet(state, 'bench', exercise.slotId, exercise.sets[0].id, 0);
  assert.equal(previous.source, 'Imported reference');
  assert.equal(previous.completedAt, null);
  assert.equal(previous.weight, 45);
  assert.equal(state.history.length, 0);
  assert.deepEqual(M.parseBackup(M.exportBackup(state)), state);
  state = M.finishWorkout(logSet(state, 0, 0, 50, 11));
  assert.equal(M.previousForSet(state, 'bench', exercise.slotId, exercise.sets[0].id, 0).reps, 11);
  assert.equal(M.previousForSet(state, 'bench', exercise.slotId, exercise.sets[0].id, 0).source, 'Completed workout');
  assert.equal(M.previousForSet(state, 'bench', exercise.slotId, exercise.sets[1].id, 1), null);
});

test('Adding and replacing exercises use previous actual reps plus one, across routines', () => {
  let { state, routine } = completedFixture();
  state = M.startWorkout(state, routine.id);
  state = M.addActiveExercise(state, 'bench');
  assert.deepEqual(state.active.exercises.at(-1).sets.map(set => set.targetReps), [11, 10]);
  const slot = state.active.exercises[0].slotId;
  state = M.replaceActiveExercise(state, slot, 'row');
  assert.equal(state.active.exercises[0].sets[0].targetReps, 13);
  assert.equal(state.active.exercises[0].sets[0].weight, null);
});

test('Renaming keeps exercise identity, logged sets, comparisons, and completed history snapshots', () => {
  let { state, routine } = completedFixture();
  state = M.startWorkout(state, routine.id);
  state = logSet(state, 0, 0, 55, 11);
  const before = JSON.stringify(state);
  const renamed = M.renameExercise(state, 'bench', '  My dumbbell bench  ');
  assert.equal(JSON.stringify(state), before);
  assert.equal(renamed.catalog.find(item => item.id === 'bench').name, 'My dumbbell bench');
  assert.equal(renamed.active.exercises[0].name, 'My dumbbell bench');
  assert.deepEqual(renamed.active.exercises[0].sets, state.active.exercises[0].sets);
  assert.deepEqual(renamed.routines, state.routines);
  assert.deepEqual(renamed.history, state.history);
  assert.equal(M.previousForExercise(renamed, 'bench').sets[0].weight, 50);
  const restarted = M.startWorkout(M.discardWorkout(renamed), routine.id);
  assert.equal(restarted.active.exercises[0].name, 'My dumbbell bench');
  assert.equal(restarted.active.exercises[0].sets[0].targetReps, 11);
  assert.deepEqual(M.parseBackup(M.exportBackup(renamed)), renamed);
});

test('Renaming rejects invalid, duplicate, or missing exercises without changing saved state', () => {
  const { state } = setup();
  const before = JSON.stringify(state);
  assert.throws(() => M.renameExercise(state, 'bench', '   '), /Exercise name/);
  assert.throws(() => M.renameExercise(state, 'bench', 'x'.repeat(161)), /Exercise name/);
  assert.throws(() => M.renameExercise(state, 'bench', ' machine LAT row '), /already exists/);
  assert.throws(() => M.renameExercise(state, 'missing', 'New name'), /could not be found/);
  assert.equal(JSON.stringify(state), before);
  assert.equal(M.renameExercise(state, 'bench', 'Dumbbell bench press').catalog[0].id, 'bench');
});
